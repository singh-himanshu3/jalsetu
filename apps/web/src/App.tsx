import { formatMetric } from './metrics';
import { useEffect, useState } from 'react';
import Operations, { type Operation } from './Operations';
import { api, postOptions } from './api';
import SiteImport from './SiteImport';
import { download, exportCards, exportStops, isApprovedPlan, type ExportMeta } from './exports';
import Projects, { type Project } from './Projects';
import ResourceEditor from './ResourceEditor';
import ComparisonCharts from './ComparisonCharts';
import Sources from './Sources';
import Marginal, {type Analysis} from './Marginal';

export type Row = { [key: string]: unknown; location?: { longitude: number | null; latitude: number | null } };
export type Input = { name: string; display_warning: string; data_mode: string; service_window_policy: string | null; loading_mode: string | null; depot: Row; vehicles: Row[]; sites: Row[]; travel_matrix: { provider: string; limitations: string[]; [key:string]:unknown } | null; [key: string]: unknown };
type Stop = { site_id: string; planned_litres: number; estimated_arrival: string; estimated_departure: string };
type Route = { vehicle_id: string; planned_load_litres: number; capacity_litres: number; stops: Stop[] };
type Plan = { strategy: string; status: string; created_at: string; approval_blockers: string[]; approvable: boolean; explanation: string; runtime_seconds: number; input_snapshot_sha256: string; metrics: Record<string, number | string | null>; validation: { valid: boolean; errors: string[] }; site_results: { site_id: string; requested_litres: number; scheduled_litres: number; unmet_litres: number; reason: string | null }[]; vehicle_routes: Route[]; limitations: string[] };
type Job = { job_id: string; status: string; stage?: string; stage_history?: {stage:string;completed_at:string}[]; created_at: string; end_to_end_runtime_seconds?:number; plans?: Plan[]; analysis?: Analysis; operation?: Operation; error?: { code?:string; message: string; details?: { field: string; message: string }[] } };
const stageLabels: Record<string,string> = { LoadAndValidate:'Validate saved inputs', GetRouteMatrix:'Read example travel matrix', SolveStrategies:'Calculate delivery strategies', ValidatePlans:'Independently check routes', PersistResult:'Save checked result', ExplainResult:'Prepare deterministic explanation', CompleteJob:'Publish completed job' };
const statusLabels: Record<string,string> = { queued:'Waiting to start', validating:'Validating inputs', routing:'Reading example travel matrix', solving:'Calculating delivery strategies', checking:'Independently checking routes', persisting:'Saving checked result', explaining:'Preparing explanation', completed:'Completed', failed:'Failed', validating_and_solving:'Validating and calculating' };
const labels: Record<string, string> = { jalsetu: 'JalSetu', equal_share: 'Equal share', demand_proportional: 'Demand proportional', greedy: 'Priority-first greedy' };
const litres = (n: unknown) => `${Number(n).toLocaleString('en-IN')} L`;
const time = (stamp: string) => new Date(stamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

function NumberField({ label, value, onChange, step = 100 }: { label: string; value: unknown; onChange: (value: number | null) => void; step?: number }) {
  return <label>{label}<input type="number" min="0" step={step} value={String(value ?? '')} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} /></label>;
}
function TimeField({ label, value, day, onChange }: { label: string; value: unknown; day: string; onChange: (value: string) => void }) {
  const date = new Date(String(value));
  const local = Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
  return <label>{label} · IST<input type="time" value={local} onChange={e => onChange(e.target.value ? `${day}T${e.target.value}:00+05:30` : '')}/></label>;
}

