"""Phase 4 stage boundaries: no AWS, real solver and independent validators."""
from copy import deepcopy

import pytest
import test_cloud_foundation as foundation
import test_cloud_operations as operations
from cloud import workflow
from test_cloud_foundation import cloud, create_project, event
from test_cloud_operations import action

setup_cloud = foundation.setup_cloud
approved_cloud = operations.approved_cloud


@pytest.fixture
def queued(setup_cloud, monkeypatch):
    store, owner, _ = setup_cloud
    value = create_project(store, owner)["input"]
    value.update(service_window_policy="finish_by_close", loading_mode="parallel")
    request = event(owner, "/v1/planning-jobs", "POST", {"input": value}, **{"Idempotency-Key": "staged"})
    _, job = cloud.dispatch(request, store, "stage-test")
    monkeypatch.setattr(cloud, "Store", lambda: store)
    return store, owner, job["job_id"], request


def through(store, owner, job_id, last):
    for stage in workflow.STAGES:
        workflow.run_stage(store, owner, job_id, stage)
        if stage == last:
            return


def test_duplicate_stages_solve_once_and_publish_only_at_completion(queued, monkeypatch):
    store, owner, job_id, request = queued
    execute, calls = cloud.execute, []
    def tracked(message):
        if message["command"] == "compare":
            calls.append(message)
        return execute(message)
    monkeypatch.setattr(cloud, "execute", tracked)
    for stage in workflow.STAGES:
        workflow.run_stage(store, owner, job_id, stage)
        version = store.get(owner, "JOB", job_id)["version"]
        workflow.run_stage(store, owner, job_id, stage)
        assert store.get(owner, "JOB", job_id)["version"] == version
        public = cloud.public_job(store.get(owner, "JOB", job_id))
        assert not any(key.startswith("_") for key in public)
        if stage != "CompleteJob":
            assert "plans" not in public and "revision" not in public
    assert len(calls) == 1 and len(store.list(owner, "RESULT")) == 1
    completed = cloud.dispatch(request, store, "another-request")[1]
    assert len(store.invocations) == 1 and store.admitted == 1
    assert completed["status"] == "completed" and store.slot is None
    assert [item["stage"] for item in completed["stage_history"]] == list(workflow.STAGES)
    saved = store.get(owner, "RESULT", job_id)
    assert saved["input_snapshot_sha256"] == completed["input_snapshot_sha256"]
    assert saved["result"]["plans"] == completed["plans"]


@pytest.mark.parametrize("damage", ["routes", "hash", "strategies", "metrics", "validation"])
def test_corrupted_intermediate_result_never_publishes(queued, damage):
    store, owner, job_id, _ = queued
    through(store, owner, job_id, "SolveStrategies")
    job = store.get(owner, "JOB", job_id)
    if damage == "routes":
        job["_result"]["plans"][0]["vehicle_routes"][0]["planned_load_litres"] += 100
    elif damage == "hash":
        job["_result"]["plans"][0]["input_snapshot_sha256"] = "wrong"
    elif damage == "metrics":
        job["_result"]["plans"][0]["metrics"]["on_time_scheduled_litres"] += 100
    elif damage == "validation":
        job["_result"]["plans"][0]["validation"]["valid"] = False
    else:
        job["_result"]["plans"].pop()
    store.put(owner, "JOB", job_id, {**job, "version": job["version"] + 1}, job["version"])
    with pytest.raises(workflow.JobRejected):
        workflow.run_stage(store, owner, job_id, "ValidatePlans")
    failed = cloud.public_job(store.get(owner, "JOB", job_id))
    assert failed["status"] == "failed" and failed["error"]["code"] == "INVALID_RESULT"
    assert "plans" not in failed and not store.list(owner, "RESULT") and store.slot is None


def test_forced_solver_failure_and_duplicate_catch_are_terminal(queued, monkeypatch):
    store, owner, job_id, _ = queued
    through(store, owner, job_id, "GetRouteMatrix")
    def broken(message):
        raise RuntimeError("internal details must remain private")
    monkeypatch.setattr(cloud, "execute", broken)
    with pytest.raises(workflow.WorkflowFailed) as error:
        workflow.stage_handler({"owner": owner, "job_id": job_id, "stage": "SolveStrategies"}, None)
    assert "internal details" not in str(error.value)
    assert workflow.run_stage(store, owner, job_id, "FailJob") == {"status": "failed"}
    failed = store.get(owner, "JOB", job_id)
    assert "internal details" not in str(cloud.public_job(failed))
    assert failed["error"]["message"] and "plans" not in failed and store.slot is None
    workflow.run_stage(store, owner, job_id, "FailJob")
    assert store.get(owner, "JOB", job_id) == failed


def test_workflow_timeout_event_repairs_job_without_polling(queued):
    import json
    store, owner, job_id, _ = queued
    response = workflow.stage_handler({"source": "aws.states", "detail": {
        "status": "TIMED_OUT", "input": json.dumps({"owner": owner, "job_id": job_id})}}, None)
    assert response == {"status": "failed"} and store.slot is None
    with pytest.raises(workflow.JobRejected):
        workflow.run_stage(store, owner, job_id, "LoadAndValidate")


