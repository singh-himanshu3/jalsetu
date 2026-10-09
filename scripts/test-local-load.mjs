import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:8787';
const health = await (await fetch(`${base}/v1/health`)).json();
assert.equal(health.cloud_deployed, false, 'This check must run against the local adapter');
const reads = await Promise.all(Array.from({ length: 100 }, async () => {
  const start = performance.now(); const res = await fetch(`${base}/v1/health`); await res.json();
  assert.equal(res.status, 200); return performance.now() - start;
}));
reads.sort((a, b) => a - b);
const input = await (await fetch(`${base}/v1/example`)).json();
input.service_window_policy = 'finish_by_close'; input.loading_mode = 'parallel';
const submissions = await Promise.all(Array.from({ length: 10 }, async () => {
  const res = await fetch(`${base}/v1/planning-jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ input }) });
  return { status: res.status, body: await res.json() };
}));
assert.equal(submissions.filter(x => x.status === 202).length, 1);
assert.equal(submissions.filter(x => x.status === 429).length, 9);
const accepted = submissions.find(x => x.status === 202);
let terminal;
const deadline = Date.now() + 90_000;
while (Date.now() < deadline) {
  terminal = await (await fetch(`${base}/v1/planning-jobs/${accepted.body.job_id}`)).json();
  if (['completed', 'failed'].includes(terminal.status)) break;
  await new Promise(resolve => setTimeout(resolve, 200));
}
assert.equal(terminal.status, 'completed', JSON.stringify(terminal.error));
const evidence = { recorded_at: new Date().toISOString(), environment: 'Windows local loopback adapter', read_burst: { simultaneous_requests: 100, successful: 100, median_ms: +reads[50].toFixed(2), max_ms: +reads.at(-1).toFixed(2) }, planning_burst: { requests: 10, accepted: 1, rejected_busy: 9, accepted_job_completed: true }, limitations: ['Health reads do not simulate complete visitors', 'This is not an AWS or public-traffic benchmark', 'Local adapter deliberately permits only one calculation at a time'] };
await writeFile(new URL('../docs/local-load-check.json', import.meta.url), JSON.stringify(evidence, null, 2));
console.log('Local load checks passed: 100 health reads succeeded; 1 planning job accepted, 9 received busy responses; accepted job completed.');
