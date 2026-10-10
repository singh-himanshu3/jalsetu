"""Receiving-point availability must never change physical water accounting."""

from copy import deepcopy

import pytest
from pydantic import ValidationError

from jalsetu_planner.fixtures import example_input
from jalsetu_planner.handler import plan
from jalsetu_planner.operations import append_event, approve_revision, start_operation
from jalsetu_planner.replanning import replan_after_events, validate_revision
from jalsetu_planner.schemas import PlanningInput


def exercise():
    payload = example_input("finish_by_close", "parallel")
    return start_operation(payload, plan(PlanningInput.model_validate(payload)), "Closure check", "CLOSURE-TEST")


def report(state, kind, payload, at=None, key=None):
    return append_event(state, {"event_type": kind, "payload": payload,
                               "occurred_at": at or state["input"]["depot"]["opens_at"],
                               "idempotency_key": key or f"report-{len(state['events'])}"})


def draft(state, at=None):
    parent = {**state["approved_plan"], "vehicle_routes": state["ledger_routes"]}
    return replan_after_events(PlanningInput.model_validate(state["input"]), parent, state["events"],
                               at or state["events"][-1]["occurred_at"])


def physical(ledger):
    return {key: ledger[key] for key in ("depot_litres", "vehicles", "reported_delivered_litres",
                                       "initial_stock_litres", "stock_adjustments_litres", "conservation_valid")}


def test_closure_is_idempotent_and_preserves_stock_and_original_input():
    state = exercise()
    site = state["approved_plan"]["vehicle_routes"][0]["stops"][0]["site_id"]
    closed = report(state, "site_closed", {"site_id": site}, key="close")
    assert closed["ledger"]["closed_site_ids"] == [site]
    assert physical(closed["ledger"]) == physical(state["ledger"])
    assert closed["input"] == state["input"] and closed["initial_plan"] == state["initial_plan"]
    assert append_event(closed, closed["events"][-1]) == closed
    assert closed["ledger"]["history"][-1]["physical_total_litres"] == 12000
    with pytest.raises(ValueError, match="already closed"):
        report(closed, "site_closed", {"site_id": site})
    conflict = {**closed["events"][-1], "event_type": "site_reopened"}
    with pytest.raises(ValueError, match="IDEMPOTENCY_CONFLICT"):
        append_event(closed, conflict)


def test_affected_old_route_cannot_load_until_replanned_or_reopened():
    state = exercise()
    route = state["approved_plan"]["vehicle_routes"][0]
    site = route["stops"][0]["site_id"]
    closed = report(state, "site_closed", {"site_id": site})
    with pytest.raises(ValueError, match="Update the approved plan"):
        report(closed, "vehicle_loaded", {"vehicle_id": route["vehicle_id"], "litres": route["planned_load_litres"]})
    reopened = report(closed, "site_reopened", {"site_id": site})
    assert reopened["ledger"]["closed_site_ids"] == []
    assert physical(reopened["ledger"]) == physical(state["ledger"])
    loaded = report(reopened, "vehicle_loaded", {"vehicle_id": route["vehicle_id"], "litres": route["planned_load_litres"]})
    assert loaded["ledger"]["vehicles"][route["vehicle_id"]]["loaded"]


def test_revision_excludes_closed_point_keeps_full_request_and_can_be_approved():
    state = exercise()
    site = state["approved_plan"]["vehicle_routes"][0]["stops"][0]["site_id"]
    closed = report(state, "site_closed", {"site_id": site})
    candidate = draft(closed)
    assert all(stop["site_id"] != site for route in candidate["vehicle_routes"] for stop in route["stops"])
    row = next(row for row in candidate["site_results"] if row["site_id"] == site)
    assert row["scheduled_litres"] == 0 and row["unmet_litres"] == row["requested_litres"]
    assert "reopening" in row["reason"]
    assert candidate["revision_accounting"]["original_confirmed_requested_litres"] == sum(
        row["requested_litres"] for row in state["input"]["sites"] if row["confirmation_status"] == "confirmed")
    closed["revision_draft"] = candidate
    approved = approve_revision(closed, "Closure coordinator")
    assert approved["ledger"] == closed["ledger"] and approved["events"] == closed["events"]
    assert draft(approved)["stock_ledger"]["closed_site_ids"] == [site]
    reopened = report(approved, "site_reopened", {"site_id": site})
    reopened_candidate = draft(reopened)
    pending_site = next(row for row in reopened_candidate["pending_input_snapshot"]["sites"] if row["site_id"] == site)
    assert pending_site["confirmation_status"] == "confirmed"
    assert any(stop["site_id"] == site for route in reopened_candidate["vehicle_routes"] for stop in route["stops"])
    reopened["revision_draft"] = reopened_candidate
    approved_again = approve_revision(reopened, "Reopening coordinator")
    assert approved_again["ledger"] == reopened["ledger"]