def test_stage_order_cannot_skip_independent_validation(queued):
    store, owner, job_id, _ = queued
    with pytest.raises(cloud.ApiError) as error:
        workflow.run_stage(store, owner, job_id, "CompleteJob")
    assert error.value.code == "STAGE_ORDER"
    assert not store.list(owner, "RESULT")


def test_lost_result_write_response_reuses_immutable_result(queued, monkeypatch):
    store, owner, job_id, _ = queued
    through(store, owner, job_id, "ValidatePlans")
    put, lost = store.put, [False]
    def lose_response(owner, kind, record_id, value, expected=None):
        result = put(owner, kind, record_id, value, expected)
        if kind == "RESULT" and not lost[0]:
            lost[0] = True
            raise RuntimeError("Response lost after successful write")
        return result
    monkeypatch.setattr(store, "put", lose_response)
    with pytest.raises(RuntimeError):
        workflow.run_stage(store, owner, job_id, "PersistResult")
    workflow.run_stage(store, owner, job_id, "PersistResult")
    assert len(store.list(owner, "RESULT")) == 1


def test_lost_completion_response_does_not_install_revision_twice(approved_cloud, monkeypatch):
    store, owner, _, operation, _ = approved_cloud
    _, job = action(store, owner, operation, "replan", {"replan_at": operation["input"]["depot"]["opens_at"]})[0]
    through(store, owner, job["job_id"], "ExplainResult")
    put, lost = store.put, [False]
    def lose_response(owner, kind, record_id, value, expected=None):
        result = put(owner, kind, record_id, value, expected)
        if kind == "OPERATION" and not lost[0]:
            lost[0] = True
            raise RuntimeError("Response lost after successful operation write")
        return result
    monkeypatch.setattr(store, "put", lose_response)
    with pytest.raises(RuntimeError):
        workflow.run_stage(store, owner, job["job_id"], "CompleteJob")
    installed = deepcopy(store.get(owner, "OPERATION", operation["operation_id"]))
    workflow.run_stage(store, owner, job["job_id"], "CompleteJob")
    assert store.get(owner, "OPERATION", operation["operation_id"]) == installed
    assert installed["version"] == operation["version"] + 1
    assert store.get(owner, "JOB", job["job_id"])["status"] == "completed"
    assert "_revision_job_id" not in cloud.public_operation(installed)


def test_expired_demo_fails_durably_and_releases_slot(queued, monkeypatch):
    store, owner, job_id, _ = queued
    monkeypatch.setenv("DEMO_EXPIRES_AT", "2020-01-01T00:00:00Z")
    with pytest.raises(workflow.JobRejected):
        workflow.run_stage(store, owner, job_id, "LoadAndValidate")
    assert store.get(owner, "JOB", job_id)["error"]["code"] == "DEMO_EXPIRED"
    assert store.slot is None


def test_transient_storage_failure_has_a_bounded_retry_error(queued, monkeypatch):
    from botocore.exceptions import ClientError
    store, owner, job_id, _ = queued
    def throttled(*args):
        raise ClientError({"Error": {"Code": "ThrottlingException", "Message": "private details"}}, "GetItem")
    monkeypatch.setattr(store, "get", throttled)
    with pytest.raises(workflow.WorkflowTransientError) as error:
        workflow.stage_handler({"owner": owner, "job_id": job_id, "stage": "LoadAndValidate"}, None)
    assert "private details" not in str(error.value)


def test_revision_cannot_change_the_captured_input_and_rehash_it(approved_cloud):
    from jalsetu_planner.schemas import PlanningInput
    store, owner, _, operation, _ = approved_cloud
    _, public = action(store, owner, operation, "replan", {"replan_at": operation["input"]["depot"]["opens_at"]})[0]
    job_id = public["job_id"]
    through(store, owner, job_id, "SolveStrategies")
    job = store.get(owner, "JOB", job_id)
    candidate = job["_result"]["revision"]
    candidate["pending_input_snapshot"]["sites"][0]["location"]["latitude"] += 0.001
    candidate["input_snapshot_sha256"] = cloud.digest(PlanningInput.model_validate(candidate["pending_input_snapshot"]).model_dump(mode="json"))
    store.put(owner, "JOB", job_id, {**job, "version": job["version"] + 1}, job["version"])
    with pytest.raises(workflow.JobRejected):
        workflow.run_stage(store, owner, job_id, "ValidatePlans")
    assert store.get(owner, "JOB", job_id)["error"]["code"] == "INVALID_REVISION"
    assert store.get(owner, "OPERATION", operation["operation_id"])["version"] == operation["version"]


def test_offline_preview_drives_real_stages_without_aws_clients(queued, monkeypatch):
    import boto3
    from cloud.offline import execute
    store, owner, job_id, _ = queued
    def forbidden(*args, **kwargs):
        pytest.fail("Offline preview constructed an AWS client")
    monkeypatch.setattr(boto3, "client", forbidden)
    monkeypatch.setattr(boto3, "resource", forbidden)
    progress = []
    result = execute({"input": store.get(owner, "JOB", job_id)["input"], "job_id": job_id}, progress.append)
    assert result["status"] == "completed" and len(result["plans"]) == 4
    assert {"validating", "routing", "solving", "checking", "persisting", "explaining", "completed"} <= {row["status"] for row in progress}
    assert [row["stage"] for row in result["stage_history"]] == list(workflow.STAGES)

