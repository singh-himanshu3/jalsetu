import {routePoints, directionsParts, legDirections, navigateTo, driverBlock, type DriverInput, type DriverRoute, type DriverState} from './driver-route.ts';
import { encodeCsv } from './csv.mjs';
type Stop = { site_id: string; planned_litres: number; estimated_arrival: string; estimated_departure: string };
type Route = { vehicle_id: string; planned_load_litres: number; stops: Stop[] };
export type ExportPlan = { strategy: string; input_snapshot_sha256: string; vehicle_routes: Route[]; limitations: string[]; explanation: string; site_results?: {site_id:string;requested_litres:number;scheduled_litres:number;unmet_litres:number;reported_delivered_litres?:number;reason:string|null}[]; revision_accounting?: {reported_delivered_litres:number;additional_scheduled_litres:number;remaining_unmet_requested_litres:number} };
export type ExportMeta = { route_input?: DriverInput; driver_states?: Record<string,DriverState>; closed_sites?: string[]; source_reference?: string; records_date?:string; project_name: string; revision: string; data_mode: string; created_at: string; approval_state: string; source_age: string; vehicle_names?: Record<string,string>; site_names?: Record<string,string> };
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
const status = (meta: ExportMeta) => (meta.approval_state.startsWith('approved') ? 'Approved' : 'Draft') + (meta.data_mode === 'operator_entered' ? ' record-based plan' : ' example');
const notes = (meta: ExportMeta) => (meta.data_mode === 'operator_entered' ? 'Operator-entered records; not independently verified.' : 'Example only.') + ' Travel times are estimates, not road navigation. Planned water is not a delivery report.';
export function exportStops(plan: ExportPlan, meta: ExportMeta) {
  const headers = ['Project', 'Plan status', 'Vehicle', 'Receiving point', 'Planned litres', 'Arrival (IST)', 'Unloading ends (IST)', meta.data_mode === 'operator_entered' ? 'Data notes' : 'Example notes'];
  const rows = plan.vehicle_routes.flatMap(route => route.stops.map(stop => [meta.project_name, status(meta), meta.vehicle_names?.[route.vehicle_id] ?? route.vehicle_id, meta.site_names?.[stop.site_id] ?? stop.site_id, stop.planned_litres, dateTime(stop.estimated_arrival), dateTime(stop.estimated_departure), notes(meta)]));
  download(encodeCsv([headers, ...rows]), 'text/csv;charset=utf-8', meta.data_mode === 'operator_entered' ? 'jalsetu-record-based-deliveries.csv' : 'jalsetu-example-deliveries.csv');
}
function driverLinks(route: DriverRoute, meta: ExportMeta) {
  if (!meta.route_input) return '';
  const block = driverBlock(route,meta.driver_states,meta.closed_sites);
  if (block) return '<p class="warning">'+escape(block)+'</p>';
  const points = routePoints(meta.route_input,route);
  if (!points) return '<p>Directions unavailable: update missing or invalid coordinates. No stops were skipped.</p>';
  const parts = directionsParts(points);
  const navigate = meta.data_mode === 'operator_entered' && meta.approval_state.startsWith('approved') && meta.driver_states?.[route.vehicle_id]?.loaded;
  const link = (url:string,label:string) => '<a href="'+escape(url)+'" target="_blank" rel="noopener noreferrer">'+escape(label)+'</a>';
  return '<h2>Driver directions</h2><p>Verify the current approved revision and receiving-point availability before use. '+(meta.data_mode==='example'?'Example locations only; preview, not an actual trip. ':'')+'Google Maps calculates road directions and may differ from the planning estimates. Check tanker access. Opening links shares the selected coordinates with Google Maps.</p>'
    +'<p>'+parts.map((part,i)=>link(part.url,parts.length===1?'View whole route in Google Maps':`Route part ${i+1}: ${part.from} → ${part.to}`)).join(' · ')+'</p>'
    +(parts.length>1?'<p>Open route parts in order. Follow the numbered stop list if Maps omits intermediate stops.</p>':'')
    +'<ol>'+points.slice(1).map((point,i)=>'<li>'+escape(i===route.stops.length?'Return to '+point.name:point.name)+' · '+link(navigate?navigateTo(point):legDirections(points,i+1)!,navigate?'Navigate from current location':'Preview directions')+'</li>').join('')+'</ol>';
}

