"""Read-only original-dispatch replay; reported outcomes are a separate evidence layer."""
import math
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from pydantic import Field, model_validator

from .handler import plan
from .metrics import compute_metrics
from .schemas import Contract, PlanningInput
from .sources import digest
from .validator import validate_plan


class DispatchRow(Contract):
    vehicle_name: str = Field(min_length=1, max_length=120)
    sequence: int = Field(strict=True, ge=1, le=20)
    point_name: str = Field(min_length=1, max_length=120)
    planned_litres: int = Field(strict=True, gt=0, le=1_000_000)
    loading_started_at: datetime


class DeliveryRow(Contract):
    point_name: str = Field(min_length=1, max_length=120)
    delivered_litres: int = Field(strict=True, ge=0, le=1_000_000)
    arrived_at: datetime | None = None
    finished_at: datetime | None = None

    @model_validator(mode="after")
    def recorded_times(self):
        if self.delivered_litres and (self.arrived_at is None or self.finished_at is None):
            raise ValueError("Positive deliveries need recorded arrival and unloading-finish times")
        if (self.arrived_at is None) != (self.finished_at is None):
            raise ValueError("Enter both delivery times, or leave both blank for a zero delivery")
        if self.arrived_at is not None:
            if not self.arrived_at.tzinfo or not self.finished_at.tzinfo:
                raise ValueError("Recorded times need an explicit timezone")
            if self.finished_at < self.arrived_at:
                raise ValueError("Unloading cannot finish before arrival")
        return self


class History(Contract):
    source_reference: str = Field(min_length=1, max_length=500)
    reviewed: bool
    dispatch: list[DispatchRow] = Field(min_length=1, max_length=20)
    deliveries: list[DeliveryRow] = Field(default_factory=list, max_length=20)


ERROR_LABELS = {
    "UNAVAILABLE_VEHICLE": "A selected vehicle is unavailable",
    "LOADING_BEFORE_OPEN": "Loading starts before the depot or vehicle opens",
    "VEHICLE_RETURN_WINDOW": "A vehicle returns outside its available/depot window",
    "UNCONFIRMED_SITE": "A receiving point is not confirmed",
    "QUANTITY_INCREMENT": "A planned quantity does not match the selected planning increment",
    "SITE_QUANTITY_BOUND": "A planned quantity violates a request, receiving limit or minimum useful delivery",
    "SITE_START_WINDOW": "A modelled delivery starts outside receiving hours",
    "SITE_FINISH_WINDOW": "Modelled unloading finishes after closing under the selected rule",
    "VEHICLE_CAPACITY": "A vehicle's planned load exceeds its capacity",
    "DEPOT_STOCK_EXCEEDED": "The original plan uses more water than declared stock",
    "OVERLAPPING_DEPOT_LOADING": "Original loading times overlap under sequential loading",
}


def _lookup(entities, label):
    names = [e.name for e in entities]
    if len(names) != len(set(names)):
        raise ValueError(f"Give each {label} a unique name before matching historical records")
    return {e.name: e for e in entities}


def _day(stamp, data):
    if not stamp.tzinfo or stamp.astimezone(ZoneInfo(data.timezone)).date() != data.operating_date:
        raise ValueError("Historical times must include a timezone and belong to the project's IST operating day")


