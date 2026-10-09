import { encodeCsv } from './csv.mjs';
type Stop = { site_id: string; planned_litres: number; estimated_arrival: string; estimated_departure: string };
type Route = { vehicle_id: string; planned_load_litres: number; stops: Stop[] };
export type ExportPlan = { strategy: string; input_snapshot_sha256: string; vehicle_routes: Route[]; limitations: string[]; explanation: string };
export type ExportMeta = { project_name: string; revision: string; data_mode: string; created_at: string; approval_state: string; source_age: string };
export function download(text: string, mime: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a'); link.href = url; link.download = name;
  document.body.appendChild(link);
  try { link.click(); } finally {
    link.remove();
    // Give the browser time to consume the Blob before releasing its URL.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
export function isApprovedPlan(plan: ExportPlan | undefined, approved: ExportPlan | undefined) {
  return Boolean(plan && approved && plan.strategy === approved.strategy
    && plan.input_snapshot_sha256 === approved.input_snapshot_sha256
    && JSON.stringify(plan.vehicle_routes) === JSON.stringify(approved.vehicle_routes));
}
export function exportStops(plan: ExportPlan, meta: ExportMeta) {
  const headers = ['project_name', 'revision', 'data_mode', 'created_at', 'approval_state', 'source_age', 'input_sha256', 'vehicle_id', 'site_id', 'planned_litres', 'estimated_service_start_utc', 'estimated_service_end_utc', 'limitations'];
  const rows = plan.vehicle_routes.flatMap(route => route.stops.map(stop => [meta.project_name, meta.revision, meta.data_mode, meta.created_at, meta.approval_state, meta.source_age, plan.input_snapshot_sha256, route.vehicle_id, stop.site_id, stop.planned_litres, stop.estimated_arrival, stop.estimated_departure, plan.limitations.join(' | ')]));
  download(encodeCsv([headers, ...rows]), 'text/csv;charset=utf-8', 'jalsetu-example-stop-assignments.csv');
}
const escape = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const time = (value: string) => new Date(value).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
export function exportCards(plan: ExportPlan, meta: ExportMeta) {
  const metadata = Object.entries(meta).map(([key, value]) => `<p><b>${escape(key.replaceAll('_', ' '))}:</b> ${escape(value)}</p>`).join('');
  const source = `<p>Input SHA-256: ${escape(plan.input_snapshot_sha256)}</p><ul>${plan.limitations.map(text => `<li>${escape(text)}</li>`).join('')}</ul>`;
  const cards = plan.vehicle_routes.map(route => `<section class="card"><h1>JalSetu · ${escape(route.vehicle_id)} task card</h1><p class="warning">EXAMPLE DATA · computed plan, not a report of delivery or road navigation</p>${metadata}<h2>Planned load: ${escape(route.planned_load_litres)} litres</h2><table><thead><tr><th>Order</th><th>Point</th><th>Litres</th><th>Service · IST estimate</th></tr></thead><tbody>${route.stops.map((stop, i) => `<tr><td>${i + 1}</td><td>${escape(stop.site_id)}</td><td>${escape(stop.planned_litres)}</td><td>${escape(time(stop.estimated_arrival))}–${escape(time(stop.estimated_departure))}</td></tr>`).join('')}</tbody></table>${source}</section>`).join('');
  download(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JalSetu example plan and task cards</title><style>body{font:14px/1.5 system-ui,sans-serif;color:#103047;max-width:900px;margin:30px auto;padding:0 20px}h1{font-size:24px}h2{font-size:18px}p{overflow-wrap:anywhere;margin:6px 0}.warning{background:#fff3cc;padding:12px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{text-align:left;padding:10px;border-bottom:1px solid #ccdce6}.card{margin-top:45px;border-top:2px solid #103047;padding-top:20px}@media print{body{margin:0;padding:0}.card{break-before:page;border:0;margin:0}tr{break-inside:avoid}@page{size:A4;margin:18mm}}</style><main><h1>JalSetu · coordinator summary</h1><p class="warning">EXAMPLE DATA · synthetic resources and travel matrix</p>${metadata}<p>${escape(plan.explanation)}</p><p>Open this saved HTML file and use your browser's Print command to print or save it as PDF.</p>${source}${cards}</main></html>`, 'text/html;charset=utf-8', 'jalsetu-example-plan-and-task-cards.html');
}
