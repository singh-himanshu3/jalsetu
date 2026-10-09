from copy import deepcopy
from datetime import datetime, timedelta
from itertools import pairwise

import pytest
from pydantic import ValidationError

from jalsetu_planner.allocation import allocate
from jalsetu_planner.fixtures import example_input, scenarios
from jalsetu_planner.handler import STRATEGIES, plan
from jalsetu_planner.schemas import PlanningInput
from jalsetu_planner.validator import validate_plan


@pytest.fixture
def input_data():
    # Test settings, not a choice of policy for the user's demo.
    return PlanningInput.model_validate(example_input("finish_by_close", "parallel"))


@pytest.mark.parametrize("policy", ["finish_by_close", "start_by_close"])
@pytest.mark.parametrize("loading", ["parallel", "sequential"])
@pytest.mark.parametrize("strategy", STRATEGIES)
def test_every_strategy_and_policy_returns_valid_result(policy, loading, strategy):
    for fixture in scenarios(policy, loading).values():
        data = PlanningInput.model_validate(fixture)
        result = plan(data, strategy)
        assert result["validation"]["valid"], result["validation"]
        assert result["metrics"]["on_time_scheduled_litres"] <= data.depot.available_stock_litres
        assert result["optimality_claim"] is False
        assert result["approvable"]


def test_deterministic_routes_and_metrics(input_data):
    first, second = plan(input_data), plan(input_data)
    for key in ("vehicle_routes", "site_results", "metrics", "input_snapshot_sha256"):
        assert first[key] == second[key]


def test_validator_detects_corrupted_capacity_stock_and_timing(input_data):
    routes = deepcopy(plan(input_data)["vehicle_routes"])
    assert routes, "Scenario should exercise actual routes"
    routes[0]["stops"][0]["planned_litres"] = 20000
    routes[0]["planned_load_litres"] = sum(s["planned_litres"] for s in routes[0]["stops"])
    result = validate_plan(input_data, routes)
    assert {"VEHICLE_CAPACITY", "DEPOT_STOCK_EXCEEDED", "SITE_QUANTITY_BOUND"} <= set(result["errors"])
    routes = deepcopy(plan(input_data)["vehicle_routes"])
    routes[0]["stops"][0]["estimated_arrival"] = "2026-10-10T00:00:00+00:00"
    assert "SITE_START_WINDOW" in validate_plan(input_data, routes)["errors"]


def test_finish_policy_includes_unloading_duration(input_data):
    payload = input_data.model_dump(mode="json")
    for site in payload["sites"]:
        site["closes_at"] = "2026-10-10T08:10:00+05:30"
    finish = plan(PlanningInput.model_validate(payload))
    assert finish["metrics"]["on_time_scheduled_litres"] == 0
    payload["service_window_policy"] = "start_by_close"
    start = plan(PlanningInput.model_validate(payload))
    assert start["metrics"]["on_time_scheduled_litres"] > 0


def test_validator_detects_late_unloading(input_data):
    routes = deepcopy(plan(input_data)["vehicle_routes"])
    stop = routes[0]["stops"][0]
    site = next(s for s in input_data.sites if s.site_id == stop["site_id"])
    stop["estimated_arrival"] = site.closes_at.isoformat()
    stop["estimated_departure"] = (site.closes_at + timedelta(minutes=site.service_duration_minutes)).isoformat()
    assert "SITE_FINISH_WINDOW" in validate_plan(input_data, routes)["errors"]


def test_unconfirmed_and_unreachable_sites_are_not_scheduled(input_data):
    payload = input_data.model_dump(mode="json")
    payload["sites"][0]["confirmation_status"] = "draft"
    payload["travel_matrix"]["durations_seconds"][0][2] = None
    result = plan(PlanningInput.model_validate(payload))
    assert all(stop["site_id"] not in {"SITE-1", "SITE-2"} for route in result["vehicle_routes"] for stop in route["stops"])
    assert result["site_results"][1]["reason"].startswith("No complete depot connection")


def test_zero_supply_and_missing_vehicles_do_not_invent_resources(input_data):
    payload = input_data.model_dump(mode="json")
    payload["depot"]["available_stock_litres"] = 0
    result = plan(PlanningInput.model_validate(payload))
    assert result["metrics"]["on_time_scheduled_litres"] == 0
    payload["vehicles"] = []
    result = plan(PlanningInput.model_validate(payload))
    assert not result["approvable"]
    assert not result["vehicle_routes"]


