import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {mkdtemp, readFile, writeFile, rm, rmdir} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {tmpdir} from 'node:os';
import {once} from 'node:events';

const root = resolve(import.meta.dirname, '..');
const directory = await mkdtemp(join(tmpdir(), 'jalsetu-release-'));
const checks = [], startedAt = performance.now();
let child, base;
async function start() {
  child = spawn(process.execPath, [resolve(root, 'scripts/local-api.mjs'), '--serve-web'], {
    cwd:root, env:{...process.env, JALSETU_PORT:'0', JALSETU_STATE_DIR:directory, JALSETU_LOCAL_STATE:''},
    stdio:['ignore','pipe','pipe'], windowsHide:true,
  });
  let output = '';
  base = await new Promise((accept, reject) => {
    const timer = setTimeout(() => reject(new Error('The isolated release server did not become ready')), 20000);
    child.stdout.on('data', chunk => {
      output += chunk;
      const ready = output.match(/JalSetu app: (http:\/\/127\.0\.0\.1:\d+)/);
      if (ready) { clearTimeout(timer); accept(ready[1]); }
    });
    child.stderr.on('data', chunk => { output = (output + chunk).slice(-8000); });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Release startup failed (${code}): ${output}`)); });
  });
}
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit'); child.kill(); await exited;
}
async function read(path) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200);
  return response.json();
}
async function write(path, body, version, key = randomUUID(), method = 'POST') {
  const response = await fetch(base + path, {method, headers:{'Content-Type':'application/json',
    'Idempotency-Key':key, ...(version === undefined ? {} : {'If-Match':String(version)})}, body:JSON.stringify(body)});
  return {status:response.status, value:await response.json()};
}
async function waitJob(id, expected = 'completed') {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const job = await read(`/v1/planning-jobs/${id}`);
    if (['completed','failed'].includes(job.status)) {
      assert.equal(job.status, expected, JSON.stringify(job.error));
      return job;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Release job did not reach a terminal state');
}
try {
  await start();
  const collision = spawn(process.execPath, [resolve(root, 'scripts/local-api.mjs'), '--serve-web'], {
    cwd:root, env:{...process.env, JALSETU_PORT:new URL(base).port, JALSETU_STATE_DIR:directory, JALSETU_LOCAL_STATE:''},
    stdio:['ignore','ignore','pipe'], windowsHide:true,
  });
  let collisionMessage = '';
  collision.stderr.on('data', chunk => { collisionMessage += chunk; });
  assert.equal((await once(collision, 'exit'))[0], 1);
  assert.match(collisionMessage, /already in use.*Stop the existing JalSetu server/);
  assert.deepEqual(await read('/v1/health'), {mode:'offline_fixture', authentication:'loopback-only local application', cloud_deployed:false, frontend:'built'});
  const indexResponse = await fetch(base + '/');
  assert.equal(indexResponse.status, 200);
  assert.ok(indexResponse.headers.get('content-security-policy').includes("connect-src 'self'"));
  const browserPolicy = indexResponse.headers.get('content-security-policy');
  const imagePolicy = browserPolicy.split(';').map(s=>s.trim()).find(s=>s.startsWith('img-src '));
  assert.deepEqual(imagePolicy.split(/\s+/).slice(1).sort(),["'self'",'data:','https://tile.openstreetmap.org'].sort(),'Only the selected street-tile host may supply external images');
  assert.ok(browserPolicy.includes("script-src 'self'"),'The map must not enable external scripts');
  assert.equal(indexResponse.headers.get('referrer-policy'),'no-referrer','Page-level referrer protection stays in place; map images set their own origin-only policy');
  const index = await indexResponse.text();
  assert.ok(!index.includes('@vite/client'));
  for (const url of [index.match(/<script[^>]+src="([^"]+)"/)[1], index.match(/<link[^>]+href="([^"]+\.css)"/)[1]]) {
    const asset = await fetch(base + url);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get('x-content-type-options'), 'nosniff');
    assert.ok((await asset.arrayBuffer()).byteLength > 0);
  }
  const head = await fetch(base + '/', {method:'HEAD'});
  for(const route of ['/local-workspace','/auth/callback','/workspace','/workspace/deliveries']){
    const page=await fetch(base+route);assert.equal(page.status,200);assert.equal(await page.text(),index,'A permitted SPA route serves only the same built entry');
  }
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  assert.ok(Number(head.headers.get('content-length')) > 0);
  for (const path of ['/README.md','/.env','/local-state/operations.json','/scripts/local-api.mjs',
    '/config.json','/assets/..%2F..%2Flocal-state%2Foperations.json','/assets/%5C..%5C..%5CREADME.md']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404, path);
    assert.ok(response.headers.get('content-type').startsWith('text/plain'));
  }
  assert.equal((await fetch(base + '/%ZZ')).status, 400);
  assert.equal((await fetch(base + '/', {method:'POST'})).status, 405);
  checks.push('Built HTML, JavaScript and CSS; HEAD; same-origin connection policy; no source/state/cloud-config or traversal access; duplicate startup stops with a readable port-conflict message');

  const created = await write('/v1/projects', {name:'Release restart check · पानी', data_mode:'example', operating_date:'2026-10-10'});
  assert.equal(created.status, 200);
  let project = created.value.project;
  assert.equal(project.input.loading_mode, null);
  assert.equal(project.input.service_window_policy, null);
  const input = structuredClone(project.input);
  input.loading_mode = 'parallel'; input.service_window_policy = 'finish_by_close';
  const saved = await write(`/v1/projects/${project.project_id}`, {input}, project.version, randomUUID(), 'PUT');
  assert.equal(saved.status, 200); project = saved.value.project;

  const invalid = structuredClone(input); invalid.sites[0].location.latitude = 40;
  const invalidJob = await write('/v1/planning-jobs', {input:invalid});
  assert.equal(invalidJob.status, 202);
  const failed = await waitJob(invalidJob.value.job_id, 'failed');
  assert.equal(failed.error.code, 'INVALID_INPUT');
  assert.ok(!failed.plans, 'A failed job must not publish unvalidated routes');
  const planningKey = randomUUID(), planned = await write('/v1/planning-jobs', {input}, undefined, planningKey);
  assert.equal(planned.status, 202);
  const retry = await write('/v1/planning-jobs', {input}, undefined, planningKey);
  assert.equal(retry.value.job_id, planned.value.job_id);
  assert.equal((await write('/v1/planning-jobs', {input})).status, 429);
  const job = await waitJob(planned.value.job_id);
  assert.equal(job.plans.length, 4); assert.ok(job.plans.every(plan => plan.validation.valid));
  checks.push('Invalid-input failure is terminal, publishes no routes and releases the slot; next comparison completes; retry and busy safeguards');

  const approval = await write('/v1/approvals', {job_id:job.job_id, strategy:'jalsetu', actor:'Release check — synthetic exercise'});
  assert.equal(approval.status, 200);
  let operation = approval.value.operation;
  const route = operation.approved_plan.vehicle_routes[0], point = route.stops[0], at = point.estimated_departure;
  const operationPath = `/v1/operations/${operation.operation_id}`;
  async function report(kind, payload, when = at, key) {
    const result = await write(operationPath + '/events', {event:{event_type:kind, occurred_at:when, payload}}, operation.version, key);
    assert.equal(result.status, 200, JSON.stringify(result.value.error)); operation = result.value.operation;
  }
  await report('vehicle_loaded', {vehicle_id:route.vehicle_id, litres:route.planned_load_litres}, route.loading_started_at);
  await report('delivery_reported', {vehicle_id:route.vehicle_id, site_id:point.site_id, litres:point.planned_litres});
  await report('vehicle_failed', {vehicle_id:route.vehicle_id});
  await report('water_recovered', {vehicle_id:route.vehicle_id, litres:300});
  const closureKey = randomUUID();
  const closure = {event:{event_type:'site_closed', occurred_at:at, payload:{site_id:point.site_id}}};
  await report('site_closed', closure.event.payload, at, closureKey);
  const revision = await write(operationPath + '/replan', {replan_at:at}, operation.version);
  assert.equal(revision.status, 202);
  operation = (await waitJob(revision.value.job_id)).operation;
  assert.ok(operation.revision_draft);const draftSnapshot=structuredClone(operation);await stop();await start();assert.deepEqual((await read(operationPath)).operation,draftSnapshot,'Unapproved draft, reports and ledger survive process restart');checks.push('Pending draft restores durably through the operation API before a separate approval');
  const revisionApproval = await write(operationPath + '/approve-revision', {actor:'Release recovery revision'}, operation.version);
  assert.equal(revisionApproval.status, 200); operation = revisionApproval.value.operation;
  assert.equal(operation.ledger.depot_litres, 12000 - route.planned_load_litres + 300);
  assert.equal(operation.ledger.vehicles[route.vehicle_id].stranded_litres, route.planned_load_litres - point.planned_litres - 300);
  assert.equal(operation.ledger.reported_delivered_litres[point.site_id], point.planned_litres);
  assert.ok(operation.ledger.conservation_valid);
  assert.deepEqual(operation.ledger.closed_site_ids, [point.site_id]);
  assert.ok(operation.approved_plan.vehicle_routes.every(route => route.stops.every(stop => stop.site_id !== point.site_id)));
  const archived = await write(`/v1/projects/${project.project_id}/archive`, {}, project.version);
  assert.equal(archived.status, 200); project = archived.value.project;
  checks.push('Actual approval/loading/delivery/failure/300-L recovery/closure and independently checked revision; exact water accounting; project archive keeps operations');

  await stop(); await start();
  assert.deepEqual((await read(operationPath)).operation, operation);
  assert.deepEqual((await read(`/v1/projects/${project.project_id}`)).project, project);
  assert.equal((await read('/v1/projects')).projects.length, 0);
  assert.equal((await read('/v1/projects?archived=true')).projects[0].project_id, project.project_id);
  const eventRetry = await write(operationPath + '/events', closure, 1, closureKey);
  assert.equal(eventRetry.status, 200); assert.deepEqual(eventRetry.value.operation, operation);
  assert.equal((await write(operationPath + '/events', closure, 1)).status, 409);
  const restore = await write(`/v1/projects/${project.project_id}/restore`, {}, project.version);
  assert.equal(restore.status, 200); assert.ok(!restore.value.project.archived_at);
  assert.equal((await read('/v1/projects')).projects.length, 1);
  assert.equal((await fetch(`${base}/v1/planning-jobs/${job.job_id}`)).status, 404, 'Transient jobs must not be mistaken for durable results');
  checks.push('Real process restart preserves complete operation, Unicode project, archive state and retry receipts; stale writes still rejected; project restore; job cache intentionally resets');

  await stop();
  const operationFile = resolve(directory, 'operations.json'), bytes = await readFile(operationFile);
  await writeFile(operationFile, '{broken');
  await assert.rejects(start(), /Local operation file could not be read/);
  assert.equal(await readFile(operationFile, 'utf8'), '{broken', 'Startup must never reset corrupt saved data');
  await writeFile(operationFile, bytes); await start();
  assert.deepEqual((await read(operationPath)).operation, operation);
  checks.push('Corrupt saved file stops startup and remains unchanged; restoring the test snapshot allows startup and identical operation reads');
  await writeFile(resolve(root, 'docs/audit/local-release-check-2026-10-10.json'), JSON.stringify({
    scope:'Isolated built-app localhost release check; example data; no AWS calls or external user validation',
    recorded_at:new Date().toISOString(), duration_seconds:+((performance.now() - startedAt) / 1000).toFixed(2), checks,
    saved_operation_sha256:createHash('sha256').update(JSON.stringify(operation)).digest('hex'),
    persistence:'Projects, approvals, events, revisions and write receipts persist; transient planning jobs do not',
  }, null, 2) + '\n');
  console.log(`Local release check passed: ${checks.length} acceptance groups, real restart, preserved data, failure recovery and built app boundaries.`);
} finally {
  await stop();
  // Delete only explicit files created in this unique isolated test directory.
  for (const name of ['projects.json','operations.json','projects.json.next','operations.json.next']) await rm(resolve(directory, name), {force:true});
  await rmdir(directory);
}
