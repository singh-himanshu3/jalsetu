"""Small, retry-safe stages for the example-only Standard planning workflow.

State-machine payloads contain identifiers only. Input, intermediate results and
stage receipts stay in owner-scoped immutable snapshots behind versioned pointers.
"""
import json
import time
from datetime import datetime

from jalsetu_planner.explanation import explain
from jalsetu_planner.marginal import Options, checked_options, validate_analysis
from jalsetu_planner.metrics import compute_metrics
from jalsetu_planner.replanning import pending_input_after_events, validate_revision
from jalsetu_planner.schemas import PlanningInput
from jalsetu_planner.validator import validate_plan

from . import handler as cloud

STAGES = {
    "LoadAndValidate": "validating",
    "GetRouteMatrix": "routing",
    "SolveStrategies": "solving",
    "ValidatePlans": "checking",
    "PersistResult": "persisting",
    "ExplainResult": "explaining",
    "CompleteJob": "completed",
}


class JobRejected(Exception):
    """A recorded domain failure; never retried by the state machine."""


class WorkflowTransientError(Exception):
    """A bounded retry for storage/network failures, without private details."""


class WorkflowFailed(Exception):
    """Safe terminal boundary; SDK/domain internals stay out of Lambda errors."""


def save(store, owner, job, **changes):
    return store.put(owner, "JOB", job["job_id"], {**job, **changes, "version": job["version"] + 1}, job["version"])


def fail(store, owner, job_id, code="WORKFLOW_FAILED", message="Planning failed. No unchecked result was published."):
    job = store.get(owner, "JOB", job_id)
    if job["status"] not in ["completed", "failed"]:
        try:
            job = save(store, owner, job, status="failed", completed_at=cloud.stamp(),
                       error={"code": code, "message": message})
        except cloud.ApiError as error:
            if error.status != 409:
                raise
            # A concurrent completion or timeout owns the newer pointer.
            job = store.get(owner, "JOB", job_id)
            if job["status"] not in ["completed", "failed"]:
                raise
    store.release_slot(job_id)
    return {"status": job["status"]}


def validate_result(job):
    result = job["_result"]
    original = PlanningInput.model_validate(job["_input"])
    if job.get("kind") == "marginal":
        try:
            validate_analysis(original, Options.model_validate(job["options"]), result["analysis"], job["job_id"], job["parent_job_id"])
        except (ValueError, KeyError, TypeError):
            raise cloud.ApiError(400, "INVALID_RESULT", "Independent scenario checks failed") from None
        return
    candidates = [result["revision"]] if job.get("kind") == "replan" else result["plans"]
    if not candidates or (job.get("kind") != "replan" and
                          [p["strategy"] for p in candidates] != ["equal_share", "demand_proportional", "greedy", "jalsetu"]):
        raise cloud.ApiError(400, "INVALID_RESULT", "The saved comparison is incomplete")
    for candidate in candidates:
        data = PlanningInput.model_validate(candidate["pending_input_snapshot"]) if job.get("kind") == "replan" else original
        check = validate_plan(data, candidate["vehicle_routes"])
        if (not check["valid"] or candidate["validation"] != check or candidate["metrics"] != compute_metrics(data, candidate["vehicle_routes"]) or
                candidate["input_snapshot_sha256"] != cloud.digest(data.model_dump(mode="json"))):
            raise cloud.ApiError(400, "INVALID_RESULT", "Independent route or input-snapshot checks failed")
        if job.get("kind") == "replan":
            operation = job["operation_snapshot"]
            parent = {**operation["approved_plan"], "vehicle_routes": operation["ledger_routes"]}
            expected, _, _ = pending_input_after_events(original, parent, operation["events"], job["replan_at"])
            if data.model_dump(mode="json") != expected.model_dump(mode="json") or not validate_revision(original, parent, operation["events"], candidate)["valid"]:
                raise cloud.ApiError(400, "INVALID_REVISION", "Revision no longer matches reported deliveries")


def persist_result(store, owner, job):
    # Re-running this stage after a lost response reuses the same result.
    result = {"job_id": job["job_id"], "version": 1,
              "input_snapshot_sha256": cloud.digest(job["_input"]), "result": job["_result"]}
    try:
        store.put(owner, "RESULT", job["job_id"], result)
    except cloud.ApiError as error:
        if error.status != 409:
            raise
        if store.get(owner, "RESULT", job["job_id"]) != result:
            raise cloud.ApiError(409, "RESULT_CONFLICT", "An immutable result already exists with different contents") from None


def complete(store, owner, job):
    result = store.get(owner, "RESULT", job["job_id"])["result"]
    if cloud.digest(result) != cloud.digest(job["_result"]):
        raise cloud.ApiError(409, "RESULT_CONFLICT", "Saved result no longer matches the checked workflow result")
    if job.get("kind") == "replan":
        current = store.get(owner, "OPERATION", job["operation_id"])
        # Receipt shares the operation write. A lost response cannot install a
        # revision twice, or overwrite reports that arrived after installation.
        if current.get("_revision_job_id") != job["job_id"]:
            operation = job["operation_snapshot"]
            next_operation = {**operation, "revision_draft": result["revision"],
                              "_revision_job_id": job["job_id"], "version": operation["version"] + 1}
            current = store.put(owner, "OPERATION", job["operation_id"], next_operation, job["operation_version"])
        result = {**result, "operation": cloud.public_operation(current)}
    completed = save(store, owner, job, **result, status="completed", stage="CompleteJob",
                     completed_at=cloud.stamp(), result_id=job["job_id"],
                     input_snapshot_sha256=cloud.digest(job["_input"]),
                     end_to_end_runtime_seconds=time.time() - datetime.fromisoformat(job["created_at"].replace("Z", "+00:00")).timestamp(),
                     stage_history=job.get("stage_history", []) + [{"stage": "CompleteJob", "completed_at": cloud.stamp()}])
    store.release_slot(job["job_id"])
    return {"status": completed["status"]}