def replay(data: PlanningInput, history: History):
    """Preserve imported quantities/order/loading starts. Only travel/waiting is modelled."""
    vehicles, sites = _lookup(data.vehicles, "vehicle"), _lookup(data.sites, "receiving point")
    grouped, seen = defaultdict(list), set()
    for row in history.dispatch:
        if row.vehicle_name not in vehicles or row.point_name not in sites:
            raise ValueError("Historical vehicle and point names must exactly match the setup")
        if row.point_name in seen:
            raise ValueError("This comparison supports one visit per point and one trip per vehicle; duplicate point found")
        seen.add(row.point_name)
        _day(row.loading_started_at, data)
        grouped[row.vehicle_name].append(row)
    matrix = data.travel_matrix
    indices = {node: i for i, node in enumerate(matrix.node_ids)}

    def leg(previous, current):
        a, b = indices[previous], indices[current]
        duration, distance = matrix.durations_seconds[a][b], matrix.distances_metres[a][b]
        if duration is None or distance is None:
            raise ValueError("An original-plan road leg is unavailable; no distance or travel time was invented")
        return math.ceil(duration * data.travel_time_multiplier), distance

    routes = []
    for name, rows in grouped.items():
        rows.sort(key=lambda r: r.sequence)
        if [r.sequence for r in rows] != list(range(1, len(rows)+1)):
            raise ValueError("Each vehicle's stop numbers must be consecutive from 1, without duplicates")
        loading = rows[0].loading_started_at
        if any(row.loading_started_at != loading for row in rows):
            raise ValueError("Repeat the same recorded loading start for every stop on a vehicle's trip")
        vehicle = vehicles[name]
        departure = loading + timedelta(minutes=data.depot.loading_duration_minutes)
        clock, previous, stops, seconds, metres = departure, data.depot.depot_id, [], 0, 0
        for row in rows:
            site = sites[row.point_name]
            duration, distance = leg(previous, site.site_id)
            arrival = max(clock + timedelta(seconds=duration), site.opens_at)
            clock = arrival + timedelta(minutes=site.service_duration_minutes)
            seconds += duration
            metres += distance
            stops.append({"site_id": site.site_id, "vehicle_id": vehicle.vehicle_id, "sequence": row.sequence,
                "planned_litres": row.planned_litres, "estimated_arrival": arrival.isoformat(),
                "estimated_departure": clock.isoformat(), "travel_duration_seconds_from_previous": duration,
                "travel_distance_metres_from_previous": distance})
            previous = site.site_id
        duration, distance = leg(previous, data.depot.depot_id)
        routes.append({"vehicle_id": vehicle.vehicle_id, "depot_id": data.depot.depot_id,
            "loading_started_at": loading.isoformat(), "estimated_departure": departure.isoformat(),
            "estimated_return": (clock+timedelta(seconds=duration)).isoformat(), "stops": stops,
            "planned_load_litres": sum(r.planned_litres for r in rows),
            "travel_duration_seconds": seconds+duration, "travel_distance_metres": metres+distance,
            "return_leg": {"duration_seconds": duration, "distance_metres": distance}})
    return routes


def reported_outcomes(data, rows):
    sites, seen, reports, issues = _lookup(data.sites, "receiving point"), set(), [], []
    for row in rows:
        if row.point_name not in sites or row.point_name in seen:
            raise ValueError("Delivery records need known, unique point names; enter one cumulative total per point")
        seen.add(row.point_name)
        site = sites[row.point_name]
        if row.arrived_at is not None:
            _day(row.arrived_at, data)
            _day(row.finished_at, data)
        on_time = bool(row.arrived_at is not None and site.opens_at <= row.arrived_at <= site.closes_at
            and (data.service_window_policy == "start_by_close" or row.finished_at <= site.closes_at))
        if row.delivered_litres > min(site.requested_litres, site.receiving_limit_litres):
            issues.append(f"{site.name}: reported litres exceed the declared request or receiving limit")
        if site.confirmation_status != "confirmed":
            issues.append(f"{site.name}: a report refers to an unconfirmed request")
        reports.append({**row.model_dump(mode="json"), "within_receiving_window": on_time,
            "on_time_reported_litres": row.delivered_litres if on_time else 0})
    total = sum(r.delivered_litres for r in rows)
    if total > data.depot.available_stock_litres:
        issues.append("Reported litres exceed initial declared stock; changed stock or records need explanation")
    return {"points": reports, "reported_litres": total,
        "on_time_reported_litres": sum(r["on_time_reported_litres"] for r in reports),
        "missing_point_names": [s.name for s in data.sites if s.confirmation_status == "confirmed" and s.name not in seen],
        "issues": issues}


