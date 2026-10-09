"""Read-only, independently solved example scenarios with a bounded batch budget."""
import hashlib
import json
from datetime import timedelta
from uuid import NAMESPACE_URL, uuid5

from pydantic import Field, ValidationError

from .handler import plan
from .metrics import compute_metrics
from .schemas import Contract, Identifier, PlanningInput
from .validator import validate_plan

KINDS = ("stock", "vehicle", "earlier_start", "later_close", "shorter_service")
DELTA_METRICS = ("on_time_scheduled_litres", "unmet_requested_litres", "served_site_count",
                 "total_travel_distance_metres", "total_travel_duration_seconds")


class Options(Contract):
    extra_stock_litres: int = Field(strict=True, gt=0, le=100_000)
    vehicle_capacity_litres: int = Field(strict=True, gt=0, le=100_000)
    earlier_start_minutes: int = Field(strict=True, gt=0, le=120)
    closing_site_id: Identifier
    later_close_minutes: int = Field(strict=True, gt=0, le=120)
    shorter_service_minutes: int = Field(strict=True, gt=0, le=120)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def checked_options(data, value, parent_input):
    if PlanningInput.model_validate(parent_input).model_dump(mode="json") != data.model_dump(mode="json"):
        raise ValueError("Generate a comparison for the current inputs before resource analysis")
    options = Options.model_validate(value)
    if options.closing_site_id not in {s.site_id for s in data.sites if s.confirmation_status == "confirmed"}:
        raise ValueError("Choose a confirmed point for the closing-time scenario")
    if any(n % data.increment_litres for n in (options.extra_stock_litres, options.vehicle_capacity_litres)):
        raise ValueError("Scenario quantities must use the configured planning increment")
    return options


def scenarios(data, options):
    baseline = data.model_dump(mode="json")
    # Six solves share a <=48-second solve allowance, leaving room for worker
    # startup, validation and persistence. Every comparison uses the same budget.
    baseline["solver_time_limit_seconds"] = min(data.solver_time_limit_seconds, 8.0)
    yield "baseline", PlanningInput.model_validate(baseline), None
    for kind in KINDS:
        candidate = json.loads(json.dumps(baseline))
        try:
            if kind == "stock":
                candidate["depot"]["available_stock_litres"] += options.extra_stock_litres
            elif kind == "vehicle":
                if len(data.vehicles) >= 5:
                    raise ValueError("The five-vehicle limit prevents adding another example vehicle")
                vehicle_id = "EXAMPLE-EXTRA"
                while vehicle_id in {v.vehicle_id for v in data.vehicles}:
                    vehicle_id += "X"
                candidate["vehicles"].append({"vehicle_id": vehicle_id, "name": "EXAMPLE additional vehicle",
                    "capacity_litres": options.vehicle_capacity_litres, "status": "available", "provenance": "example",
                    "opens_at": data.depot.opens_at.isoformat(), "closes_at": data.depot.closes_at.isoformat()})
            elif kind == "earlier_start":
                for vehicle, source in zip(candidate["vehicles"], data.vehicles, strict=True):
                    if source.status in ("available", "delayed"):
                        vehicle["opens_at"] = max(data.depot.opens_at, source.opens_at - timedelta(minutes=options.earlier_start_minutes)).isoformat()
            elif kind == "later_close":
                for site, source in zip(candidate["sites"], data.sites, strict=True):
                    if source.site_id == options.closing_site_id:
                        site["closes_at"] = (source.closes_at + timedelta(minutes=options.later_close_minutes)).isoformat()
            else:
                for site in candidate["sites"]:
                    if site["confirmation_status"] == "confirmed":
                        site["service_duration_minutes"] = max(0, site["service_duration_minutes"] - options.shorter_service_minutes)
            yield kind, PlanningInput.model_validate(candidate), None
        except (ValidationError, ValueError) as error:
            reason = "Scenario exceeds the declared day, quantity or resource bounds" if isinstance(error, ValidationError) else str(error)
            yield kind, None, reason


def check_plan(data, candidate):
    check = validate_plan(data, candidate["vehicle_routes"])
    if (candidate["input_snapshot_sha256"] != digest(data.model_dump(mode="json")) or
            candidate["strategy"] != "jalsetu" or not check["valid"] or candidate["validation"] != check or
            candidate["metrics"] != compute_metrics(data, candidate["vehicle_routes"])):
        raise ValueError("Independent scenario route, metric or snapshot checks failed")


def analyze(data, options, job_id, parent_job_id):
    children = []
    for kind, scenario, reason in scenarios(data, options):
        child = {"child_job_id": str(uuid5(NAMESPACE_URL, f"jalsetu:{job_id}:{kind}")), "kind": kind,
                 "status": "not_applicable" if scenario is None else "completed", "reason": reason}
        if scenario is not None:
            result = plan(scenario)
            check_plan(scenario, result)
            child.update(input_snapshot=scenario.model_dump(mode="json"), plan=result)
        children.append(child)
    baseline = children[0]["plan"]
    for child in children[1:]:
        if "plan" in child:
            child["delta"] = ({key: child["plan"]["metrics"][key] - baseline["metrics"][key] for key in DELTA_METRICS}
                              if baseline["status"] == "feasible" and child["plan"]["status"] == "feasible" else None)
    result = {"analysis": {"parent_job_id": parent_job_id, "parent_input_sha256": digest(data.model_dump(mode="json")),
        "options": options.model_dump(mode="json"), "children": children,
        "warning": "EXAMPLE scenarios only. No stock, vehicle, request, approved plan or report is changed. Shorter service is a what-if, not an operational recommendation.",
        "comparison_allowance_seconds": min(data.solver_time_limit_seconds, 8.0),
        "explanation": "Each applicable alternative and its baseline was separately solved and checked. Ties, losses and unavailable scenarios remain visible. Bounded heuristic results do not prove which resource is globally best."}}
    validate_analysis(data, options, result["analysis"], job_id, parent_job_id)
    return result


def validate_analysis(data, options, analysis, job_id, parent_job_id):
    if (analysis["parent_input_sha256"] != digest(data.model_dump(mode="json")) or
            analysis["parent_job_id"] != parent_job_id or analysis["options"] != options.model_dump(mode="json")):
        raise ValueError("Scenario lineage does not match its parent")
    expected = list(scenarios(data, options))
    if [c["kind"] for c in analysis["children"]] != [k for k, _, _ in expected]:
        raise ValueError("Scenario batch is incomplete")
    baseline = analysis["children"][0]["plan"]
    for child, (kind, scenario, reason) in zip(analysis["children"], expected, strict=True):
        if child["child_job_id"] != str(uuid5(NAMESPACE_URL, f"jalsetu:{job_id}:{kind}")):
            raise ValueError("Scenario child identity is invalid")
        if scenario is None:
            if child["status"] != "not_applicable" or child["reason"] != reason or "plan" in child or "delta" in child:
                raise ValueError("Unavailable scenario must not publish a result")
            continue
        if child["status"] != "completed" or child["input_snapshot"] != scenario.model_dump(mode="json"):
            raise ValueError("Scenario snapshot differs from its declared change")
        check_plan(scenario, child["plan"])
        if kind != "baseline":
            expected_delta = ({k: child["plan"]["metrics"][k] - baseline["metrics"][k] for k in DELTA_METRICS}
                              if baseline["status"] == "feasible" and child["plan"]["status"] == "feasible" else None)
            if child["delta"] != expected_delta:
                raise ValueError("Scenario delta is not grounded in checked metrics")
