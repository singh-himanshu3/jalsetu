"""Exercise cloud HTTP/worker boundaries with real domain logic and no AWS calls."""

from copy import deepcopy
from uuid import uuid4

import pytest
from test_cloud_foundation import MemoryStore, cloud, create_project, event


@pytest.fixture
def approved_cloud(monkeypatch):
    monkeypatch.setenv("DEMO_EXPIRES_AT", "2099-10-10T00:00:00Z")
    monkeypatch.setenv("WEB_ORIGIN", "https://example.invalid")
    store, owner, other = MemoryStore(), str(uuid4()), str(uuid4())
    value = create_project(store, owner)["input"]
    value.update(service_window_policy="finish_by_close", loading_mode="parallel")
    job_id = str(uuid4())
    plans = cloud.checked({"command": "plan", "input": value})["plans"]
    store.put(owner, "JOB", job_id, {"job_id": job_id, "version": 1, "status": "completed", "input": value, "plans": plans})
    request = event(owner, "/v1/approvals", "POST", {"job_id": job_id, "strategy": "jalsetu", "actor": "Example coordinator", "actor_id": other}, **{"Idempotency-Key": "approve"})
    _, response = cloud.dispatch(request, store, "test")
    return store, owner, other, response["operation"], request


def action(store, owner, operation, path, value, key=None, version=None):
    request = event(owner, f"/v1/operations/{operation['operation_id']}/{path}", "POST", value,
                    **{"Idempotency-Key": key or str(uuid4()), "If-Match": str(operation["version"] if version is None else version)})
    return cloud.dispatch(request, store, "test"), request


def report(store, owner, operation, kind, when, payload, key=None, version=None):
    (status, value), request = action(store, owner, operation, "events", {"event": {"event_type": kind, "occurred_at": when, "payload": payload}}, key, version)
    assert status == 200
    return value["operation"], request


def work(monkeypatch, store, owner, job):
    monkeypatch.setattr(cloud, "Store", lambda: store)
    cloud.worker_handler({"owner": owner, "job_id": job["job_id"]}, None)
    return cloud.dispatch(event(owner, f"/v1/planning-jobs/{job['job_id']}"), store, "test")[1]


def test_approval_retry_and_authenticated_owner(approved_cloud):
    store, owner, other, operation, request = approved_cloud
    assert operation["approvals"][0]["actor_id"] == owner
    assert operation["approvals"][0]["authentication"] == "Cognito authenticated coordinator"
    assert "_requests" not in operation
    assert cloud.dispatch(request, store, "test")[1]["operation"] == operation
    assert len(store.list(owner, "OPERATION")) == 1
    assert cloud.dispatch(event(other, "/v1/operations"), store, "test")[1] == {"operations": []}
    for path in [f"/v1/operations/{operation['operation_id']}", "/v1/approvals"]:
        foreign = event(other, path, "GET") if path != "/v1/approvals" else {**request, "requestContext": event(other, path)["requestContext"]}
        with pytest.raises(cloud.ApiError) as error:
            cloud.dispatch(foreign, store, "test")
        assert error.value.status == 404
    altered = deepcopy(request)
    altered["body"] = altered["body"].replace("Example coordinator", "Changed coordinator")
    with pytest.raises(cloud.ApiError) as error:
        cloud.dispatch(altered, store, "test")
    assert error.value.code == "IDEMPOTENCY_CONFLICT"


def test_events_retry_conflict_ownership_and_invalid_report(approved_cloud):
    store, owner, other, operation, _ = approved_cloud
    route = operation["approved_plan"]["vehicle_routes"][0]
    loaded, request = report(store, owner, operation, "vehicle_loaded", route["loading_started_at"], {"vehicle_id": route["vehicle_id"], "litres": route["planned_load_litres"]}, "load")
    assert loaded["ledger"]["conservation_valid"]
    assert loaded["event_audit"][0]["actor_id"] == owner
    assert cloud.dispatch(request, store, "test")[1]["operation"] == loaded
    assert len(loaded["events"]) == 1
    foreign = {**request, "requestContext": event(other, "")["requestContext"]}
    with pytest.raises(cloud.ApiError) as error:
        cloud.dispatch(foreign, store, "test")
    assert error.value.status == 404
    with pytest.raises(cloud.ApiError) as error:
        action(store, owner, loaded, "events", {"event": {}}, "load")
    assert error.value.code == "IDEMPOTENCY_CONFLICT"
    with pytest.raises(cloud.ApiError) as error:
        action(store, owner, loaded, "events", {"event": {}}, version=1)
    assert error.value.status == 409
    with pytest.raises(cloud.ApiError) as error:
        action(store, owner, loaded, "events", {"event": None})
    assert error.value.status == 400
    assert store.get(owner, "OPERATION", loaded["operation_id"])["version"] == 2