export default function App({cloud=false}:{cloud?:boolean}) {
  const [tab, setTab] = useState('Overview');
  const [input, setInput] = useState<Input | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState('jalsetu');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ack, setAck] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [actor, setActor] = useState('');
  const [plansJob, setPlansJob] = useState<Job | null>(null);
  const [project, setProject] = useState<Project<Input> | null>(null);
  const [savedMessage,setSavedMessage]=useState('');
  const [statusReadError,setStatusReadError]=useState('');
  const [analysis,setAnalysis]=useState<Analysis|null>(null);
  const shownInput = tab === 'Operations' && operation ? operation.input : input;
  const busy = loading || Boolean(job && !['completed', 'failed'].includes(job.status));
  const chosen = plans.find(p => p.strategy === selectedStrategy);
  const resultMatches = Boolean(input && chosen && JSON.stringify(input) === jsonText);
  const exportMeta: ExportMeta = { project_name: input?.name ?? 'Local example', revision: plansJob?.job_id ?? 'local draft', data_mode: input?.data_mode ?? 'example', created_at: chosen?.created_at ?? plansJob?.created_at ?? new Date().toISOString(), approval_state: isApprovedPlan(chosen, operation?.approved_plan) ? 'approved example' : 'draft', source_age: 'Not applicable: synthetic exercise matrix' };
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [tab]);
  useEffect(() => {
    if (!job || ['completed', 'failed'].includes(job.status)) return;
    const controller = new AbortController();
    let reading = false;
    const timer = setInterval(() => {
      if (reading) return;
      reading = true;
      api<Job>(`/v1/planning-jobs/${job.job_id}`, { signal: controller.signal }).then(next => {
        if (controller.signal.aborted) return;
        setStatusReadError('');
        setJob(next);
        if (next.status === 'completed') {
          if (next.operation) { setOperation(next.operation); setTab('Operations'); }
          else if (next.analysis) { setAnalysis(next.analysis); setTab('Compare'); }
          else { setPlans(next.plans ?? []); setPlansJob(next); setTab('Plan'); }
        }
        if (next.error) setError([next.error.message, ...(next.error.details ?? []).map(d => {const parts=d.field.split('.');const row=parts[0]==='sites'?input?.sites[Number(parts[1])]:parts[0]==='vehicles'?input?.vehicles[Number(parts[1])]:null;return `${row?.name??(parts[0]==='depot'?'Depot':d.field.replaceAll('_',' '))}${(row&&parts.length>2)||(parts[0]==='depot'&&parts.length>1)?' · '+parts.slice(parts[0]==='depot'?1:2).join(' ').replaceAll('_',' '):''}: ${d.message}`;})].join('\n'));
      }).catch(err => {
        if (err.name !== 'AbortError') {
          if (cloud) setStatusReadError(`${err.message} Planning status is unknown; checking again. Saved operations remain available.`);
          else {
            setError('Could not read planning status. Check the local server, then generate again. Saved approvals remain available in Operations.');
            setJob(current => current ? { ...current, status: 'failed' } : current);
          }
        }
      }).finally(() => { reading = false; });
    }, cloud ? 2000 : 500);
    return () => { clearInterval(timer); controller.abort(); };
  }, [job]);
  const edit = (next: Input) => { setInput(next); setAnalysis(null); setPlans([]); setPlansJob(null); setJob(null); setError(''); };
  async function loadExample() {
    setLoading(true); setError('');
    try { const next = await api<Input>('/v1/example'); setProject(null); edit(next); setJsonText(JSON.stringify(next)); setTab('Inputs'); }
    catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }
  function openProject(next:Project<Input>) {setProject(next);edit(next.input);setJsonText(JSON.stringify(next.input));setSavedMessage('');setTab('Inputs');}
  async function saveProject() {if(!project||!input)return;setLoading(true);setError('');try{const result=await api<{project:Project<Input>}>(`/v1/projects/${project.project_id}`,{...postOptions({input},project.version),method:'PUT'});setProject(result.project);setSavedMessage(`Draft saved as version ${result.project.version}. Planning validation runs separately.`);}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
  async function generate() {
    if (!input?.service_window_policy || !input.loading_mode) { setError('Select the unloading and depot-loading rules before planning.'); return; }
    setLoading(true); setError(''); setAnalysis(null); setPlans([]);
    try {
      setJsonText(JSON.stringify(input));
      setJob(await api<Job>('/v1/planning-jobs', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ input }) }));
    } catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }
  async function marginal(options:Record<string,unknown>) {
    if(!input||!plansJob)return;
    setLoading(true);setError('');setAnalysis(null);
    try{setJob(await api<Job>('/v1/planning-jobs',postOptions({kind:'marginal',input,parent_job_id:plansJob.job_id,options})));}
    catch(err){setError((err as Error).message);}finally{setLoading(false);}
  }
  async function operationAction(path: string, body: unknown, version?: number) {
    setLoading(true); setError('');
    try {
      const result = await api<{ operation?: Operation } & Partial<Job>>(path, postOptions(body, version));
      if (result.operation) { setOperation(result.operation); setTab('Operations'); }
      else if (result.job_id) setJob(result as Job);
    } catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }
  async function applyJson() {
    setLoading(true); setError('');
    try {
      const response = await api<{ input: Input }>('/v1/validate-input', postOptions({ input: JSON.parse(jsonText) }));
      edit(response.input); setJsonText(JSON.stringify(response.input, null, 2));
    } catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }
  function exportJson() {
    download(JSON.stringify({ mode: cloud?'aws_live':'offline_fixture', exported_at: new Date().toISOString(), input, plans, analysis, operation }, null, 2), 'application/json', 'jalsetu-example-plans.json');
  }
  function editRow(section: 'depot' | 'vehicles' | 'sites', index: number, key: string, value: unknown) {
    if (!input) return;
    if (section === 'depot') edit({ ...input, depot: { ...input.depot, [key]: value } });
    else edit({ ...input, [section]: input[section].map((row, i) => i === index ? { ...row, [key]: value } : row) });
  }
  return <div className="app">
    <aside className="sidebar"><a className="brand" href="#" onClick={e => { e.preventDefault(); setTab('Overview'); }}><span className="mark">J</span> JalSetu</a><p className="brand-sub">HEAT RELIEF DISPATCH</p><nav aria-label="Project navigation">{['Overview', 'Inputs', 'Plan', 'Compare', 'Operations', 'Evidence'].map(name => <button key={name} className={tab === name ? 'nav active' : 'nav'} onClick={() => setTab(name)}>{name}</button>)}</nav><div className="sidebar-note"><strong>{cloud?"AWS example demo":"Local prototype"}</strong><p>{cloud?"Authenticated workspace. Synthetic projects and plans save privately in AWS.":"No cloud resources deployed. Example approvals and reports save on this computer."}</p></div></aside>
    <main><header><div><span className="eyebrow">DELHI · COORDINATOR WORKSPACE</span><h1>{shownInput?.name ?? 'Plan the next water-relief run'}</h1></div><span className="mode">{cloud?"AWS live · example mode":"Offline fixture mode"}</span></header>
      {shownInput && <div className="banner"><strong>EXAMPLE DATA</strong><span>{shownInput.display_warning}</span></div>}
      {error && <div className="error" role="alert">{error}</div>}
      {busy && <div className="job" role="status"><span className="spinner"/> {job && !['completed', 'failed'].includes(job.status) ? `Planning job: ${statusLabels[job.status]??job.status.replaceAll('_', ' ')}` : 'Processing request…'}<span>The planner publishes independently checked results.</span></div>}
      {statusReadError && <p className="attention" role="status">{statusReadError}</p>}
      {job && <details className="panel job-details"><summary>Planning job · {statusLabels[job.status]??job.status.replaceAll('_',' ')}</summary><p className="hint">Job {job.job_id}</p>{job.stage_history && <ol aria-label="Planning stage history">{Object.entries(stageLabels).map(([stage,label])=>{const finished=job.stage_history?.find(item=>item.stage===stage);return <li key={stage}><span>{label}</span><strong>{finished?`Completed · ${time(finished.completed_at)} IST`:job.stage===stage&&job.status!=='failed'?'In progress':job.status==='failed'?'Not completed':'Waiting'}</strong></li>;})}</ol>}{job.error && <p className="attention">{job.error.code?`${job.error.code}: `:''}{job.error.message}</p>}<p className="hint">{cloud?'Saved job progress; refreshes every two seconds while running.':'Offline preview. Job history lasts until the local server restarts.'}</p></details>}
      {tab==='Overview' && input && <section className="panel"><h3>Current example project</h3><dl className="validation-grid"><div><dt>Operating day</dt><dd>{String(input.operating_date)} · Asia/Kolkata</dd></div><div><dt>Pilot bounds · west, south, east, north</dt><dd>{Array.isArray(input.pilot_bounds)?input.pilot_bounds.join(', '):'Missing'}</dd></div><div><dt>Example depot</dt><dd>{String(input.depot.name)} · {input.depot.location?.latitude}, {input.depot.location?.longitude}</dd></div><div><dt>Data mode</dt><dd>Published synthetic example</dd></div></dl><button className="secondary" onClick={()=>setTab('Inputs')}>Continue reviewing this draft</button></section>}{tab==='Overview' && <Projects<Input> busy={busy} onOpen={openProject} onArchive={id=>{if(project?.project_id===id){setProject(null);setInput(null);setPlans([]);setPlansJob(null);setJob(null);setJsonText('');setSavedMessage('');}}}/>}
      {tab === 'Overview' && <section className="intro"><div><span className="eyebrow">FROM LIMITED SUPPLY TO A CHECKED PLAN</span><h2>Make every refill<br/>a deliberate decision.</h2><p>Enter confirmed requests, water stock and vehicle limits. Generate a delivery plan that exposes what remains unmet.</p><label className="ack"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}/> I understand the demo uses synthetic resources and travel estimates.</label><button className="primary" disabled={!ack || busy} onClick={loadExample}>Load example scenario <span>→</span></button></div><div className="workflow"><h3>One complete planning pass</h3>{['Review stock, vehicles and confirmed points', 'Select the operating rules explicitly', 'Generate and independently check routes', 'Compare quantities and tradeoffs'].map((text, i) => <div key={text}><b>0{i + 1}</b><span>{text}</span></div>)}<p>Designed for one depot and one trip per vehicle.</p></div></section>}
      {tab === 'Inputs' && (!input ? <Empty action={() => setTab('Overview')}/> : <fieldset className="input-scope" disabled={busy}>
        <section className="panel"><label>Project display name<input maxLength={120} value={input.name} onChange={e=>edit({...input,name:e.target.value})}/></label><div className="actions"><button className="secondary" disabled={!project||busy} onClick={saveProject}>Save project draft</button><span role="status" className="hint">{project?`Project version ${project.version}. ${savedMessage}`:'Quick example is unsaved. Create a project on Overview to persist a draft.'}</span></div></section>
        {!input.travel_matrix&&<p className="attention" role="status">Routing matrix is missing. Rebuild the synthetic matrix in resource setup before planning.</p>}
        {!input.vehicles.length&&<p className="attention" role="status">No vehicles. Add an example vehicle and enter its capacity/window before planning.</p>}
        {!input.sites.some(s=>s.confirmation_status==='confirmed')&&<p className="attention" role="status">No confirmed points. Review and explicitly confirm example requests.</p>}
        <ResourceEditor input={input} onEdit={edit}/>
        <div className="section-head"><div><h2>Review inputs</h2><p>These are labelled examples. Change them to test constraints.</p></div><button className="primary" onClick={generate} disabled={busy}>Generate & compare</button></div>
        <section className="panel"><h3>01 · Operating rules</h3><div className="form-grid"><label>Site closing rule<select value={input.service_window_policy ?? ''} onChange={e => edit({ ...input, service_window_policy: e.target.value || null })}><option value="">Choose a rule</option><option value="finish_by_close">Unloading must finish by closing</option><option value="start_by_close">Unloading may start by closing</option></select></label><label>Depot loading<select value={input.loading_mode ?? ''} onChange={e => edit({ ...input, loading_mode: e.target.value || null })}><option value="">Choose a rule</option><option value="parallel">Vehicles load simultaneously</option><option value="sequential">One vehicle loads at a time</option></select></label><NumberField label="Available water · litres" value={input.depot.available_stock_litres} onChange={value => editRow('depot', 0, 'available_stock_litres', value)}/><TimeField label="Depot opens" value={input.depot.opens_at} day={String(input.operating_date)} onChange={value => editRow('depot', 0, 'opens_at', value)}/><TimeField label="Depot closes" value={input.depot.closes_at} day={String(input.operating_date)} onChange={value => editRow('depot', 0, 'closes_at', value)}/><NumberField label="Loading duration · minutes" step={1} value={input.depot.loading_duration_minutes} onChange={value => editRow('depot', 0, 'loading_duration_minutes', value)}/></div><label className="ack"><input type="checkbox" checked={Boolean(input.depot.potable_supply_confirmed)} onChange={e => editRow('depot', 0, 'potable_supply_confirmed', e.target.checked)}/> Example operator confirms potable water supply. This is a declaration, not certification.</label><p className="hint">No rule is preselected. Times below are IST; quantities use the example’s 100-litre increment.</p></section>
        <section className="panel"><h3>02 · Vehicles</h3><div className="form-grid">{input.vehicles.map((vehicle, i) => <div className="vehicle" key={String(vehicle.vehicle_id)}><strong>{String(vehicle.name)}</strong><NumberField label="Capacity · litres" value={vehicle.capacity_litres} onChange={value => editRow('vehicles', i, 'capacity_litres', value)}/><label>Availability<select value={String(vehicle.status)} onChange={e => editRow('vehicles', i, 'status', e.target.value)}><option value="available">Available</option><option value="unavailable">Unavailable</option></select></label><TimeField label={`Start for ${vehicle.vehicle_id}`} day={String(input.operating_date)} value={vehicle.opens_at} onChange={value => editRow('vehicles', i, 'opens_at', value)}/><TimeField label={`Return by for ${vehicle.vehicle_id}`} day={String(input.operating_date)} value={vehicle.closes_at} onChange={value => editRow('vehicles', i, 'closes_at', value)}/></div>)}</div></section>
        <section className="panel"><h3>03 · Distribution points</h3><div className="table-wrap"><table><thead><tr><th>Point · example</th><th>Request · L</th><th>Minimum · L</th><th>Receiving limit · L</th><th>Priority</th><th>Confirmation</th></tr></thead><tbody>{input.sites.map((site, i) => <tr key={String(site.site_id)}><td>{String(site.name)}</td><td><input aria-label={`Request for ${site.name}`} type="number" min="0" step="100" value={String(site.requested_litres??'')} onChange={e => editRow('sites', i, 'requested_litres', e.target.value === '' ? null : Number(e.target.value))}/></td><td><input aria-label={`Minimum for ${site.name}`} type="number" min="0" step="100" value={String(site.minimum_useful_litres??'')} onChange={e => editRow('sites', i, 'minimum_useful_litres', e.target.value === '' ? null : Number(e.target.value))}/></td><td><input aria-label={`Receiving limit for ${site.name}`} type="number" min="0" step="100" value={String(site.receiving_limit_litres??'')} onChange={e => editRow('sites', i, 'receiving_limit_litres', e.target.value === '' ? null : Number(e.target.value))}/></td><td><select aria-label={`Priority for ${site.name}`} value={String(site.priority_class)} onChange={e => editRow('sites', i, 'priority_class', e.target.value)}><option value="">Choose priority</option>{['critical', 'high', 'standard'].map(p => <option key={p}>{p}</option>)}</select></td><td><select aria-label={`Confirmation for ${site.name}`} value={String(site.confirmation_status)} onChange={e => editRow('sites', i, 'confirmation_status', e.target.value)}>{['confirmed', 'contacted', 'draft'].map(p => <option key={p}>{p}</option>)}</select></td></tr>)}</tbody></table></div><p className="hint">Requests cannot exceed receiving limits. Unconfirmed points are excluded from scheduled visits.</p></section>
        <details className="panel"><summary>Receiving windows & unloading time</summary><div className="table-wrap"><table><thead><tr><th>Point</th><th>Opens · IST</th><th>Closes · IST</th><th>Unloading</th></tr></thead><tbody>{input.sites.map((site, i) => <tr key={String(site.site_id)}><td>{String(site.name)}</td><td><TimeField label={`Opens for ${site.site_id}`} day={String(input.operating_date)} value={site.opens_at} onChange={value => editRow('sites', i, 'opens_at', value)}/></td><td><TimeField label={`Closes for ${site.site_id}`} day={String(input.operating_date)} value={site.closes_at} onChange={value => editRow('sites', i, 'closes_at', value)}/></td><td><NumberField label={`Service minutes for ${site.site_id}`} step={1} value={site.service_duration_minutes} onChange={value => editRow('sites', i, 'service_duration_minutes', value)}/></td></tr>)}</tbody></table></div></details>
        <SiteImport key={JSON.stringify(input)} sites={input.sites} disabled={busy} onPreview={async sites => (await api<{ input: Input }>('/v1/validate-input', postOptions({ input: { ...input, sites } }))).input.sites} onApply={sites => edit({ ...input, sites })}/>
        <details onToggle={e => { const open = e.currentTarget.open; setAdvanced(open); if (open) setJsonText(JSON.stringify(input, null, 2)); }}><summary>Edit the full input JSON</summary>{advanced && <><textarea aria-label="Full planning input JSON" value={jsonText} onChange={e => setJsonText(e.target.value)}/><button className="secondary" disabled={busy} onClick={applyJson}>Validate & apply input edits</button></>}</details>
      </fieldset>)}
      {tab === 'Plan' && (!chosen ? <Empty action={() => setTab(input ? 'Inputs' : 'Overview')}/> : <>
        <div className="section-head"><div><h2>{chosen.approvable ? `${labels[chosen.strategy]} delivery plan` : 'Planning needs attention'}</h2><p>Computed estimates · not a dispatch or proof of delivery</p></div><span className={chosen.approvable ? 'validated' : 'attention'}>{chosen.approvable ? '✓ Independent checks passed' : (chosen.approval_blockers?.[0] ?? chosen.status.replaceAll('_', ' '))}</span></div>
        <div className="metrics"><Metric label="Scheduled within windows" value={litres(chosen.metrics.on_time_scheduled_litres)}/><Metric label="Unmet confirmed requests" value={litres(chosen.metrics.unmet_requested_litres)}/><Metric label="Points meeting minimum" value={String(chosen.metrics.sites_meeting_minimum)}/><Metric label="Computation" value={`${chosen.runtime_seconds.toFixed(2)} s`}/></div>
        <details className="panel"><summary>All computed metrics</summary><div className="table-wrap"><table><tbody>{Object.entries(chosen.metrics).map(([key, value]) => <tr key={key}><th>{key.replaceAll('_', ' ')}</th><td>{formatMetric(key,value)}</td></tr>)}</tbody></table></div><p className="hint">Distances are metres, durations are seconds, quantities are litres and completion timestamps are IST. These are computed planning metrics.</p></details>
        <p className="explanation">{chosen.explanation}</p><p className="hint">Aggregate quantities and fulfilment metrics cover confirmed requests. Draft/contacted points remain visible in the table but cannot receive a planned visit.</p><div className="route-grid"><section className="panel"><h3>Route schematic</h3><RouteDiagram input={input!} routes={chosen.vehicle_routes}/><p className="hint">Straight-line schematic from example coordinates. Not road geometry or navigation.</p></section><section className="panel"><h3>Vehicle instructions</h3>{chosen.vehicle_routes.length ? chosen.vehicle_routes.map(route => <details className="route" open key={route.vehicle_id}><summary>{route.vehicle_id} · {litres(route.planned_load_litres)} / {litres(route.capacity_litres)}</summary><ol>{route.stops.map((stop,index) => <li key={stop.site_id}><strong>{stop.site_id} · {litres(stop.planned_litres)}</strong><small>{time(stop.estimated_arrival)}–{time(stop.estimated_departure)} IST</small><small>Remaining load after stop: {litres(route.planned_load_litres-route.stops.slice(0,index+1).reduce((n,s)=>n+s.planned_litres,0))}</small></li>)}</ol></details>) : <p>No visits were scheduled under these constraints.</p>}</section></div>
        <section className="panel"><h3>Independent validation</h3><dl className="validation-grid"><div><dt>Result</dt><dd>{chosen.validation.valid?'Valid under declared constraints':'Invalid'}</dd></div><div><dt>Solve status</dt><dd>{chosen.status.replaceAll('_',' ')}</dd></div><div><dt>Validation errors</dt><dd>{chosen.validation.errors.length}</dd></div><div><dt>Planner wall-clock runtime</dt><dd>{chosen.runtime_seconds.toFixed(3)} seconds</dd></div><div><dt>Job end-to-end runtime</dt><dd>{plansJob?.end_to_end_runtime_seconds===undefined?'Not recorded':`${plansJob.end_to_end_runtime_seconds.toFixed(3)} seconds`}</dd></div><div><dt>Physical checks</dt><dd>Stock, vehicle capacity, loading, receiving windows, service duration and stored route legs</dd></div></dl><p className="hint">Unconfirmed points are excluded. Unserved points stay in the request table. Estimated quantities do not constitute a delivery report.</p>{chosen.validation.errors.length>0&&<ul>{chosen.validation.errors.map(e=><li key={e}>{e}</li>)}</ul>}</section>
        <section className="panel"><h3>Approve this example plan</h3><p>Approval saves an immutable plan and opens the stock ledger. Water remains at the depot until you record loading.</p><div className="form-grid"><label>Coordinator label<input maxLength={120} value={actor} onChange={e => setActor(e.target.value)} placeholder="Enter your name or exercise label"/></label></div><div className="actions"><button className="primary" disabled={busy || !actor.trim() || !chosen.approvable || !plansJob?.plans} onClick={() => operationAction('/v1/approvals', { job_id: plansJob!.job_id, strategy: chosen.strategy, actor })}>Approve reviewed example & open operations</button></div><p className="hint">{cloud?"Example approval under your signed-in identity. The coordinator label is self-entered.":"Local example approval only. This label is not authenticated."}</p></section>
        <section className="panel"><h3>Every request stays visible</h3><div className="table-wrap"><table><thead><tr><th>Point</th><th>Requested</th><th>Scheduled</th><th>Unmet</th><th>Reason if unserved</th></tr></thead><tbody>{chosen.site_results.map(site => <tr key={site.site_id}><td>{site.site_id}</td><td>{litres(site.requested_litres)}</td><td>{litres(site.scheduled_litres)}</td><td>{litres(site.unmet_litres)}</td><td>{site.reason ?? 'Scheduled'}</td></tr>)}</tbody></table></div></section>
        <section className="panel"><h3>Take the checked plan with you</h3><div className="actions"><button className="secondary" onClick={() => exportStops(chosen, exportMeta)}>Download stop assignments CSV</button><button className="secondary" onClick={() => exportCards(chosen, exportMeta)}>Download printable plan & vehicle cards</button></div><p className="hint">Exports preserve the example label, approval state, input hash and limitations. Open the HTML file to print or save as PDF.</p></section>
      </>)}
      {tab === 'Operations' && <Operations cloud={cloud} operation={operation} busy={busy} onRestore={next => { setOperation(next); setTab('Operations'); }} onAction={operationAction}/>}
      {tab === 'Compare' && (!plans.length ? <Empty action={() => setTab('Inputs')}/> : <><div className="section-head"><div><h2>Compare the same resources</h2><p>No strategy is assumed to win every metric. All results are independently checked.</p></div></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Strategy</th><th>Scheduled</th><th>Unmet</th><th>Critical minimum</th><th>Lowest fulfilment</th><th>Travel</th><th>Review</th></tr></thead><tbody>{plans.map(plan => <tr key={plan.strategy} className={plan.strategy === selectedStrategy ? 'selected-row' : ''}><td><strong>{labels[plan.strategy]}</strong></td><td>{litres(plan.metrics.on_time_scheduled_litres)}</td><td>{litres(plan.metrics.unmet_requested_litres)}</td><td>{litres(plan.metrics.critical_minimum_litres)}</td><td>{(Number(plan.metrics.minimum_fulfilment_ratio) * 100).toFixed(1)}%</td><td>{(Number(plan.metrics.total_travel_distance_metres) / 1000).toFixed(1)} km</td><td><button className="secondary" aria-label={`Review ${labels[plan.strategy]} plan`} onClick={() => { setSelectedStrategy(plan.strategy); setTab('Plan'); }}>Review plan</button></td></tr>)}</tbody></table></div></section><ComparisonCharts plans={plans}/>{input&&<Marginal key={plansJob?.job_id} input={input} busy={busy} parentReady={Boolean(plansJob?.plans)} analysis={analysis} onRun={marginal}/>}<p className="hint">Priority commitments take precedence over total volume in the JalSetu policy. Arrival estimates come from the same synthetic matrix. Review and approve the strategy whose tradeoffs you accept. Aggregate metrics include confirmed requests only.</p></>)}
      {tab === 'Evidence' && <><div className="section-head"><div><h2>Inputs, sources & checks</h2><p>A result should be inspectable, not merely persuasive.</p></div>{(chosen || operation) && <button className="secondary" onClick={exportJson}>Download evidence JSON</button>}</div><Sources input={input}/>{chosen && <section className="panel"><h3>Validation and provenance</h3><p>{chosen.validation.valid ? 'Independent validator passed.' : 'Validation failed.'} Global optimality is not claimed.</p><p className="hash">Input SHA-256: {chosen.input_snapshot_sha256}</p><ul>{chosen.limitations.map(text => <li key={text}>{text}</li>)}</ul><p>{resultMatches ? 'These results correspond to the current input.' : 'Review the saved input included in the export.'}</p></section>}</>}
      <footer>JalSetu · One depot, one trip per vehicle · {cloud?"AWS example mode":"Local example mode"}</footer>
    </main>
  </div>;
}
function Empty({ action }: { action: () => void }) { return <section className="empty"><h2>No checked plan yet</h2><p>Load an example, review its resources and select the operating rules.</p><button className="primary" onClick={action}>Review inputs</button></section>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function RouteDiagram({ input, routes }: { input: Input; routes: Route[] }) {
  const rows = [input.depot, ...input.sites];
  const coordinates = rows.map(row => row.location!);
  const west = Math.min(...coordinates.map(p => Number(p.longitude))), east = Math.max(...coordinates.map(p => Number(p.longitude)));
  const south = Math.min(...coordinates.map(p => Number(p.latitude))), north = Math.max(...coordinates.map(p => Number(p.latitude)));
  const point = (row: Row) => [40 + (Number(row.location!.longitude) - west) / (east - west || 1) * 360, 260 - (Number(row.location!.latitude) - south) / (north - south || 1) * 220];
  const colors = ['#087eaa', '#7259a6', '#a76b25', '#486f51', '#98395c'];
  return <><svg role="img" aria-label="Schematic showing example depot and vehicle stop sequences" viewBox="0 0 460 320"><rect width="460" height="320" fill="#f2f7fa"/>{routes.map((route, i) => { const stops = [input.depot, ...route.stops.map(stop => input.sites.find(s => s.site_id === stop.site_id)!), input.depot]; return <polyline key={route.vehicle_id} points={stops.map(point).map(p => p.join(',')).join(' ')} stroke={colors[i % colors.length]} fill="none" strokeWidth="2.5"/>; })}{rows.map((row, i) => { const [x, y] = point(row); return <g key={i}><title>{i ? `${row.name} · ${row.confirmation_status} · ${routes.flatMap(r=>r.stops).filter(s=>s.site_id===row.site_id).reduce((sum,s)=>sum+s.planned_litres,0)} L scheduled` : String(row.name)}</title><circle cx={x} cy={y} r={i ? 8 : 11} fill={i ? (routes.some(r=>r.stops.some(s=>s.site_id===row.site_id))?'#d7edf5':'#fff') : '#103047'} stroke="#103047" strokeWidth="2" strokeDasharray={i&&row.confirmation_status!=='confirmed'?'3 2':undefined}/><text x={x} y={y + 24} textAnchor="middle" fontSize="12" fill="#203849">{i ? String(row.site_id) : 'Depot'}</text></g>; })}</svg><div className="route-legend">{routes.map((r,i)=><span key={r.vehicle_id}><b style={{color:colors[i%colors.length]}}>━</b> {r.vehicle_id}</span>)}<span>Filled point: scheduled</span><span>Dashed outline: unconfirmed</span></div></>;
}