@pytest.mark.parametrize("mutation", ["negative_stock", "outside_area", "wrong_increment", "bad_matrix", "naive_time", "duplicate_id"])
def test_invalid_inputs_are_rejected(input_data, mutation):
    payload = input_data.model_dump(mode="json")
    if mutation == "negative_stock":
        payload["depot"]["available_stock_litres"] = -1
    elif mutation == "outside_area":
        payload["sites"][0]["location"]["latitude"] = 30.0
    elif mutation == "wrong_increment":
        payload["sites"][0]["requested_litres"] = 2101
    elif mutation == "bad_matrix":
        payload["travel_matrix"]["durations_seconds"][0] = []
    elif mutation == "naive_time":
        payload["depot"]["opens_at"] = "2026-10-10T07:00:00"
    else:
        payload["sites"][0]["site_id"] = payload["sites"][1]["site_id"]
    with pytest.raises(ValidationError):
        PlanningInput.model_validate(payload)


def test_critical_minimum_precedes_extra_litres(input_data):
    import time
    payload = input_data.model_dump(mode="json")
    payload["depot"]["available_stock_litres"] = 1200
    data = PlanningInput.model_validate(payload)
    quantities, _ = allocate(data, "jalsetu", set(), time.monotonic() + 5)
    assert quantities["SITE-1"] == quantities["SITE-2"] == 600
    assert sum(quantities.values()) == 1200


def test_sequential_loading_never_overlaps(input_data):
    payload = input_data.model_dump(mode="json")
    payload["loading_mode"] = "sequential"
    result = plan(PlanningInput.model_validate(payload))
    intervals = sorted((datetime.fromisoformat(r["loading_started_at"]), datetime.fromisoformat(r["estimated_departure"])) for r in result["vehicle_routes"])
    assert all(end <= next_start for (_, end), (next_start, _) in pairwise(intervals))


def test_one_unusable_vehicle_does_not_block_other_vehicles(input_data):
    payload = input_data.model_dump(mode="json")
    payload["vehicles"][0]["closes_at"] = "2026-10-10T07:05:00+05:30"
    result = plan(PlanningInput.model_validate(payload))
    assert result["metrics"]["on_time_scheduled_litres"] > 0
    assert all(r["vehicle_id"] != "VEH-1" for r in result["vehicle_routes"])


def test_timeout_is_not_reported_as_proven_infeasibility_or_valid_dispatch(input_data):
    payload = input_data.model_dump(mode="json")
    payload["solver_time_limit_seconds"] = 0.000001
    result = plan(PlanningInput.model_validate(payload))
    assert result["status"] == "no_solution_within_limit"
    assert not result["approvable"]
    assert result["optimality_claim"] is False


@pytest.mark.parametrize("strategy", STRATEGIES)
def test_balanced_supply_meets_every_request(strategy):
    data = PlanningInput.model_validate(scenarios("finish_by_close", "parallel")["balanced_supply"])
    result = plan(data, strategy)
    assert result["metrics"]["unmet_requested_litres"] == 0
    assert result["metrics"]["served_site_count"] == 8


def test_packing_assignments_are_used_by_routes(input_data):
    result = plan(input_data)
    assert result["metrics"]["on_time_scheduled_litres"] == 12000
    assert result["metrics"]["served_site_count"] == 8


def test_windows_cannot_silently_cross_the_operating_day(input_data):
    payload = input_data.model_dump(mode="json")
    payload["vehicles"][0]["closes_at"] = "2026-10-11T13:00:00+05:30"
    with pytest.raises(ValidationError, match="IST operating day"):
        PlanningInput.model_validate(payload)


def test_proportional_rounding_uses_largest_remainder(input_data):
    import time
    payload = input_data.model_dump(mode="json")
    payload["depot"]["available_stock_litres"] = 700
    requests = [1100, 1000, 1000]
    for i, site in enumerate(payload["sites"]):
        site["requested_litres"] = site["receiving_limit_litres"] = requests[i] if i < 3 else 0
        site["minimum_useful_litres"] = 100 if i < 3 else 0
    result, _ = allocate(PlanningInput.model_validate(payload), "demand_proportional", set(), time.monotonic() + 5)
    # Quotas: 2.484, 2.258, 2.258 units. Hamilton gives the spare unit to SITE-1.
    assert [result[f"SITE-{i}"] for i in range(1, 4)] == [300, 200, 200]


