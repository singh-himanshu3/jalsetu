"""Offline Phase 5 adapters. No HTTP/SDK clients or automatic provider refresh."""
import hashlib
import json
import math
from copy import deepcopy
from datetime import datetime

from .schemas import TravelMatrix


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def instant(value):
    result = datetime.fromisoformat(value)
    if result.tzinfo is None or result.utcoffset() is None:
        raise ValueError("Source times need an explicit timezone")
    return result


def source_snapshot(payload, request, metadata):
    """Hash canonical JSON content; metadata never implies real resource facts."""
    required = ["snapshot_id", "source_type", "provider", "source_url", "retrieved_at",
                "represented_start", "represented_end", "attribution", "licence",
                "coverage", "limitations", "is_example"]
    if any(key not in metadata for key in required):
        raise ValueError("Source snapshot metadata is incomplete")
    for key in ["snapshot_id", "source_type", "provider", "source_url", "attribution", "licence", "coverage"]:
        if not isinstance(metadata[key], str) or not metadata[key].strip():
            raise ValueError("Source snapshot metadata needs nonempty text")
    if type(metadata["is_example"]) is not bool or not isinstance(metadata["limitations"], list) or not metadata["limitations"] or any(not isinstance(value, str) or not value.strip() for value in metadata["limitations"]):
        raise ValueError("Source snapshots need explicit example labels and limitations")
    for key in ["retrieved_at", "represented_start", "represented_end"]:
        instant(metadata[key])
    if instant(metadata["represented_end"]) < instant(metadata["represented_start"]):
        raise ValueError("Source represented period is reversed")
    value = {"metadata": deepcopy(metadata), "payload": deepcopy(payload), "request": deepcopy(request),
             "content_sha256": digest(payload), "request_sha256": digest(request)}
    return {**value, "snapshot_sha256": digest(value)}


def checked_snapshot(snapshot):
    if snapshot != source_snapshot(snapshot["payload"], snapshot["request"], snapshot["metadata"]):
        raise ValueError("Cached source failed its content or manifest hash check")


def cached_source(snapshot, request, *, now, max_age_seconds):
    """Caller supplies the freshness policy; a new timestamp never hides age."""
    if type(max_age_seconds) is not int or max_age_seconds < 0:
        raise ValueError("Specify a nonnegative cache freshness limit")
    if snapshot["request_sha256"] != digest(request):
        raise ValueError("Cached source does not match current coordinates and parameters")
    checked_snapshot(snapshot)
    metadata = snapshot["metadata"]
    age = (instant(now) - instant(metadata["retrieved_at"])).total_seconds()
    if age < 0 or age > max_age_seconds:
        raise ValueError("Cached source is outside the selected freshness policy")
    return {"snapshot": deepcopy(snapshot), "cached": True, "age_seconds": age,
            "warning": "Provider refresh unavailable. Showing the original cached snapshot and retrieval time."}


def location_matrix(snapshot, node_ids):
    """Normalize v2 response cells to the existing matrix contract.

    Provider errors become missing legs, never invented distances/durations.
    Ceil positive real values to whole metres/seconds; reject malformed values.
    """
    checked_snapshot(snapshot)
    raw = snapshot["payload"]
    cells = raw.get("RouteMatrix")
    if not isinstance(cells, list) or len(cells) != len(node_ids) or any(not isinstance(row, list) or len(row) != len(node_ids) for row in cells):
        raise ValueError("Provider matrix dimensions do not match frozen nodes")
    distances, durations, errors = [], [], 0
    for row in cells:
        distance_row, duration_row = [], []
        for cell in row:
            if not isinstance(cell, dict):
                raise TypeError("Invalid provider matrix cell")
            if cell.get("Error"):
                errors += 1
                distance_row.append(None)
                duration_row.append(None)
                continue
            for field in ["Distance", "Duration"]:
                value = cell.get(field)
                if type(value) not in [int, float] or not math.isfinite(value) or value < 0:
                    raise ValueError("Provider matrix values must be finite nonnegative numbers")
            distance_row.append(math.ceil(cell["Distance"]))
            duration_row.append(math.ceil(cell["Duration"]))
        distances.append(distance_row)
        durations.append(duration_row)
    if type(raw.get("ErrorCount")) is not int or raw["ErrorCount"] != errors:
        raise ValueError("Provider matrix error count does not match its cells")
    metadata = snapshot["metadata"]
    # Node order belongs to the request identity, not to the provider response.
    # The adapter requires the explicit frozen node list saved in metadata.
    if metadata.get("node_ids") != node_ids or snapshot["request"].get("node_ids") != node_ids:
        raise ValueError("Provider snapshot node order does not match the planning input")
    matrix = TravelMatrix.model_validate({
        "snapshot_id": metadata["snapshot_id"], "node_ids": node_ids,
        "distances_metres": distances, "durations_seconds": durations,
        "provider": metadata["provider"], "provenance": "example" if metadata["is_example"] else "public_snapshot",
        "retrieved_at": metadata["retrieved_at"], "represented_at": metadata["represented_start"],
        "source_url": metadata["source_url"], "attribution": metadata["attribution"],
        "limitations": metadata["limitations"],
    })
    return matrix.model_dump(mode="json")

