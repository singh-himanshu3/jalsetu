"""Bounded public-road research, separate from the customer example workflow."""
import argparse
import json
import math
from copy import deepcopy
from datetime import UTC, datetime
from pathlib import Path
from urllib.request import Request, urlopen

from .handler import STRATEGIES, plan
from .metrics import compute_metrics
from .schemas import PlanningInput, TravelMatrix
from .sources import digest, instant
from .validator import validate_plan

ROOT = Path(__file__).resolve().parents[3]
FIXTURES = ROOT / "data/evaluation/finish_by_close_parallel"
SNAPSHOT = ROOT / "data/public-roads/north-delhi-osrm.json"
RESULTS = ROOT / "docs/public-road-results.json"
REPORT = ROOT / "docs/public-road-evaluation.md"
SUMMARY = ROOT / "apps/web/src/public-road-summary.ts"
PROVIDER = "OSRM / OpenStreetMap, FOSSGIS public car service"
ATTRIBUTION = "© OpenStreetMap contributors; routing by OSRM, hosted by FOSSGIS"
LIMITS = [
    "Public car-routing estimates, not tanker height/weight/access clearance or live traffic",
    "Requested coordinates are example locations, not verified relief facilities or permissions",
    "Water, vehicles, requests, priorities and receiving windows remain synthetic",
    "Provider map date is unknown unless data_version is returned; retrieval time is not map age",
    "Missing routes remain unavailable; no straight-line fallback or invented durations",
    "Research uses a frozen snapshot, not an automatically refreshed operational service",
]


def nodes(data):
    return [{"id": data.depot.depot_id, "position": [data.depot.location.longitude, data.depot.location.latitude]},
            *[{"id": s.site_id, "position": [s.location.longitude, s.location.latitude]} for s in data.sites]]


def road_request(data):
    ordered = nodes(data)
    coordinates = ";".join(",".join(str(n) for n in item["position"]) for item in ordered)
    return {"url": f"https://router.project-osrm.org/table/v1/driving/{coordinates}?annotations=duration,distance&generate_hints=false",
            "nodes": ordered, "profile": "public car", "max_snap_metres": 250,
            "traffic": "not supplied", "departure": "not supplied"}


def collect(data):
    """One request, no retries or polling; callers explicitly opt into collection."""
    request = road_request(data)
    http = Request(request["url"], headers={"User-Agent": "JalSetu/0.1 (personal non-commercial road evaluation)", "Accept": "application/json"})
    with urlopen(http, timeout=30) as response:
        if response.status != 200:
            raise ValueError("The public road provider did not return a successful response")
        raw = response.read(2_000_001)
    if len(raw) > 2_000_000:
        raise ValueError("Public road response exceeds the bounded research size")
    payload = json.loads(raw)
    value = {"schema_version": "1.0", "request": request, "payload": payload,
             "retrieved_at": datetime.now(UTC).isoformat(), "provider": PROVIDER,
             "attribution": ATTRIBUTION, "licence": "https://www.openstreetmap.org/copyright",
             "usage_policy": "https://routing.openstreetmap.de/about.html", "limitations": LIMITS,
             "content_sha256": digest(payload)}
    snapshot = {**value, "snapshot_sha256": digest(value)}
    osrm_matrix(snapshot, data)  # Do not save an unusable provider response as accepted evidence.
    return snapshot


def osrm_matrix(snapshot, data):
    value = {key: item for key, item in snapshot.items() if key != "snapshot_sha256"}
    if snapshot["snapshot_sha256"] != digest(value) or snapshot["content_sha256"] != digest(snapshot["payload"]):
        raise ValueError("Public road snapshot integrity check failed")
    if snapshot["request"] != road_request(data):
        raise ValueError("Public road snapshot does not match the exact ordered coordinates/options")
    instant(snapshot["retrieved_at"])
    payload, size = snapshot["payload"], len(nodes(data))
    if payload.get("code") != "Ok" or payload.get("fallback_speed_cells"):
        raise ValueError("Provider error or straight-line fallback cannot establish road estimates")
    for field in ["sources", "destinations"]:
        points = payload.get(field)
        if not isinstance(points, list) or len(points) != size:
            raise ValueError("Provider waypoint count differs from the frozen request")
        for point in points:
            offset = point.get("distance")
            location = point.get("location")
            if (type(offset) not in [int, float] or not math.isfinite(offset) or not 0 <= offset <= 250
                    or not isinstance(location, list) or len(location) != 2
                    or any(type(n) not in [int, float] or not math.isfinite(n) for n in location)
                    or not -180 <= location[0] <= 180 or not -90 <= location[1] <= 90):
                raise ValueError("Provider snapped location is invalid or over the declared 250-m limit")
    matrices = {}
    for field in ["distances", "durations"]:
        rows = payload.get(field)
        if not isinstance(rows, list) or len(rows) != size or any(not isinstance(row, list) or len(row) != size for row in rows):
            raise ValueError("Public road matrix dimensions differ from the request")
        for row in rows:
            for cell in row:
                if cell is not None and (type(cell) not in [int, float] or not math.isfinite(cell) or cell < 0):
                    raise ValueError("Invalid public road matrix value")
        matrices[field] = [[None if cell is None else math.ceil(cell) for cell in row] for row in rows]
    # A partly missing pair is unavailable, never an invented complete leg.
    for i in range(size):
        for j in range(size):
            if matrices["distances"][i][j] is None or matrices["durations"][i][j] is None:
                matrices["distances"][i][j] = matrices["durations"][i][j] = None
    represented = payload.get("data_version")
    if represented is not None:
        instant(represented)
    return TravelMatrix.model_validate({"snapshot_id": "OSRM-" + snapshot["content_sha256"][:16],
        "node_ids": [item["id"] for item in nodes(data)], "durations_seconds": matrices["durations"],
        "distances_metres": matrices["distances"], "provider": snapshot["provider"], "provenance": "public_snapshot",
        "retrieved_at": snapshot["retrieved_at"], "represented_at": represented, "source_url": snapshot["request"]["url"],
        "attribution": snapshot["attribution"], "limitations": snapshot["limitations"]}).model_dump(mode="json")


