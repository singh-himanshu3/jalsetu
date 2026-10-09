"""AWS foundation: private owner-scoped snapshots and bounded example jobs.

No public operational facts or resources are inferred. API Gateway validates the
Cognito ID token; only its trusted authorizer `sub` determines record ownership.
"""

import base64
import hashlib
import json
import os
import re
import time
from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from jalsetu_planner.bridge import execute


class ApiError(Exception):
    def __init__(self, status, code, message):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def stamp():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def expiry():
    return int(datetime.fromisoformat(os.environ["DEMO_EXPIRES_AT"].replace("Z", "+00:00")).timestamp())


def live():
    if time.time() >= expiry():
        raise ApiError(410, "DEMO_EXPIRED", "This seven-day example demo has ended")


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def identity(event):
    claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
    sub = claims.get("sub")
    try:
        UUID(sub)
    except (TypeError, ValueError, AttributeError):
        raise ApiError(401, "UNAUTHENTICATED", "Sign in to the example workspace") from None
    return sub


def identifier(value):
    try:
        return str(UUID(value))
    except (TypeError, ValueError, AttributeError):
        raise ApiError(404, "NOT_FOUND", "Record not found") from None


def body(event):
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        try:
            raw = base64.b64decode(raw, validate=True).decode("utf-8")
        except (ValueError, UnicodeError):
            raise ApiError(400, "INVALID_JSON", "Enter a JSON object") from None
    if len(raw.encode()) > 2 * 1024 * 1024:
        raise ApiError(413, "INPUT_TOO_LARGE", "Input exceeds 2 MB")
    try:
        value = json.loads(raw)
        if not isinstance(value, dict):
            raise TypeError()
        return value
    except (ValueError, TypeError):
        raise ApiError(400, "INVALID_JSON", "Enter a JSON object") from None


def headers(event):
    return {key.lower(): value for key, value in (event.get("headers") or {}).items()}


