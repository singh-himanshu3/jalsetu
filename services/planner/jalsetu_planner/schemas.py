"""Authoritative input contracts. No inferred operational resources."""

from datetime import date, datetime
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, model_validator

Litres = Annotated[int, Field(strict=True, ge=0, le=1_000_000)]
Identifier = Annotated[str, Field(min_length=1, max_length=80)]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Location(Contract):
    longitude: float = Field(ge=-180, le=180)
    latitude: float = Field(ge=-90, le=90)


class Window(Contract):
    opens_at: datetime
    closes_at: datetime

    @model_validator(mode="after")
    def check_window(self):
        if any(t.tzinfo is None or t.utcoffset() is None for t in (self.opens_at, self.closes_at)):
            raise ValueError("Operational times require an explicit timezone offset")
        if self.closes_at <= self.opens_at:
            raise ValueError("Closing time must follow opening time")
        return self


class Depot(Window):
    depot_id: Identifier
    name: str = Field(min_length=1, max_length=120)
    location: Location
    available_stock_litres: Litres
    loading_duration_minutes: int = Field(strict=True, ge=0, le=180)
    potable_supply_confirmed: bool
    provenance: Literal["example", "operator_entered"]


class Vehicle(Window):
    vehicle_id: Identifier
    name: str = Field(min_length=1, max_length=120)
    capacity_litres: Annotated[int, Field(strict=True, gt=0, le=1_000_000)]
    status: Literal["available", "delayed", "unavailable", "failed", "completed"]
    provenance: Literal["example", "operator_entered"]


class Site(Window):
    site_id: Identifier
    name: str = Field(min_length=1, max_length=120)
    location: Location
    confirmation_status: Literal["draft", "contacted", "confirmed"]
    requested_litres: Litres
    minimum_useful_litres: Litres
    receiving_limit_litres: Litres
    service_duration_minutes: int = Field(strict=True, ge=0, le=180)
    priority_class: Literal["critical", "high", "standard"]
    priority_reason: str = Field(min_length=1, max_length=500)
    provenance: Literal["example", "operator_entered"]

    @model_validator(mode="after")
    def check_quantities(self):
        if self.minimum_useful_litres > self.requested_litres:
            raise ValueError("Minimum useful quantity cannot exceed the request")
        if self.requested_litres > self.receiving_limit_litres:
            raise ValueError("Request exceeds receiving limit; correct one of these quantities")
        return self


class TravelMatrix(Contract):
    snapshot_id: Identifier
    node_ids: list[Identifier] = Field(min_length=1, max_length=21)
    durations_seconds: list[list[int | None]]
    distances_metres: list[list[int | None]]
    provider: str
    provenance: Literal["example", "public_snapshot"]
    retrieved_at: datetime | None
    represented_at: datetime | None
    source_url: str | None
    attribution: str
    limitations: list[str]

    @model_validator(mode="after")
    def check_matrix(self):
        n = len(self.node_ids)
        if len(set(self.node_ids)) != n:
            raise ValueError("Duplicate route-matrix node IDs")
        for matrix in (self.durations_seconds, self.distances_metres):
            if len(matrix) != n or any(len(row) != n for row in matrix):
                raise ValueError("Route matrix dimensions must match its nodes")
            for i, row in enumerate(matrix):
                for j, value in enumerate(row):
                    ceiling = 86_400 if matrix is self.durations_seconds else 1_000_000
                    if value is not None and (type(value) is not int or not 0 <= value <= ceiling):
                        raise ValueError("Matrix cells exceed supported integer duration/distance bounds")
                    if i == j and value != 0:
                        raise ValueError("Matrix diagonal must be zero")
        if self.provenance == "public_snapshot" and not self.retrieved_at:
            raise ValueError("Public routing snapshots require a retrieval timestamp")
        return self


