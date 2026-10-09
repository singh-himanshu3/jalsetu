import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const base = 'http://127.0.0.1:8787';
import {writeFile} from 'node:fs/promises';
const input = await (await fetch(`${base}/v1/example`)).json();
for (const body of ['null', '[]', '123', '{broken']) {
  const response = await fetch(`${base}/v1/planning-jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, body });
  assert.equal(response.status, 400, 'Invalid request bodies must be readable client errors, not server errors');
}
assert.equal(input.service_window_policy, null, 'The user policy must not be preselected');
assert.equal(input.loading_mode, null);
// Explicit test configuration, not team approval of these operating rules.
input.service_window_policy = 'finish_by_close'; input.loading_mode = 'parallel';
input.name = 'Automated API test — synthetic exercise';
const key = randomUUID();
const submit = payload => fetch(`${base}/v1/planning-jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(payload) });
const firstResponse = await submit({ input }); assert.equal(firstResponse.status, 202);
const first = await firstResponse.json();
const overload = await fetch(`${base}/v1/planning-jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ input }) });
assert.equal(overload.status, 429, 'Parallel local calculations must receive backpressure');
const repeated = await submit({ input }); assert.equal(repeated.status, 202);
assert.equal((await repeated.json()).job_id, first.job_id, 'Repeated request created a duplicate job');
const changed = structuredClone(input); changed.depot.available_stock_litres -= 100;
assert.equal((await submit({ input: changed })).status, 409);
let job; const deadline = Date.now() + 30_000;
while (Date.now() < deadline) {
  job = await (await fetch(`${base}/v1/planning-jobs/${first.job_id}`)).json();
  if (['completed', 'failed'].includes(job.status)) break;
  await new Promise(resolve => setTimeout(resolve, 200));
}
assert.equal(job.status, 'completed', JSON.stringify(job.error));
assert.equal(job.plans.length, 4);
assert.ok(job.plans.every(plan => plan.validation.valid));
assert.deepEqual(job.stage_history.map(item => item.stage), ['LoadAndValidate', 'GetRouteMatrix', 'SolveStrategies', 'ValidatePlans', 'PersistResult', 'ExplainResult', 'CompleteJob']);
assert.equal(job.input_snapshot_sha256, job.plans[0].input_snapshot_sha256);
assert.ok(!Object.keys(job).some(key => key.startsWith('_')), 'Intermediate snapshots must stay private');
const invalid = structuredClone(input); invalid.sites[0].location.latitude = 40;
const badResponse = await fetch(`${base}/v1/planning-jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ input: invalid }) });
const bad = await badResponse.json();
let failed;
while (Date.now() < deadline) {
  failed = await (await fetch(`${base}/v1/planning-jobs/${bad.job_id}`)).json();
  if (failed.status === 'failed') break;
  await new Promise(resolve => setTimeout(resolve, 200));
}
assert.equal(failed.status, 'failed'); assert.equal(failed.error.code, 'INVALID_INPUT');
console.log('Local API checks passed: unset policies, four valid strategies, idempotency, conflict, terminal invalid-input failure.');

