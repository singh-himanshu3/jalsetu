"""Synthetic provider responses only; no external calls or licence assertions."""
from copy import deepcopy

import pytest

from jalsetu_planner.sources import cached_source, location_matrix, source_snapshot


@pytest.fixture
def data():
    request = {"node_ids": ["DEPOT", "SITE"], "positions": [[77.1, 28.7], [77.2, 28.8]],
               "departure": "2026-10-10T01:30:00Z", "travel_mode": "Truck", "traffic": "disabled"}
    metadata = {"snapshot_id": "SOURCE-1", "source_type": "route_matrix", "provider": "Amazon Location v2 response fixture (synthetic)",
                "source_url": "https://docs.aws.amazon.com/location/latest/APIReference/API_CalculateRouteMatrix.html",
                "retrieved_at": "2026-10-09T12:00:00Z", "represented_start": "2026-10-10T01:30:00Z",
                "represented_end": "2026-10-10T01:30:00Z", "attribution": "Synthetic test fixture",
                "licence": "Synthetic test data; no provider-data licence assertion", "coverage": "Two synthetic nodes",
                "limitations": ["Not a real road calculation or live traffic"], "is_example": True, "node_ids": request["node_ids"]}
    payload = {"ErrorCount": 0, "RouteMatrix": [[{"Distance": 0, "Duration": 0}, {"Distance": 1200.1, "Duration": 61.5}],
                                              [{"Distance": 1400, "Duration": 75}, {"Distance": 0, "Duration": 0}]]}
    return request, metadata, payload


def test_asymmetric_matrix_keeps_order_and_rounds_conservatively(data):
    request, metadata, payload = data
    result = location_matrix(source_snapshot(payload, request, metadata), request["node_ids"])
    assert result["distances_metres"] == [[0, 1201], [1400, 0]]
    assert result["durations_seconds"] == [[0, 62], [75, 0]]
    assert result["provenance"] == "example" and "synthetic" in result["provider"]


def test_route_error_becomes_missing_leg_without_invented_values(data):
    request, metadata, payload = data
    payload["RouteMatrix"][0][1] = {"Error": "RouteNotFound", "Distance": 0, "Duration": 0}
    payload["ErrorCount"] = 1
    matrix = location_matrix(source_snapshot(payload, request, metadata), request["node_ids"])
    assert matrix["distances_metres"][0][1] is None and matrix["durations_seconds"][0][1] is None


@pytest.mark.parametrize("damage", ["dimensions", "negative", "nonfinite", "count", "node_order"])
def test_bad_provider_response_is_rejected(data, damage):
    request, metadata, payload = data
    if damage == "dimensions":
        payload["RouteMatrix"].pop()
    elif damage == "negative":
        payload["RouteMatrix"][0][1]["Duration"] = -1
    elif damage == "nonfinite":
        payload["RouteMatrix"][0][1]["Distance"] = float("nan")
    elif damage == "count":
        payload["ErrorCount"] = 1
    else:
        metadata["node_ids"] = list(reversed(request["node_ids"]))
    with pytest.raises(ValueError):
        location_matrix(source_snapshot(payload, request, metadata), request["node_ids"])


def test_cached_outage_keeps_true_age_times_hash_and_limitation(data):
    request, metadata, payload = data
    snapshot = source_snapshot(payload, request, metadata)
    prior = deepcopy(snapshot)
    cached = cached_source(snapshot, request, now="2026-10-09T14:00:00Z", max_age_seconds=7200)
    assert cached["age_seconds"] == 7200 and cached["cached"] and cached["warning"]
    assert cached["snapshot"] == prior and snapshot == prior
    assert cached["snapshot"]["metadata"]["represented_start"] == "2026-10-10T01:30:00Z"


@pytest.mark.parametrize("change", ["coordinate", "departure", "traffic", "node_order"])
def test_changed_request_cannot_reuse_cached_source(data, change):
    request, metadata, payload = data
    snapshot = source_snapshot(payload, request, metadata)
    if change == "coordinate":
        request["positions"][1][0] += 0.001
    elif change == "departure":
        request["departure"] = "2026-10-11T01:30:00Z"
    elif change == "traffic":
        request["traffic"] = "enabled"
    else:
        request["node_ids"].reverse()
    with pytest.raises(ValueError, match="does not match"):
        cached_source(snapshot, request, now="2026-10-09T14:00:00Z", max_age_seconds=7200)


@pytest.mark.parametrize("damage", ["content", "metadata", "request", "old", "future"])
def test_corrupt_or_unusable_cached_source_is_rejected(data, damage):
    request, metadata, payload = data
    snapshot = source_snapshot(payload, request, metadata)
    now = "2026-10-09T14:00:00Z"
    if damage == "content":
        snapshot["payload"]["RouteMatrix"][0][1]["Distance"] = 900
    elif damage == "metadata":
        snapshot["metadata"]["retrieved_at"] = "2026-10-09T13:00:00Z"
    elif damage == "request":
        snapshot["request"]["positions"][0][0] += 0.001
    elif damage == "old":
        now = "2026-10-09T15:00:00Z"
    else:
        now = "2026-10-09T11:00:00Z"
    with pytest.raises(ValueError):
        cached_source(snapshot, request, now=now, max_age_seconds=7200)


def test_metadata_must_include_dated_attributed_limitations(data):
    request, metadata, payload = data
    metadata.pop("attribution")
    with pytest.raises(ValueError, match="metadata is incomplete"):
        source_snapshot(payload, request, metadata)

