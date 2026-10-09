"""Allocation policies in integer planning units; no language model participates."""

import time
from fractions import Fraction

from ortools.sat.python import cp_model

from .schemas import PlanningInput

PRIORITY = {"critical": 0, "high": 1, "standard": 2}


def eligible_sites(data: PlanningInput):
    durations = data.travel_matrix.durations_seconds
    distances = data.travel_matrix.distances_metres
    return [
        s for i, s in enumerate(data.sites, 1)
        if s.confirmation_status == "confirmed" and s.requested_litres > 0
        and all(m[0][i] is not None and m[i][0] is not None for m in (durations, distances))
    ]


def allocate(data: PlanningInput, strategy: str, excluded: set[str], deadline: float, vehicle_assignments=None):
    sites = [s for s in eligible_sites(data) if s.site_id not in excluded]
    vehicles = [v for v in data.vehicles if v.status in ("available", "delayed")]
    increment = data.increment_litres
    budget = min(data.depot.available_stock_litres, sum(v.capacity_litres for v in vehicles)) // increment
    largest = max((v.capacity_litres for v in vehicles), default=0) // increment
    caps = {s.site_id: min(s.requested_litres // increment, largest) for s in sites}
    minima = {s.site_id: max(1, s.minimum_useful_litres // increment) for s in sites}
    sites = [s for s in sites if caps[s.site_id] >= minima[s.site_id]]
    empty = {s.site_id: 0 for s in data.sites}
    if not sites or budget == 0:
        return empty, "NO_ALLOCATION_REQUIRED"
    if strategy == "jalsetu":
        return _lexicographic(data, sites, caps, minima, budget, deadline, vehicle_assignments)
    quantities = {s.site_id: 0 for s in sites}
    if strategy == "greedy":
        durations = data.travel_matrix.durations_seconds
        indices = {node: i for i, node in enumerate(data.travel_matrix.node_ids)}
        ordered = []
        remaining = list(sites)
        current = 0
        while remaining:
            selected = min(remaining, key=lambda s: (
                PRIORITY[s.priority_class], s.closes_at,
                durations[current][indices[s.site_id]] if durations[current][indices[s.site_id]] is not None else float("inf"), s.site_id,
            ))
            ordered.append(selected)
            remaining.remove(selected)
            current = indices[selected.site_id]
        for s in ordered:
            minimum = minima[s.site_id]
            if budget >= minimum:
                quantities[s.site_id] = minimum
                budget -= minimum
        for s in ordered:
            if quantities[s.site_id]:
                extra = min(budget, caps[s.site_id] - quantities[s.site_id])
                quantities[s.site_id] += extra
                budget -= extra
    elif strategy == "demand_proportional":
        active = list(sites)
        while active:
            quantities = _capped_largest_remainder(active, caps, budget)
            too_small = [s for s in active if 0 < quantities[s.site_id] < minima[s.site_id]]
            if not too_small:
                break
            # Remove one unusable fragment and recalculate all shares. Ties
            # retain the earlier stable ID. This is a priority-neutral baseline.
            worst_ratio = min(Fraction(quantities[s.site_id], minima[s.site_id]) for s in too_small)
            removed = max((s for s in too_small if Fraction(quantities[s.site_id], minima[s.site_id]) == worst_ratio), key=lambda s: s.site_id)
            active.remove(removed)
        else:
            quantities = {}
    elif strategy == "equal_share":
        # Allocate the next unit to the least-served target. Minima are atomic,
        # so an allocation never consists of unusable fragments.
        while budget > 0:
            feasible = [s for s in sites if quantities[s.site_id] < caps[s.site_id]
                        and (quantities[s.site_id] > 0 or minima[s.site_id] <= budget)]
            if not feasible:
                break
            def rank(site):
                return quantities[site.site_id], site.site_id
            s = min(feasible, key=rank)
            amount = 1 if quantities[s.site_id] else minima[s.site_id]
            quantities[s.site_id] += amount
            budget -= amount
    else:
        raise ValueError(f"Unknown strategy: {strategy}")
    empty.update({key: value * increment for key, value in quantities.items()})
    return empty, "DETERMINISTIC_BASELINE"


def _capped_largest_remainder(sites, caps, budget):
    result = {s.site_id: 0 for s in sites}
    active = list(sites)
    remaining = min(budget, sum(caps[s.site_id] for s in sites))
    while active and remaining:
        weight = sum(s.requested_litres for s in active)
        quotas = {s.site_id: Fraction(remaining * s.requested_litres, weight) for s in active}
        capped = [s for s in active if quotas[s.site_id] >= caps[s.site_id]]
        if capped:
            for s in capped:
                result[s.site_id] = caps[s.site_id]
                remaining -= caps[s.site_id]
                active.remove(s)
            continue
        for s in active:
            result[s.site_id] = int(quotas[s.site_id])
        remainder = remaining - sum(result[s.site_id] for s in active)
        ordered = sorted(active, key=lambda s: (-(quotas[s.site_id] - result[s.site_id]), s.site_id))
        for s in ordered[:remainder]:
            result[s.site_id] += 1
        break
    return result


def _lexicographic(data, sites, caps, minima, budget, deadline, vehicle_assignments):
    model = cp_model.CpModel()
    vehicles = sorted([v for v in data.vehicles if v.status in ("available", "delayed")], key=lambda v: v.vehicle_id)
    q = {}
    commitments = {}
    packing = {}
    vehicle_quantities = {v.vehicle_id: [] for v in vehicles}
    for s in sites:
        key = s.site_id
        q[key] = model.new_int_var(0, caps[key], f"quantity_{key}")
        served = model.new_bool_var(f"served_{key}")
        model.add(q[key] >= minima[key]).only_enforce_if(served)
        model.add(q[key] == 0).only_enforce_if(served.negated())
        # Aggregate fleet capacity alone is not enough: each site quantity must
        # fit one actual vehicle. This is a small packing model, not a new service.
        assignments = []
        packing[key] = []
        packed = []
        for vehicle in vehicles:
            assigned = model.new_bool_var(f"assigned_{key}_{vehicle.vehicle_id}")
            amount = model.new_int_var(0, caps[key], f"packed_{key}_{vehicle.vehicle_id}")
            model.add(amount <= caps[key] * assigned)
            model.add(amount >= minima[key] * assigned)
            assignments.append(assigned)
            packing[key].append((vehicle.vehicle_id, assigned))
            packed.append(amount)
            vehicle_quantities[vehicle.vehicle_id].append(amount)
        model.add(sum(assignments) == served)
        model.add(sum(packed) == q[key])
        commitments[key] = model.new_int_var(0, s.minimum_useful_litres // data.increment_litres, f"commitment_{key}")
        model.add_min_equality(commitments[key], [q[key], s.minimum_useful_litres // data.increment_litres])
    model.add(sum(q.values()) <= budget)
    for vehicle in vehicles:
        model.add(sum(vehicle_quantities[vehicle.vehicle_id]) <= vehicle.capacity_litres // data.increment_litres)
    objectives = [
        sum(commitments[s.site_id] for s in sites if s.priority_class == "critical"),
        sum(commitments[s.site_id] for s in sites if s.priority_class == "high"),
        sum(q.values()),
    ]
    # Same-class fairness is lower order than minimum commitments and total litres.
    for priority in PRIORITY:
        group = [s for s in sites if s.priority_class == priority]
        if group:
            ratio = model.new_int_var(0, 10_000, f"min_fulfilment_{priority}")
            for s in group:
                model.add(q[s.site_id] * 10_000 >= ratio * (s.requested_litres // data.increment_litres))
            objectives.append(ratio)
    # Stable final allocation preference; never overrides higher objectives.
    objectives.extend(q[s.site_id] for s in sorted(sites, key=lambda s: s.site_id))
    result = {s.site_id: 0 for s in data.sites}
    status_name = "NO_SOLUTION_WITHIN_LIMIT"
    last_feasible_status = None
    for objective in objectives:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        model.maximize(objective)
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = remaining
        solver.parameters.num_search_workers = 1
        solver.parameters.random_seed = data.random_seed
        status = solver.solve(model)
        status_name = solver.status_name(status)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            break
        result.update({key: solver.value(var) * data.increment_litres for key, var in q.items()})
        last_feasible_status = status_name
        if vehicle_assignments is not None:
            vehicle_assignments.clear()
            vehicle_assignments.update({key: vehicle_id for key, choices in packing.items()
                                        for vehicle_id, assigned in choices if solver.value(assigned)})
        if status != cp_model.OPTIMAL:
            break  # Never optimize a lower goal without proving and freezing a higher goal.
        value = int(solver.value(objective)) if not isinstance(objective, int) else objective
        model.add(objective == value)
    return result, last_feasible_status or status_name