def evaluate(snapshot):
    records = []
    for path in sorted(FIXTURES.glob("*.json")):
        original = PlanningInput.model_validate_json(path.read_text(encoding="utf-8"))
        matrix = osrm_matrix(snapshot, original)
        # The toy reference is re-solved here; historical metrics are not substituted.
        for source, multiplier in [("synthetic_reference", 1.0), ("public_roads", 1.0), ("public_roads", 1.5), ("public_roads", 2.0)]:
            payload = original.model_dump(mode="json")
            if source == "public_roads":
                payload.update(data_mode="mixed", travel_matrix=deepcopy(matrix),
                    display_warning="PUBLIC ROAD ESTIMATES + EXAMPLE requests, stock, vehicles and locations. Not an actual relief operation.")
            payload["travel_time_multiplier"] = multiplier
            data = PlanningInput.model_validate(payload)
            for strategy in STRATEGIES:
                result = plan(data, strategy)
                records.append({"scenario": path.stem, "source": source, "travel_multiplier": multiplier,
                    "input": data.model_dump(mode="json"), "result": result})
    return {"recorded_at": datetime.now(UTC).isoformat(), "snapshot_sha256": snapshot["snapshot_sha256"], "records": records}


def render(evidence, snapshot):
    records = evidence["records"]
    expected = {(p.stem, source, speed, strategy) for p in FIXTURES.glob("*.json")
                for source, speed in [("synthetic_reference", 1.0), ("public_roads", 1.0), ("public_roads", 1.5), ("public_roads", 2.0)] for strategy in STRATEGIES}
    actual = [(r["scenario"], r["source"], r["travel_multiplier"], r["result"]["strategy"]) for r in records]
    if set(actual) != expected or len(actual) != len(expected) or evidence["snapshot_sha256"] != snapshot["snapshot_sha256"]:
        raise ValueError("Public road report needs complete, uniquely matched evidence")
    rows = []
    fixtures = {p.stem: PlanningInput.model_validate_json(p.read_text(encoding="utf-8")) for p in FIXTURES.glob("*.json")}
    for record in records:
        result = record["result"]
        original = fixtures[record["scenario"]]
        matrix = osrm_matrix(snapshot, original)
        expected_input = original.model_dump(mode="json")
        if record["source"] == "public_roads":
            expected_input.update(data_mode="mixed", travel_matrix=matrix,
                display_warning="PUBLIC ROAD ESTIMATES + EXAMPLE requests, stock, vehicles and locations. Not an actual relief operation.")
        expected_input["travel_time_multiplier"] = record["travel_multiplier"]
        if record["input"] != expected_input:
            raise ValueError("Evaluation input differs from the frozen fixture/road experiment")
        if result["input_snapshot_sha256"] != digest(record["input"]):
            raise ValueError("Evaluation input differs from its result")
        data = PlanningInput.model_validate(record["input"])
        validation = validate_plan(data, result["vehicle_routes"])
        if result["validation"] != validation or not validation["valid"]:
            raise ValueError("Saved routes do not pass independent rechecking")
        if result["metrics"] != compute_metrics(data, result["vehicle_routes"]):
            raise ValueError("Saved metrics differ from recomputed routes")
        m = result["metrics"]
        rows.append({"scenario": record["scenario"], "source": record["source"], "travelMultiplier": record["travel_multiplier"],
                     "strategy": result["strategy"], "scheduledLitres": m["on_time_scheduled_litres"], "unmetLitres": m["unmet_requested_litres"],
                     "servedPoints": m["served_site_count"], "travelKm": round(m["total_travel_distance_metres"] / 1000, 3),
                     "lowestFulfilment": m["minimum_fulfilment_ratio"], "valid": result["validation"]["valid"], "status": result["status"]})
    lines = ["# Public-road planning evidence", "", "Public road estimates are used with **example requests, vehicles, stock, priorities and receiving locations**. This is a reproducible mixed-data software evaluation, not a real relief operation or observed delivery benefit.", "",
        f"Retrieved: {snapshot['retrieved_at']}. Provider map date: {snapshot['payload'].get('data_version') or 'not supplied; unknown'}. All compared strategies reuse the same frozen road snapshot.", "",
        "One table request covers nine example nodes (81 pairs). Returned road distances/durations are rounded upward to whole metres/seconds. Snapped endpoints must be within the declared 250-m research limit. Missing legs remain unavailable.", "",
        "The 1.5× and 2× travel times are **invented sensitivity settings**, not measured traffic. The synthetic reference is re-solved alongside the public-road cases. Policies are finish-unloading-by-close and parallel loading; seed 42; five seconds per strategy; 100-L units. These are experiment settings, not coordinator instructions.", "",
        "| Scenario | Source | Travel setting | Strategy | Scheduled L | Unmet L | Served points | Travel km | Lowest fulfilment | Status | Check |",
        "|---|---|---:|---|---:|---:|---:|---:|---:|---|---|"]
    for r in rows:
        lines.append(f"| {r['scenario']} | {r['source']} | {r['travelMultiplier']:g}× | {r['strategy']} | {r['scheduledLitres']} | {r['unmetLitres']} | {r['servedPoints']} | {r['travelKm']:.3f} | {r['lowestFulfilment']:.1%} | {r['status']} | {'passed' if r['valid'] else 'FAILED'} |")
    lines += ["", "## What this establishes", "", f"{len(rows)} bounded calculations are retained, including ties, losses and failed statuses. {sum(r['valid'] for r in rows)} returned passing independent route checks. Checked feasibility does not prove optimality or establish a universal winner.", "",
        "The provider uses a public car profile. It does not establish tanker accessibility, current congestion, service permission, water quality, actual stock, real requests or deliveries. No weather/population data created priorities or demand. A historical or current field backtest has not been performed.", "",
        "To establish operational impact next, obtain anonymized confirmed requests/resources and the coordinator's original plan, then run a paired comparison with identical inputs. Collect observed arrival/delivery reports and coordinator feedback separately. Do not use modelled quantities as measured benefits.", "",
        "## Sources and reproduction", "", f"{ATTRIBUTION}. [OpenStreetMap data licence](https://www.openstreetmap.org/copyright), [OSRM HTTP API](https://project-osrm.org/docs/v5.24.0/api/), [FOSSGIS usage policy](https://routing.openstreetmap.de/about.html), [fix the map](https://www.openstreetmap.org/).", "",
        "Run `pnpm evaluate:roads` to solve again from the saved snapshot **without network requests**. `pnpm render:roads` rebuilds the report and customer summary from saved measured results without solving. `pnpm collect:roads` makes one explicit collection request only if the snapshot file does not already exist. No background refresh, paid provider or AWS call is enabled.", "",
        "The complete developer evidence retains raw response, ordered request, snapped positions, hashes, all inputs, routes, validation and metrics. The customer summary exposes readable quantities and source limits only.", ""]
    summary = {"retrievedAt": snapshot["retrieved_at"], "mapDate": snapshot["payload"].get("data_version"),
               "provider": PROVIDER, "nodeCount": len(snapshot["request"]["nodes"]), "calculationCount": len(rows),
               "passedChecks": sum(r["valid"] for r in rows), "rows": rows}
    return "\n".join(lines), summary


