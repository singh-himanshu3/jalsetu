import argparse
import json
from pathlib import Path

from pydantic import ValidationError

from .evaluation import render
from .fixtures import example_input, scenarios
from .handler import STRATEGIES, plan
from .operations import append_event, start_operation
from .replanning import replan_after_events
from .schemas import PlanningInput


def main():
    parser = argparse.ArgumentParser(description="JalSetu offline planner")
    commands = parser.add_subparsers(dest="command", required=True)
    run = commands.add_parser("plan")
    run.add_argument("--input", type=Path, required=True)
    run.add_argument("--strategy", choices=STRATEGIES, required=True)
    run.add_argument("--output", type=Path, required=True)
    generate = commands.add_parser("fixtures")
    generate.add_argument("--service-window-policy", choices=["finish_by_close", "start_by_close"], required=True)
    generate.add_argument("--loading-mode", choices=["parallel", "sequential"], required=True)
    generate.add_argument("--output", type=Path, required=True)
    failure = commands.add_parser("failure-fixture")
    failure.add_argument("--service-window-policy", choices=["finish_by_close", "start_by_close"], required=True)
    failure.add_argument("--loading-mode", choices=["parallel", "sequential"], required=True)
    failure.add_argument("--output", type=Path, required=True)
    schema = commands.add_parser("schema")
    schema.add_argument("--output", type=Path, required=True)
    evaluate = commands.add_parser("evaluate")
    evaluate.add_argument("--fixtures", type=Path, required=True)
    evaluate.add_argument("--output", type=Path, required=True)
    evaluate.add_argument("--markdown", type=Path)
    args = parser.parse_args()
    if args.command == "fixtures":
        args.output.mkdir(parents=True, exist_ok=True)
        fixtures = {"north_delhi_example": example_input(args.service_window_policy, args.loading_mode), **scenarios(args.service_window_policy, args.loading_mode)}
        for name, data in fixtures.items():
            (args.output / f"{name}.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
        print("Created labelled synthetic scenarios with explicitly selected test policies")
        return
    if args.command == "failure-fixture":
        payload = example_input(args.service_window_policy, args.loading_mode)
        payload["project_id"] = "TEST-FAILURE-AFTER-DELIVERY"
        payload["name"] = "Example failure after a reported delivery"
        data = PlanningInput.model_validate(payload)
        approved = plan(data)
        operation = start_operation(payload, approved, "Synthetic fixture evaluation", "TEST-FAILURE")
        route = approved["vehicle_routes"][0]
        stop = route["stops"][0]
        events = [
            {"idempotency_key": "load", "occurred_at": route["loading_started_at"], "event_type": "vehicle_loaded", "payload": {"vehicle_id": route["vehicle_id"], "litres": route["planned_load_litres"]}},
            {"idempotency_key": "delivery", "occurred_at": stop["estimated_departure"], "event_type": "delivery_reported", "payload": {"vehicle_id": route["vehicle_id"], "site_id": stop["site_id"], "litres": stop["planned_litres"]}},
            {"idempotency_key": "failure", "occurred_at": stop["estimated_departure"], "event_type": "vehicle_failed", "payload": {"vehicle_id": route["vehicle_id"]}},
        ]
        for event in events:
            operation = append_event(operation, event)
        revision = replan_after_events(data, approved, operation["events"], events[-1]["occurred_at"])
        result = {"warning": "Synthetic evaluation fixture; not a real dispatch or independently verified delivery", "operation": operation, "revision_draft": revision}
    elif args.command == "schema":
        result = PlanningInput.model_json_schema()
    elif args.command == "evaluate":
        result = []
        for path in sorted(args.fixtures.glob("*.json")):
            data = PlanningInput.model_validate_json(path.read_text(encoding="utf-8"))
            for strategy in STRATEGIES:
                output = plan(data, strategy)
                result.append({"fixture": path.name, "input_snapshot_sha256": output["input_snapshot_sha256"], "strategy": strategy, "metrics": output["metrics"], "validation": output["validation"], "status": output["status"], "runtime_seconds": output["runtime_seconds"]})
        if not result:
            parser.error("No evaluation fixtures found; select explicit policies when creating them")
    else:
        try:
            data = PlanningInput.model_validate_json(args.input.read_text(encoding="utf-8"))
            result = plan(data, args.strategy)
        except ValidationError as error:
            parser.exit(2, f"Invalid planning input: {error}\n")
        print(result["explanation"])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    if args.command == "evaluate" and args.markdown:
        render(args.output, args.fixtures, args.markdown)
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
