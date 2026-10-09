from copy import deepcopy

import pytest
from pydantic import ValidationError

from jalsetu_planner.fixtures import example_input
from jalsetu_planner.handler import plan
from jalsetu_planner.operations import append_event, approve_revision, start_operation
from jalsetu_planner.replanning import replan_after_events
from jalsetu_planner.schemas import PlanningInput


def exercise():
    payload = example_input("finish_by_close", "parallel")
    candidate = plan(PlanningInput.model_validate(payload))
    return start_operation(payload, candidate, "Automated test coordinator", "TEST-OP")


def test_approval_rechecks_input_and_keeps_stock_at_depot():
    state = exercise()
    assert state["ledger"]["depot_litres"] == 12000 and not state["events"]
    assert state["approvals"][0]["authentication"].startswith("local")
    payload = deepcopy(state["input"])
    payload["depot"]["available_stock_litres"] = 11000
    with pytest.raises(ValueError, match="saved input"):
        start_operation(payload, state["approved_plan"], "test", "bad")


def test_revision_approval_preserves_history_and_can_load_unused_vehicle():
    state = exercise()
    route = state["approved_plan"]["vehicle_routes"][0]
    stop = route["stops"][0]
    at = stop["estimated_departure"]
    events = [
        {"event_type": "vehicle_loaded", "idempotency_key": "load", "occurred_at": route["loading_started_at"], "payload": {"vehicle_id": route["vehicle_id"], "litres": route["planned_load_litres"]}},
        {"event_type": "delivery_reported", "idempotency_key": "delivery", "occurred_at": at, "payload": {"vehicle_id": route["vehicle_id"], "site_id": stop["site_id"], "litres": stop["planned_litres"]}},
        {"event_type": "vehicle_failed", "idempotency_key": "failure", "occurred_at": at, "payload": {"vehicle_id": route["vehicle_id"]}},
    ]
    for item in events:
        state = append_event(state, item)
    original_ledger = deepcopy(state["ledger"])
    state["revision_draft"] = replan_after_events(PlanningInput.model_validate(state["input"]), state["approved_plan"], state["events"], at)
    approved = approve_revision(state, "Revision test")
    assert approved["ledger"] == original_ledger
    assert approved["events"] == state["events"]
    assert approved["initial_plan"] == state["initial_plan"]
    assert approved["current_plan_revision"] == 2
    new_route = approved["approved_plan"]["vehicle_routes"][0]
    assert new_route["vehicle_id"] != route["vehicle_id"]
    next_state = append_event(approved, {"event_type": "vehicle_loaded", "idempotency_key": "new-load", "occurred_at": new_route["loading_started_at"], "payload": {"vehicle_id": new_route["vehicle_id"], "litres": new_route["planned_load_litres"]}})
    assert next_state["ledger"]["depot_litres"] == original_ledger["depot_litres"] - new_route["planned_load_litres"]
    assert next_state["ledger"]["conservation_valid"]


def test_event_retries_are_idempotent_and_conflicts_rejected():
    state = exercise()
    event = {"event_type": "depot_stock_adjusted", "idempotency_key": "stock", "occurred_at": "2026-10-10T07:00:00+05:30", "payload": {"delta_litres": -100}}
    once = append_event(state, event)
    assert append_event(once, event) == once
    assert state["ledger"]["depot_litres"] == 12000
    event["payload"]["delta_litres"] = -200
    with pytest.raises(ValueError, match="IDEMPOTENCY_CONFLICT"):
        append_event(once, event)


@pytest.mark.parametrize("payload", [{"vehicle_id": "VEH-1", "litres": 100}, {"vehicle_id": "VEH-1", "unknown": 1}, {"vehicle_id": "VEH-1", "litres": "100"}])
def test_malformed_failure_payload_rejected(payload):
    with pytest.raises(ValidationError):
        append_event(exercise(), {"event_type": "vehicle_failed", "idempotency_key": "bad", "occurred_at": "2026-10-10T07:00:00+05:30", "payload": payload})


def test_delivery_after_return_rejected():
    state = exercise()
    route = state["approved_plan"]["vehicle_routes"][0]
    state = append_event(state, {"event_type": "vehicle_loaded", "idempotency_key": "load", "occurred_at": route["loading_started_at"], "payload": {"vehicle_id": route["vehicle_id"], "litres": route["planned_load_litres"]}})
    state = append_event(state, {"event_type": "vehicle_returned", "idempotency_key": "return", "occurred_at": route["estimated_return"], "payload": {"vehicle_id": route["vehicle_id"]}})
    with pytest.raises(ValueError, match="active loaded"):
        append_event(state, {"event_type": "delivery_reported", "idempotency_key": "late", "occurred_at": route["estimated_return"], "payload": {"vehicle_id": route["vehicle_id"], "site_id": route["stops"][0]["site_id"], "litres": 100}})
