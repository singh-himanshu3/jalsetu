"""Offline checks of installed solver libraries and the Lambda runtime interface."""

import json
import sys
import time
import urllib.request
from copy import deepcopy

import boto3
from cloud.offline import execute as offline_workflow
from jalsetu_planner.bridge import execute
from jalsetu_planner.fixtures import example_input
from jalsetu_planner.handler import STRATEGIES


def maximum_example():
    value = example_input("finish_by_close", "parallel")
    value["solver_time_limit_seconds"] = 2
    for number in range(9, 21):
        site = deepcopy(value["sites"][(number - 1) % 8])
        site.update(site_id=f"SITE-{number}", name=f"Example point {number}")
        value["sites"].append(site)
    for number in (4, 5):
        vehicle = deepcopy(value["vehicles"][0])
        vehicle.update(vehicle_id=f"VEH-{number}", name=f"Example vehicle {number}")
        value["vehicles"].append(vehicle)
    matrix = value["travel_matrix"]
    matrix["node_ids"] = ["DEPOT-1", *[site["site_id"] for site in value["sites"]]]
    matrix["durations_seconds"] = [[0 if i == j else 300 + 30 * abs(i - j) for j in range(21)] for i in range(21)]
    matrix["distances_metres"] = [[0 if i == j else 1800 + 100 * abs(i - j) for j in range(21)] for i in range(21)]
    return value


def invoke(event):
    request = urllib.request.Request(
        "http://127.0.0.1:8080/2015-03-31/functions/function/invocations",
        data=json.dumps(event).encode(), headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        value = json.load(response)
    assert "statusCode" in value, value
    return value["statusCode"], json.loads(value["body"])


def runtime():
    event = {"httpMethod": "GET", "path": "/v1/health", "requestContext": {}}
    assert invoke(event)[0] == 401
    event["requestContext"] = {"authorizer": {"claims": {"sub": "11111111-1111-4111-8111-111111111111"}}}
    assert invoke(event)[0] == 200
    event["path"] = "/v1/example"
    status, value = invoke(event)
    assert status == 200 and value["data_mode"] == "example", value
    value.update(service_window_policy="finish_by_close", loading_mode="parallel")
    event.update(httpMethod="POST", path="/v1/validate-input", body=json.dumps({"input": value}))
    assert invoke(event)[0] == 200
    event["body"] = "[]"
    assert invoke(event)[0] == 400
    print("Lambda runtime interface: authentication, health, example, validation and invalid JSON passed")


def solver():
    started = time.monotonic()
    result = execute({"command": "compare", "input": maximum_example()})
    assert "error" not in result, result
    assert [plan["strategy"] for plan in result["plans"]] == list(STRATEGIES)
    for plan in result["plans"]:
        assert plan["validation"]["valid"], plan["validation"]
        assert plan["status"] == "feasible", plan["status"]
        assert plan["metrics"]["on_time_scheduled_litres"] > 0
    print(json.dumps({"check": "20 sites / 5 vehicles / four validated feasible strategies",
                      "elapsed_seconds": round(time.monotonic() - started, 3),
                      "boto3": boto3.__version__}))
    staged = offline_workflow({"input": maximum_example(), "job_id": "00000000-0000-4000-8000-000000000002"})
    assert staged["status"] == "completed", staged.get("error")
    assert len(staged["stage_history"]) == 7 and len(staged["plans"]) == 4
    print('Offline seven-stage workflow and immutable result checks passed in the Linux image')
    value = maximum_example()
    scenarios = offline_workflow({"input": value, "job_id": "00000000-0000-4000-8000-000000000003",
        "kind": "marginal", "parent_job_id": staged["job_id"], "parent_input": value,
        "options": {"extra_stock_litres": 1000, "vehicle_capacity_litres": 5000, "earlier_start_minutes": 30,
                    "closing_site_id": value["sites"][0]["site_id"], "later_close_minutes": 30, "shorter_service_minutes": 5}})
    assert scenarios["status"] == "completed", scenarios.get("error")
    children = scenarios["analysis"]["children"]
    assert len(children) == 6 and all(c["plan"]["validation"]["valid"] for c in children if "plan" in c)
    assert next(c for c in children if c["kind"] == "vehicle")["status"] == "not_applicable"
    print('Bounded scenario batch: independent checked children and explicit five-vehicle limit passed')


if __name__ == "__main__":
    runtime() if sys.argv[1:] == ["runtime"] else solver()
