"""Conservative depot-based revisions. Never teleport an in-progress vehicle."""

from datetime import datetime

from .handler import plan
from .ledger import derive_ledger
from .schemas import PlanningInput


def pending_input_after_events(original, approved_plan, events, replan_at):
    """Derive the exact revision input without running the solver."""
    if not approved_plan["validation"]["valid"]:
        raise ValueError("Cannot revise an invalid plan")
    ledger = derive_ledger(original, approved_plan["vehicle_routes"], events)
    when = datetime.fromisoformat(replan_at)
    if when.tzinfo is None:
        raise ValueError("Replan time needs an explicit timezone")
    if events and when < max(datetime.fromisoformat(e["occurred_at"]) for e in events):
        raise ValueError("Replan time precedes recorded events")
    if when >= original.depot.closes_at:
        raise ValueError("The declared depot operating window has ended")
    for vehicle in ledger["vehicles"].values():
        if not vehicle["failed"] and not vehicle["at_depot"]:
            raise ValueError("In-progress vehicles need their current position and fixed remaining stops; depot-based revision is blocked")
    payload = original.model_dump(mode="json")
    # Physical reports remain exact. Only complete configured planning units
    # can be dispatched; explicitly retain any remainder at the depot.
    rounding_reserve = ledger["depot_litres"] % original.increment_litres
    payload["depot"]["available_stock_litres"] = ledger["depot_litres"] - rounding_reserve
    payload["depot"]["opens_at"] = max(original.depot.opens_at, when).isoformat()
    fixed = ledger["reported_delivered_litres"]
    for vehicle in payload["vehicles"]:
        state = ledger["vehicles"][vehicle["vehicle_id"]]
        if state["failed"] or state["trip_completed"]:
            vehicle["status"] = "unavailable"
    for site in payload["sites"]:
        if fixed[site["site_id"]] > 0:
            # Completed stops stay fixed and are not silently given a second visit.
            site["confirmation_status"] = "draft"
    pending_input = PlanningInput.model_validate(payload)
    return pending_input, ledger, rounding_reserve


def replan_after_events(original, approved_plan, events, replan_at):
    pending_input, ledger, rounding_reserve = pending_input_after_events(original, approved_plan, events, replan_at)
    payload = pending_input.model_dump(mode="json")
    fixed = ledger["reported_delivered_litres"]
    revision = plan(pending_input)
    revision["fixed_reported_deliveries"] = {key: litres for key, litres in fixed.items() if litres > 0}
    revision["stock_ledger"] = ledger
    revision["planning_stock_litres"] = payload["depot"]["available_stock_litres"]
    revision["rounding_reserve_litres"] = rounding_reserve
    revision["pending_input_snapshot"] = pending_input.model_dump(mode="json")
    revision["parent_input_snapshot_sha256"] = approved_plan["input_snapshot_sha256"]
    for result in revision["site_results"]:
        completed = fixed[result["site_id"]]
        result["reported_delivered_litres"] = completed
        result["remaining_unmet_litres"] = result["requested_litres"] - result["scheduled_litres"] - completed
        result["unmet_litres"] = result["remaining_unmet_litres"]
        if completed:
            result["reason"] = "Reported completed visit is preserved; a second visit is outside this depot-based revision"
    revision["metrics_scope"] = "pending_routes_only; preserved reports are accounted for separately"
    confirmed = [s for s in original.sites if s.confirmation_status == "confirmed"]
    requested = sum(s.requested_litres for s in confirmed)
    reported = sum(fixed[s.site_id] for s in confirmed)
    scheduled = revision["metrics"]["on_time_scheduled_litres"]
    revision["revision_accounting"] = {"original_confirmed_requested_litres": requested,
                                       "reported_delivered_litres": reported,
                                       "additional_scheduled_litres": scheduled,
                                       "remaining_unmet_requested_litres": requested - reported - scheduled}
    revision["service_completeness"] = "partial" if requested > reported + scheduled else "complete"
    revision["explanation"] = (f"Schedules {scheduled:,} additional modelled litres. Preserves {reported:,} litres as coordinator-reported deliveries. "
                               f"{requested - reported - scheduled:,} litres remain unmet after those reports and this draft. "
                               "Reports are not independently verified; global optimality is not proved.")
    if rounding_reserve:
        revision["limitations"].append(f"{rounding_reserve} physical litres remain at the depot outside complete {original.increment_litres}-litre planning units")
    validation = validate_revision(original, approved_plan, events, revision)
    if not validation["valid"]:
        raise ValueError("Revision accounting failed: " + ",".join(validation["errors"]))
    revision["revision_validation"] = validation
    revision["limitations"].append("Depot-based revision supports unused vehicles only; active routes require explicit position/fixed-stop handling")
    return revision


def validate_revision(original, approved_plan, events, revision):
    ledger = derive_ledger(original, approved_plan["vehicle_routes"], events)
    errors = []
    expected = {key: amount for key, amount in ledger["reported_delivered_litres"].items() if amount > 0}
    if revision.get("fixed_reported_deliveries") != expected:
        errors.append("COMPLETED_DELIVERY_NOT_PRESERVED")
    if revision.get("stock_ledger") != ledger:
        errors.append("LEDGER_MISMATCH")
    reserve = ledger["depot_litres"] % original.increment_litres
    if revision.get("rounding_reserve_litres") != reserve or revision.get("planning_stock_litres") != ledger["depot_litres"] - reserve:
        errors.append("PLANNING_STOCK_ROUNDING_MISMATCH")
    scheduled = 0
    for route in revision["vehicle_routes"]:
        state = ledger["vehicles"][route["vehicle_id"]]
        if state["failed"] or state["trip_completed"] or not state["at_depot"]:
            errors.append("UNAVAILABLE_REVISION_VEHICLE")
        for stop in route["stops"]:
            if stop["site_id"] in expected:
                errors.append("COMPLETED_SITE_RESCHEDULED")
            scheduled += stop["planned_litres"]
    if scheduled > ledger["depot_litres"]:
        errors.append("STRANDED_OR_CONSUMED_STOCK_REUSED")
    requested = sum(s.requested_litres for s in original.sites if s.confirmation_status == "confirmed")
    reported = sum(ledger["reported_delivered_litres"][s.site_id] for s in original.sites if s.confirmation_status == "confirmed")
    expected_accounting = {"original_confirmed_requested_litres": requested, "reported_delivered_litres": reported,
                           "additional_scheduled_litres": scheduled, "remaining_unmet_requested_litres": requested - reported - scheduled}
    if revision.get("revision_accounting") != expected_accounting:
        errors.append("REVISION_METRICS_MISMATCH")
    return {"valid": not errors, "errors": errors}
