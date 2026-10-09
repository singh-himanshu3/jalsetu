import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { exportCards, exportStops, isApprovedPlan } from '../apps/web/src/exports.ts';
import { parseCsv } from '../apps/web/src/csv.mjs';

const fixture = JSON.parse(await readFile(new URL('../data/evaluation-events/failure_after_delivery.json', import.meta.url), 'utf8'));
const plan = fixture.operation.approved_plan;
const meta = { project_name: 'Synthetic export test <script>alert(1)</script>', revision: '1', data_mode: 'example', created_at: plan.created_at, approval_state: 'approved local example', source_age: 'Synthetic fixture' };
assert.equal(isApprovedPlan(plan, plan), true);
assert.equal(isApprovedPlan({ ...plan, strategy: 'different_strategy' }, plan), false, 'Sharing an input hash must not mark another strategy approved');
assert.equal(isApprovedPlan({ ...plan, vehicle_routes: [] }, plan), false);
assert.equal(isApprovedPlan(undefined, plan), false);

const blobs = new Map(), captures = [], deferred = [], links = new Set();
const originals = { document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL, timer: globalThis.setTimeout };
try {
  URL.createObjectURL = blob => { const url = `blob:test-${blobs.size}`; blobs.set(url, blob); return url; };
  URL.revokeObjectURL = url => blobs.delete(url);
  globalThis.setTimeout = callback => { deferred.push(callback); return 0; };
  globalThis.document = { body: { appendChild: link => links.add(link) }, createElement: () => {
    const link = { click() { assert.ok(links.has(link)); captures.push({ name: link.download, blob: blobs.get(link.href) }); }, remove() { links.delete(link); } };
    return link;
  } };
  exportStops(plan, meta); exportCards(plan, meta);
  assert.equal(links.size, 0);
  assert.equal(blobs.size, 2, 'Blob must remain available until asynchronous download consumption');
  const csv = await captures[0].blob.text(), html = await captures[1].blob.text();
  const rows = parseCsv(csv), stops = plan.vehicle_routes.flatMap(r => r.stops.map(s => ({ ...s, vehicle_id: r.vehicle_id })));
  assert.equal(rows.length, stops.length);
  for (let i = 0; i < rows.length; i++) {
    assert.equal(rows[i].site_id, stops[i].site_id); assert.equal(rows[i].vehicle_id, stops[i].vehicle_id);
    assert.equal(Number(rows[i].planned_litres), stops[i].planned_litres);
    assert.equal(rows[i].estimated_service_start_utc, stops[i].estimated_arrival);
    assert.equal(rows[i].estimated_service_end_utc, stops[i].estimated_departure);
    assert.equal(rows[i].revision, '1'); assert.equal(rows[i].input_sha256, plan.input_snapshot_sha256);
  }
  assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('EXAMPLE DATA')); assert.ok(html.includes(plan.input_snapshot_sha256));
  assert.equal((html.match(/class="card"/g) ?? []).length, plan.vehicle_routes.length);
  for (const route of plan.vehicle_routes) for (const stop of route.stops) {
    assert.ok(html.includes(`<td>${stop.planned_litres}</td>`));
    const expectedTime = new Date(stop.estimated_arrival).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    assert.ok(html.includes(expectedTime));
  }
  const output = new URL('../docs/audit/exports/', import.meta.url); await mkdir(output, { recursive: true });
  for (const capture of captures) await writeFile(new URL(capture.name, output), await capture.blob.text());
  deferred.forEach(callback => callback()); assert.equal(blobs.size, 0);
  console.log('Export checks passed: strategy-specific approval, correct fixture assignments/times/revision/hash, escaped HTML, example labels and deferred Blob cleanup. Browser saving is a separate check.');
} finally {
  globalThis.document = originals.document; URL.createObjectURL = originals.create; URL.revokeObjectURL = originals.revoke; globalThis.setTimeout = originals.timer;
}
