import type { Input, Row } from './App';
export function rebuildExampleMatrix(input: Input): Input {
  const ids = [String(input.depot.depot_id),...input.sites.map(s=>String(s.site_id))];
  return { ...input, travel_matrix: { snapshot_id: crypto.randomUUID(), node_ids: ids,
    durations_seconds: ids.map((_,i)=>ids.map((_,j)=>i===j?0:300+90*Math.abs(i-j))),
    distances_metres: ids.map((_,i)=>ids.map((_,j)=>i===j?0:1800+450*Math.abs(i-j))),
    provider:'Synthetic exercise fixture', provenance:'example', retrieved_at:null, represented_at:null, source_url:null,
    attribution:'Published toy matrix generator; no real routing dataset', limitations:['Invented exercise times and distances','Not road navigation or traffic','Coordinates do not establish venue permission'] } };
}
const nextId=(prefix:string,rows:Row[],key:string)=>{let n=1;while(rows.some(r=>r[key]===`${prefix}-${n}`))n++;return `${prefix}-${n}`;};
export default function ResourceEditor({ input, onEdit }: { input: Input; onEdit: (input: Input)=>void }) {
  const real = input.data_mode === 'operator_entered';
  function changeSite(i:number,key:string,value:unknown) {onEdit({...input, sites:input.sites.map((s,j)=>i===j?{...s,[key]:value}:s)});}
  function coordinate(section:'depot'|'sites', i:number, key:'longitude'|'latitude', value:string) {
    const row=section==='depot'?input.depot:input.sites[i]; const next={...row,location:{longitude:null,latitude:null,...row.location,[key]:value===''?null:Number(value)}};
    onEdit({...input,travel_matrix:null,...(section==='depot'?{depot:next}:{sites:input.sites.map((s,j)=>i===j?next:s)})});
  }
  function add(kind:'vehicles'|'sites') {
    const id=nextId(kind==='sites'?'SITE':'VEH',input[kind],kind==='sites'?'site_id':'vehicle_id');
    const row:Row={ name:real?'':`Example ${kind==='sites'?'point':'vehicle'} ${id}`, opens_at:real?'':input.depot.opens_at,closes_at:real?'':input.depot.closes_at,provenance:real?'operator_entered':'example',
      ...(kind==='sites'?{site_id:id,location:{longitude:null,latitude:null},requested_litres:real?null:0,minimum_useful_litres:real?null:0,receiving_limit_litres:real?null:0,service_duration_minutes:real?null:0,priority_class:'',priority_reason:'',confirmation_status:'draft'}:{vehicle_id:id,capacity_litres:real?null:0,status:'unavailable'}) };
    onEdit({...input,[kind]:[...input[kind],row],...(kind==='sites'?{travel_matrix:null}:{})});
  }
  return <details className="panel"><summary>Names, coordinates and resource setup</summary><p className="hint">{real ? "Enter the actual names and coordinates from your records. New entries start blank. Changing a location or removing a point requires fetching matching roads again." : "All entries in this project remain synthetic. New points start as drafts and require an explicit priority. After changing a location or point, update the sample travel estimates before planning."}</p>
  <div className="form-grid"><label>Depot name<input value={String(input.depot.name??'')} onChange={e=>onEdit({...input,depot:{...input.depot,name:e.target.value}})}/></label>{(['longitude','latitude'] as const).map(key=><label key={key}>Depot {key}<input type="number" step="any" value={input.depot.location?.[key]??''} onChange={e=>coordinate('depot',0,key,e.target.value)}/></label>)}</div>
  {input.sites.map((s,i)=><div className="resource-row" key={String(s.site_id)}><h4>{String(s.name||`Receiving point ${i+1}`)}</h4><div className="form-grid"><label>Point name {i+1}<input value={String(s.name??'')} onChange={e=>changeSite(i,'name',e.target.value)}/></label>{(['longitude','latitude'] as const).map(key=><label key={key}>Point {i+1} {key}<input type="number" step="any" value={s.location?.[key]??''} onChange={e=>coordinate('sites',i,key,e.target.value)}/></label>)}<label>Priority reason for point {i+1}<input maxLength={500} value={String(s.priority_reason??'')} onChange={e=>changeSite(i,'priority_reason',e.target.value)}/></label></div><button className="secondary" onClick={()=>onEdit({...input,sites:input.sites.filter((_,j)=>j!==i),travel_matrix:null})}>Remove point {i+1}</button></div>)}
  <div className="actions"><button className="secondary" disabled={input.sites.length>=20} onClick={()=>add('sites')}>{real?"Add receiving point":"Add example point"}</button><button className="secondary" disabled={input.vehicles.length>=5} onClick={()=>add('vehicles')}>{real?"Add vehicle":"Add example vehicle"}</button>{!real && <button className="secondary" onClick={()=>onEdit(rebuildExampleMatrix(input))}>Update example travel estimates</button>}</div>
  {input.vehicles.map((v,i)=><div className="actions" key={String(v.vehicle_id)}><label>Vehicle name {i+1}<input value={String(v.name??'')} onChange={e=>onEdit({...input,vehicles:input.vehicles.map((r,j)=>j===i?{...r,name:e.target.value}:r)})}/></label><button className="secondary" onClick={()=>onEdit({...input,vehicles:input.vehicles.filter((_,j)=>j!==i)})}>Remove vehicle {i+1}</button></div>)}
  </details>;
}
