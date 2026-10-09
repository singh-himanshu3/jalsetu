"""Synthetic unit/evaluation scenarios; policy fields are explicit scenario settings."""

from copy import deepcopy


def example_input(service_window_policy: str, loading_mode: str):
    locations = [(77.20, 28.69), (77.19, 28.70), (77.21, 28.71), (77.22, 28.70), (77.23, 28.68), (77.21, 28.67), (77.18, 28.68), (77.18, 28.71), (77.23, 28.72)]
    ids = ["DEPOT-1", *(f"SITE-{i}" for i in range(1, 9))]
    # These are invented exercise durations, not observations or road estimates.
    durations = [[0 if i == j else 300 + 90 * abs(i - j) for j in range(9)] for i in range(9)]
    distances = [[0 if i == j else 1800 + 450 * abs(i - j) for j in range(9)] for i in range(9)]
    def stamp(hour, minute=0):
        return f"2026-10-10T{hour:02d}:{minute:02d}:00+05:30"
    requests = [2500, 2200, 3000, 1800, 1600, 2400, 1200, 1400]
    priorities = ["critical", "critical", "high", "high", "standard", "standard", "standard", "standard"]
    return {
        "schema_version": "1.0", "project_id": "EXAMPLE-NORTH-DELHI", "name": "Example North Delhi relief exercise",
        "data_mode": "example", "display_warning": "EXAMPLE DATA: synthetic resources, requests and travel matrix. Not NGO or government inventory, site permission or real traffic.",
        "operating_date": "2026-10-10", "timezone": "Asia/Kolkata",
        "pilot_bounds": [77.16, 28.66, 77.24, 28.73], "increment_litres": 100,
        "service_window_policy": service_window_policy, "loading_mode": loading_mode,
        "solver_time_limit_seconds": 5.0, "random_seed": 42, "travel_time_multiplier": 1.0,
        "depot": {"depot_id": "DEPOT-1", "name": "Example relief depot", "location": {"longitude": locations[0][0], "latitude": locations[0][1]}, "available_stock_litres": 12000, "opens_at": stamp(7), "closes_at": stamp(13), "loading_duration_minutes": 15, "potable_supply_confirmed": True, "provenance": "example"},
        "vehicles": [{"vehicle_id": f"VEH-{i}", "name": f"Example vehicle {i}", "capacity_litres": capacity, "opens_at": stamp(7), "closes_at": stamp(13), "status": "available", "provenance": "example"} for i, capacity in enumerate([5000, 4000, 3000], 1)],
        "sites": [{"site_id": f"SITE-{i}", "name": f"Example point {i}", "location": {"longitude": locations[i][0], "latitude": locations[i][1]}, "confirmation_status": "confirmed", "requested_litres": request, "minimum_useful_litres": 600, "receiving_limit_litres": request, "opens_at": stamp(8), "closes_at": stamp(10 if i == 2 else 12), "service_duration_minutes": 20, "priority_class": priorities[i - 1], "priority_reason": "Synthetic operator-declared priority for an exercise, not a medical score", "provenance": "example"} for i, request in enumerate(requests, 1)],
        "travel_matrix": {"snapshot_id": "EXAMPLE-MATRIX-1", "node_ids": ids, "durations_seconds": durations, "distances_metres": distances, "provider": "Synthetic exercise fixture", "provenance": "example", "retrieved_at": None, "represented_at": None, "source_url": None, "attribution": "Synthetic scenario authored during this build; no external routing dataset", "limitations": ["Invented exercise travel matrix", "Not road navigation, actual distance or live traffic", "Locations do not establish permission to operate"]},
    }


def scenarios(service_window_policy: str, loading_mode: str):
    base = example_input(service_window_policy, loading_mode)
    balanced = deepcopy(base)
    balanced["project_id"] = "TEST-BALANCED-SUPPLY"
    for site in balanced["sites"]:
        site["requested_litres"] = site["receiving_limit_litres"] = 1000
    shortage = deepcopy(base)
    shortage["project_id"] = "TEST-STOCK-SHORTAGE"
    shortage["depot"]["available_stock_litres"] = 7000
    narrow = deepcopy(base)
    narrow["project_id"] = "TEST-NARROW-WINDOWS"
    for i, site in enumerate(narrow["sites"]):
        if i % 2 == 0:
            site["closes_at"] = "2026-10-10T08:15:00+05:30"
    unavailable = deepcopy(base)
    unavailable["project_id"] = "TEST-VEHICLE-UNAVAILABLE"
    unavailable["vehicles"][0]["status"] = "unavailable"
    # A failure-after-delivery fixture requires the event-ledger phase. This input
    # only tests an unavailable vehicle; it must not masquerade as that later gate.
    return {"balanced_supply": balanced, "stock_shortage": shortage, "narrow_time_windows": narrow, "vehicle_unavailable": unavailable}
