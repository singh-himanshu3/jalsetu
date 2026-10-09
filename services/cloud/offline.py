"""Run the cloud stages offline for the local preview; never construct AWS clients."""
import json
import sys
from copy import deepcopy

from . import handler as cloud
from .workflow import STAGES, JobRejected, fail, run_stage

OWNER = "00000000-0000-4000-8000-000000000001"


class OfflineStore:
    """Ephemeral preview snapshots. AWS durability is tested separately."""
    def __init__(self, report):
        self.records, self.report = {}, report

    def get(self, owner, kind, record_id):
        try:
            return deepcopy(self.records[(owner, kind, record_id)])
        except KeyError:
            raise cloud.ApiError(404, "NOT_FOUND", "Offline record not found") from None

    def put(self, owner, kind, record_id, value, expected=None):
        prior = self.records.get((owner, kind, record_id))
        if (expected is None and prior is not None) or (expected is not None and (prior is None or prior["version"] != expected)):
            raise cloud.ApiError(409, "STALE_VERSION", "Offline snapshot changed")
        self.records[(owner, kind, record_id)] = deepcopy(value)
        if kind == "JOB":
            self.report({"status": value["status"], "stage": value.get("stage"), "stage_history": value.get("stage_history", [])})
        return deepcopy(value)

    def release_slot(self, job_id):
        pass


def execute(message, report=lambda _: None):
    store = OfflineStore(report)
    job_id = cloud.identifier(message["job_id"])
    job = {"job_id": job_id, "version": 1, "status": "queued", "mode": "offline_fixture",
           "created_at": cloud.stamp(), "input": message["input"], "correlation_id": job_id}
    if message.get("kind") == "marginal":
        job.update(kind="marginal", options=message["options"], parent_job_id=message["parent_job_id"], _parent_input=message["parent_input"])
    store.put(OWNER, "JOB", job_id, job)
    try:
        for stage in STAGES:
            run_stage(store, OWNER, job_id, stage, enforce_expiry=False)
    except JobRejected:
        fail(store, OWNER, job_id)
    except Exception:  # noqa: BLE001 -- Safe local worker response.
        fail(store, OWNER, job_id)
    return cloud.public_job(store.get(OWNER, "JOB", job_id))


def main():
    message = json.loads(sys.stdin.read())
    def report(value):
        sys.stderr.write(json.dumps(value) + "\n")
        sys.stderr.flush()
    # Stage audit logs go to stderr too; stdout is one JSON response.
    from contextlib import redirect_stdout
    with redirect_stdout(sys.stderr):
        result = execute(message, report)
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()

