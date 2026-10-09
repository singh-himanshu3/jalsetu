from copy import deepcopy

import pytest

from jalsetu_planner.fixtures import example_input
from jalsetu_planner.handler import plan
from jalsetu_planner.replanning import replan_after_events, validate_revision
from jalsetu_planner.schemas import PlanningInput


def failure_scenario():
    data = PlanningInput.model_validate(example_input("finish_by_close", "parallel"))
    approved = plan(data)
    route = approved["vehicle_routes"][0]
    stop = route["stops"][0]
    events = [
        {"idempotency_key": "load", "occurred_at": route["loading_started_at"], "event_type": "vehicle_loaded", "payload": {"vehicle_id": route["vehicle_id"], "litres": route["planned_load_litres"]}},
        {"idempotency_key": "deliver", "occurred_at": stop["estimated_departure"], "event_type": "delivery_reported", "payload": {"vehicle_id": route["vehicle_id"], "site_id": stop["site_id"], "litres": stop["planned_litres"]}},
        {"idempotency_key": "fail", "occurred_at": stop["estimated_departure"], "event_type": "vehicle_failed", "payload": {"vehicle_id": route["vehicle_id"]}},
    ]
    return data, approved, route, stop, events


def test_valid_revision_preserves_delivery_without_reusing_stranded_water():
    data, approved, route, stop, events = failure_scenario()
    revised = replan_after_events(data, approved, events, events[-1]["occurred_at"])
    assert revised["validation"]["valid"] and revised["revision_validation"]["valid"]
    assert revised["fixed_reported_deliveries"][stop["site_id"]] == stop["planned_litres"]
    assert all(r["vehicle_id"] != route["vehicle_id"] for r in revised["vehicle_routes"])
    assert revised["metrics"]["on_time_scheduled_litres"] <= data.depot.available_stock_litres - route["planned_load_litres"]
    assert all(s["site_id"] != stop["site_id"] for r in revised["vehicle_routes"] for s in r["stops"])
    accounting = revised["revision_accounting"]
    assert accounting["remaining_unmet_requested_litres"] == sum(s.requested_litres for s in data.sites) - stop["planned_litres"] - accounting["additional_scheduled_litres"]
    completed_site = next(s for s in revised["site_results"] if s["site_id"] == stop["site_id"])
    assert completed_site["unmet_litres"] == completed_site["requested_litres"] - stop["planned_litres"]


def test_revision_validator_detects_erased_completed_work():
    data, approved, _, _, events = failure_scenario()
    revised = replan_after_events(data, approved, events, events[-1]["occurred_at"])
    revised["fixed_reported_deliveries"] = {}
    assert "COMPLETED_DELIVERY_NOT_PRESERVED" in validate_revision(data, approved, events, revised)["errors"]


def test_active_vehicle_is_not_teleported_to_depot():
    data, approved, _, _, events = failure_scenario()
    with pytest.raises(ValueError, match="In-progress"):
        replan_after_events(data, approved, events[:-1], events[-1]["occurred_at"])


def test_loaded_water_does_not_automatically_become_available_after_failure():
    data, approved, route, stop, events = failure_scenario()
    revised = replan_after_events(data, approved, events, events[-1]["occurred_at"])
    stranded = route["planned_load_litres"] - stop["planned_litres"]
    recovered = deepcopy(events)
    recovered.append({"idempotency_key": "recover", "occurred_at": events[-1]["occurred_at"], "event_type": "water_recovered", "payload": {"vehicle_id": route["vehicle_id"], "litres": stranded}})
    next_revision = replan_after_events(data, approved, recovered, recovered[-1]["occurred_at"])
    assert next_revision["stock_ledger"]["depot_litres"] == revised["stock_ledger"]["depot_litres"] + stranded


def test_exact_physical_stock_keeps_an_explicit_planning_remainder():
    data = PlanningInput.model_validate(example_input("finish_by_close", "parallel"))
    approved = plan(data)
    events = [{"idempotency_key": "measured-stock", "occurred_at": data.depot.opens_at.isoformat(), "event_type": "depot_stock_adjusted", "payload": {"delta_litres": -37}}]
    revision = replan_after_events(data, approved, events, events[0]["occurred_at"])
    assert revision["stock_ledger"]["depot_litres"] == 11963
    assert revision["planning_stock_litres"] == 11900
    assert revision["rounding_reserve_litres"] == 63
    assert revision["metrics"]["on_time_scheduled_litres"] <= 11900