class Store:
    """DynamoDB stores versioned pointers; S3 stores immutable JSON snapshots."""

    def __init__(self):
        import boto3
        self.table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])
        self.s3 = boto3.client("s3")
        self.workflow_client = boto3.client("stepfunctions")

    def key(self, owner, kind, record_id):
        return {"pk": f"OWNER#{owner}", "sk": f"{kind}#{record_id}"}

    def get(self, owner, kind, record_id):
        item = self.table.get_item(Key=self.key(owner, kind, record_id), ConsistentRead=True).get("Item")
        if not item:
            raise ApiError(404, "NOT_FOUND", "Record not found")
        # Constructed key and recorded prefix are both checked before S3 access.
        if not item["snapshot"].startswith(f"owners/{owner}/"):
            raise ApiError(500, "INVALID_RECORD", "Stored record could not be read")
        response = self.s3.get_object(Bucket=os.environ["SNAPSHOT_BUCKET"], Key=item["snapshot"])
        return json.loads(response["Body"].read())

    def put(self, owner, kind, record_id, value, expected=None):
        key = f"owners/{owner}/{kind}/{record_id}/{uuid4()}.json"
        self.s3.put_object(Bucket=os.environ["SNAPSHOT_BUCKET"], Key=key, Body=json.dumps(value).encode(), ContentType="application/json")
        item = {**self.key(owner, kind, record_id), "snapshot": key, "version": value.get("version", 1), "expires_at": expiry(), "updated_at": stamp()}
        options = {"ConditionExpression": "attribute_not_exists(pk)"} if expected is None else {"ConditionExpression": "#v = :expected", "ExpressionAttributeNames": {"#v": "version"}, "ExpressionAttributeValues": {":expected": expected}}
        try:
            self.table.put_item(Item=item, **options)
        except Exception as error:
            if getattr(error, "response", {}).get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                raise ApiError(409, "STALE_VERSION", "The record changed. Reload before saving") from None
            raise
        return value

    def list(self, owner, kind):
        from boto3.dynamodb.conditions import Key
        result, cursor = [], None
        while True:
            options = {"KeyConditionExpression": Key("pk").eq(f"OWNER#{owner}") & Key("sk").begins_with(f"{kind}#"), "ConsistentRead": True}
            if cursor:
                options["ExclusiveStartKey"] = cursor
            page = self.table.query(**options)
            result.extend(self.get(owner, kind, item["sk"].split("#", 1)[1]) for item in page["Items"])
            cursor = page.get("LastEvaluatedKey")
            if not cursor:
                return result

    def admit(self):
        """An atomic daily limit caps expensive work across all demo users."""
        day = datetime.now(timezone.utc).date().isoformat()
        try:
            self.table.update_item(Key={"pk": "DEMO_LIMITS", "sk": day}, UpdateExpression="SET expires_at = :expiry ADD job_count :one", ConditionExpression="attribute_not_exists(job_count) OR job_count < :limit", ExpressionAttributeValues={":expiry": expiry(), ":one": 1, ":limit": int(os.environ["DAILY_JOB_LIMIT"])})
        except Exception as error:
            if getattr(error, "response", {}).get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                raise ApiError(429, "DAILY_LIMIT", "The demo has reached its daily planning limit") from None
            raise

    def claim_slot(self, job_id):
        try:
            self.table.update_item(Key={"pk": "DEMO_LIMITS", "sk": "PLANNER"}, UpdateExpression="SET lease_until = :until, job_id = :job, expires_at = :expiry", ConditionExpression="attribute_not_exists(lease_until) OR lease_until < :now", ExpressionAttributeValues={":until": int(time.time()) + 420, ":now": int(time.time()), ":job": job_id, ":expiry": expiry()})
        except Exception as error:
            if getattr(error, "response", {}).get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                raise ApiError(429, "PLANNER_BUSY", "Another demo calculation is running. Wait and retry.") from None
            raise

    def release_slot(self, job_id):
        try:
            self.table.delete_item(Key={"pk": "DEMO_LIMITS", "sk": "PLANNER"}, ConditionExpression="job_id = :job", ExpressionAttributeValues={":job": job_id})
        except Exception as error:
            if getattr(error, "response", {}).get("Error", {}).get("Code") != "ConditionalCheckFailedException":
                raise

    def invoke(self, owner, job_id, correlation_id):
        # Stable name AND stable input make retries safe for Standard workflows.
        self.workflow_client.start_execution(stateMachineArn=os.environ["PLANNER_WORKFLOW"], name=job_id,
                                             input=json.dumps({"owner": owner, "job_id": job_id, "correlation_id": correlation_id}, sort_keys=True))


def checked(message):
    result = execute(message)
    if "error" in result:
        error = result["error"]
        raise ApiError(400, error["code"], error["message"] + (": " + "; ".join(f"{d['field']}: {d['message']}" for d in error.get("details", [])) if error.get("details") else ""))
    return result


def draft(value):
    """Drafts may have unselected policies, but must be safe to reopen in the UI."""
    if not isinstance(value, dict) or value.get("data_mode") != "example" or not isinstance(value.get("name"), str) or not value["name"].strip() or len(value["name"]) > 120:
        raise ApiError(400, "INVALID_PROJECT", "Enter a name and labelled example mode")
    for section, limit in [("vehicles", 5), ("sites", 20)]:
        if not isinstance(value.get(section), list) or len(value[section]) > limit or any(not isinstance(row, dict) for row in value[section]):
            raise ApiError(400, "INVALID_PROJECT", "Unsupported resource fields or count")
    rows = [value.get("depot"), *value["vehicles"], *value["sites"]]
    if any(not isinstance(row, dict) or not all(isinstance(row.get(key), str) for key in ["name", "opens_at", "closes_at"]) for row in rows):
        raise ApiError(400, "INVALID_PROJECT", "Draft resources need names and time fields")
    if any(not isinstance(row.get("location"), dict) for row in [value["depot"], *value["sites"]]):
        raise ApiError(400, "INVALID_PROJECT", "Draft locations must have coordinate fields")
    matrix = value.get("travel_matrix")
    if matrix is not None and (not isinstance(matrix, dict) or not isinstance(matrix.get("provider"), str) or not isinstance(matrix.get("limitations"), list)):
        raise ApiError(400, "INVALID_PROJECT", "Invalid draft routing matrix")
    if not isinstance(value.get("display_warning"), str) or not isinstance(value.get("operating_date"), str):
        raise ApiError(400, "INVALID_PROJECT", "Draft date and example warning are required")
    return value


