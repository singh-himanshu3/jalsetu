"""Synthetic operator declarations exercise local wiring, not real field evidence."""
import json
from copy import deepcopy

import pytest

from jalsetu_planner.bridge import execute
from jalsetu_planner.public_roads import FIXTURES, SNAPSHOT, osrm_matrix
from jalsetu_planner.record_roads import review_records
from jalsetu_planner.schemas import PlanningInput


@pytest.fixture
def records():
    value = json.loads((FIXTURES / "north_delhi_example.json").read_text(encoding="utf-8"))
    value.update(data_mode="operator_entered", operational_source={"description": "SYNTHETIC TEST declaration, not actual records",
                 "recorded_date": "2026-10-10", "reviewed": True}, display_warning="TEST records, unverified")
    for row in [value["depot"], *value["vehicles"], *value["sites"]]:
        row["provenance"] = "operator_entered"
    value["travel_matrix"] = None
    return value


@pytest.fixture
def checked(records):
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    records["travel_matrix"] = osrm_matrix(snapshot, review_records(records))
    return records, snapshot


def test_review_returns_no_placeholder_routing(records):
    result = execute({"command": "review_records", "input": records}, local_operator=True)
    assert result["input"]["travel_matrix"] is None
    assert result["input"]["operational_source"]["reviewed"] is True
    assert records["travel_matrix"] is None


@pytest.mark.parametrize("damage", ["stock", "latitude", "large_area", "vehicles", "source", "review", "provenance", "rules", "quantities"])
def test_invalid_records_rejected_before_network(records, monkeypatch, damage):
    def forbidden(_):
        raise AssertionError("Invalid records must not make a provider request")
    monkeypatch.setattr("jalsetu_planner.record_roads.collect", forbidden)
    if damage == "stock": records["depot"]["available_stock_litres"] = None
    elif damage == "latitude": records["sites"][0]["location"]["latitude"] = None
    elif damage == "large_area": records["sites"][0]["location"]["longitude"] = 77.4
    elif damage == "vehicles": records["vehicles"] = []
    elif damage == "source": records["operational_source"]["description"] = " "
    elif damage == "review": records["operational_source"]["reviewed"] = False
    elif damage == "provenance": records["sites"][0]["provenance"] = "example"
    elif damage == "rules": records["loading_mode"] = None
    elif damage == "quantities": records["sites"][0]["requested_litres"] = 2511
    result = execute({"command": "fetch_roads", "input": records}, local_operator=True)
    assert "error" in result


def test_cloud_and_default_bridge_still_reject_operator_records(checked):
    records, snapshot = checked
    assert "error" in execute({"command": "validate", "input": records, "road_snapshot": snapshot, "local_operator": True})


@pytest.mark.parametrize("damage", ["missing", "matrix", "coordinates", "source_hash", "order"])
def test_plan_rejects_untrusted_or_stale_roads(checked, damage):
    records, snapshot = deepcopy(checked)
    if damage == "missing": snapshot = None
    elif damage == "matrix": records["travel_matrix"]["durations_seconds"][0][1] += 1
    elif damage == "coordinates": records["sites"][0]["location"]["longitude"] += .00001
    elif damage == "source_hash": snapshot["payload"]["distances"][0][1] += 1
    elif damage == "order": records["sites"][0], records["sites"][1] = records["sites"][1], records["sites"][0]
    result = execute({"command": "plan", "input": records, "road_snapshot": snapshot}, local_operator=True)
    assert "error" in result and "plans" not in result


def test_checked_local_plan_and_operations_use_frozen_roads(checked):
    records, snapshot = checked
    result = execute({"command": "plan", "input": records, "road_snapshot": snapshot}, local_operator=True)
    plan = result["plans"][0]
    assert plan["validation"]["valid"] and plan["approvable"]
    approved = execute({"command": "approve", "input": records, "road_snapshot": snapshot,
        "plan": plan, "actor": "Test reviewer", "operation_id": "TEST-RECORD-OP"}, local_operator=True)
    assert approved["operation"]["input"]["operational_source"] == records["operational_source"]
    assert approved["operation"]["input"]["travel_matrix"] == records["travel_matrix"]


def test_optional_record_source_does_not_change_historical_example_inputs():
    value = json.loads((FIXTURES / "north_delhi_example.json").read_text(encoding="utf-8"))
    assert PlanningInput.model_validate(value).model_dump(mode="json") == value


def test_successful_acquisition_retains_source_and_returns_only_real_matrix(records, monkeypatch):
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    monkeypatch.setattr("jalsetu_planner.record_roads.collect", lambda _: deepcopy(snapshot))
    result = execute({"command": "fetch_roads", "input": records}, local_operator=True)
    assert result["input"]["travel_matrix"]["provenance"] == "public_snapshot"
    assert result["input"]["travel_matrix"]["durations_seconds"][0][1] > 0
    assert result["input"]["operational_source"] == records["operational_source"]
    assert result["input"]["travel_matrix"]["represented_at"] is None
    assert records["travel_matrix"] is None


def test_provider_failure_returns_no_fallback_or_changed_records(records, monkeypatch):
    original = deepcopy(records)
    def unavailable(_):
        raise OSError("Provider unavailable")
    monkeypatch.setattr("jalsetu_planner.record_roads.collect", unavailable)
    result = execute({"command": "fetch_roads", "input": records}, local_operator=True)
    assert "error" in result and "input" not in result
    assert records == original
