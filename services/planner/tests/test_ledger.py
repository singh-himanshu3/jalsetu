from copy import deepcopy

import pytest

from jalsetu_planner.fixtures import example_input
from jalsetu_planner.handler import plan
from jalsetu_planner.ledger import derive_ledger
from jalsetu_planner.schemas import PlanningInput


def event(key, minute, kind, **payload):
    return {"idempotency_key": key, "occurred_at": f"2026-10-10T04:{minute:02d}:00+00:00", "event_type": kind, "payload": payload}


def setup():
    data = PlanningInput.model_validate(example_input("finish_by_close", "parallel"))
    routes = plan(data)["vehicle_routes"]
    route = routes[0]
    stop = route["stops"][0]
    events = [event("load", 0, "vehicle_loaded", vehicle_id=route["vehicle_id"], litres=route["planned_load_litres"]), event("deliver", 20, "delivery_reported", vehicle_id=route["vehicle_id"], site_id=stop["site_id"], litres=stop["planned_litres"])]
    return data, routes, route, stop, events


def test_failure_after_delivery_strands_stock_and_keeps_completion():
    data, routes, route, stop, events = setup()
    events.append(event("failure", 21, "vehicle_failed", vehicle_id=route["vehicle_id"]))
    state = derive_ledger(data, routes, events)
    assert state["reported_delivered_litres"][stop["site_id"]] == stop["planned_litres"]
    stranded = route["planned_load_litres"] - stop["planned_litres"]
    assert state["vehicles"][route["vehicle_id"]]["stranded_litres"] == stranded
    assert state["depot_litres"] == data.depot.available_stock_litres - route["planned_load_litres"]
    assert state["conservation_valid"]


def test_duplicate_completion_does_not_consume_twice():
    data, routes, _, _, events = setup()
    first = derive_ledger(data, routes, events)
    second = derive_ledger(data, routes, events + [events[-1]])
    assert first == second
    # A repeated cumulative report with a new key is also not additional water.
    repeated = deepcopy(events[-1])
    repeated["idempotency_key"] = "another-report"
    third = derive_ledger(data, routes, events + [repeated])
    assert first["reported_delivered_litres"] == third["reported_delivered_litres"]


def test_recovery_is_explicit_and_bounded():
    data, routes, route, stop, events = setup()
    events.append(event("failure", 21, "vehicle_failed", vehicle_id=route["vehicle_id"]))
    stranded = route["planned_load_litres"] - stop["planned_litres"]
    events.append(event("recover", 30, "water_recovered", vehicle_id=route["vehicle_id"], litres=stranded))
    state = derive_ledger(data, routes, events)
    assert state["vehicles"][route["vehicle_id"]]["stranded_litres"] == 0
    assert state["depot_litres"] == data.depot.available_stock_litres - stop["planned_litres"]
    events[-1]["payload"]["litres"] = stranded + 1
    with pytest.raises(ValueError, match="Recovery"):
        derive_ledger(data, routes, events)


def test_reused_key_with_different_payload_is_rejected():
    data, routes, _, _, events = setup()
    corrupted = deepcopy(events[-1])
    corrupted["payload"]["litres"] -= 100
    with pytest.raises(ValueError, match="IDEMPOTENCY_CONFLICT"):
        derive_ledger(data, routes, events + [corrupted])


def test_approval_alone_does_not_remove_depot_stock():
    data, routes, _, _, _ = setup()
    state = derive_ledger(data, routes, [])
    assert state["depot_litres"] == data.depot.available_stock_litres


def test_delivery_before_loading_and_negative_adjustment_are_rejected():
    data, routes, _, _, events = setup()
    with pytest.raises(ValueError, match="loaded"):
        derive_ledger(data, routes, [events[-1]])
    with pytest.raises(ValueError, match="negative"):
        derive_ledger(data, routes, [event("loss", 0, "depot_stock_adjusted", delta_litres=-20000)])
