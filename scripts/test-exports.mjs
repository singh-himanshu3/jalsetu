import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { exportCards, exportStops, isApprovedPlan } from '../apps/web/src/exports.ts';
import { parseCsv } from '../apps/web/src/csv.mjs';

const fixture = JSON.parse(await readFile(new URL('../data/evaluation-events/failure_after_delivery.json', import.meta.url), 'utf8'));
const plan = fixture.operation.approved_plan;
const meta = { project_name: 'Synthetic export test <script>alert(1)</script>', revision: '1', data_mode: 'example', created_at: plan.created_at, approval_state: 'approved local example', source_age: 'Synthetic fixture',vehicle_names:Object.fromEntries(plan.vehicle_routes.map((r,i)=>[r.vehicle_id,`Example vehicle ${i+1}`])),site_names:Object.fromEntries(plan.vehicle_routes.flatMap(r=>r.stops.map(s=>[s.site_id,`Receiving ${s.site_id}`]))) };
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
    assert.equal(rows[i]['Receiving point'], meta.site_names[stops[i].site_id]); assert.equal(rows[i].Vehicle, meta.vehicle_names[stops[i].vehicle_id]);
    assert.equal(Number(rows[i]['Planned litres']), stops[i].planned_litres);
    const ist = value => new Date(value).toLocaleString('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
    assert.equal(rows[i]['Arrival (IST)'], ist(stops[i].estimated_arrival));
    assert.equal(rows[i]['Unloading ends (IST)'], ist(stops[i].estimated_departure));
    assert.equal(rows[i]['Plan status'], 'Approved example');
    assert.equal(rows[i].Project, meta.project_name);
  }
  assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('EXAMPLE DATA')); assert.ok(! /meta\s*\)\s*=>/.test(html), 'Downloads must render notes, not implementation code'); assert.ok(!html.includes(plan.input_snapshot_sha256));
  assert.ok(!csv.includes(plan.input_snapshot_sha256));
  assert.ok(!/SHA-256|input_sha256|schema_version|source_age/.test(html+csv));
  assert.ok(html.includes('Approved example'));
  assert.ok(html.includes('Coordinator overview'));
  assert.ok(html.includes('Requests and remaining shortfall'));
  for (const site of plan.site_results) assert.ok(html.includes(`<td>${site.unmet_litres}</td>`));
  for (const name of Object.values(meta.vehicle_names)) assert.ok(html.includes(name));
  for (const name of Object.values(meta.site_names)) assert.ok(html.includes(name));
  assert.equal((html.match(/class="card"/g) ?? []).length, plan.vehicle_routes.length);
  for (const route of plan.vehicle_routes) for (const stop of route.stops) {
    assert.ok(html.includes(`<td>${stop.planned_litres}</td>`));
    const expectedTime = new Date(stop.estimated_arrival).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    assert.ok(html.includes(expectedTime));
  }
  exportCards(fixture.revision_draft, {...meta, approval_state: 'draft', project_name: fixture.operation.input.name,
    vehicle_names: Object.fromEntries(fixture.operation.input.vehicles.map(v => [v.vehicle_id, v.name])),
    site_names: Object.fromEntries(fixture.operation.input.sites.map(s => [s.site_id, s.name]))});
  const revisedHtml = await captures[2].blob.text();
  const accounting = fixture.revision_draft.revision_accounting;
  assert.ok(revisedHtml.includes('Draft example'));
  assert.ok(revisedHtml.includes(`<b>Preserved delivery reports:</b> ${accounting.reported_delivered_litres} litres`));
  assert.ok(revisedHtml.includes(`<b>Additional water planned:</b> ${accounting.additional_scheduled_litres} litres`));
  assert.ok(revisedHtml.includes(`<b>Still unmet after reports and this plan:</b> ${accounting.remaining_unmet_requested_litres} litres`));
  assert.ok(revisedHtml.includes('new routes only'));
  assert.ok(!revisedHtml.includes(fixture.revision_draft.input_snapshot_sha256));
  captures[2].name = 'jalsetu-example-revision-summary.html';
  const output = new URL('../docs/audit/exports/', import.meta.url); await mkdir(output, { recursive: true });
  for (const capture of captures) await writeFile(new URL(capture.name, output), await capture.blob.text());
  const recordMeta = {...meta,data_mode:'operator_entered',source_reference:'SYNTHETIC test record <script>',records_date:'2026-10-10',source_age:'2026-10-10T06:05:23Z'};
  const recordPlan={...plan,limitations:["SYNTHETIC export test declaration, not actual records"]};
  exportStops(recordPlan,recordMeta);exportCards(recordPlan,recordMeta);
  const recordCsv=await captures.at(-2).blob.text(),recordHtml=await captures.at(-1).blob.text();
  assert.ok(recordCsv.includes('Approved record-based plan') && recordCsv.includes('not independently verified'));
  assert.ok(recordHtml.includes('OPERATOR-ENTERED RECORDS') && recordHtml.includes('Declared record source'));
  assert.ok(recordHtml.includes('Road estimates retrieved') && recordHtml.includes('OpenStreetMap contributors'));
  assert.ok(!recordHtml.includes('EXAMPLE DATA') && !recordHtml.includes('<script>'));
  assert.ok(! /meta\s*\)\s*=>/.test(recordHtml));
  assert.equal((html.match(/<p>Example only\./g)??[]).length,plan.vehicle_routes.length+1);
  deferred.forEach(callback => callback()); assert.equal(blobs.size, 0);
  console.log('Export checks passed: strategy-specific approval, readable names, exact quantities, IST times, approval labels and no internal hashes, escaped HTML, example labels and deferred Blob cleanup. Browser saving is a separate check.');
} finally {
  globalThis.document = originals.document; URL.createObjectURL = originals.create; URL.revokeObjectURL = originals.revoke; globalThis.setTimeout = originals.timer;
}