def test_proportional_small_fragments_are_not_dispatched(input_data):
    import time
    payload = input_data.model_dump(mode="json")
    payload["depot"]["available_stock_litres"] = 600
    for site in payload["sites"]:
        site["requested_litres"] = site["receiving_limit_litres"] = 1000
        site["minimum_useful_litres"] = 600
    result, _ = allocate(PlanningInput.model_validate(payload), "demand_proportional", set(), time.monotonic() + 5)
    assert sum(result.values()) == 600
    assert sum(n > 0 for n in result.values()) == 1


@pytest.mark.parametrize("corruption,error", [
    ("unknown_vehicle", "UNKNOWN_VEHICLE"), ("unknown_site", "UNKNOWN_SITE"),
    ("duplicate_route", "DUPLICATE_VEHICLE_ROUTE"), ("duplicate_stop", "DUPLICATE_SITE_ASSIGNMENT"),
    ("unconfirmed", "UNCONFIRMED_SITE"), ("unavailable", "UNAVAILABLE_VEHICLE"),
    ("wrong_depot", "WRONG_DEPOT"), ("sequence", "INVALID_STOP_ASSIGNMENT"),
    ("boolean_quantity", "INVALID_QUANTITY"), ("load_total", "LOAD_METADATA_MISMATCH"),
    ("late_return", "VEHICLE_RETURN_WINDOW"), ("early_return", "IMPOSSIBLE_RETURN"),
    ("loading_duration", "INCORRECT_LOADING_DURATION"), ("leg_metadata", "LEG_METADATA_MISMATCH"),
    ("return_metadata", "RETURN_METADATA_MISMATCH"), ("travel_total", "TRAVEL_TOTAL_MISMATCH"),
    ("naive_route_time", "INVALID_ROUTE_TIMESTAMP"), ("service_duration", "SERVICE_DURATION"),
])
def test_validator_rejects_each_independent_corruption(input_data, corruption, error):
    routes = deepcopy(plan(input_data)["vehicle_routes"])
    payload = input_data.model_dump(mode="json")
    route, stop = routes[0], routes[0]["stops"][0]
    if corruption == "unknown_vehicle":
        route["vehicle_id"] = "NOT-A-VEHICLE"
    elif corruption == "unknown_site":
        stop["site_id"] = "NOT-A-SITE"
    elif corruption == "duplicate_route":
        routes.append(deepcopy(route))
    elif corruption == "duplicate_stop":
        route["stops"].append(deepcopy(stop))
    elif corruption == "unconfirmed":
        next(s for s in payload["sites"] if s["site_id"] == stop["site_id"])["confirmation_status"] = "draft"
    elif corruption == "unavailable":
        next(v for v in payload["vehicles"] if v["vehicle_id"] == route["vehicle_id"])["status"] = "unavailable"
    elif corruption == "wrong_depot":
        route["depot_id"] = "ANOTHER-DEPOT"
    elif corruption == "sequence":
        stop["sequence"] = 99
    elif corruption == "boolean_quantity":
        stop["planned_litres"] = True
    elif corruption == "load_total":
        route["planned_load_litres"] -= 100
    elif corruption == "late_return":
        route["estimated_return"] = (input_data.depot.closes_at + timedelta(seconds=1)).isoformat()
    elif corruption == "early_return":
        route["estimated_return"] = route["estimated_departure"]
    elif corruption == "loading_duration":
        route["loading_started_at"] = route["estimated_departure"]
    elif corruption == "leg_metadata":
        stop["travel_duration_seconds_from_previous"] += 1
    elif corruption == "return_metadata":
        route["return_leg"]["duration_seconds"] += 1
    elif corruption == "travel_total":
        route["travel_distance_metres"] += 1
    elif corruption == "naive_route_time":
        route["estimated_departure"] = "2026-10-10T08:00:00"
    else:
        stop["estimated_departure"] = stop["estimated_arrival"]
    check = validate_plan(PlanningInput.model_validate(payload), routes)
    assert not check["valid"] and error in check["errors"]


def test_unconfirmed_potable_supply_blocks_approval(input_data):
    payload = input_data.model_dump(mode="json")
    payload["depot"]["potable_supply_confirmed"] = False
    result = plan(PlanningInput.model_validate(payload))
    assert result["validation"]["valid"] and not result["approvable"]
    assert any("Potable" in message for message in result["approval_blockers"])