def request_key(event):
    key = headers(event).get("idempotency-key", "")
    if not isinstance(key, str) or not key or len(key) > 128:
        raise ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "This action needs an idempotency key")
    return key


def request_id(owner, path, key):
    return str(UUID(digest([owner, path, key])[:32]))


def public_operation(operation):
    return {key: value for key, value in operation.items() if not key.startswith("_")}


def public_project(project):
    return {key: value for key, value in project.items() if key != "_requests"}


def authenticated_approval(operation, owner):
    operation["approvals"][-1].update(actor_id=owner, authentication="Cognito authenticated coordinator")
    return operation


def submit_revision(event, store, owner, operation_id, correlation_id):
    value, key = body(event), request_key(event)
    job_id = request_id(owner, event["path"], key)
    request_hash = digest([event["path"], value])
    try:
        prior = store.get(owner, "JOB", job_id)
    except ApiError as error:
        if error.status != 404:
            raise
    else:
        if prior["request_hash"] != request_hash:
            raise ApiError(409, "IDEMPOTENCY_CONFLICT", "This key was used with different inputs")
        return 202, public_job(prior)
    operation = store.get(owner, "OPERATION", operation_id)
    if headers(event).get("if-match") != str(operation["version"]):
        raise ApiError(409, "STALE_VERSION", "Reload the changed operation before replanning")
    when = value.get("replan_at")
    try:
        parsed = datetime.fromisoformat(when)
        if parsed.tzinfo is None or parsed.utcoffset() is None:
            raise ValueError()
    except (TypeError, ValueError):
        raise ApiError(400, "INVALID_REPLAN_TIME", "Enter a replan timestamp with a timezone offset") from None
    store.claim_slot(job_id)
    try:
        store.admit()
        job = {"job_id": job_id, "version": 1, "status": "queued", "kind": "replan", "mode": "aws_live", "created_at": stamp(),
               "request_hash": request_hash, "operation_id": operation_id, "operation_version": operation["version"],
               "operation_snapshot": operation, "replan_at": when, "correlation_id": correlation_id}
        store.put(owner, "JOB", job_id, job)
    except Exception:
        store.release_slot(job_id)
        raise
    try:
        store.invoke(owner, job_id, correlation_id)
    except Exception:  # noqa: BLE001 -- SDK failure becomes a durable terminal job.
        store.release_slot(job_id)
        store.put(owner, "JOB", job_id, {**job, "version": 2, "status": "failed", "error": {"code": "JOB_START_FAILED", "message": "Revision could not start. Try a new request later."}}, 1)
        raise ApiError(503, "JOB_START_FAILED", "Revision could not start") from None
    return 202, public_job(job)