def main():
    parser = argparse.ArgumentParser(description="Public-road research with explicitly synthetic operational inputs")
    parser.add_argument("command", choices=["collect", "evaluate", "render"])
    args = parser.parse_args()
    if args.command == "collect":
        if SNAPSHOT.exists():
            parser.error("A frozen road snapshot already exists; it will not be overwritten or refreshed")
        data = PlanningInput.model_validate_json((FIXTURES / "north_delhi_example.json").read_text(encoding="utf-8"))
        snapshot = collect(data)
        SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
        SNAPSHOT.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8", newline="\n")
        print("Saved one public road response. Operational inputs remain examples. No AWS calls.")
        return
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    if args.command == "evaluate":
        evidence = evaluate(snapshot)
        RESULTS.write_text(json.dumps(evidence, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8", newline="\n")
    else:
        evidence = json.loads(RESULTS.read_text(encoding="utf-8"))
    text, summary = render(evidence, snapshot)
    REPORT.write_text(text, encoding="utf-8", newline="\n")
    SUMMARY.write_text("// Generated by pnpm render:roads from measured public-road research; no runtime provider calls.\nexport default "
                       + json.dumps(summary, indent=2, ensure_ascii=False, allow_nan=False) + ";\n", encoding="utf-8", newline="\n")
    print(f"Recorded {len(evidence['records'])} complete strategy/scenario results from the frozen public road snapshot. No network calls.")


if __name__ == "__main__":
    main()
