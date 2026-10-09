"""Local JSON/stdin adapter. Not a cloud deployment or authentication provider."""

import json
import sys

from pydantic import ValidationError

from .fixtures import example_input
from .handler import STRATEGIES, plan
from .marginal import analyze, checked_options
from .operations import append_event, approve_revision, start_operation
from .replanning import replan_after_events
from .schemas import PlanningInput


def execute(message):
    """Shared example-only adapter for local and authenticated cloud entrypoints."""
    if message["command"] == "example":
        result = example_input("finish_by_close", "parallel")
        # No policy is chosen for the user. Both are required in the interface.
        result["service_window_policy"] = None
        result["loading_mode"] = None
        result["solver_time_limit_seconds"] = 20.0
    else:
        try:
            command = message["command"]
            payload = message.get("input") or message.get("operation", {}).get("input")
            data = PlanningInput.model_validate(payload)
            if data.data_mode != "example":
                raise ValueError("This local interface supports labelled example exercises only")
            if data.travel_matrix.provenance != "example":
                raise ValueError("Offline exercises require an example matrix; verified public routing integration is pending")
            if data.solver_time_limit_seconds > 20:
                raise ValueError("Local comparison supports a maximum 20-second allowance per strategy")
            if command in ("marginal", "validate_marginal"):
                options = checked_options(data, message.get("options"), message.get("parent_input"))
                result = {"options": options.model_dump(mode="json")} if command == "validate_marginal" else analyze(data, options, message["job_id"], message["parent_job_id"])
            elif command == "approve":
                result = {"operation": start_operation(payload, message["plan"], message["actor"], message["operation_id"])}
            elif command == "event":
                result = {"operation": append_event(message["operation"], message["event"])}
            elif command == "approve_revision":
                result = {"operation": approve_revision(message["operation"], message["actor"])}
            elif command == "replan":
                operation = message["operation"]
                parent = {**operation["approved_plan"], "vehicle_routes": operation["ledger_routes"]}
                result = {"revision": replan_after_events(data, parent, operation["events"], message["replan_at"])}
            elif command == "validate":
                result = {"input": data.model_dump(mode="json")}
            elif command in ("compare", "plan"):
                strategies = STRATEGIES if command == "compare" else ["jalsetu"]
                result = {"plans": [plan(data, strategy) for strategy in strategies]}
            else:
                raise ValueError("Unknown local command")
        except ValidationError as error:
            result = {"error": {"code": "INVALID_INPUT", "message": "Correct the input fields listed below", "details": [{"field": ".".join(map(str, e["loc"])), "message": e["msg"]} for e in error.errors(include_url=False)]}}
        except ValueError as error:
            result = {"error": {"code": "ACTION_REJECTED", "message": str(error)}}
        except (RuntimeError, OverflowError):
            result = {"error": {"code": "PLANNING_FAILED", "message": "The planner could not publish a checked result. Review inputs and retry."}}
    return result


def main():
    sys.stdout.write(json.dumps(execute(json.loads(sys.stdin.read()))))


if __name__ == "__main__":
    main()