def test_closure_after_partial_delivery_preserves_reports_and_active_vehicle_guard():
    state = exercise()
    route = state["approved_plan"]["vehicle_routes"][0]
    stop = route["stops"][0]
    vehicle = route["vehicle_id"]
    state = report(state, "vehicle_loaded", {"vehicle_id": vehicle, "litres": route["planned_load_litres"]})
    state = report(state, "delivery_reported", {"vehicle_id": vehicle, "site_id": stop["site_id"], "litres": 100}, stop["estimated_departure"])
    earlier = deepcopy(state["events"][-1])
    closed = report(state, "site_closed", {"site_id": stop["site_id"]}, stop["estimated_departure"])
    assert physical(closed["ledger"]) == physical(state["ledger"])
    assert append_event(closed, earlier) == closed
    with pytest.raises(ValueError, match="closed; record its reopening"):
        report(closed, "delivery_reported", {"vehicle_id": vehicle, "site_id": stop["site_id"], "litres": 200}, stop["estimated_departure"])
    with pytest.raises(ValueError, match="In-progress vehicles"):
        draft(closed)
    failed = report(closed, "vehicle_failed", {"vehicle_id": vehicle}, stop["estimated_departure"])
    candidate = draft(failed)
    assert candidate["fixed_reported_deliveries"] == {stop["site_id"]: 100}
    row = next(row for row in candidate["site_results"] if row["site_id"] == stop["site_id"])
    assert row["unmet_litres"] == row["requested_litres"] - 100
    assert "closed" in row["reason"] and "earlier reported delivery is preserved" in row["reason"]
    failed["revision_draft"] = candidate
    revised = approve_revision(failed, "Preserve reports")
    assert revised["ledger"] == failed["ledger"]
    reopened = report(revised, "site_reopened", {"site_id": stop["site_id"]}, stop["estimated_departure"])
    assert all(s["site_id"] != stop["site_id"] for r in draft(reopened)["vehicle_routes"] for s in r["stops"])
    assert reopened["ledger"]["reported_delivered_litres"][stop["site_id"]] == 100


def test_new_availability_report_invalidates_draft_and_tampered_closed_stop_is_rejected():
    state = exercise()
    site = state["approved_plan"]["vehicle_routes"][0]["stops"][0]["site_id"]
    state["revision_draft"] = {"stale": True}
    closed = report(state, "site_closed", {"site_id": site})
    assert "revision_draft" not in closed
    closed["revision_draft"] = draft(closed)
    forged = deepcopy(closed["revision_draft"])
    forged["vehicle_routes"][0]["stops"][0]["site_id"] = site
    original = PlanningInput.model_validate(closed["input"])
    assert "CLOSED_SITE_RESCHEDULED" in validate_revision(original, closed["approved_plan"], closed["events"], forged)["errors"]
    broken = {**closed, "revision_draft": forged}
    with pytest.raises(ValueError, match="no longer matches"):
        approve_revision(broken, "Cannot approve")
    assert "revision_draft" not in report(closed, "site_reopened", {"site_id": site})


@pytest.mark.parametrize("kind,payload", [
    ("site_closed", {}), ("site_closed", {"site_id": "SITE-1", "litres": 100}),
    ("site_reopened", {"site_id": "SITE-1", "vehicle_id": "VEH-1"}),
])
def test_site_reports_reject_unrelated_or_missing_fields(kind, payload):
    with pytest.raises(ValidationError):
        report(exercise(), kind, payload)


def test_unknown_point_open_point_and_out_of_order_reports_are_rejected():
    state = exercise()
    site = state["input"]["sites"][0]["site_id"]
    with pytest.raises(ValueError, match="Unknown receiving point"):
        report(state, "site_closed", {"site_id": "UNKNOWN"})
    with pytest.raises(ValueError, match="not closed"):
        report(state, "site_reopened", {"site_id": site})
    closed = report(state, "site_closed", {"site_id": site}, "2026-10-10T09:00:00+05:30")
    with pytest.raises(ValueError, match="chronological"):
        report(closed, "site_reopened", {"site_id": site}, "2026-10-10T08:00:00+05:30")


def test_legacy_ledger_shape_stays_unchanged_without_site_reports():
    state = exercise()
    assert "closed_site_ids" not in state["ledger"]
    assert "closed_site_ids" not in report(state, "depot_stock_adjusted", {"delta_litres": 100})["ledger"]


def test_all_points_closed_produces_no_dispatch_and_reopening_one_keeps_others_closed():
    state = exercise()
    for site in state["input"]["sites"]:
        state = report(state, "site_closed", {"site_id": site["site_id"]})
    candidate = draft(state)
    assert candidate["vehicle_routes"] == [] and candidate["revision_validation"]["valid"]
    assert candidate["revision_accounting"]["additional_scheduled_litres"] == 0
    assert all(row["unmet_litres"] == row["requested_litres"] for row in candidate["site_results"])
    state["revision_draft"] = candidate
    assert not candidate["approvable"]
    with pytest.raises(ValueError, match="cannot be approved"):
        approve_revision(state, "No receiving points available")
    assert state["ledger"]["depot_litres"] == 12000
    site = state["input"]["sites"][0]["site_id"]
    reopened = report(state, "site_reopened", {"site_id": site})
    assert "revision_draft" not in reopened
    assert len(reopened["ledger"]["closed_site_ids"]) == len(state["input"]["sites"]) - 1
    assert all(stop["site_id"] == site for route in draft(reopened)["vehicle_routes"] for stop in route["stops"])