def compare_history(data, payload):
    history = History.model_validate(payload)
    if not history.reviewed or not history.source_reference.strip():
        raise ValueError("Add the original-record reference and acknowledge that the records were reviewed")
    routes = replay(data, history)
    checked = validate_plan(data, routes)
    outcomes = reported_outcomes(data, history.deliveries)
    proposed = plan(data, "jalsetu")
    # Invalid originals retain quantities and failures, but do not create improvement claims.
    comparison_ready = checked["valid"] and proposed["approvable"]
    original_metrics = compute_metrics(data, routes) if checked["valid"] else None
    raw_total = sum(row.planned_litres for row in history.dispatch)
    site_names = {s.site_id: s.name for s in data.sites}
    vehicle_names = {v.vehicle_id: v.name for v in data.vehicles}

    def readable_routes(value):
        return [{"vehicle_name": vehicle_names[r["vehicle_id"]], "planned_load_litres": r["planned_load_litres"],
            "loading_started_at": r["loading_started_at"], "estimated_return": r["estimated_return"],
            "stops": [{"point_name": site_names[s["site_id"]], "planned_litres": s["planned_litres"],
                "estimated_arrival": s["estimated_arrival"], "estimated_departure": s["estimated_departure"]} for s in r["stops"]]} for r in value]

    original_quantities = {r.point_name: r.planned_litres for r in history.dispatch}
    proposed_quantities = {site_names[r["site_id"]]: r["scheduled_litres"] for r in proposed["site_results"]}
    return {"project_name": data.name, "operating_date": str(data.operating_date), "data_mode": data.data_mode,
        "created_at": datetime.now(UTC).isoformat(), "input_snapshot_sha256": digest(data.model_dump(mode="json")),
        "history_snapshot_sha256": digest(history.model_dump(mode="json")),
        "source_reference": history.source_reference, "record_source": data.operational_source.model_dump(mode="json") if data.operational_source else None,
        "road_source": {key: data.travel_matrix.model_dump(mode="json")[key] for key in ("provider", "retrieved_at", "represented_at", "attribution", "source_url", "limitations")},
        "settings": {"closing_rule": data.service_window_policy, "loading_rule": data.loading_mode,
            "increment_litres": data.increment_litres, "travel_time_multiplier": data.travel_time_multiplier},
        "resources": {"depot_name": data.depot.name, "stock_litres": data.depot.available_stock_litres,
            "opens_at": data.depot.opens_at.isoformat(), "closes_at": data.depot.closes_at.isoformat(),
            "loading_minutes": data.depot.loading_duration_minutes,
            "vehicles": [{"name": v.name, "capacity_litres": v.capacity_litres, "status": v.status,
                "opens_at": v.opens_at.isoformat(), "closes_at": v.closes_at.isoformat()} for v in data.vehicles]},
        "original": {"valid": checked["valid"], "issues": [ERROR_LABELS.get(e, e.replace("_", " ").capitalize()) for e in checked["errors"]],
            "imported_planned_litres": raw_total, "metrics": original_metrics, "routes": readable_routes(routes)},
        "jalsetu": {"approvable": proposed["approvable"], "issues": proposed["approval_blockers"],
            "metrics": proposed["metrics"], "routes": readable_routes(proposed["vehicle_routes"])},
        "comparison_ready": comparison_ready,
        "scheduled_difference_litres": proposed["metrics"]["on_time_scheduled_litres"]-original_metrics["on_time_scheduled_litres"] if comparison_ready else None,
        "points": [{"point_name": s.name, "confirmed": s.confirmation_status == "confirmed", "requested_litres": s.requested_litres,
            "minimum_useful_litres": s.minimum_useful_litres, "receiving_limit_litres": s.receiving_limit_litres,
            "opens_at": s.opens_at.isoformat(), "closes_at": s.closes_at.isoformat(), "unloading_minutes": s.service_duration_minutes,
            "priority": s.priority_class, "priority_reason": s.priority_reason,
            "original_planned_litres": original_quantities.get(s.name, 0), "jalsetu_planned_litres": proposed_quantities[s.name]} for s in data.sites],
        "outcomes": outcomes,
        "limitations": ["Original quantities, loading starts and stop order are preserved; arrival/return times are reconstructed from the same road estimates as JalSetu, with waiting until opening. Original arrival estimates are not imported.",
            "This is a retrospective model comparison, not a measured delivery improvement. Later roads and hindsight may differ from information available on the original day.",
            "Reported outcomes are operator declarations, not independently verified; missing reports are unknown, not zero. No vehicle travel, stock ledger or dispatch is verified by these outcome rows.",
            "One depot, one trip per vehicle, one visit per point; no reloads. A result may tie or lose. Global optimality is not claimed.",
            "This comparison is read-only and does not approve a plan or alter saved operations. Download the printable report to retain it."]}