class PlanningInput(Contract):
    schema_version: Literal["1.0"]
    project_id: Identifier
    name: str = Field(min_length=1, max_length=120)
    data_mode: Literal["example", "operator_entered", "mixed"]
    display_warning: str
    operating_date: date
    timezone: Literal["Asia/Kolkata"]
    pilot_bounds: tuple[float, float, float, float]
    increment_litres: int = Field(strict=True, gt=0, le=10_000)
    service_window_policy: Literal["start_by_close", "finish_by_close"]
    loading_mode: Literal["parallel", "sequential"]
    solver_time_limit_seconds: float = Field(gt=0, le=60)
    random_seed: int = Field(strict=True, ge=0, le=2**31 - 1)
    travel_time_multiplier: float = Field(gt=0, le=5)
    depot: Depot
    vehicles: list[Vehicle] = Field(max_length=5)
    sites: list[Site] = Field(min_length=1, max_length=20)
    travel_matrix: TravelMatrix

    @model_validator(mode="after")
    def validate_project(self):
        zone = ZoneInfo(self.timezone)
        if any(t.astimezone(zone).date() != self.operating_date
               for entity in [self.depot, *self.vehicles, *self.sites]
               for t in (entity.opens_at, entity.closes_at)):
            raise ValueError("All operating windows must belong to the declared IST operating day")
        west, south, east, north = self.pilot_bounds
        if not (76.8 <= west < east <= 77.5 and 28.3 <= south < north <= 29.0):
            raise ValueError("Pilot bounds must lie within the supported Delhi coordinate envelope")
        if east - west > 0.1 or north - south > 0.1:
            raise ValueError("Pilot exceeds the supported small-area limit")
        ids = [self.depot.depot_id] + [s.site_id for s in self.sites]
        if len(set(ids)) != len(ids) or len({v.vehicle_id for v in self.vehicles}) != len(self.vehicles):
            raise ValueError("Entity IDs must be unique")
        if self.travel_matrix.node_ids != ids:
            raise ValueError("Matrix order must be depot followed by all site IDs")
        for entity in [self.depot, *self.sites]:
            if not (west <= entity.location.longitude <= east and south <= entity.location.latitude <= north):
                raise ValueError(f"{entity.name} is outside the pilot area")
        quantities = [self.depot.available_stock_litres]
        quantities += [v.capacity_litres for v in self.vehicles]
        quantities += [q for s in self.sites for q in (s.requested_litres, s.minimum_useful_litres, s.receiving_limit_litres)]
        if any(q % self.increment_litres for q in quantities):
            raise ValueError("Quantities must be divisible by the configured planning increment")
        if any(q // self.increment_litres > 10_000 for q in quantities):
            raise ValueError("Quantity exceeds the supported 10,000 planning-unit bound")
        if self.data_mode == "example" and any(e.provenance != "example" for e in [self.depot, *self.vehicles, *self.sites]):
            raise ValueError("Example mode requires example-labelled operational inputs")
        if self.data_mode == "example" and not self.display_warning:
            raise ValueError("Example inputs require a visible synthetic-data warning")
        if self.data_mode == "operator_entered" and self.travel_matrix.provenance == "example":
            raise ValueError("Synthetic routing cannot be presented as an operator-only plan")
        return self


class EventPayload(Contract):
    vehicle_id: Identifier | None = None
    site_id: Identifier | None = None
    litres: Litres | None = None
    delta_litres: Annotated[int, Field(strict=True, ge=-1_000_000, le=1_000_000)] | None = None


class OperationalEvent(Contract):
    event_type: Literal["vehicle_loaded", "delivery_reported", "vehicle_failed", "water_recovered", "vehicle_returned", "depot_stock_adjusted", "site_closed", "site_reopened"]
    idempotency_key: str = Field(min_length=1, max_length=128)
    occurred_at: datetime
    payload: EventPayload

    @model_validator(mode="after")
    def check_payload(self):
        fields = {
            "vehicle_loaded": {"vehicle_id", "litres"},
            "delivery_reported": {"vehicle_id", "site_id", "litres"},
            "vehicle_failed": {"vehicle_id"},
            "water_recovered": {"vehicle_id", "litres"},
            "vehicle_returned": {"vehicle_id"},
            "depot_stock_adjusted": {"delta_litres"},
            "site_closed": {"site_id"},
            "site_reopened": {"site_id"},
        }
        if self.occurred_at.tzinfo is None or self.occurred_at.utcoffset() is None:
            raise ValueError("Event timestamp requires an explicit timezone offset")
        if set(self.payload.model_dump(exclude_none=True)) != fields[self.event_type]:
            raise ValueError("Payload fields do not match the selected event type")
        return self
