"""Recompute physical constraints from serialized output, without solver objects."""

import math
from datetime import datetime, timedelta
from itertools import pairwise

from .schemas import PlanningInput


def validate_plan(data: PlanningInput, routes: list[dict]):
    errors = []
    sites = {s.site_id: s for s in data.sites}
    vehicles = {v.vehicle_id: v for v in data.vehicles}
    matrix = data.travel_matrix
    indices = {key: i for i, key in enumerate(matrix.node_ids)}
    seen_sites, seen_vehicles = set(), set()
    total_load = 0
    loading_intervals = []
    for route in routes:
        vehicle = vehicles.get(route.get("vehicle_id"))
        if vehicle is None:
            errors.append("UNKNOWN_VEHICLE")
            continue
        if vehicle.vehicle_id in seen_vehicles:
            errors.append("DUPLICATE_VEHICLE_ROUTE")
        seen_vehicles.add(vehicle.vehicle_id)
        if vehicle.status not in ("available", "delayed"):
            errors.append("UNAVAILABLE_VEHICLE")
        if route.get("depot_id") != data.depot.depot_id:
            errors.append("WRONG_DEPOT")
        try:
            departure = datetime.fromisoformat(route["estimated_departure"])
            loading_start = datetime.fromisoformat(route["loading_started_at"])
            return_time = datetime.fromisoformat(route["estimated_return"])
            if any(t.tzinfo is None for t in (departure, loading_start, return_time)):
                raise ValueError("Missing timezone")
        except (KeyError, TypeError, ValueError):
            errors.append("INVALID_ROUTE_TIMESTAMP")
            continue
        if loading_start < max(data.depot.opens_at, vehicle.opens_at):
            errors.append("LOADING_BEFORE_OPEN")
        if departure - loading_start != timedelta(minutes=data.depot.loading_duration_minutes):
            errors.append("INCORRECT_LOADING_DURATION")
        loading_intervals.append((loading_start, departure))
        if return_time > min(data.depot.closes_at, vehicle.closes_at) or return_time < departure:
            errors.append("VEHICLE_RETURN_WINDOW")
        load = 0
        current_time = departure
        previous_id = data.depot.depot_id
        distance_total = travel_total = 0
        for sequence, stop in enumerate(route.get("stops", []), 1):
            site = sites.get(stop.get("site_id"))
            if site is None:
                errors.append("UNKNOWN_SITE")
                continue
            if site.site_id in seen_sites:
                errors.append("DUPLICATE_SITE_ASSIGNMENT")
            seen_sites.add(site.site_id)
            if site.confirmation_status != "confirmed":
                errors.append("UNCONFIRMED_SITE")
            if stop.get("sequence") != sequence or stop.get("vehicle_id") != vehicle.vehicle_id:
                errors.append("INVALID_STOP_ASSIGNMENT")
            quantity = stop.get("planned_litres")
            if type(quantity) is not int or quantity <= 0:
                errors.append("INVALID_QUANTITY")
                continue
            load += quantity
            if quantity % data.increment_litres:
                errors.append("QUANTITY_INCREMENT")
            if not site.minimum_useful_litres <= quantity <= min(site.requested_litres, site.receiving_limit_litres):
                errors.append("SITE_QUANTITY_BOUND")
            a, b = indices[previous_id], indices[site.site_id]
            duration, distance = matrix.durations_seconds[a][b], matrix.distances_metres[a][b]
            if duration is None or distance is None:
                errors.append("UNREACHABLE_LEG")
                continue
            duration = math.ceil(duration * data.travel_time_multiplier)
            travel_total += duration
            distance_total += distance
            try:
                arrival = datetime.fromisoformat(stop["estimated_arrival"])
                leave = datetime.fromisoformat(stop["estimated_departure"])
                if arrival.tzinfo is None or leave.tzinfo is None:
                    raise ValueError("Missing timezone")
            except (KeyError, TypeError, ValueError):
                errors.append("INVALID_STOP_TIMESTAMP")
                continue
            if arrival < current_time + timedelta(seconds=duration):
                errors.append("IMPOSSIBLE_ARRIVAL")
            if arrival < site.opens_at or arrival > site.closes_at:
                errors.append("SITE_START_WINDOW")
            if leave != arrival + timedelta(minutes=site.service_duration_minutes):
                errors.append("SERVICE_DURATION")
            if data.service_window_policy == "finish_by_close" and leave > site.closes_at:
                errors.append("SITE_FINISH_WINDOW")
            if stop.get("travel_duration_seconds_from_previous") != duration or stop.get("travel_distance_metres_from_previous") != distance:
                errors.append("LEG_METADATA_MISMATCH")
            previous_id, current_time = site.site_id, leave
        a, b = indices[previous_id], 0
        duration, distance = matrix.durations_seconds[a][b], matrix.distances_metres[a][b]
        if duration is None or distance is None:
            errors.append("UNREACHABLE_RETURN")
        else:
            duration = math.ceil(duration * data.travel_time_multiplier)
            travel_total += duration
            distance_total += distance
            if return_time < current_time + timedelta(seconds=duration):
                errors.append("IMPOSSIBLE_RETURN")
            if route.get("return_leg") != {"duration_seconds": duration, "distance_metres": distance}:
                errors.append("RETURN_METADATA_MISMATCH")
        if load > vehicle.capacity_litres:
            errors.append("VEHICLE_CAPACITY")
        if route.get("planned_load_litres") != load:
            errors.append("LOAD_METADATA_MISMATCH")
        if route.get("travel_duration_seconds") != travel_total or route.get("travel_distance_metres") != distance_total:
            errors.append("TRAVEL_TOTAL_MISMATCH")
        total_load += load
    if total_load > data.depot.available_stock_litres:
        errors.append("DEPOT_STOCK_EXCEEDED")
    if data.loading_mode == "sequential":
        intervals = sorted(loading_intervals)
        if any(end > next_start for (_, end), (next_start, _) in pairwise(intervals)):
            errors.append("OVERLAPPING_DEPOT_LOADING")
    return {"valid": not errors, "errors": sorted(set(errors)), "warnings": []}
