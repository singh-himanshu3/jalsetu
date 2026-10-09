"""Check real boto3 serialization and errors using Stubber, without AWS access."""

import io
import json
from uuid import UUID

import boto3
import pytest
from botocore.response import StreamingBody
from botocore.stub import ANY, Stubber
from test_cloud_foundation import cloud

OWNER = "00000000-0000-4000-8000-000000000001"
RECORD = "00000000-0000-4000-8000-000000000002"
OBJECT = f"owners/{OWNER}/OPERATION/{RECORD}/snapshot.json"


@pytest.fixture
def sdk(monkeypatch):
    # Explicit inert credentials avoid the credential chain, profiles and IMDS.
    session = boto3.Session(aws_access_key_id="test-only", aws_secret_access_key="test-only", region_name="ap-south-1")
    table = session.resource("dynamodb").Table("jalsetu-test-state")
    s3, worker = session.client("s3"), session.client("stepfunctions")
    monkeypatch.setattr(boto3, "resource", lambda name: type("Tables", (), {"Table": lambda self, name: table})())
    monkeypatch.setattr(boto3, "client", lambda name: {"s3": s3, "stepfunctions": worker}[name])
    monkeypatch.setenv("TABLE_NAME", "jalsetu-test-state")
    monkeypatch.setenv("SNAPSHOT_BUCKET", "jalsetu-test-snapshots")
    monkeypatch.setenv("DEMO_EXPIRES_AT", "2099-01-01T00:00:00Z")
    monkeypatch.setenv("DAILY_JOB_LIMIT", "100")
    monkeypatch.setenv("PLANNER_WORKFLOW", "arn:aws:states:ap-south-1:000000000000:stateMachine:jalsetu-test")
    monkeypatch.setattr(cloud, "uuid4", lambda: UUID(RECORD))
    def no_network(*args, **kwargs):
        pytest.fail("SDK test attempted an unstubbed network request")
    for client in [table.meta.client, s3, worker]:
        monkeypatch.setattr(client._endpoint.http_session, "send", no_network)
    with Stubber(table.meta.client) as ddb_stub, Stubber(s3) as s3_stub, Stubber(worker) as worker_stub:
        yield cloud.Store(), ddb_stub, s3_stub, worker_stub
        for stub in [ddb_stub, s3_stub, worker_stub]:
            stub.assert_no_pending_responses()


def pointer(key=OBJECT):
    return {"Item": {"snapshot": {"S": key}, "version": {"N": "1"}}}


def get_parameters():
    return {"TableName": "jalsetu-test-state", "Key": {"pk": f"OWNER#{OWNER}", "sk": f"OPERATION#{RECORD}"}, "ConsistentRead": True}


def snapshot_response(value):
    raw = json.dumps(value).encode()
    return {"Body": StreamingBody(io.BytesIO(raw), len(raw))}


def test_owner_scoped_consistent_read(sdk):
    store, ddb, s3, _ = sdk
    ddb.add_response("get_item", pointer(), get_parameters())
    s3.add_response("get_object", snapshot_response({"version": 1, "events": []}), {"Bucket": "jalsetu-test-snapshots", "Key": OBJECT})
    assert store.get(OWNER, "OPERATION", RECORD) == {"version": 1, "events": []}


def test_wrong_owner_snapshot_is_blocked_before_s3(sdk):
    store, ddb, _, _ = sdk
    ddb.add_response("get_item", pointer("owners/another-owner/private.json"), get_parameters())
    with pytest.raises(cloud.ApiError) as error:
        store.get(OWNER, "OPERATION", RECORD)
    assert error.value.code == "INVALID_RECORD"


