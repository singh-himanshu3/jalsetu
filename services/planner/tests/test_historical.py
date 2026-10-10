"""Synthetic dispatch/outcomes only. No actual coordinator or field evidence."""
import json
from copy import deepcopy
from datetime import timedelta

import pytest

from jalsetu_planner.bridge import execute
from jalsetu_planner.fixtures import example_input
from jalsetu_planner.historical import History, compare_history, replay, reported_outcomes
from jalsetu_planner.metrics import compute_metrics
from jalsetu_planner.public_roads import SNAPSHOT, osrm_matrix
from jalsetu_planner.schemas import PlanningInput
from jalsetu_planner.validator import validate_plan


@pytest.fixture
def data():
    value = example_input("finish_by_close", "parallel")
    value["solver_time_limit_seconds"] = 1
    return PlanningInput.model_validate(value)


@pytest.fixture
def history(data):
    return {"source_reference": "SYNTHETIC regression dispatch — no field records", "reviewed": True,
        "dispatch": [{"vehicle_name": data.vehicles[0].name, "sequence": 1, "point_name": data.sites[0].name,
            "planned_litres": 1000, "loading_started_at": data.depot.opens_at.isoformat()}], "deliveries": []}


def test_preserves_input_and_original_quantities_order(data, history):
    history["dispatch"].append({**history["dispatch"][0], "sequence": 2, "point_name": data.sites[1].name})
    original = deepcopy(history)
    rows = replay(data, History.model_validate(history))
    assert history == original
    assert [s["site_id"] for s in rows[0]["stops"]] == [data.sites[0].site_id, data.sites[1].site_id]
    assert [s["planned_litres"] for s in rows[0]["stops"]] == [1000, 1000]
    assert validate_plan(data, rows)["valid"]
    report = compare_history(data, history)
    assert report["comparison_ready"]
    assert report["original"]["imported_planned_litres"] == 2000
    assert not report["outcomes"]["points"]
    assert len(report["outcomes"]["missing_point_names"]) == len(data.sites)
    json.dumps(report)  # Includes serializable dated road metadata.


@pytest.mark.parametrize("damage", ["over_capacity", "increment", "early_loading", "late_loading", "below_minimum", "unconfirmed", "stock", "sequential"])
def test_invalid_original_is_not_repaired_or_promoted(data, history, damage):
    value = data.model_dump(mode="json")
    if damage == "over_capacity": history["dispatch"][0]["planned_litres"] = data.vehicles[0].capacity_litres+100
    elif damage == "increment": history["dispatch"][0]["planned_litres"] = 1001
    elif damage == "early_loading": history["dispatch"][0]["loading_started_at"] = (data.depot.opens_at-timedelta(minutes=1)).isoformat()
    elif damage == "late_loading": history["dispatch"][0]["loading_started_at"] = data.depot.closes_at.isoformat()
    elif damage == "below_minimum": history["dispatch"][0]["planned_litres"] = 100
    elif damage == "unconfirmed": value["sites"][0]["confirmation_status"] = "draft"
    elif damage == "stock": value["depot"]["available_stock_litres"] = 100
    else:
        value["loading_mode"] = "sequential"
        history["dispatch"].append({**history["dispatch"][0], "vehicle_name": data.vehicles[1].name, "point_name": data.sites[1].name})
    report = compare_history(PlanningInput.model_validate(value), history)
    assert not report["original"]["valid"] and report["original"]["issues"]
    assert report["original"]["metrics"] is None
    assert report["scheduled_difference_litres"] is None
    assert not report["comparison_ready"]
    assert report["original"]["imported_planned_litres"] == sum(r["planned_litres"] for r in history["dispatch"])


@pytest.mark.parametrize("damage", ["unknown_vehicle", "unknown_point", "duplicate_point", "sequence", "duplicate_sequence", "different_loading", "wrong_day", "naive_time", "unreviewed", "blank_reference", "ambiguous_names"])
def test_rejects_ambiguous_or_unsupported_records(data, history, damage):
    if damage == "unknown_vehicle": history["dispatch"][0]["vehicle_name"] = "UNKNOWN"
    elif damage == "unknown_point": history["dispatch"][0]["point_name"] = "UNKNOWN"
    elif damage == "duplicate_point": history["dispatch"].append(deepcopy(history["dispatch"][0]))
    elif damage == "sequence": history["dispatch"][0]["sequence"] = 2
    elif damage in ("duplicate_sequence", "different_loading"):
        history["dispatch"].append({**history["dispatch"][0], "point_name": data.sites[1].name,
            "sequence": 1 if damage == "duplicate_sequence" else 2,
            "loading_started_at": (data.depot.opens_at+timedelta(minutes=1)).isoformat()})
    elif damage == "wrong_day": history["dispatch"][0]["loading_started_at"] = (data.depot.opens_at-timedelta(days=1)).isoformat()
    elif damage == "naive_time": history["dispatch"][0]["loading_started_at"] = data.depot.opens_at.replace(tzinfo=None).isoformat()
    elif damage == "unreviewed": history["reviewed"] = False
    elif damage == "blank_reference": history["source_reference"] = "  "
    else:
        data = data.model_copy(deep=True)
        data.vehicles[1].name = data.vehicles[0].name
    with pytest.raises(ValueError): compare_history(data, history)