def operations_dispatch(event, store, owner, correlation_id):
    path, method = event.get("path", ""), event.get("httpMethod")
    if method == "GET" and path == "/v1/operations":
        return 200, {"operations": [{"operation_id": op["operation_id"], "name": op["input"]["name"], "version": op["version"], "actor": op["approvals"][0]["actor"]} for op in store.list(owner, "OPERATION")]}
    if method == "POST" and path == "/v1/approvals":
        value, key = body(event), request_key(event)
        operation_id = request_id(owner, path, key)
        request_hash = digest([path, value])
        try:
            prior = store.get(owner, "OPERATION", operation_id)
        except ApiError as error:
            if error.status != 404:
                raise
        else:
            if prior["_requests"].get(key) != request_hash:
                raise ApiError(409, "IDEMPOTENCY_CONFLICT", "This key was used with different inputs")
            return 200, {"operation": public_operation(prior)}
        job = store.get(owner, "JOB", identifier(value.get("job_id")))
        candidate = next((p for p in job.get("plans", []) if p["strategy"] == value.get("strategy")), None)
        if job["status"] != "completed" or not candidate:
            raise ApiError(409, "PLAN_NOT_READY", "Generate and review a completed planning job first")
        operation = checked({"command": "approve", "input": job["input"], "plan": candidate, "actor": value.get("actor"), "operation_id": operation_id})["operation"]
        authenticated_approval(operation, owner)
        operation["_requests"] = {key: request_hash}
        try:
            store.put(owner, "OPERATION", operation_id, operation)
        except ApiError as error:
            if error.status != 409:
                raise
            prior = store.get(owner, "OPERATION", operation_id)
            if prior["_requests"].get(key) != request_hash:
                raise ApiError(409, "IDEMPOTENCY_CONFLICT", "This key was used with different inputs") from None
            operation = prior
        return 200, {"operation": public_operation(operation)}
    match = re.fullmatch(r"/v1/operations/([^/]+)(?:/(events|replan|approve-revision))?", path)
    if not match:
        raise ApiError(404, "NOT_FOUND", "Endpoint not found")
    operation_id, action = identifier(match[1]), match[2]
    if method == "POST" and action == "replan":
        return submit_revision(event, store, owner, operation_id, correlation_id)
    operation = store.get(owner, "OPERATION", operation_id)
    if method == "GET" and action is None:
        return 200, {"operation": public_operation(operation)}
    if method != "POST" or action not in ["events", "approve-revision"]:
        raise ApiError(404, "NOT_FOUND", "Endpoint not found")
    value, key = body(event), request_key(event)
    request_hash = digest([path, value])
    prior = operation.get("_requests", {}).get(key)
    if prior is not None:
        if prior != request_hash:
            raise ApiError(409, "IDEMPOTENCY_CONFLICT", "This key was used with different inputs")
        return 200, {"operation": public_operation(operation)}
    if headers(event).get("if-match") != str(operation["version"]):
        raise ApiError(409, "STALE_VERSION", "Reload the changed operation before updating it")
    if action == "events":
        report = value.get("event")
        if not isinstance(report, dict):
            raise ApiError(400, "INVALID_EVENT", "Enter an operational event")
        next_operation = checked({"command": "event", "operation": operation, "event": {**report, "idempotency_key": key}})["operation"]
        next_operation.setdefault("event_audit", []).append({"idempotency_key": key, "actor_id": owner, "recorded_at": stamp()})
    else:
        next_operation = checked({"command": "approve_revision", "operation": operation, "actor": value.get("actor")})["operation"]
        authenticated_approval(next_operation, owner)
    # Request receipt and state change share one conditional pointer write.
    next_operation["_requests"] = {**operation.get("_requests", {}), key: request_hash}
    store.put(owner, "OPERATION", operation_id, next_operation, operation["version"])
    return 200, {"operation": public_operation(next_operation)}


