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
  function changeSite(i:number,key:string,value:unknown) {onEdit({...input, sites:input.sites.map((s,j)=>i===j?{...s,[key]:value}:s)});}
  function coordinate(section:'depot'|'sites', i:number, key:'longitude'|'latitude', value:string) {
    const row=section==='depot'?input.depot:input.sites[i]; const next={...row,location:{longitude:null,latitude:null,...row.location,[key]:value===''?null:Number(value)}};
    onEdit({...input,travel_matrix:null,...(section==='depot'?{depot:next}:{sites:input.sites.map((s,j)=>i===j?next:s)})});
  }
  function add(kind:'vehicles'|'sites') {
    const id=nextId(kind==='sites'?'SITE':'VEH',input[kind],kind==='sites'?'site_id':'vehicle_id');
    const row:Row={ name:`Example ${kind==='sites'?'point':'vehicle'} ${id}`, opens_at:input.depot.opens_at,closes_at:input.depot.closes_at,provenance:'example',
      ...(kind==='sites'?{site_id:id,location:{longitude:null,latitude:null},requested_litres:0,minimum_useful_litres:0,receiving_limit_litres:0,service_duration_minutes:0,priority_class:'',priority_reason:'',confirmation_status:'draft'}:{vehicle_id:id,capacity_litres:0,status:'unavailable'}) };
    onEdit({...input,[kind]:[...input[kind],row],...(kind==='sites'?{travel_matrix:null}:{})});
  }
  return <details className="panel"><summary>Names, coordinates and resource setup</summary><p className="hint">All entries in this project remain synthetic. New points start as drafts and require an explicit priority. Editing coordinates or points invalidates the matrix; rebuild the labelled toy matrix before planning.</p>
  <div className="form-grid"><label>Depot name<input value={String(input.depot.name??'')} onChange={e=>onEdit({...input,depot:{...input.depot,name:e.target.value}})}/></label>{(['longitude','latitude'] as const).map(key=><label key={key}>Depot {key}<input type="number" step="any" value={input.depot.location?.[key]??''} onChange={e=>coordinate('depot',0,key,e.target.value)}/></label>)}</div>
  {input.sites.map((s,i)=><div className="resource-row" key={String(s.site_id)}><h4>{String(s.site_id)}</h4><div className="form-grid"><label>Point name for {String(s.site_id)}<input value={String(s.name??'')} onChange={e=>changeSite(i,'name',e.target.value)}/></label>{(['longitude','latitude'] as const).map(key=><label key={key}>{String(s.site_id)} {key}<input type="number" step="any" value={s.location?.[key]??''} onChange={e=>coordinate('sites',i,key,e.target.value)}/></label>)}<label>Priority reason for {String(s.site_id)}<input maxLength={500} value={String(s.priority_reason??'')} onChange={e=>changeSite(i,'priority_reason',e.target.value)}/></label></div><button className="secondary" onClick={()=>onEdit({...input,sites:input.sites.filter((_,j)=>j!==i),travel_matrix:null})}>Remove draft point {String(s.site_id)}</button></div>)}
  <div className="actions"><button className="secondary" disabled={input.sites.length>=20} onClick={()=>add('sites')}>Add example point</button><button className="secondary" disabled={input.vehicles.length>=5} onClick={()=>add('vehicles')}>Add example vehicle</button><button className="secondary" onClick={()=>onEdit(rebuildExampleMatrix(input))}>Rebuild synthetic travel matrix</button></div>
  {input.vehicles.map((v,i)=><div className="actions" key={String(v.vehicle_id)}><label>Name for {String(v.vehicle_id)}<input value={String(v.name??'')} onChange={e=>onEdit({...input,vehicles:input.vehicles.map((r,j)=>j===i?{...r,name:e.target.value}:r)})}/></label><button className="secondary" onClick={()=>onEdit({...input,vehicles:input.vehicles.filter((_,j)=>j!==i)})}>Remove draft vehicle {String(v.vehicle_id)}</button></div>)}
  </details>;
}
