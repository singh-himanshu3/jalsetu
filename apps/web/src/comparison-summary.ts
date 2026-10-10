export type ComparisonResult={strategy:string;metrics:Record<string,number|string|null>;site_results:{site_id:string;requested_litres:number;scheduled_litres:number}[]};
// Missing metrics are unknown, never a fabricated zero or an automatic win.
function quantity(value:unknown):number|null {return typeof value==='number'&&Number.isFinite(value)?value:null;}
export function comparisonDelta(plans:ComparisonResult[]):{litres:number;distance:number|null}|null {
  const proposal=plans.find(p=>p.strategy==='jalsetu'),baseline=plans.find(p=>p.strategy==='demand_proportional');
  if(!proposal||!baseline)return null;
  const a=quantity(proposal.metrics.on_time_scheduled_litres),b=quantity(baseline.metrics.on_time_scheduled_litres);
  if(a===null||b===null)return null;
  const x=quantity(proposal.metrics.total_travel_distance_metres),y=quantity(baseline.metrics.total_travel_distance_metres);
  return {litres:a-b,distance:x===null||y===null?null:x-y};
}
