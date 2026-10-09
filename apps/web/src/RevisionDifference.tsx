import {revisionDifference} from './revision-diff';
import type {Operation} from './Operations';
export default function RevisionDifference({operation}:{operation:Operation}) {
  if(!operation.revision_draft)return null;
  const rows=revisionDifference(operation.ledger_routes,operation.revision_draft.vehicle_routes,operation.revision_draft.fixed_reported_deliveries);
  const litres=(n:number)=>`${n.toLocaleString('en-IN')} L`;
  const time=(s:string)=>new Date(s).toLocaleTimeString('en-GB',{timeZone:'Asia/Kolkata'});
  return <section className="panel"><h3>What changes in this revision</h3><p>Previous commitments are compared with preserved reports plus newly scheduled visits. Reported deliveries stay separate from estimates.</p><div className="table-wrap"><table className="revision-diff"><thead><tr><th>Point</th><th>Previously planned</th><th>Reported delivered</th><th>Newly scheduled</th><th>Revised total</th><th>Change</th><th>Previous visit · IST</th><th>New visit · IST</th></tr></thead><tbody>{rows.map(d=><tr key={d.site_id}><td>{d.site_id}</td><td>{litres(d.previous)}</td><td>{litres(d.delivered)}</td><td>{litres(d.pending)}</td><td>{litres(d.revised_total)}</td><td>{d.delta>0?'+':''}{litres(d.delta)}</td><td>{d.old.map(s=>`${s.vehicle_id}: ${time(s.estimated_arrival)}–${time(s.estimated_departure)}`).join('; ')||'No previous visit'}</td><td>{d.next.map(s=>`${s.vehicle_id}: ${time(s.estimated_arrival)}–${time(s.estimated_departure)}`).join('; ')||'No new visit'}</td></tr>)}</tbody></table></div></section>;
}