def dispatch(event, store, correlation_id):
    live()
    owner = identity(event)
    path, method = event.get("path", ""), event.get("httpMethod")
    if path == "/v1/approvals" or path == "/v1/operations" or path.startswith("/v1/operations/"):
        return operations_dispatch(event, store, owner, correlation_id)
    if method == "GET" and path == "/v1/health":
        return 200, {"mode": "aws_live", "data_mode": "example", "expires_at": os.environ["DEMO_EXPIRES_AT"]}
    if method == "GET" and path == "/v1/example":
        return 200, execute({"command": "example"})
    if method == "GET" and path == "/v1/projects":
        archived = (event.get("queryStringParameters") or {}).get("archived") == "true"
        return 200, {"projects": [{key: project[key] for key in ["project_id", "version", "updated_at"]} | {"name": project["input"]["name"], "data_mode": "example", "archived": bool(project.get("archived_at"))} for project in store.list(owner, "PROJECT") if bool(project.get("archived_at")) == archived]}
    if path.startswith("/v1/projects/"):
        match = re.fullmatch(r"/v1/projects/([^/]+)(?:/(archive|restore))?", path)
        if not match:
            raise ApiError(404, "NOT_FOUND", "Endpoint not found")
        record_id, action = identifier(match[1]), match[2]
        project = store.get(owner, "PROJECT", record_id)
        if method == "POST" and action:
            key = request_key(event)
            request_hash = digest([path, body(event)])
            prior = project.get("_requests", {}).get(key)
            if prior is not None:
                if prior != request_hash:
                    raise ApiError(409, "IDEMPOTENCY_CONFLICT", "This key was used with different inputs")
                return 200, {"project": public_project(project)}
            if headers(event).get("if-match") != str(project["version"]):
                raise ApiError(409, "STALE_VERSION", "Reload the changed project before updating it")
            next_project = {**project, "archived_at": stamp() if action == "archive" else None, "version": project["version"] + 1, "updated_at": stamp(),
                            "_requests": {**project.get("_requests", {}), key: request_hash}}
            store.put(owner, "PROJECT", record_id, next_project, project["version"])
            return 200, {"project": public_project(next_project)}
        if method == "GET" and not action:
            return 200, {"project": public_project(project)}
        if method == "PUT" and not action:
            if headers(event).get("if-match") != str(project["version"]):
                raise ApiError(409, "STALE_VERSION", "Reload the changed project before saving")
            if project.get("archived_at"):
                raise ApiError(409, "PROJECT_ARCHIVED", "Restore this archived project before saving")
            value = draft(body(event).get("input"))
            if value.get("project_id") != record_id:
                raise ApiError(400, "INVALID_PROJECT", "Project identity cannot change")
            next_project = {**project, "input": value, "version": project["version"] + 1, "updated_at": stamp()}
            return 200, {"project": public_project(store.put(owner, "PROJECT", record_id, next_project, project["version"]))}
        raise ApiError(404, "NOT_FOUND", "Endpoint not found")
    if method == "POST" and path == "/v1/projects":
        value = body(event)
        try:
            day = date.fromisoformat(value["operating_date"]).isoformat()
            if day != value["operating_date"] or value.get("data_mode") != "example":
                raise ValueError()
        except (KeyError, ValueError, TypeError):
            raise ApiError(400, "INVALID_PROJECT", "Select a valid operating date and example mode") from None
        if len(store.list(owner, "PROJECT")) >= 20:
            raise ApiError(429, "PROJECT_LIMIT", "This demo supports 20 saved projects per identity")
        value_input = execute({"command": "example"})
        record_id = str(uuid4())
        value_input.update(project_id=record_id, name=value.get("name"), operating_date=day)
        for row in [value_input["depot"], *value_input["vehicles"], *value_input["sites"]]:
            for field in ["opens_at", "closes_at"]:
                row[field] = day + row[field][10:]
        draft(value_input)
        project = {"project_id": record_id, "version": 1, "input": value_input, "updated_at": stamp()}
        return 200, {"project": store.put(owner, "PROJECT", record_id, project)}
    if method == "POST" and path == "/v1/validate-input":
        return 200, checked({"command": "validate", "input": body(event).get("input")})
    if method == "POST" and path == "/v1/planning-jobs":
        value = body(event)
        key = headers(event).get("idempotency-key", "")
        if not key or len(key) > 128:
            raise ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "A planning request needs an idempotency key")
        # Owner + idempotency key gives a stable job identity across repeated requests.
        job_id = str(UUID(hashlib.sha256(f"{owner}:{key}".encode()).hexdigest()[:32]))
        try:
            job = store.get(owner, "JOB", job_id)
            if job["request_hash"] != digest(value):
                raise ApiError(409, "IDEMPOTENCY_CONFLICT", "This key was used with different inputs")
            return 202, public_job(job)
        except ApiError as error:
            if error.status != 404:
                raise
        checked({"command": "validate", "input": value.get("input")})
        kind = value.get("kind", "comparison")
        if kind not in ["comparison", "marginal"]:
            raise ApiError(400, "INVALID_JOB_KIND", "Choose comparison or marginal analysis")
        extra = {}
        if kind == "marginal":
            parent = store.get(owner, "JOB", identifier(value.get("parent_job_id")))
            if parent["status"] != "completed" or not parent.get("plans"):
                raise ApiError(409, "PLAN_NOT_READY", "Generate a comparison before resource analysis")
            options = checked({"command": "validate_marginal", "input": value["input"], "options": value.get("options"), "parent_input": parent["input"]})["options"]
            extra = {"kind": kind, "options": options, "parent_job_id": parent["job_id"], "_parent_input": parent["input"]}
        store.claim_slot(job_id)
        try:
            store.admit()
        except Exception:
            store.release_slot(job_id)
            raise
        job = {"job_id": job_id, "version": 1, "status": "queued", "mode": "aws_live", "created_at": stamp(), "request_hash": digest(value), "input": value["input"], "correlation_id": correlation_id}
        job.update(extra)
        try:
            store.put(owner, "JOB", job_id, job)
        except ApiError as error:
            store.release_slot(job_id)
            if error.status != 409:
                raise
            existing = store.get(owner, "JOB", job_id)
            if existing["request_hash"] != job["request_hash"]:
                raise ApiError(409, "IDEMPOTENCY_CONFLICT", "This key was used with different inputs") from None
            return 202, public_job(existing)
        try:
            store.invoke(owner, job_id, correlation_id)
        except Exception:  # noqa: BLE001 -- SDK failure becomes a durable terminal job.
            store.release_slot(job_id)
            store.put(owner, "JOB", job_id, {**job, "version": 2, "status": "failed", "error": {"code": "JOB_START_FAILED", "message": "Planning could not start. Try a new request later."}}, 1)
            raise ApiError(503, "JOB_START_FAILED", "Planning could not start") from None
        return 202, public_job(job)
    if method == "GET" and path.startswith("/v1/planning-jobs/"):
        job_id = identifier(path.removeprefix("/v1/planning-jobs/"))
        job = store.get(owner, "JOB", job_id)
        if job["status"] not in ["completed", "failed"] and time.time() - datetime.fromisoformat(job["created_at"].replace("Z", "+00:00")).timestamp() > 420:
            job = store.put(owner, "JOB", job_id, {**job, "version": job["version"] + 1, "status": "failed", "error": {"code": "JOB_TIMEOUT", "message": "Planning timed out. No unchecked result was published."}}, job["version"])
        return 200, public_job(job)
    raise ApiError(404, "NOT_FOUND", "Endpoint not found")


def public_job(job):
    return {key: value for key, value in job.items() if not key.startswith("_") and key not in ["input", "request_hash", "operation_snapshot", "operation_version"]}


def api_handler(event, context):
    correlation_id = getattr(context, "aws_request_id", str(uuid4()))
    status = 500
    try:
        # Authentication is checked before constructing AWS clients or accessing state.
        identity(event)
        status, result = dispatch(event, Store(), correlation_id)
    except ApiError as error:
        status, result = error.status, {"error": {"code": error.code, "message": error.message, "correlation_id": correlation_id}}
    except Exception:  # noqa: BLE001 -- HTTP boundary never exposes internal details.
        result = {"error": {"code": "API_FAILED", "message": "The request could not complete. Retry later.", "correlation_id": correlation_id}}
    print(json.dumps({"event": "api_request", "correlation_id": correlation_id, "status": status}))
    return {"statusCode": status, "headers": {"Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Access-Control-Allow-Origin": os.environ["WEB_ORIGIN"]}, "body": json.dumps(result)}


def worker_handler(event, context):
    """Offline compatibility harness; production invokes workflow.stage_handler."""
    from .workflow import run_offline
    return run_offline(event)
