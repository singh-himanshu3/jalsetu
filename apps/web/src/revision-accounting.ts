import type {Operation} from './Operations';
export function revisionCapacityEvidence(operation:Operation): {capacity:number;vehicles:{vehicle_id:string;capacity_litres:number}[]}|null {
  const draft=operation.revision_draft,vehicles=draft?.pending_input_snapshot?.vehicles;
  if(!draft?.revision_validation.valid||!draft.revision_accounting||!vehicles)return null;
  const eligible=vehicles.filter(v=>v.status==='available');
  if(!eligible.length||eligible.some(v=>{
    const state=operation.ledger.vehicles[v.vehicle_id];
    return !state||state.failed||state.loaded||state.trip_completed||!state.at_depot||!(v.capacity_litres>0);
  }))return null;
  const capacity=eligible.reduce((sum,v)=>sum+v.capacity_litres,0);
  if(capacity!==draft.revision_accounting.additional_scheduled_litres||draft.vehicle_routes.length!==eligible.length)return null;
  if(eligible.some(v=>{const route=draft.vehicle_routes.find(r=>r.vehicle_id===v.vehicle_id);return !route||route.planned_load_litres!==v.capacity_litres||route.stops.reduce((sum,s)=>sum+s.planned_litres,0)!==v.capacity_litres;}))return null;
  return {capacity,vehicles:eligible};
}
