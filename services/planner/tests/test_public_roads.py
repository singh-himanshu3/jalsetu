"""Offline corruption/failure regressions for actual public-road evidence."""
import json
from copy import deepcopy

import pytest

from jalsetu_planner.public_roads import FIXTURES, RESULTS, SNAPSHOT, osrm_matrix, render
from jalsetu_planner.schemas import PlanningInput
from jalsetu_planner.sources import digest


@pytest.fixture
def source():
    return json.loads(SNAPSHOT.read_text(encoding="utf-8"))


@pytest.fixture
def data():
    return PlanningInput.model_validate_json((FIXTURES / "north_delhi_example.json").read_text(encoding="utf-8"))


def seal(snapshot):
    snapshot["content_sha256"] = digest(snapshot["payload"])
    snapshot["snapshot_sha256"] = digest({k: v for k, v in snapshot.items() if k != "snapshot_sha256"})


def test_downloaded_road_snapshot_preserves_order_rounds_up_and_unknown_map_date(source, data):
    matrix = osrm_matrix(source, data)
    assert matrix["provenance"] == "public_snapshot"
    assert matrix["node_ids"] == [n["id"] for n in source["request"]["nodes"]]
    assert matrix["represented_at"] is None  # Actual provider omitted data_version.
    assert matrix["retrieved_at"] and matrix["durations_seconds"][0][0] == 0
    source["payload"]["durations"][0][1] = 61.2
    source["payload"]["durations"][1][0] = 92.1
    seal(source)
    changed = osrm_matrix(source, data)
    assert changed["durations_seconds"][0][1] == 62
    assert changed["durations_seconds"][1][0] == 93


def test_partial_missing_road_leg_stays_unavailable(source, data):
    source["payload"]["durations"][0][1] = None
    seal(source)
    matrix = osrm_matrix(source, data)
    assert matrix["durations_seconds"][0][1] is None
    assert matrix["distances_metres"][0][1] is None


@pytest.mark.parametrize("damage", ["content", "coordinate", "node_order", "negative", "boolean", "dimensions", "snap", "fallback", "error"])
def test_bad_or_mismatched_road_data_is_rejected(source, data, damage):
    if damage == "content":
        source["payload"]["durations"][0][1] += 1
    elif damage == "coordinate":
        source["request"]["nodes"][1]["position"][0] += .001
    elif damage == "node_order":
        source["request"]["nodes"].reverse()
    elif damage == "negative":
        source["payload"]["distances"][0][1] = -1
    elif damage == "boolean":
        source["payload"]["durations"][0][1] = True
    elif damage == "dimensions":
        source["payload"]["durations"].pop()
    elif damage == "snap":
        source["payload"]["sources"][1]["distance"] = 251
    elif damage == "fallback":
        source["payload"]["fallback_speed_cells"] = [[0, 1]]
    else:
        source["payload"]["code"] = "NoTable"
    if damage != "content":
        seal(source)
    with pytest.raises(ValueError):
        osrm_matrix(source, data)


def test_saved_evaluation_is_complete_and_independently_rechecked(source):
    evidence = json.loads(RESULTS.read_text(encoding="utf-8"))
    before = deepcopy(evidence)
    text, summary = render(evidence, source)
    assert evidence == before
    assert summary["calculationCount"] == summary["passedChecks"] == 80
    assert len(summary["rows"]) == 80 and "not a real relief operation" in text
    assert {r["travelMultiplier"] for r in summary["rows"]} == {1, 1.5, 2}


@pytest.mark.parametrize("damage", ["missing", "duplicate", "snapshot", "input", "metrics", "route"])
def test_report_rejects_incomplete_or_tampered_measured_evidence(source, damage):
    evidence = json.loads(RESULTS.read_text(encoding="utf-8"))
    record = next(r for r in evidence["records"] if r["scenario"] == "north_delhi_example")
    if damage == "missing":
        evidence["records"].pop()
    elif damage == "duplicate":
        evidence["records"].append(deepcopy(record))
    elif damage == "snapshot":
        evidence["snapshot_sha256"] = "wrong"
    elif damage == "input":
        record["input"]["depot"]["available_stock_litres"] += 100
        record["result"]["input_snapshot_sha256"] = digest(record["input"])
    elif damage == "metrics":
        record["result"]["metrics"]["on_time_scheduled_litres"] += 100
    else:
        record["result"]["vehicle_routes"][0]["stops"][0]["planned_litres"] += 100
    with pytest.raises(ValueError):
        render(evidence, source)
