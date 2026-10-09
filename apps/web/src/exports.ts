import { encodeCsv } from './csv.mjs';
type Stop = { site_id: string; planned_litres: number; estimated_arrival: string; estimated_departure: string };
type Route = { vehicle_id: string; planned_load_litres: number; stops: Stop[] };
export type ExportPlan = { strategy: string; input_snapshot_sha256: string; vehicle_routes: Route[]; limitations: string[]; explanation: string };
export type ExportMeta = { project_name: string; revision: string; data_mode: string; created_at: string; approval_state: string; source_age: string; vehicle_names?: Record<string,string>; site_names?: Record<string,string> };
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

const escape = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const time = (value: string) => new Date(value).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
const dateTime = (value: string) => new Date(value).toLocaleString('en-GB', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const status = (meta: ExportMeta) => meta.approval_state.startsWith('approved') ? 'Approved example' : 'Draft example';
const notes = 'Example only. Travel times are estimates, not road navigation. Planned water is not a delivery report.';
export function exportStops(plan: ExportPlan, meta: ExportMeta) {
  const headers = ['Project', 'Plan status', 'Vehicle', 'Receiving point', 'Planned litres', 'Arrival (IST)', 'Unloading ends (IST)', 'Example notes'];
  const rows = plan.vehicle_routes.flatMap(route => route.stops.map(stop => [meta.project_name, status(meta), meta.vehicle_names?.[route.vehicle_id] ?? route.vehicle_id, meta.site_names?.[stop.site_id] ?? stop.site_id, stop.planned_litres, dateTime(stop.estimated_arrival), dateTime(stop.estimated_departure), notes]));
  download(encodeCsv([headers, ...rows]), 'text/csv;charset=utf-8', 'jalsetu-example-deliveries.csv');
}
export function exportCards(plan: ExportPlan, meta: ExportMeta) {
  const metadata = '<p><b>Run:</b> '+escape(meta.project_name)+'</p><p><b>Plan:</b> '+escape(status(meta))+'</p><p><b>Prepared:</b> '+escape(dateTime(meta.created_at))+' IST</p>';
  const cards = plan.vehicle_routes.map(route => '<section class="card"><h1>JalSetu · '+escape(meta.vehicle_names?.[route.vehicle_id] ?? route.vehicle_id)+'</h1><p class="warning">EXAMPLE DATA · planned instructions, not a delivery report</p>'+metadata+'<h2>Planned load: '+escape(route.planned_load_litres)+' litres</h2><table><thead><tr><th>Order</th><th>Receiving point</th><th>Litres</th><th>Arrival – unloading ends · IST</th></tr></thead><tbody>'+route.stops.map((stop,i)=>'<tr><td>'+(i+1)+'</td><td>'+escape(meta.site_names?.[stop.site_id] ?? stop.site_id)+'</td><td>'+escape(stop.planned_litres)+'</td><td>'+escape(time(stop.estimated_arrival))+'–'+escape(time(stop.estimated_departure))+'</td></tr>').join('')+'</tbody></table><p>'+notes+'</p></section>').join('');
  download('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JalSetu delivery instructions</title><style>body{font:14px/1.5 system-ui,sans-serif;color:#103047;max-width:900px;margin:30px auto;padding:0 20px}h1{font-size:24px}h2{font-size:18px}p{overflow-wrap:anywhere;margin:6px 0}.warning{background:#fff3cc;padding:12px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{text-align:left;padding:10px;border-bottom:1px solid #ccdce6}.card{margin-top:45px;border-top:2px solid #103047;padding-top:20px}@media print{body{margin:0;padding:0}.card{break-before:page;border:0;margin:0}tr{break-inside:avoid}@page{size:A4;margin:18mm}}</style><main><h1>JalSetu · delivery summary</h1><p class="warning">EXAMPLE DATA · sample requests, vehicles and travel times</p>'+metadata+'<p>Approve the plan before use, then record loading and deliveries separately. Follow actual road guidance.</p><p>Use your browser’s Print command to print or save as PDF.</p>'+cards+'</main></html>', 'text/html;charset=utf-8', 'jalsetu-example-plan-and-task-cards.html');
}
