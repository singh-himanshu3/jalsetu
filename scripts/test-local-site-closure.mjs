import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFile,mkdtemp,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {once} from 'node:events';

const directory=await mkdtemp(join(tmpdir(),'jalsetu-closure-'));
const child=spawn(process.execPath,['scripts/local-api.mjs'],{cwd:resolve(import.meta.dirname,'..'),env:{...process.env,JALSETU_PORT:'0',JALSETU_STATE_DIR:directory,JALSETU_LOCAL_STATE:''},stdio:['ignore','pipe','pipe'],windowsHide:true});
try {
const base=await new Promise((accept,reject)=>{let output='';const timer=setTimeout(()=>reject(new Error('Isolated closure server startup timed out')),20000);child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/JalSetu local API: (http:\/\/127\.0\.0\.1:\d+)/);if(match){clearTimeout(timer);accept(match[1]);}});child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{clearTimeout(timer);reject(new Error('Closure server exited: '+code));});});
async function post(path, body, version, key = randomUUID()) {
  const response = await fetch(base + path, {method:'POST', headers:{'Content-Type':'application/json',
    'Idempotency-Key':key, ...(version === undefined ? {} : {'If-Match':String(version)})}, body:JSON.stringify(body)});
  const result = await response.json();
  return {status:response.status, result};
}
async function waitJob(id) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const job = await (await fetch(`${base}/v1/planning-jobs/${id}`)).json();
    if (['completed','failed'].includes(job.status)) {
      assert.equal(job.status, 'completed', JSON.stringify(job.error));
      return job;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('The local closure check exceeded its job allowance');
}
const input = await (await fetch(`${base}/v1/example`)).json();
input.name = 'Automated site-closure API check — synthetic exercise';
input.service_window_policy = 'finish_by_close'; input.loading_mode = 'parallel';
const submitted = await post('/v1/planning-jobs', {input});
assert.equal(submitted.status, 202);
const job = await waitJob(submitted.result.job_id);
const approval = await post('/v1/approvals', {job_id:job.job_id, strategy:'jalsetu', actor:'Automated site-closure API check'});
assert.equal(approval.status, 200);
let operation = approval.result.operation;
const original = structuredClone(operation);
const site = operation.approved_plan.vehicle_routes[0].stops[0].site_id;
const path = `/v1/operations/${operation.operation_id}`;
const time = input.depot.opens_at;
const close = {event:{event_type:'site_closed', occurred_at:time, payload:{site_id:site}}};
const closeKey = randomUUID();
const closed = await post(`${path}/events`, close, operation.version, closeKey);
assert.equal(closed.status, 200);
operation = closed.result.operation;
assert.deepEqual(operation.ledger.closed_site_ids, [site]);
assert.equal(operation.ledger.depot_litres, 12000);
const retry = await post(`${path}/events`, close, 1, closeKey);
assert.equal(retry.status, 200);
assert.equal(retry.result.operation.version, operation.version);
assert.equal((await post(`${path}/events`, close, 1)).status, 409);
const revisionJob = await post(`${path}/replan`, {replan_at:time}, operation.version);
assert.equal(revisionJob.status, 202);
operation = (await waitJob(revisionJob.result.job_id)).operation;
assert.ok(operation.revision_draft.vehicle_routes.every(route => route.stops.every(stop => stop.site_id !== site)));
const row = operation.revision_draft.site_results.find(row => row.site_id === site);
assert.equal(row.unmet_litres, row.requested_litres);
const approved = await post(`${path}/approve-revision`, {actor:'Automated closed-point revision'}, operation.version);
assert.equal(approved.status, 200);
operation = approved.result.operation;
const closedRevision = structuredClone(operation);
const reopened = await post(`${path}/events`, {event:{event_type:'site_reopened', occurred_at:time, payload:{site_id:site}}}, operation.version);
assert.equal(reopened.status, 200);
operation = reopened.result.operation;
assert.deepEqual(operation.ledger.closed_site_ids, []);
const reopeningJob = await post(`${path}/replan`, {replan_at:time}, operation.version);
assert.equal(reopeningJob.status, 202);
operation = (await waitJob(reopeningJob.result.job_id)).operation;
assert.ok(operation.revision_draft.vehicle_routes.some(route => route.stops.some(stop => stop.site_id === site)));
const approvalAgain = await post(`${path}/approve-revision`, {actor:'Automated reopening revision'}, operation.version);
assert.equal(approvalAgain.status, 200);
operation = approvalAgain.result.operation;
assert.equal(operation.current_plan_revision, 3);
assert.equal(operation.ledger.depot_litres, 12000);
assert.deepEqual(operation.input, original.input);
assert.deepEqual(operation.initial_plan, original.initial_plan);
assert.equal(operation.events.length, 2);
assert.deepEqual((await (await fetch(base + path)).json()).operation, operation);
function checkpoint(state) {
  return {version:state.version, current_plan_revision:state.current_plan_revision,
    approved_plan:state.approved_plan, ledger:state.ledger, events:state.events, approvals:state.approvals};
}
await writeFile(new URL('../docs/audit/site-closure-example-2026-10-10.json', import.meta.url), JSON.stringify({
  scope:'Synthetic localhost API check; no physical delivery or AWS call', site_id:site,
  input:original.input, initial:checkpoint(original), closed_revision:checkpoint(closedRevision), reopened_revision:checkpoint(operation),
}, null, 2) + '\n');
console.log('Local site-closure API check passed: retry/version safeguards, exclusion, approval, explicit reopening, rescheduling, unchanged stock, history and saved reads.');

} finally {if(child.exitCode===null){const exit=once(child,'exit');child.kill();await exit;}await rm(directory,{recursive:true,force:true});}
