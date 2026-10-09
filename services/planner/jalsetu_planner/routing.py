"""One-trip capacity/time-window routing; results are always independently checked."""

import math
import time
from datetime import UTC, timedelta

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

from .schemas import PlanningInput


def route_allocations(data: PlanningInput, quantities: dict[str, int], deadline: float, vehicle_assignments=None):
    sites = [s for s in data.sites if quantities.get(s.site_id, 0) > 0]
    vehicles = sorted([v for v in data.vehicles if v.status in ("available", "delayed")], key=lambda v: v.vehicle_id)
    if not sites or not vehicles:
        return [], {s.site_id for s in sites}, "EMPTY"
    origin = data.depot.opens_at
    def seconds(value):
        return int((value - origin).total_seconds())
    horizon = max(seconds(data.depot.closes_at), *(seconds(v.closes_at) for v in vehicles))
    nodes = [data.depot.depot_id, *(s.site_id for s in sites)]
    full_index = {key: i for i, key in enumerate(data.travel_matrix.node_ids)}
    duration = [[data.travel_matrix.durations_seconds[full_index[a]][full_index[b]] for b in nodes] for a in nodes]
    distance = [[data.travel_matrix.distances_metres[full_index[a]][full_index[b]] for b in nodes] for a in nodes]
    duration = [[math.ceil(cell * data.travel_time_multiplier) if cell is not None else None for cell in row] for row in duration]
    service = [0, *(s.service_duration_minutes * 60 for s in sites)]
    demands = [0, *(quantities[s.site_id] for s in sites)]
    manager = pywrapcp.RoutingIndexManager(len(nodes), len(vehicles), 0)
    routing = pywrapcp.RoutingModel(manager)
    def transit(i, j):
        a, b = manager.IndexToNode(i), manager.IndexToNode(j)
        return (duration[a][b] if duration[a][b] is not None else horizon + 1) + service[a]
    transit_index = routing.RegisterTransitCallback(transit)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_index)
    load_index = routing.RegisterUnaryTransitCallback(lambda i: demands[manager.IndexToNode(i)])
    routing.AddDimensionWithVehicleCapacity(load_index, 0, [v.capacity_litres for v in vehicles], True, "Capacity")
    routing.AddDimension(transit_index, max(0, horizon), max(0, horizon), False, "Time")
    dimension = routing.GetDimensionOrDie("Time")
    # An absent edge is forbidden, not replaced by a claimed road estimate.
    for i in range(routing.Size()):
        for j in range(manager.GetNumberOfIndices()):
            a, b = manager.IndexToNode(i), manager.IndexToNode(j)
            if a != b and (duration[a][b] is None or distance[a][b] is None):
                routing.NextVar(i).RemoveValue(j)
    ready_times = []
    queue_free = 0
    loading = data.depot.loading_duration_minutes * 60
    for k, vehicle in enumerate(vehicles):
        start = max(0, seconds(vehicle.opens_at))
        if data.loading_mode == "sequential":
            start = max(start, queue_free)
            queue_free = start + loading
        ready = start + loading
        end = min(seconds(vehicle.closes_at), seconds(data.depot.closes_at))
        if ready > end:
            # An unusable vehicle must not prevent the rest of the fleet serving sites.
            routing.ActiveVehicleVar(k).SetValue(0)
            ready = max(0, end)
        ready_times.append(ready)
        dimension.CumulVar(routing.Start(k)).SetRange(ready, end)
        dimension.CumulVar(routing.End(k)).SetRange(ready, end)
        routing.AddVariableMinimizedByFinalizer(dimension.CumulVar(routing.Start(k)))
        routing.AddVariableMinimizedByFinalizer(dimension.CumulVar(routing.End(k)))
    # Separated penalties: critical minimum, high minimum, total litres, travel.
    # Bounds use this allocated input, not unchecked arbitrary fixed weights.
    travel_bound = sum(sorted([max((x or 0) for x in row) + service[i] for i, row in enumerate(duration)], reverse=True)) + len(vehicles) * max(x or 0 for x in duration[0])
    total_units = sum(demands) // data.increment_litres
    litre_weight = travel_bound + 1
    high_weight = total_units * litre_weight + travel_bound + 1
    critical_weight = total_units * high_weight + total_units * litre_weight + travel_bound + 1
    penalties = []
    impossible = set()
    for i, site in enumerate(sites, 1):
        lower = max(0, seconds(site.opens_at))
        upper = min(horizon, seconds(site.closes_at))
        if data.service_window_policy == "finish_by_close":
            upper -= service[i]
        index = manager.NodeToIndex(i)
        if vehicle_assignments and site.site_id in vehicle_assignments:
            assigned = next(k for k, v in enumerate(vehicles) if v.vehicle_id == vehicle_assignments[site.site_id])
            routing.VehicleVar(index).SetValues([-1, assigned])
        if lower > upper:
            routing.ActiveVar(index).SetValue(0)
            impossible.add(site.site_id)
        else:
            dimension.CumulVar(index).SetRange(lower, upper)
        units = demands[i] // data.increment_litres
        minimum = min(demands[i], site.minimum_useful_litres) // data.increment_litres
        penalty = units * litre_weight
        if site.priority_class == "critical":
            penalty += minimum * critical_weight
        elif site.priority_class == "high":
            penalty += minimum * high_weight
        penalties.append(penalty)
        routing.AddDisjunction([index], penalty)
    if sum(penalties) >= 2**63 - 1:
        raise ValueError("Routing objective exceeds the supported numeric bound")
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        return [], {s.site_id for s in sites}, "NO_SOLUTION_WITHIN_LIMIT"
    search = pywrapcp.DefaultRoutingSearchParameters()
    search.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
    # A deterministic first feasible solution avoids wall-clock-sensitive random search.
    # This is deliberately a heuristic, never a global optimality claim.
    search.solution_limit = 1
    search.time_limit.FromMilliseconds(max(1, int(remaining * 1000)))
    solution = routing.SolveWithParameters(search)
    if solution is None:
        return [], {s.site_id for s in sites}, "NO_SOLUTION_WITHIN_LIMIT"
    def stamp(seconds_value):
        return (origin + timedelta(seconds=seconds_value)).astimezone(UTC).isoformat()
    routes = []
    served = set()
    for k, vehicle in enumerate(vehicles):
        index = routing.Start(k)
        departure = solution.Value(dimension.CumulVar(index))
        previous_node = 0
        stops = []
        total_distance = 0
        total_travel = 0
        while True:
            next_index = solution.Value(routing.NextVar(index))
            node = manager.IndexToNode(next_index)
            leg_duration = duration[previous_node][node] or 0
            leg_distance = distance[previous_node][node] or 0
            total_travel += leg_duration
            total_distance += leg_distance
            if routing.IsEnd(next_index):
                return_at = solution.Value(dimension.CumulVar(next_index))
                return_leg = {"duration_seconds": leg_duration, "distance_metres": leg_distance}
                break
            site = sites[node - 1]
            arrival = solution.Value(dimension.CumulVar(next_index))
            served.add(site.site_id)
            stops.append({
                "stop_id": f"{vehicle.vehicle_id}:{site.site_id}", "vehicle_id": vehicle.vehicle_id,
                "site_id": site.site_id, "sequence": len(stops) + 1,
                "planned_litres": quantities[site.site_id],
                "estimated_arrival": stamp(arrival), "estimated_departure": stamp(arrival + service[node]),
                "travel_duration_seconds_from_previous": leg_duration,
                "travel_distance_metres_from_previous": leg_distance,
                "state": "not_started", "reported_delivered_litres": 0,
            })
            previous_node, index = node, next_index
        if stops:
            routes.append({
                "vehicle_id": vehicle.vehicle_id,
                "depot_id": data.depot.depot_id,
                "estimated_departure": stamp(departure), "estimated_return": stamp(return_at),
                "loading_started_at": stamp(departure - loading),
                "planned_load_litres": sum(s["planned_litres"] for s in stops),
                "capacity_litres": vehicle.capacity_litres, "stops": stops,
                "return_leg": return_leg, "travel_duration_seconds": total_travel,
                "travel_distance_metres": total_distance,
            })
    return routes, {s.site_id for s in sites} - served | impossible, "FEASIBLE_HEURISTIC"