@pytest.mark.parametrize("expected", [None, 1])
def test_conditional_pointer_write_and_snapshot(sdk, expected):
    store, ddb, s3, _ = sdk
    value = {"version": 1 if expected is None else 2, "events": [], "_requests": {"retry": "hash"}}
    key = f"owners/{OWNER}/OPERATION/{RECORD}/{RECORD}.json"
    s3.add_response("put_object", {}, {"Bucket": "jalsetu-test-snapshots", "Key": key, "Body": json.dumps(value).encode(), "ContentType": "application/json"})
    parameters = {"TableName": "jalsetu-test-state", "Item": {"pk": f"OWNER#{OWNER}", "sk": f"OPERATION#{RECORD}", "snapshot": key, "version": value["version"], "expires_at": cloud.expiry(), "updated_at": ANY}}
    if expected is None:
        parameters["ConditionExpression"] = "attribute_not_exists(pk)"
    else:
        parameters.update(ConditionExpression="#v = :expected", ExpressionAttributeNames={"#v": "version"}, ExpressionAttributeValues={":expected": expected})
    ddb.add_response("put_item", {}, parameters)
    assert store.put(OWNER, "OPERATION", RECORD, value, expected) == value


def test_conditional_failure_is_a_readable_conflict(sdk):
    store, ddb, s3, _ = sdk
    s3.add_response("put_object", {}, {"Bucket": "jalsetu-test-snapshots", "Key": ANY, "Body": ANY, "ContentType": "application/json"})
    ddb.add_client_error("put_item", "ConditionalCheckFailedException", expected_params={"TableName": "jalsetu-test-state", "Item": ANY, "ConditionExpression": "#v = :expected", "ExpressionAttributeNames": {"#v": "version"}, "ExpressionAttributeValues": {":expected": 1}})
    with pytest.raises(cloud.ApiError) as error:
        store.put(OWNER, "OPERATION", RECORD, {"version": 2}, 1)
    assert error.value.status == 409


def test_daily_limit_and_slot_errors_are_bounded(sdk):
    store, ddb, _, _ = sdk
    ddb.add_client_error("update_item", "ConditionalCheckFailedException", expected_params={"TableName": "jalsetu-test-state", "Key": {"pk": "DEMO_LIMITS", "sk": ANY}, "UpdateExpression": "SET expires_at = :expiry ADD job_count :one", "ConditionExpression": "attribute_not_exists(job_count) OR job_count < :limit", "ExpressionAttributeValues": {":expiry": cloud.expiry(), ":one": 1, ":limit": 100}})
    with pytest.raises(cloud.ApiError) as error:
        store.admit()
    assert error.value.code == "DAILY_LIMIT"
    ddb.add_client_error("update_item", "ConditionalCheckFailedException", expected_params={"TableName": "jalsetu-test-state", "Key": {"pk": "DEMO_LIMITS", "sk": "PLANNER"}, "UpdateExpression": ANY, "ConditionExpression": "attribute_not_exists(lease_until) OR lease_until < :now", "ExpressionAttributeValues": ANY})
    with pytest.raises(cloud.ApiError) as error:
        store.claim_slot(RECORD)
    assert error.value.code == "PLANNER_BUSY"
    ddb.add_client_error("delete_item", "ConditionalCheckFailedException", expected_params={"TableName": "jalsetu-test-state", "Key": {"pk": "DEMO_LIMITS", "sk": "PLANNER"}, "ConditionExpression": "job_id = :job", "ExpressionAttributeValues": {":job": RECORD}})
    store.release_slot(RECORD)  # Never release a different job's lease.


def test_standard_workflow_start_contract(sdk):
    store, _, _, worker = sdk
    parameters = {"stateMachineArn": "arn:aws:states:ap-south-1:000000000000:stateMachine:jalsetu-test", "name": RECORD,
                  "input": json.dumps({"owner": OWNER, "job_id": RECORD, "correlation_id": "test-correlation"}, sort_keys=True)}
    worker.add_response("start_execution", {"executionArn": "arn:aws:states:ap-south-1:000000000000:execution:jalsetu-test:" + RECORD, "startDate": 0}, parameters)
    store.invoke(OWNER, RECORD, "test-correlation")
