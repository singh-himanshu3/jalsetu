from copy import deepcopy

import pytest
import test_cloud_foundation as foundation
from cloud import workflow
from test_cloud_foundation import cloud, create_project, event

setup_cloud = foundation.setup_cloud


@pytest.fixture
def parent(setup_cloud):
    store, owner, other = setup_cloud
    data = create_project(store, owner)["input"]
    data.update(service_window_policy="finish_by_close", loading_mode="parallel")
    request = event(owner, "/v1/planning-jobs", "POST", {"input": data}, **{"Idempotency-Key": "parent"})
    _, job = cloud.dispatch(request, store, "test")
    for stage in workflow.STAGES:
        workflow.run_stage(store, owner, job["job_id"], stage)
    options = {"extra_stock_litres": 1000, "vehicle_capacity_litres": 5000, "earlier_start_minutes": 30,
               "closing_site_id": data["sites"][0]["site_id"], "later_close_minutes": 30, "shorter_service_minutes": 5}
    return store, owner, other, {"input": data, "kind": "marginal", "parent_job_id": job["job_id"], "options": options}


def test_marginal_job_uses_shared_stages_and_retries_without_touching_parent(parent):
    store, owner, _, body = parent
    before = store.get(owner, "JOB", body["parent_job_id"])
    request = event(owner, "/v1/planning-jobs", "POST", body, **{"Idempotency-Key": "marginal"})
    _, job = cloud.dispatch(request, store, "analysis")
    for stage in workflow.STAGES:
        workflow.run_stage(store, owner, job["job_id"], stage)
        workflow.run_stage(store, owner, job["job_id"], stage)
    completed = cloud.dispatch(request, store, "retry")[1]
    assert completed["status"] == "completed" and len(completed["analysis"]["children"]) == 6
    assert store.get(owner, "JOB", before["job_id"]) == before
    assert not store.list(owner, "OPERATION") and store.slot is None
    assert store.admitted == 2 and len(store.invocations) == 2
    assert not any(k.startswith("_") for k in completed)


def test_foreign_parent_and_changed_inputs_are_rejected_before_admission(parent):
    store, owner, other, body = parent
    for actor, changed, code in [(other, body, "NOT_FOUND"), (owner, deepcopy(body), "ACTION_REJECTED")]:
        if actor == owner:
            changed["input"]["depot"]["available_stock_litres"] += 100
        with pytest.raises(cloud.ApiError) as error:
            cloud.dispatch(event(actor, "/v1/planning-jobs", "POST", changed, **{"Idempotency-Key": actor}), store, "test")
        assert error.value.code == code
    assert store.admitted == 1 and store.slot is None


def test_corrupted_analysis_never_publishes(parent):
    store, owner, _, body = parent
    _, response = cloud.dispatch(event(owner, "/v1/planning-jobs", "POST", body, **{"Idempotency-Key": "corrupt"}), store, "test")
    job_id = response["job_id"]
    for stage in ["LoadAndValidate", "GetRouteMatrix", "SolveStrategies"]:
        workflow.run_stage(store, owner, job_id, stage)
    job = store.get(owner, "JOB", job_id)
    job["_result"]["analysis"]["children"][1]["delta"]["on_time_scheduled_litres"] += 100
    store.put(owner, "JOB", job_id, {**job, "version": job["version"] + 1}, job["version"])
    with pytest.raises(workflow.JobRejected):
        workflow.run_stage(store, owner, job_id, "ValidatePlans")
    failed = cloud.public_job(store.get(owner, "JOB", job_id))
    assert failed["status"] == "failed" and "analysis" not in failed
