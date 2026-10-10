"""Explicit, bounded local record review and public-road acquisition."""
from copy import deepcopy

from .public_roads import collect, osrm_matrix
from .schemas import PlanningInput
from .sources import digest


def review_records(payload):
    if not isinstance(payload, dict):
        raise TypeError("Enter the record-based setup fields first")
    value = deepcopy(payload)
    if value.get("data_mode") != "operator_entered":
        raise ValueError("Use a record-based project for this action")
    entities = [value["depot"], *value["sites"]]
    positions = [e["location"] for e in entities]
    try:
        longitudes = [float(p["longitude"]) for p in positions]
        latitudes = [float(p["latitude"]) for p in positions]
    except (TypeError, ValueError):
        raise ValueError("Enter the recorded longitude and latitude for the depot and every receiving point") from None
    value["pilot_bounds"] = [min(longitudes)-0.00001, min(latitudes)-0.00001,
                             max(longitudes)+0.00001, max(latitudes)+0.00001]
    ids = [value["depot"]["depot_id"], *[s["site_id"] for s in value["sites"]]]
    # Validation placeholder only: never returned or passed to planning.
    value["travel_matrix"] = {"snapshot_id": "REVIEW-ONLY", "node_ids": ids,
        "durations_seconds": [[0 for _ in ids] for _ in ids], "distances_metres": [[0 for _ in ids] for _ in ids],
        "provider": "Not collected", "provenance": "public_snapshot", "retrieved_at": "2000-01-01T00:00:00Z",
        "represented_at": None, "source_url": None, "attribution": "Validation only", "limitations": ["Not routing"]}
    data = PlanningInput.model_validate(value)
    if not data.vehicles or not any(v.status == "available" for v in data.vehicles):
        raise ValueError("Enter at least one available vehicle")
    if not any(s.confirmation_status == "confirmed" for s in data.sites):
        raise ValueError("Confirm at least one actual request")
    if data.solver_time_limit_seconds > 20:
        raise ValueError("Local planning supports at most 20 seconds per option")
    return data


def fetch_record_roads(payload):
    data = review_records(payload)  # All records checked before any network request.
    snapshot = collect(data)
    snapshot["limitations"] = [
        "Car routing estimates; tanker access and receiving permission require operator review",
        "Locations and operational records are operator-entered, not independently verified",
        "Frozen estimates, not live traffic; map date may be unknown",
    ]
    snapshot["snapshot_sha256"] = digest({k: v for k, v in snapshot.items() if k != "snapshot_sha256"})
    result = data.model_dump(mode="json")
    result["travel_matrix"] = osrm_matrix(snapshot, data)
    return {"input": result, "road_snapshot": snapshot}


def verify_record_roads(data, snapshot):
    if not snapshot or osrm_matrix(snapshot, data) != data.travel_matrix.model_dump(mode="json"):
        raise ValueError("Road estimates are missing or changed. Fetch matching roads again before planning.")
