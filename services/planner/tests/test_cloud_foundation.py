"""Cloud adapter tests without credentials or paid service calls."""

import json
import sys
from copy import deepcopy
from pathlib import Path
from uuid import uuid4

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from cloud import handler as cloud


class MemoryStore:
    def __init__(self):
        self.records = {}
        self.admitted = 0
        self.invocations = []
        self.slot = None

    def get(self, owner, kind, record_id):
        try:
            return deepcopy(self.records[(owner, kind, record_id)])
        except KeyError:
            raise cloud.ApiError(404, "NOT_FOUND", "Record not found") from None

    def put(self, owner, kind, record_id, value, expected=None):
        prior = self.records.get((owner, kind, record_id))
        if (expected is None and prior is not None) or (expected is not None and (prior is None or prior["version"] != expected)):
            raise cloud.ApiError(409, "STALE_VERSION", "Changed")
        self.records[(owner, kind, record_id)] = deepcopy(value)
        return deepcopy(value)

    def list(self, owner, kind):
        return [deepcopy(value) for (record_owner, record_kind, _), value in self.records.items() if record_owner == owner and record_kind == kind]

    def admit(self):
        self.admitted += 1

    def invoke(self, owner, job_id, correlation_id):
        self.invocations.append((owner, job_id, correlation_id))

    def claim_slot(self, job_id):
        if self.slot:
            raise cloud.ApiError(429, "PLANNER_BUSY", "Busy")
        self.slot = job_id

    def release_slot(self, job_id):
        if self.slot == job_id:
            self.slot = None


@pytest.fixture
def setup_cloud(monkeypatch):
    monkeypatch.setenv("DEMO_EXPIRES_AT", "2099-10-10T00:00:00Z")
    monkeypatch.setenv("WEB_ORIGIN", "https://example.invalid")
    return MemoryStore(), str(uuid4()), str(uuid4())


def event(owner, path, method="GET", value=None, **request_headers):
    return {"requestContext": {"authorizer": {"claims": {"sub": owner}}}, "httpMethod": method, "path": path, "headers": request_headers, "body": json.dumps(value) if value is not None else None}


def create_project(store, owner):
    _, response = cloud.dispatch(event(owner, "/v1/projects", "POST", {"name": "Synthetic exercise", "data_mode": "example", "operating_date": "2026-10-10"}), store, "test-correlation")
    return response["project"]


def test_owner_isolation_and_version_conditions(setup_cloud):
    store, owner, other = setup_cloud
    project = create_project(store, owner)
    url = f"/v1/projects/{project['project_id']}"
    with pytest.raises(cloud.ApiError) as error:
        cloud.dispatch(event(other, url), store, "test")
    assert error.value.status == 404


    assert cloud.dispatch(event(other, "/v1/projects"), store, "test")[1] == {"projects": []}
    value = deepcopy(project["input"])
    value["name"] = "Saved draft"
    _, response = cloud.dispatch(event(owner, url, "PUT", {"input": value}, **{"If-Match": "1"}), store, "test")
    assert response["project"]["version"] == 2
    assert cloud.dispatch(event(owner, url), store, "test")[1]["project"] == response["project"]
    with pytest.raises(cloud.ApiError) as error:
        cloud.dispatch(event(owner, url, "PUT", {"input": value}, **{"If-Match": "1"}), store, "test")
    assert error.value.status == 409


def test_busy_planner_does_not_accept_more_work(setup_cloud):
    store, owner, _ = setup_cloud
    value = create_project(store, owner)["input"]
    value.update(service_window_policy="finish_by_close", loading_mode="parallel")
    for key in ["first", "second"]:
        request = event(owner, "/v1/planning-jobs", "POST", {"input": value}, **{"Idempotency-Key": key})
        if key == "first":
            assert cloud.dispatch(request, store, "test")[0] == 202
        else:
            with pytest.raises(cloud.ApiError) as error:
                cloud.dispatch(request, store, "test")
            assert error.value.status == 429
    assert store.admitted == 1 and len(store.invocations) == 1


def test_drafts_preserve_unselected_rules_and_empty_resources(setup_cloud):
    store, owner, _ = setup_cloud
    project = create_project(store, owner)
    assert project["input"]["service_window_policy"] is None
    assert project["input"]["loading_mode"] is None
    assert project["input"]["depot"]["opens_at"].startswith("2026-10-10")
    value = deepcopy(project["input"])
    value.update(vehicles=[], sites=[], travel_matrix=None)
    cloud.draft(value)
    for malformed in [None, {**value, "depot": None}, {**value, "sites": [None]}, {**value, "data_mode": "operator"}]:
        with pytest.raises(cloud.ApiError):
            cloud.draft(malformed)


def test_authentication_and_expiry_fail_closed(setup_cloud, monkeypatch):
    store, owner, _ = setup_cloud
    for subject in [None, "", "../other-owner", "not-a-uuid"]:
        with pytest.raises(cloud.ApiError) as error:
            cloud.dispatch(event(subject, "/v1/health"), store, "test")
        assert error.value.status == 401
    monkeypatch.setenv("DEMO_EXPIRES_AT", "2020-01-01T00:00:00Z")
    with pytest.raises(cloud.ApiError) as error:
        cloud.dispatch(event(owner, "/v1/health"), store, "test")
    assert error.value.status == 410


def test_job_idempotency_and_private_input(setup_cloud):
    store, owner, other = setup_cloud
    value = create_project(store, owner)["input"]
    value.update(service_window_policy="finish_by_close", loading_mode="parallel")
    request = event(owner, "/v1/planning-jobs", "POST", {"input": value}, **{"Idempotency-Key": "same-click"})
    status, job = cloud.dispatch(request, store, "test")
    assert status == 202 and job["status"] == "queued"
    assert "input" not in job and "request_hash" not in job
    assert cloud.dispatch(request, store, "test")[1] == job
    assert store.admitted == 1 and len(store.invocations) == 1
    altered = deepcopy(request)
    payload = json.loads(altered["body"])
    payload["input"]["depot"]["available_stock_litres"] += 100
    altered["body"] = json.dumps(payload)
    with pytest.raises(cloud.ApiError) as error:
        cloud.dispatch(altered, store, "test")
    assert error.value.status == 409
    with pytest.raises(cloud.ApiError) as error:
        cloud.dispatch(event(other, f"/v1/planning-jobs/{job['job_id']}"), store, "test")
    assert error.value.status == 404


def test_unauthenticated_api_never_constructs_store(setup_cloud, monkeypatch, capsys):
    def forbidden():
        pytest.fail("Unauthenticated request accessed AWS")
    monkeypatch.setattr(cloud, "Store", forbidden)
    response = cloud.api_handler({}, None)
    assert response["statusCode"] == 401
    log = json.loads(capsys.readouterr().out)
    assert log["correlation_id"]
    assert "body" not in log and "owner" not in log
