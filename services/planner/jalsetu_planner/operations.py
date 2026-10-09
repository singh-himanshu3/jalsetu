"""Local approvals and immutable events. This is not an identity provider."""

import hashlib
import json
from copy import deepcopy
from datetime import UTC, datetime

from .ledger import derive_ledger
from .replanning import validate_revision
from .schemas import OperationalEvent, PlanningInput
from .validator import validate_plan


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def checked_approval(data, candidate, actor):
    if not isinstance(actor, str) or not actor.strip() or len(actor) > 120:
        raise ValueError("Enter a coordinator label (1–120 characters)")
    if not candidate.get("approvable") or not candidate["validation"]["valid"]:
        raise ValueError("This result cannot be approved")
    if candidate["input_snapshot_sha256"] != digest(data.model_dump(mode="json")):
        raise ValueError("Plan does not match the saved input")
    validation = validate_plan(data, candidate["vehicle_routes"])
    if not validation["valid"]:
        raise ValueError("Independent approval validation failed")
    return {"actor": actor.strip(), "approved_at": datetime.now(UTC).isoformat(),
            "input_snapshot_sha256": candidate["input_snapshot_sha256"],
            "validation_sha256": digest(validation), "authentication": "local coordinator label; not authenticated"}


def start_operation(payload, candidate, actor, operation_id):
    data = PlanningInput.model_validate(payload)
    approval = checked_approval(data, candidate, actor)
    return {"operation_id": operation_id, "version": 1, "input": data.model_dump(mode="json"),
            "approved_plan": deepcopy(candidate), "ledger_routes": deepcopy(candidate["vehicle_routes"]),
            "initial_plan": deepcopy(candidate),
            "events": [], "ledger": derive_ledger(data, candidate["vehicle_routes"], []),
            "approvals": [{**approval, "plan_revision": 1}], "revisions": [], "current_plan_revision": 1}


def append_event(operation, event):
    next_state = deepcopy(operation)
    event = OperationalEvent.model_validate(event).model_dump(mode="json", exclude_none=True)
    for existing in operation["events"]:
        if existing["idempotency_key"] == event["idempotency_key"]:
            if existing != event:
                raise ValueError("IDEMPOTENCY_CONFLICT")
            return next_state
    next_state["events"].append(deepcopy(event))
    data = PlanningInput.model_validate(operation["input"])
    next_state["ledger"] = derive_ledger(data, operation["ledger_routes"], next_state["events"])
    next_state["version"] += 1
    next_state.pop("revision_draft", None)  # A new event makes an older draft stale.
    return next_state


def approve_revision(operation, actor):
    candidate = operation.get("revision_draft")
    if not candidate:
        raise ValueError("No current revision draft; generate one after the latest event")
    original = PlanningInput.model_validate(operation["input"])
    parent = {**operation["approved_plan"], "vehicle_routes": operation["ledger_routes"]}
    check = validate_revision(original, parent, operation["events"], candidate)
    if not check["valid"]:
        raise ValueError("Revision no longer matches recorded events")
    pending = PlanningInput.model_validate(candidate["pending_input_snapshot"])
    approval = checked_approval(pending, candidate, actor)
    next_state = deepcopy(operation)
    # Each vehicle has at most one trip. Once loaded, its historical assignments
    # remain immutable; only unused vehicles take routes from the new revision.
    kept = [r for r in operation["ledger_routes"] if operation["ledger"]["vehicles"][r["vehicle_id"]]["loaded"]]
    combined = kept + deepcopy(candidate["vehicle_routes"])
    rederived = derive_ledger(original, combined, operation["events"])
    if rederived != operation["ledger"]:
        raise ValueError("Approval would change historical water accounting")
    next_state["revisions"].append(deepcopy(candidate))
    next_state["current_plan_revision"] += 1
    next_state["approvals"].append({**approval, "plan_revision": next_state["current_plan_revision"]})
    next_state["approved_plan"] = deepcopy(candidate)
    next_state["ledger_routes"] = combined
    next_state["version"] += 1
    next_state.pop("revision_draft", None)
    return next_state