def test_failure_delivery_revision_and_approval(approved_cloud, monkeypatch):
    store, owner, _, operation, _ = approved_cloud
    initial = deepcopy(operation["initial_plan"])
    route = operation["approved_plan"]["vehicle_routes"][0]
    stop = route["stops"][0]
    operation, _ = report(store, owner, operation, "vehicle_loaded", route["loading_started_at"], {"vehicle_id": route["vehicle_id"], "litres": route["planned_load_litres"]})
    operation, _ = report(store, owner, operation, "delivery_reported", stop["estimated_departure"], {"vehicle_id": route["vehicle_id"], "site_id": stop["site_id"], "litres": stop["planned_litres"]})
    operation, _ = report(store, owner, operation, "vehicle_failed", stop["estimated_departure"], {"vehicle_id": route["vehicle_id"]})
    (status, job), request = action(store, owner, operation, "replan", {"replan_at": stop["estimated_departure"]}, "revision")
    assert status == 202 and "operation_snapshot" not in job
    assert cloud.dispatch(request, store, "test")[1] == job
    assert store.admitted == 1 and len(store.invocations) == 1
    result = work(monkeypatch, store, owner, job)
    assert result["status"] == "completed" and store.slot is None
    operation = result["operation"]
    assert "_requests" not in operation
    assert operation["revision_draft"]["fixed_reported_deliveries"][stop["site_id"]] == stop["planned_litres"]
    stranded = route["planned_load_litres"] - stop["planned_litres"]
    assert operation["ledger"]["vehicles"][route["vehicle_id"]]["stranded_litres"] == stranded
    (status, response), approval = action(store, owner, operation, "approve-revision", {"actor": "Example revision reviewer"}, "revision-approval")
    assert status == 200
    operation = response["operation"]
    assert operation["current_plan_revision"] == 2
    assert operation["initial_plan"] == initial
    assert operation["ledger"]["conservation_valid"]
    assert operation["approvals"][-1]["actor_id"] == owner
    assert cloud.dispatch(approval, store, "test")[1] == response
    assert cloud.dispatch(event(owner, f"/v1/operations/{operation['operation_id']}"), store, "test")[1] == response
    assert cloud.worker_handler({"owner": owner, "job_id": job["job_id"]}, None)["status"] == "already_claimed"
    recovered, _ = report(store, owner, operation, "water_recovered", stop["estimated_departure"], {"vehicle_id": route["vehicle_id"], "litres": stranded})
    assert recovered["ledger"]["conservation_valid"]
    assert recovered["ledger"]["depot_litres"] == operation["ledger"]["depot_litres"] + stranded


def test_active_vehicle_revision_fails_and_releases_slot(approved_cloud, monkeypatch):
    store, owner, _, operation, _ = approved_cloud
    route = operation["approved_plan"]["vehicle_routes"][0]
    operation, _ = report(store, owner, operation, "vehicle_loaded", route["loading_started_at"], {"vehicle_id": route["vehicle_id"], "litres": route["planned_load_litres"]})
    (_, job), _ = action(store, owner, operation, "replan", {"replan_at": route["stops"][0]["estimated_departure"]})
    result = work(monkeypatch, store, owner, job)
    assert result["status"] == "failed" and "In-progress vehicles" in result["error"]["message"]
    assert store.slot is None
    assert "revision_draft" not in store.get(owner, "OPERATION", operation["operation_id"])


def test_revision_cannot_overwrite_new_event(approved_cloud, monkeypatch):
    store, owner, _, operation, _ = approved_cloud
    when = operation["input"]["depot"]["opens_at"]
    (_, job), _ = action(store, owner, operation, "replan", {"replan_at": when})
    newer, _ = report(store, owner, operation, "depot_stock_adjusted", when, {"delta_litres": 100})
    result = work(monkeypatch, store, owner, job)
    assert result["status"] == "failed" and result["error"]["code"] == "STALE_VERSION"
    saved = cloud.public_operation(store.get(owner, "OPERATION", operation["operation_id"]))
    assert saved == newer and "revision_draft" not in saved
    assert store.slot is None


def test_revision_start_failure_is_terminal(approved_cloud, monkeypatch):
    store, owner, _, operation, _ = approved_cloud
    def unavailable(*args):
        raise RuntimeError("SDK failure")
    monkeypatch.setattr(store, "invoke", unavailable)
    with pytest.raises(cloud.ApiError) as error:
        action(store, owner, operation, "replan", {"replan_at": operation["input"]["depot"]["opens_at"]}, "failed-start")
    assert error.value.status == 503 and store.slot is None
    failed = next(job for job in store.list(owner, "JOB") if job.get("kind") == "replan")
    assert failed["status"] == "failed" and failed["error"]["code"] == "JOB_START_FAILED"