async function post(path, body, version, requestKey = randomUUID()) {
  return fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey, ...(version === undefined ? {} : { 'If-Match': String(version) }) }, body: JSON.stringify(body) });
}
const approvalResponse = await post('/v1/approvals', { job_id: first.job_id, strategy: 'jalsetu', actor: 'Automated API test' });
assert.equal(approvalResponse.status, 200);
let operation = (await approvalResponse.json()).operation;
assert.equal(operation.ledger.depot_litres, 12000);
const route = operation.approved_plan.vehicle_routes[0], stop = route.stops[0];
const eventPath = `/v1/operations/${operation.operation_id}/events`;
const loadKey = randomUUID();
const load = { event: { event_type: 'vehicle_loaded', occurred_at: route.loading_started_at, payload: { vehicle_id: route.vehicle_id, litres: route.planned_load_litres } } };
const loadResponse = await post(eventPath, load, operation.version, loadKey);
const loadResult = await loadResponse.json();
assert.equal(loadResponse.status, 200, JSON.stringify(loadResult));
operation = loadResult.operation;
const afterLoad = operation.version;
const duplicateLoad = await post(eventPath, load, 1, loadKey);
assert.equal(duplicateLoad.status, 200, 'Idempotent retries must work even with the earlier version header');
assert.equal((await duplicateLoad.json()).operation.version, afterLoad);
assert.equal((await post(eventPath, load, 1)).status, 409, 'Stale new writes must be rejected');
const activeRevision = await post(`/v1/operations/${operation.operation_id}/replan`, { replan_at: stop.estimated_departure }, operation.version);
const blockedJob = await activeRevision.json();
async function waitJob(id) {
  const limit = Date.now() + 30_000;
  while (Date.now() < limit) {
    const current = await (await fetch(`${base}/v1/planning-jobs/${id}`)).json();
    if (['completed', 'failed'].includes(current.status)) return current;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Local job did not finish in the test allowance');
}
const blocked = await waitJob(blockedJob.job_id);
assert.equal(blocked.status, 'failed'); assert.match(blocked.error.message, /In-progress vehicles/);
for (const event of [
  { event_type: 'delivery_reported', occurred_at: stop.estimated_departure, payload: { vehicle_id: route.vehicle_id, site_id: stop.site_id, litres: stop.planned_litres } },
  { event_type: 'vehicle_failed', occurred_at: stop.estimated_departure, payload: { vehicle_id: route.vehicle_id } },
]) {
  const response = await post(eventPath, { event }, operation.version);
  assert.equal(response.status, 200); operation = (await response.json()).operation;
}
assert.equal(operation.ledger.vehicles[route.vehicle_id].stranded_litres, route.planned_load_litres - stop.planned_litres);
const revisionJob = await (await post(`/v1/operations/${operation.operation_id}/replan`, { replan_at: stop.estimated_departure }, operation.version)).json();
const revision = await waitJob(revisionJob.job_id);
assert.equal(revision.status, 'completed', JSON.stringify(revision.error));
operation = revision.operation;
assert.equal(operation.revision_draft.fixed_reported_deliveries[stop.site_id], stop.planned_litres);
const approveRevision = await post(`/v1/operations/${operation.operation_id}/approve-revision`, { actor: 'Automated revision test' }, operation.version);
assert.equal(approveRevision.status, 200); operation = (await approveRevision.json()).operation;
assert.equal(operation.current_plan_revision, 2);
assert.equal(operation.ledger.conservation_valid, true);
const stored = (await (await fetch(`${base}/v1/operations/${operation.operation_id}`)).json()).operation;
assert.deepEqual(stored, operation);
console.log('Operations API checks passed: checked approval, duplicate loading, stale-write rejection, active-vehicle safeguard, failure, preserved delivery, revision approval and persisted reads.');
const scenarioBody={input,kind:'marginal',parent_job_id:first.job_id,options:{extra_stock_litres:1000,vehicle_capacity_litres:5000,earlier_start_minutes:30,closing_site_id:input.sites[0].site_id,later_close_minutes:30,shorter_service_minutes:5}};
const scenarioKey=randomUUID();
const marginalResponse=await post('/v1/planning-jobs',scenarioBody,undefined,scenarioKey);
assert.equal(marginalResponse.status,202);
const marginalJob=await waitJob((await marginalResponse.json()).job_id);
assert.equal(marginalJob.status,'completed',JSON.stringify(marginalJob.error));
assert.equal(marginalJob.analysis.children.length,6);
assert.ok(marginalJob.analysis.children.every(c=>c.plan?.validation.valid));
assert.equal((await (await post('/v1/planning-jobs',scenarioBody,undefined,scenarioKey)).json()).job_id,marginalJob.job_id);
assert.deepEqual((await (await fetch(`${base}/v1/operations/${operation.operation_id}`)).json()).operation,stored,'Scenario analysis must not change approved operations');
await writeFile(new URL('../docs/marginal-example.json',import.meta.url),JSON.stringify(marginalJob,null,2)+'\n');
console.log('Marginal API checks passed: six checked child solves, stable retries, parent lineage and unchanged approved operations.');
