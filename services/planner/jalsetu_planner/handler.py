import hashlib
import json
import time
from datetime import UTC, datetime

from .allocation import allocate, eligible_sites
from .metrics import compute_metrics
from .routing import route_allocations
from .schemas import PlanningInput
from .validator import validate_plan

STRATEGIES = ("equal_share", "demand_proportional", "greedy", "jalsetu")


def plan(data: PlanningInput, strategy="jalsetu"):
    if strategy not in STRATEGIES:
        raise ValueError("Unknown planning strategy")
    started = time.monotonic()
    deadline = started + data.solver_time_limit_seconds
    snapshot_hash = hashlib.sha256(json.dumps(data.model_dump(mode="json"), sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    best = []
    best_score = None
    excluded = set()
    stage_status = []
    iterations = 3 if strategy == "jalsetu" else 2
    for iteration in range(iterations):
        if time.monotonic() >= deadline:
            break
        # Reserve time for routing and checking instead of spending the entire
        # job allowance proving lower-order allocation preferences.
        allocation_deadline = time.monotonic() + max(0, deadline - time.monotonic()) * 0.6
        assignments = {}
        quantities, allocation_status = allocate(data, strategy, excluded, allocation_deadline, assignments)
        routes, dropped, route_status = route_allocations(data, quantities, deadline, assignments)
        validation = validate_plan(data, routes)
        if not validation["valid"]:
            raise RuntimeError("Independent validator rejected the generated plan: " + ",".join(validation["errors"]))
        metrics = compute_metrics(data, routes)
        score = (metrics["critical_minimum_litres"], metrics["high_minimum_litres"], metrics["on_time_scheduled_litres"], metrics["minimum_fulfilment_ratio"], -metrics["total_travel_duration_seconds"], -metrics["total_travel_distance_metres"])
        candidate_found = allocation_status in ("OPTIMAL", "FEASIBLE", "DETERMINISTIC_BASELINE", "NO_ALLOCATION_REQUIRED") and route_status != "NO_SOLUTION_WITHIN_LIMIT"
        if candidate_found and (best_score is None or score > best_score):
            best, best_score = routes, score
        stage_status.append({"iteration": iteration + 1, "allocation_status": allocation_status, "routing_status": route_status, "dropped_site_ids": sorted(dropped)})
        if not dropped or dropped <= excluded:
            break
        excluded.update(dropped)
    validation = validate_plan(data, best)
    metrics = compute_metrics(data, best)
    served = {stop["site_id"]: stop["planned_litres"] for route in best for stop in route["stops"]}
    eligible = {s.site_id for s in eligible_sites(data)}
    site_results = []
    for s in data.sites:
        amount = served.get(s.site_id, 0)
        if amount:
            reason = None
        elif s.confirmation_status != "confirmed":
            reason = "Site is not confirmed"
        elif s.site_id not in eligible and s.requested_litres:
            reason = "No complete depot connection in the stored matrix"
        elif not data.vehicles:
            reason = "No vehicles supplied; delivery feasibility unresolved"
        elif s.site_id in excluded:
            reason = "Not scheduled within capacity/time constraints by this bounded heuristic"
        else:
            reason = "No allocation under the declared resources and policy"
        site_results.append({"site_id": s.site_id, "requested_litres": s.requested_litres, "scheduled_litres": amount, "unmet_litres": s.requested_litres - amount, "reason": reason})
    available = any(v.status in ("available", "delayed") for v in data.vehicles)
    found = best_score is not None
    blockers = []
    if not found:
        blockers.append("No checked result found within the calculation limit")
    if not available:
        blockers.append("No available vehicle declared")
    if not data.depot.potable_supply_confirmed:
        blockers.append("Potable supply has not been confirmed by the example operator")
    if not best:
        blockers.append("No delivery visits scheduled")
    approvable = validation["valid"] and not blockers
    return {
        "schema_version": "1.0", "project_id": data.project_id, "data_mode": data.data_mode,
        "created_at": datetime.now(UTC).isoformat(), "algorithm_version": "0.1.0",
        "strategy": strategy, "status": "invalid_input" if not available else ("feasible" if found else "no_solution_within_limit"),
        "service_completeness": "partial" if metrics["unmet_requested_litres"] else "complete",
        "solver_status": "FEASIBLE_HEURISTIC" if found else "NO_SOLUTION_WITHIN_LIMIT", "optimality_claim": False,
        "approvable": approvable, "approval_blockers": blockers, "input_snapshot_sha256": snapshot_hash,
        "source_snapshot_ids": [data.travel_matrix.snapshot_id],
        "vehicle_routes": best, "site_results": site_results,
        "metrics": metrics, "validation": validation, "iterations": stage_status,
        "runtime_seconds": round(time.monotonic() - started, 6),
        "explanation": f"Schedules {metrics['on_time_scheduled_litres']:,} modelled litres within the selected windows. {metrics['unmet_requested_litres']:,} litres remain unmet. A feasible heuristic result; global optimality is not proved." if found else "No checked feasible result was found within the configured calculation limit. Infeasibility was not proved.",
        "limitations": ["Declared requests are not independently verified needs", "Arrival times come from the stored matrix, not guaranteed traffic", "Synthetic matrix is not real Delhi routing" if data.travel_matrix.provenance == "example" else "Routing estimates depend on the dated provider snapshot", "One trip per vehicle; no reloads", "Sequential loading reserves slots in vehicle-ID order when selected"],
    }
