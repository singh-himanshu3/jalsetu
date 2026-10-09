type Routes = {vehicle_id:string; stops:{site_id:string;planned_litres:number;estimated_arrival:string;estimated_departure:string}[]}[];
export function revisionDifference(before:Routes, after:Routes, reported:Record<string,number>) {
  const ids = new Set([...Object.keys(reported), ...before.flatMap(r=>r.stops.map(s=>s.site_id)), ...after.flatMap(r=>r.stops.map(s=>s.site_id))]);
  const assignments = (routes:Routes, id:string) => routes.flatMap(r=>r.stops.filter(s=>s.site_id===id).map(s=>({...s,vehicle_id:r.vehicle_id})));
  return [...ids].sort().map(site_id=>{
    const old = assignments(before,site_id), next = assignments(after,site_id);
    const previous = old.reduce((n,s)=>n+s.planned_litres,0), pending = next.reduce((n,s)=>n+s.planned_litres,0), delivered = reported[site_id]??0;
    return {site_id, previous, delivered, pending, revised_total:delivered+pending, delta:delivered+pending-previous, old, next};
  });
}
