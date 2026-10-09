from copy import deepcopy

import pytest

from jalsetu_planner import marginal
from jalsetu_planner.fixtures import example_input
from jalsetu_planner.schemas import PlanningInput


@pytest.fixture
def batch():
    data = PlanningInput.model_validate(example_input("finish_by_close", "parallel"))
    value = {"extra_stock_litres": 1000, "vehicle_capacity_litres": 5000, "earlier_start_minutes": 30,
             "closing_site_id": data.sites[0].site_id, "later_close_minutes": 30, "shorter_service_minutes": 5}
    options = marginal.checked_options(data, value, data.model_dump(mode="json"))
    return data, options


def test_each_applicable_child_is_solved_and_checked_without_mutating_parent(batch, monkeypatch):
    data, options = batch
    original = data.model_dump(mode="json")
    actual, calls = marginal.plan, []
    def tracked(scenario):
        calls.append(scenario.model_dump(mode="json"))
        return actual(scenario)
    monkeypatch.setattr(marginal, "plan", tracked)
    result = marginal.analyze(data, options, "batch-1", "parent-1")["analysis"]
    assert len(calls) == 6 and len({c["child_job_id"] for c in result["children"]}) == 6
    assert data.model_dump(mode="json") == original
    assert all(c["plan"]["validation"]["valid"] for c in result["children"])
    assert all(c["solver_time_limit_seconds"] <= 8 for c in calls)
    baseline = result["children"][0]["plan"]["metrics"]
    for c in result["children"][1:]:
        assert c["delta"] == {k: c["plan"]["metrics"][k] - baseline[k] for k in marginal.DELTA_METRICS}
    # No manufactured gains for an earlier start already clamped at depot open.
    earlier = next(c for c in result["children"] if c["kind"] == "earlier_start")
    assert earlier["input_snapshot"]["depot"] == original["depot"]


@pytest.mark.parametrize("damage", ["metric", "delta", "snapshot", "missing", "identity", "parent"])
def test_corruption_is_rejected(batch, damage):
    data, options = batch
    analysis = marginal.analyze(data, options, "batch-1", "parent-1")["analysis"]
    child = analysis["children"][1]
    if damage == "metric":
        child["plan"]["metrics"]["on_time_scheduled_litres"] += 100
    elif damage == "delta":
        child["delta"]["on_time_scheduled_litres"] += 100
    elif damage == "snapshot":
        child["input_snapshot"]["depot"]["available_stock_litres"] += 100
    elif damage == "missing":
        analysis["children"].pop()
    elif damage == "identity":
        child["child_job_id"] = "unrelated"
    else:
        analysis["parent_job_id"] = "unrelated"
    with pytest.raises(ValueError):
        marginal.validate_analysis(data, options, analysis, "batch-1", "parent-1")


def test_resource_limit_is_explicit_and_other_scenarios_remain_available(batch):
    data, options = batch
    data.vehicles.extend([data.vehicles[0].model_copy(update={"vehicle_id": f"extra-{i}"}) for i in range(5-len(data.vehicles))])
    candidates = list(marginal.scenarios(data, options))
    vehicle = next(c for c in candidates if c[0] == "vehicle")
    assert vehicle[1] is None and "five-vehicle" in vehicle[2]
    assert candidates[1][1] is not None


def test_changed_input_and_unconfirmed_closing_target_are_rejected(batch):
    data, options = batch
    parent = deepcopy(data.model_dump(mode="json"))
    parent["depot"]["available_stock_litres"] += 100
    with pytest.raises(ValueError, match="current inputs"):
        marginal.checked_options(data, options.model_dump(mode="json"), parent)
    value = options.model_dump(mode="json")
    value["closing_site_id"] = "missing"
    with pytest.raises(ValueError, match="confirmed point"):
        marginal.checked_options(data, value, data.model_dump(mode="json"))


def test_no_feasible_baseline_withholds_gains(batch):
    data, options = batch
    data.vehicles = []
    result = marginal.analyze(data, options, "no-vehicle-batch", "parent")["analysis"]
    assert result["children"][0]["plan"]["status"] == "invalid_input"
    assert all(child.get("delta") is None for child in result["children"][1:])


def test_closing_extension_cannot_cross_declared_operating_day(batch):
    data, options = batch
    data.sites[0].closes_at = data.sites[0].closes_at.replace(hour=23, minute=50)
    closing = next(c for c in marginal.scenarios(data, options) if c[0] == "later_close")
    assert closing[1] is None and "declared day" in closing[2]
