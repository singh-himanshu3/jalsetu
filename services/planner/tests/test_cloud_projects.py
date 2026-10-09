"""Reversible archive/restore preserves operations and conditional ownership."""

from uuid import uuid4

import pytest
from test_cloud_foundation import MemoryStore, cloud, create_project, event


@pytest.fixture
def projects(monkeypatch):
    monkeypatch.setenv("DEMO_EXPIRES_AT", "2099-01-01T00:00:00Z")
    store, owner, other = MemoryStore(), str(uuid4()), str(uuid4())
    return store, owner, other, create_project(store, owner)


def change(store, owner, project, action, key, version=None):
    request = event(owner, f"/v1/projects/{project['project_id']}/{action}", "POST", {}, **{"If-Match": str(project["version"] if version is None else version), "Idempotency-Key": key})
    return cloud.dispatch(request, store, "test"), request


def test_archive_restore_and_preserve_reports(projects):
    store, owner, _, original = projects
    operation = {"version": 1, "events": [{"event_type": "delivery_reported", "payload": {"litres": 100}}]}
    store.put(owner, "OPERATION", "evidence", operation)
    (_, response), retry = change(store, owner, original, "archive", "archive")
    archived = response["project"]
    assert archived["version"] == 2 and archived["archived_at"]
    assert archived["input"] == original["input"]
    assert "_requests" not in archived
    assert cloud.dispatch(retry, store, "test")[1] == response
    assert cloud.dispatch(event(owner, "/v1/projects"), store, "test")[1]["projects"] == []
    query = {**event(owner, "/v1/projects"), "queryStringParameters": {"archived": "true"}}
    assert cloud.dispatch(query, store, "test")[1]["projects"][0]["archived"]
    with pytest.raises(cloud.ApiError) as error:
        cloud.dispatch(event(owner, f"/v1/projects/{original['project_id']}", "PUT", {"input": original["input"]}, **{"If-Match": "2"}), store, "test")
    assert error.value.code == "PROJECT_ARCHIVED"
    (_, response), retry = change(store, owner, archived, "restore", "restore")
    restored = response["project"]
    assert restored["version"] == 3 and restored["archived_at"] is None
    assert restored["input"] == original["input"]
    assert cloud.dispatch(retry, store, "test")[1] == response
    assert len(cloud.dispatch(event(owner, "/v1/projects"), store, "test")[1]["projects"]) == 1
    assert cloud.dispatch(query, store, "test")[1]["projects"] == []
    assert store.get(owner, "OPERATION", "evidence") == operation


def test_archive_owner_version_and_retry_conflicts(projects):
    store, owner, other, original = projects
    for action in ["archive", "restore"]:
        with pytest.raises(cloud.ApiError) as error:
            change(store, other, original, action, "key")
        assert error.value.status == 404
    with pytest.raises(cloud.ApiError) as error:
        change(store, owner, original, "archive", "")
    assert error.value.status == 400
    (_, response), _ = change(store, owner, original, "archive", "archive")
    with pytest.raises(cloud.ApiError) as error:
        change(store, owner, original, "restore", "restore")
    assert error.value.status == 409
    with pytest.raises(cloud.ApiError) as error:
        change(store, owner, response["project"], "restore", "archive")
    assert error.value.code == "IDEMPOTENCY_CONFLICT"


def test_unknown_project_action_never_changes_saved_input(projects):
    store, owner, _, original = projects
    with pytest.raises(cloud.ApiError) as error:
        cloud.dispatch(event(owner, f"/v1/projects/{original['project_id']}/delete", "POST", {}), store, "test")
    assert error.value.status == 404
    assert store.get(owner, "PROJECT", original["project_id"]) == original