def run_stage(store, owner, job_id, stage, *, enforce_expiry=True):
    if stage == "FailJob":
        return fail(store, owner, job_id)
    if stage not in STAGES:
        raise ValueError("Unknown planning stage")
    job = store.get(owner, "JOB", job_id)
    if job["status"] == "completed":
        store.release_slot(job_id)
        return {"status": "completed"}
    if job["status"] == "failed":
        raise JobRejected(job["error"]["code"])
    history = job.get("stage_history", [])
    finished = [item["stage"] for item in history]
    if stage in finished:
        return {"status": job["status"]}
    if finished != list(STAGES)[:list(STAGES).index(stage)]:
        raise cloud.ApiError(409, "STAGE_ORDER", "Planning stages must run in order")
    job = save(store, owner, job, status=STAGES[stage] if stage != "CompleteJob" else "persisting", stage=stage)
    try:
        if enforce_expiry:
            cloud.live()
        changes = {}
        if stage == "LoadAndValidate":
            value = job["operation_snapshot"]["input"] if job.get("kind") == "replan" else job["input"]
            changes["_input"] = cloud.checked({"command": "validate", "input": value})["input"]
            if job.get("kind") == "marginal":
                changes["options"] = checked_options(PlanningInput.model_validate(changes["_input"]), job["options"], job["_parent_input"]).model_dump(mode="json")
        elif stage == "GetRouteMatrix":
            # Already validated synthetic snapshot: never call a routing provider.
            changes["routing_source"] = "stored example matrix"
        elif stage == "SolveStrategies":
            message = {"command": "replan", "operation": job["operation_snapshot"], "replan_at": job["replan_at"]} if job.get("kind") == "replan" else {"command": "compare", "input": job["_input"]}
            if job.get("kind") == "marginal":
                message = {"command": "marginal", "input": job["_input"], "options": job["options"], "parent_input": job["_parent_input"], "job_id": job_id, "parent_job_id": job["parent_job_id"]}
            changes["_result"] = cloud.checked(message)
        elif stage == "ValidatePlans":
            validate_result(job)
        elif stage == "PersistResult":
            persist_result(store, owner, job)
        elif stage == "ExplainResult":
            # The planner's deterministic explanation is part of the checked
            # result. No optional AI dependency or numeric rewriting here.
            changes["explanation_mode"] = "deterministic"
            result = job["_result"]
            candidates = ([c["plan"] for c in result["analysis"]["children"] if "plan" in c] if job.get("kind") == "marginal"
                          else [result["revision"]] if job.get("kind") == "replan" else result["plans"])
            changes["grounded_explanations"] = [explain(candidate) for candidate in candidates]
        elif stage == "CompleteJob":
            return complete(store, owner, job)
        save(store, owner, job, **changes, stage_history=history + [{"stage": stage, "completed_at": cloud.stamp()}])
    except cloud.ApiError as error:
        fail(store, owner, job_id, error.code, error.message)
        raise JobRejected(error.code) from None
    print(json.dumps({"event": "planner_stage", "correlation_id": job.get("correlation_id"), "stage": stage}))
    return {"status": STAGES[stage]}


def stage_handler(event, context):
    if event.get("source") == "aws.states":
        detail = event["detail"]
        if detail["status"] not in ["FAILED", "TIMED_OUT", "ABORTED"]:
            return {"status": "ignored"}
        # State input and output contain only small identifiers, so the
        # EventBridge status event includes the original input.
        event = {**json.loads(detail["input"]), "stage": "FailJob"}
    owner, job_id = cloud.identifier(event["owner"]), cloud.identifier(event["job_id"])
    try:
        return run_stage(cloud.Store(), owner, job_id, event["stage"])
    except Exception as error:
        from botocore.exceptions import (
            ConnectionClosedError,
            EndpointConnectionError,
            ReadTimeoutError,
        )
        code = getattr(error, "response", {}).get("Error", {}).get("Code")
        if isinstance(error, (ConnectionClosedError, EndpointConnectionError, ReadTimeoutError)) or code in [
            "ThrottlingException", "Throttling", "ProvisionedThroughputExceededException", "InternalServerError",
            "ServiceUnavailable", "RequestTimeout", "SlowDown", "RequestLimitExceeded",
        ]:
            raise WorkflowTransientError("Transient storage failure; retry this stage") from None
        if isinstance(error, JobRejected):
            raise
        raise WorkflowFailed("Planning stage failed; read the saved job status") from None


def run_offline(event):
    """Drive the same stages in tests, without emulating AWS orchestration."""
    store = cloud.Store()
    owner, job_id = cloud.identifier(event["owner"]), cloud.identifier(event["job_id"])
    if store.get(owner, "JOB", job_id)["status"] != "queued":
        return {"status": "already_claimed"}
    try:
        for stage in STAGES:
            result = run_stage(store, owner, job_id, stage)
        return result
    except JobRejected:
        return fail(store, owner, job_id)
    except Exception:  # noqa: BLE001 -- Same terminal catch exercised offline.
        return fail(store, owner, job_id)