export function exportCards(plan: ExportPlan, meta: ExportMeta) {
  const metadata = '<p><b>Run:</b> '+escape(meta.project_name)+'</p><p><b>Plan:</b> '+escape(status(meta))+'</p><p><b>Prepared:</b> '+escape(dateTime(meta.created_at))+' IST</p>' + (meta.data_mode === 'operator_entered' ? '<p><b>Declared record source:</b> '+escape(meta.source_reference ?? 'Not supplied')+' · '+escape(meta.records_date ?? 'Date not supplied')+'</p><p><b>Road estimates retrieved:</b> '+escape(Number.isNaN(Date.parse(meta.source_age)) ? 'Not supplied' : dateTime(meta.source_age))+' IST · Underlying map date may be unknown. Car routing is not tanker clearance.</p><p>© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · OSRM / FOSSGIS · <a href="https://routing.openstreetmap.de/about.html">Provider policy</a> · <a href="https://www.openstreetmap.org/">Fix the map</a></p>' : '');
  const scheduled = plan.vehicle_routes.reduce((sum, route) => sum + route.stops.reduce((n, stop) => n + stop.planned_litres, 0), 0);
  const accounting = plan.revision_accounting;
  const plainLimit = (note:string) => note.startsWith('Sequential loading reserves slots') ? 'When loading is sequential, vehicles load one at a time in the recorded order.' : note.startsWith('Depot-based revision supports') ? 'Only unused vehicles at the depot can receive new routes. Record a return or breakdown before updating the remaining deliveries.' : note;
  const summary = '<section class="overview"><h2>Coordinator overview</h2><p>Review the planned quantities and remaining requests below. Loading and delivery must be recorded separately.</p><p><b>'+(accounting ? 'Additional water planned' : 'Water planned')+':</b> '+escape(scheduled)+' litres · '+escape(plan.vehicle_routes.length)+' vehicles with routes</p>'
    +(accounting ? '<p><b>Preserved delivery reports:</b> '+escape(accounting.reported_delivered_litres)+' litres</p><p><b>Still unmet after reports and this plan:</b> '+escape(accounting.remaining_unmet_requested_litres)+' litres</p><p>Vehicle cards below cover the new routes only. Preserved reports are not independently verified deliveries.</p>' : '')
    +(plan.site_results?.length ? '<h2>Requests and remaining shortfall</h2><p>Listed requests include points excluded from planning. Their unmet quantities remain visible.</p><table><thead><tr><th>Receiving point</th><th>Requested · L</th><th>'+(accounting ? 'Additional planned · L' : 'Planned · L')+'</th><th>Reported · L</th><th>Still unmet · L</th></tr></thead><tbody>'+plan.site_results.map(site => '<tr><td>'+escape(meta.site_names?.[site.site_id] ?? site.site_id)+(site.reason ? '<br><small>'+escape(site.reason)+'</small>' : '')+'</td><td>'+escape(site.requested_litres)+'</td><td>'+escape(site.scheduled_litres)+'</td><td>'+escape(site.reported_delivered_litres ?? 0)+'</td><td>'+escape(site.unmet_litres)+'</td></tr>').join('')+'</tbody></table>' : '')
    +'<h2>Assumptions and limits</h2><p>'+escape(meta.source_age)+'</p><ul>'+plan.limitations.map(note => '<li>'+escape(plainLimit(note))+'</li>').join('')+'</ul><p>'+notes(meta)+'</p></section>';
  const cards = plan.vehicle_routes.map(route => '<section class="card"><h1>JalSetu · '+escape(meta.vehicle_names?.[route.vehicle_id] ?? route.vehicle_id)+'</h1><p class="warning">'+(meta.data_mode === 'operator_entered' ? 'OPERATOR-ENTERED RECORDS' : 'EXAMPLE DATA')+' · planned instructions, not a delivery report</p>'+metadata+'<h2>Planned load: '+escape(route.planned_load_litres)+' litres</h2><table><thead><tr><th>Order</th><th>Receiving point</th><th>Litres</th><th>Arrival – unloading ends · IST</th></tr></thead><tbody>'+route.stops.map((stop,i)=>'<tr><td>'+(i+1)+'</td><td>'+escape(meta.site_names?.[stop.site_id] ?? stop.site_id)+'</td><td>'+escape(stop.planned_litres)+'</td><td>'+escape(time(stop.estimated_arrival))+'–'+escape(time(stop.estimated_departure))+'</td></tr>').join('')+'</tbody></table>'+driverLinks(route,meta)+'<p>'+notes(meta)+'</p></section>').join('');
  download('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JalSetu delivery instructions</title><style>body{font:14px/1.5 system-ui,sans-serif;color:#103047;max-width:900px;margin:30px auto;padding:0 20px}h1{font-size:24px}h2{font-size:18px}p,li,td{overflow-wrap:anywhere;margin:6px 0}.warning{background:#fff3cc;padding:12px}.overview{margin-top:24px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{text-align:left;padding:10px;border-bottom:1px solid #ccdce6}.card{margin-top:45px;border-top:2px solid #103047;padding-top:20px}@media print{body{margin:0;padding:0}.card{break-before:page;border:0;margin:0}tr{break-inside:avoid}@page{size:A4;margin:18mm}}</style><main><h1>JalSetu · delivery summary</h1><p class="warning">'+(meta.data_mode === 'operator_entered' ? 'OPERATOR-ENTERED RECORDS · not independently verified; road estimates require tanker-access review' : 'EXAMPLE DATA · sample requests, vehicles and travel times')+'</p>'+metadata+'<p>Approve the plan before use, then record loading and deliveries separately. Follow actual road guidance.</p><p>Use your browser’s Print command to print or save as PDF.</p>'+summary+cards+'</main></html>', 'text/html;charset=utf-8', meta.data_mode === 'operator_entered' ? 'jalsetu-record-based-plan-and-task-cards.html' : 'jalsetu-example-plan-and-task-cards.html');
}