def test_losing_and_tied_results_retained(data, history, monkeypatch):
    routes = replay(data, History.model_validate(history))
    metrics = compute_metrics(data, routes)
    fake = {"approvable": True, "approval_blockers": [], "metrics": metrics, "vehicle_routes": routes, "site_results": [{"site_id": s.site_id, "scheduled_litres": 1000 if i == 0 else 0} for i, s in enumerate(data.sites)]}
    monkeypatch.setattr("jalsetu_planner.historical.plan", lambda *_: fake)
    assert compare_history(data, history)["scheduled_difference_litres"] == 0
    fake["metrics"] = {**metrics, "on_time_scheduled_litres": 500}
    assert compare_history(data, history)["scheduled_difference_litres"] == -500
    fake["approvable"] = False
    assert compare_history(data, history)["scheduled_difference_litres"] is None


def test_partial_outcomes_keep_exact_litres_and_unknown_points(data, history):
    history["deliveries"] = [{"point_name": data.sites[0].name, "delivered_litres": 713,
        "arrived_at": data.sites[0].opens_at.isoformat(), "finished_at": (data.sites[0].opens_at+timedelta(minutes=3)).isoformat()}]
    outcomes = reported_outcomes(data, History.model_validate(history).deliveries)
    assert outcomes["reported_litres"] == outcomes["on_time_reported_litres"] == 713
    assert len(outcomes["missing_point_names"]) == len(data.sites)-1
    assert not outcomes["issues"]


def test_closing_policy_and_zero_reports(data, history):
    history["deliveries"] = [{"point_name": data.sites[0].name, "delivered_litres": 713,
        "arrived_at": data.sites[0].closes_at.isoformat(), "finished_at": (data.sites[0].closes_at+timedelta(minutes=3)).isoformat()},
        {"point_name": data.sites[1].name, "delivered_litres": 0}]
    rows = History.model_validate(history).deliveries
    assert reported_outcomes(data, rows)["on_time_reported_litres"] == 0
    assert reported_outcomes(data.model_copy(update={"service_window_policy": "start_by_close"}), rows)["on_time_reported_litres"] == 713
    assert len(reported_outcomes(data, rows)["missing_point_names"]) == len(data.sites)-2


@pytest.mark.parametrize("damage", ["missing_time", "backwards", "wrong_day", "duplicate", "unknown", "fractional"])
def test_outcomes_reject_invalid_records(data, history, damage):
    row = {"point_name": data.sites[0].name, "delivered_litres": 713,
        "arrived_at": data.sites[0].opens_at.isoformat(), "finished_at": data.sites[0].closes_at.isoformat()}
    history["deliveries"] = [row]
    if damage == "missing_time": row["finished_at"] = None
    elif damage == "backwards": row["finished_at"] = (data.sites[0].opens_at-timedelta(minutes=1)).isoformat()
    elif damage == "wrong_day": row["finished_at"] = (data.sites[0].closes_at+timedelta(days=1)).isoformat()
    elif damage == "duplicate": history["deliveries"].append(deepcopy(row))
    elif damage == "unknown": row["point_name"] = "UNKNOWN"
    else: row["delivered_litres"] = 1.5
    with pytest.raises(ValueError): compare_history(data, history)


def test_reported_over_supply_is_flagged_not_silently_changed(data, history):
    history["deliveries"] = [{"point_name": data.sites[0].name, "delivered_litres": 20000,
        "arrived_at": data.sites[0].opens_at.isoformat(), "finished_at": data.sites[0].closes_at.isoformat()}]
    outcomes = reported_outcomes(data, History.model_validate(history).deliveries)
    assert outcomes["reported_litres"] == 20000
    assert len(outcomes["issues"]) == 2


def test_no_missing_leg_fallback(data, history):
    data.travel_matrix.durations_seconds[0][1] = None
    with pytest.raises(ValueError, match="unavailable"): replay(data, History.model_validate(history))


def test_trusted_local_only_and_saved_public_roads_required(data, history):
    value = data.model_dump(mode="json")
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    value["travel_matrix"] = osrm_matrix(snapshot, data)
    value.update(data_mode="operator_entered", display_warning="SYNTHETIC test declarations",
        operational_source={"description": "SYNTHETIC regression", "recorded_date": str(data.operating_date), "reviewed": True})
    for entity in [value["depot"], *value["vehicles"], *value["sites"]]: entity["provenance"] = "operator_entered"
    message = {"command": "compare_history", "input": value, "history": history, "road_snapshot": snapshot}
    assert "error" in execute(message)
    assert "report" in execute(message, local_operator=True)
    assert "error" in execute({**message, "road_snapshot": None}, local_operator=True)
