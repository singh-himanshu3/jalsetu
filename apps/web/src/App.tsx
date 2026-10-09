import { useEffect, useState } from 'react';
import Operations, { type Operation } from './Operations';
import { api, postOptions } from './api';
import { exportCards, exportStops, isApprovedPlan, type ExportMeta } from './exports';
import Projects, { type Project } from './Projects';
import ComparisonCharts from './ComparisonCharts';
import Sources from './Sources';
import Marginal, {type Analysis} from './Marginal';
import Overview, { NavIcon } from './Overview';
import Setup from './Setup';

export type Row = { [key: string]: unknown; location?: { longitude: number | null; latitude: number | null } };
export type Input = { name: string; display_warning: string; data_mode: string; service_window_policy: string | null; loading_mode: string | null; depot: Row; vehicles: Row[]; sites: Row[]; travel_matrix: { provider: string; limitations: string[]; [key:string]:unknown } | null; [key: string]: unknown };
type Stop = { site_id: string; planned_litres: number; estimated_arrival: string; estimated_departure: string };
type Route = { vehicle_id: string; planned_load_litres: number; capacity_litres: number; stops: Stop[] };
type Plan = { strategy: string; status: string; created_at: string; approval_blockers: string[]; approvable: boolean; explanation: string; runtime_seconds: number; input_snapshot_sha256: string; metrics: Record<string, number | string | null>; validation: { valid: boolean; errors: string[] }; site_results: { site_id: string; requested_litres: number; scheduled_litres: number; unmet_litres: number; reason: string | null }[]; vehicle_routes: Route[]; limitations: string[] };
type Job = { job_id: string; status: string; stage?: string; stage_history?: {stage:string;completed_at:string}[]; created_at: string; end_to_end_runtime_seconds?:number; plans?: Plan[]; analysis?: Analysis; operation?: Operation; error?: { code?:string; message: string; details?: { field: string; message: string }[] } };
const statusLabels: Record<string,string> = { queued:'Waiting to start', validating:'Validating inputs', routing:'Reading sample travel estimates', solving:'Calculating delivery options', checking:'Checking route times and quantities', persisting:'Saving checked result', explaining:'Preparing your results', completed:'Completed', failed:'Failed', validating_and_solving:'Validating and calculating' };
const labels: Record<string, string> = { jalsetu: 'JalSetu', equal_share: 'Equal share', demand_proportional: 'Demand proportional', greedy: 'Priority-first greedy' };
const litres = (n: unknown) => `${Number(n).toLocaleString('en-IN')} L`;
const time = (stamp: string) => new Date(stamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

export default function App({cloud=false}:{cloud?:boolean}) {
  const [tab, setTab] = useState('Overview');
  const [input, setInput] = useState<Input | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState('jalsetu');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
  const approved = isApprovedPlan(chosen, operation?.approved_plan);
  const exportMeta: ExportMeta = { vehicle_names:Object.fromEntries((input?.vehicles ?? []).map(row=>[String(row.vehicle_id),String(row.name)])),site_names:Object.fromEntries((input?.sites ?? []).map(row=>[String(row.site_id),String(row.name)])), project_name: input?.name ?? 'Local example', revision: plansJob?.job_id ?? 'local draft', data_mode: input?.data_mode ?? 'example', created_at: chosen?.created_at ?? plansJob?.created_at ?? new Date().toISOString(), approval_state: isApprovedPlan(chosen, operation?.approved_plan) ? 'approved example' : 'draft', source_age: 'Not applicable: synthetic exercise matrix' };
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
            setError('Could not read planning status. Check the local server, then generate again. Saved approvals remain available in Deliveries.');
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
    try { const next = await api<Input>('/v1/example'); setProject(null); edit(next);  setTab('Inputs'); }
    catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }
  function openProject(next:Project<Input>) {setProject(next);edit(next.input);setSavedMessage('');setTab('Inputs');}
  async function saveProject() {if(!project||!input)return;setLoading(true);setError('');try{const result=await api<{project:Project<Input>}>(`/v1/projects/${project.project_id}`,{...postOptions({input},project.version),method:'PUT'});setProject(result.project);setSavedMessage('Changes saved. Create a new plan to use the updated setup.');}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
  async function generate() {
    if (!input?.service_window_policy || !input.loading_mode) { setError('Choose the two operating rules in Set up → Water & timing.'); return; }
    setLoading(true); setError(''); setAnalysis(null); setPlans([]);
    try {
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
  return <div className="app">
    <a className="skip-link" href="#workspace">Skip to workspace</a>
    <aside className="sidebar"><a className="brand" href="#" onClick={e => { e.preventDefault(); setTab('Overview'); }}><span className="mark"><svg aria-hidden="true" viewBox="0 0 28 32"><path d="M14 2C11 9 4 15 4 21a10 10 0 0 0 20 0C24 15 17 9 14 2Z" fill="currentColor"/><path d="M8 22c0 4 3 6 6 6" fill="none" stroke="#c6e1b5" strokeWidth="2" strokeLinecap="round"/></svg></span> JalSetu</a><nav aria-label="Project navigation">{[['Overview','Home'],['Inputs','Set up'],['Plan','Your plan'],['Operations','Deliveries']].map(([name,label]) => <button key={name} aria-current={tab === name ? 'page' : undefined} className={tab === name ? 'nav active' : 'nav'} onClick={() => setTab(name)}><NavIcon name={name}/>{label}</button>)}<details className={['Compare','Evidence'].includes(tab) ? 'more-nav active' : 'more-nav'}><summary>More <span aria-hidden="true">⌄</span></summary><div>{[['Compare','Compare options'],['Evidence','About the example']].map(([name,label]) => <button key={name} className="nav" onClick={e => {setTab(name);const menu=e.currentTarget.closest('details');if(menu)menu.open=false;}}>{label}</button>)}</div></details></nav><span className="shell-status"><span className="status-dot"/>{cloud?'AWS example':'Local example'}</span></aside>
    <main tabIndex={-1} id="workspace" className={tab === 'Overview' ? 'overview-page' : 'workspace-page'}><header className="workspace-header"><div><span className="eyebrow">DELHI · WATER RELIEF</span><h1>{tab === 'Overview' ? 'Heat relief, planned with care.' : shownInput?.name ?? 'Plan the next water-relief run'}</h1></div><span className="mode">{cloud?"Example mode":"Practice mode"}</span></header>
      {shownInput && tab !== 'Overview' && <div className="banner"><strong>EXAMPLE ONLY</strong><span>Sample requests, vehicles and travel times. No real vehicles are dispatched.</span></div>}
      {error && <div className="error" role="alert">{error}</div>}
      {busy && <div className="job" role="status"><span className="spinner"/> {job && !['completed', 'failed'].includes(job.status) ? `Creating your plan: ${statusLabels[job.status]??job.status.replaceAll('_', ' ')}` : 'Processing request…'}<span>{job && !['completed', 'failed'].includes(job.status) ? 'You can review the result when it is ready.' : 'Please wait.'}</span></div>}
      {statusReadError && <p className="attention" role="status">{statusReadError}</p>}
      {tab === 'Overview' && <><Overview input={input} busy={busy} onLoad={loadExample} onNavigate={setTab} hasPlan={Boolean(chosen)}/><details className="project-drawer"><summary><div><span className="eyebrow">YOUR WORKSPACE</span><h3>Saved projects & new exercises</h3></div><span className="drawer-chevron" aria-hidden="true">+</span></summary><Projects<Input> busy={busy} onOpen={openProject} onArchive={id=>{if(project?.project_id===id){setProject(null);setInput(null);setPlans([]);setPlansJob(null);setJob(null);setSavedMessage('');}}}/></details></>}
      {tab === 'Inputs' && (!input ? <Empty action={() => setTab('Overview')} hasInput={false}/> : <Setup input={input} busy={busy} onEdit={edit} onGenerate={generate} onSave={saveProject} isSaved={Boolean(project)} saveStatus={project ? savedMessage || 'Saved run. Save changes before leaving.' : 'This example is not saved. You can create a saved example from Home.'}/>)}
      {tab === 'Plan' && (!chosen ? <Empty action={() => setTab(input ? 'Inputs' : 'Overview')} hasInput={Boolean(input)}/> : <>
        <div className="section-head"><div><h2>{chosen.approvable ? 'Your delivery plan' : 'This plan needs attention'}</h2><p>{labels[chosen.strategy]} option · Review the stops and quantities before approving. Times are estimates.</p></div><span className={chosen.approvable ? 'validated' : 'attention'}>{chosen.approvable ? '✓ Stock, capacity & timing checked' : (chosen.approval_blockers?.[0] ?? chosen.status.replaceAll('_', ' '))}</span></div>
        <div className="metrics"><Metric label="Water planned for delivery" value={litres(chosen.metrics.on_time_scheduled_litres)}/><Metric warning label="Requests still unmet" value={litres(chosen.metrics.unmet_requested_litres)}/><Metric label="Points receiving their minimum" value={String(chosen.metrics.sites_meeting_minimum)}/><Metric label="Vehicles used" value={String(chosen.vehicle_routes.length)}/></div>
        <p className="explanation">{litres(chosen.metrics.on_time_scheduled_litres)} is planned for confirmed requests. {Number(chosen.metrics.unmet_requested_litres) > 0 ? `${litres(chosen.metrics.unmet_requested_litres)} remains unmet. Review these gaps before approving.` : "All confirmed requests are covered within the selected rules."}</p><div className="actions"><button className="secondary" onClick={() => setTab('Compare')}>Compare other options</button><button className="text-button" onClick={() => setTab('Inputs')}>Change setup →</button></div><div className="route-grid"><section className="panel"><h3>Stops at a glance</h3><RouteDiagram input={input!} routes={chosen.vehicle_routes}/><p className="hint">Example diagram only. Follow actual road guidance on a real run.</p></section><section className="panel"><h3>Vehicle instructions</h3>{chosen.vehicle_routes.length ? chosen.vehicle_routes.map(route => <details className="route" open key={route.vehicle_id}><summary>{String(input?.vehicles.find(vehicle => vehicle.vehicle_id === route.vehicle_id)?.name ?? route.vehicle_id)} · {litres(route.planned_load_litres)} / {litres(route.capacity_litres)}</summary><ol>{route.stops.map((stop,index) => <li key={stop.site_id}><strong>{String(input?.sites.find(site => site.site_id === stop.site_id)?.name ?? stop.site_id)} · {litres(stop.planned_litres)}</strong><small>{time(stop.estimated_arrival)}–{time(stop.estimated_departure)} IST</small><small>Remaining load after stop: {litres(route.planned_load_litres-route.stops.slice(0,index+1).reduce((n,s)=>n+s.planned_litres,0))}</small></li>)}</ol></details>) : <p>No visits were scheduled under these constraints.</p>}</section></div>
        <details className="panel"><summary>Checks and limits</summary><p>{chosen.validation.valid ? "Stock, vehicle capacity, loading and receiving times were checked against your setup." : "This plan did not pass its checks. Update the setup and create a new plan before approving."}</p><p className="hint">Only confirmed requests receive visits. Planned quantities and times are estimates; deliveries need separate reports. Routes are approximate and are not road navigation.</p></details>
        <section className="panel"><h3>What each point will receive</h3><div className="table-wrap"><table><thead><tr><th>Point</th><th>Requested</th><th>Planned delivery</th><th>Unmet</th><th>Status</th></tr></thead><tbody>{chosen.site_results.map(site => <tr key={site.site_id}><td>{String(input?.sites.find(point => point.site_id === site.site_id)?.name ?? site.site_id)}</td><td>{litres(site.requested_litres)}</td><td>{litres(site.scheduled_litres)}</td><td>{litres(site.unmet_litres)}</td><td>{site.reason ?? (site.unmet_litres > 0 ? 'Partially covered' : 'Covered')}</td></tr>)}</tbody></table></div></section>
        <section id="approve-plan" className="panel approval-panel">{approved ? <><span className="validated">✓ Approved example plan</span><h3>Your plan is ready to track.</h3><p>Record loading and deliveries as they happen. Approval alone does not move any water.</p><button className="primary" onClick={() => setTab('Operations')}>Track deliveries →</button></> : <><h3>Ready to use this example plan?</h3><p>Approve after reviewing the stops and unmet requests. Water stays at the depot until loading is recorded.</p><div className="form-grid"><label>Your name or team label<input maxLength={120} value={actor} onChange={e => setActor(e.target.value)} placeholder="For example: Demo coordinator"/></label></div><div className="actions"><button className="primary" disabled={busy || !actor.trim() || !chosen.approvable || !plansJob?.plans} onClick={() => operationAction('/v1/approvals', {job_id:plansJob!.job_id,strategy:chosen.strategy,actor})}>Approve example plan & track deliveries →</button></div><p className="hint">{cloud ? 'Saved under your signed-in account with the label above.' : 'Saved locally with the label above. This is an example approval, not a verified identity.'}</p></>}</section>
        <section className="panel"><h3>Download your plan</h3><div className="actions"><button className="secondary" onClick={() => exportStops(chosen, exportMeta)}>Download delivery list (CSV)</button><button className="secondary" onClick={() => exportCards(chosen, exportMeta)}>Download printable vehicle instructions</button></div><p className="hint">The download includes the example label and approval status. Open the printable file to print or save as PDF.</p></section>
      </>)}
      {tab === 'Plan' && chosen && <div className="plan-next"><span>{approved ? 'This example plan has been approved.' : 'Review the stops and unmet requests before approving.'}</span>{approved ? <button className="primary" onClick={() => setTab('Operations')}>Track deliveries →</button> : <a className="primary" href="#approve-plan">Review & approve →</a>}</div>}
      {tab === 'Operations' && <Operations cloud={cloud} operation={operation} busy={busy} onRestore={next => { setOperation(next); setTab('Operations'); }} onAction={operationAction} onNeedPlan={() => setTab(chosen ? 'Plan' : input ? 'Inputs' : 'Overview')}/>}
      {tab === 'Compare' && (!plans.length ? <Empty action={() => setTab(input ? 'Inputs' : 'Overview')} hasInput={Boolean(input)}/> : <><div className="section-head"><div><h2>Compare the same resources</h2><p>No strategy is assumed to win every metric. All results are independently checked.</p></div></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Strategy</th><th>Scheduled</th><th>Unmet</th><th>Critical minimum</th><th>Lowest fulfilment</th><th>Travel</th><th>Review</th></tr></thead><tbody>{plans.map(plan => <tr key={plan.strategy} className={plan.strategy === selectedStrategy ? 'selected-row' : ''}><td><strong>{labels[plan.strategy]}</strong></td><td>{litres(plan.metrics.on_time_scheduled_litres)}</td><td>{litres(plan.metrics.unmet_requested_litres)}</td><td>{litres(plan.metrics.critical_minimum_litres)}</td><td>{(Number(plan.metrics.minimum_fulfilment_ratio) * 100).toFixed(1)}%</td><td>{(Number(plan.metrics.total_travel_distance_metres) / 1000).toFixed(1)} km</td><td><button className="secondary" aria-label={`Review ${labels[plan.strategy]} plan`} onClick={() => { setSelectedStrategy(plan.strategy); setTab('Plan'); }}>Review plan</button></td></tr>)}</tbody></table></div></section><ComparisonCharts plans={plans}/>{input&&<Marginal key={plansJob?.job_id} input={input} busy={busy} parentReady={Boolean(plansJob?.plans)} analysis={analysis} onRun={marginal}/>}<p className="hint">Priority commitments take precedence over total volume in the JalSetu policy. Arrival estimates come from the same sample travel estimates. Review and approve the strategy whose tradeoffs you accept. Aggregate metrics include confirmed requests only.</p></>)}
      {tab === 'Evidence' && <><div className="section-head"><div><h2>About the example</h2><p>Understand what the sample can show and what still needs checking.</p></div></div><Sources input={input}/></>}
      <footer><span className="footer-brand">JalSetu</span><span>Heat relief dispatch · Delhi pilot</span><span>{cloud?'Authenticated AWS example workspace':'Local example'}</span></footer>
    </main>
  </div>;
}
function Empty({ action, hasInput = true }: { action: () => void; hasInput?: boolean }) { return <section className="empty"><h2>Your next relief run starts here.</h2><p>Start with the example, then review water, vehicles and requests in three short steps.</p><button className="primary" onClick={action}>{hasInput ? 'Continue setup' : 'Try the example'}</button></section>; }
function Metric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) { return <div className={warning ? 'metric-unmet' : undefined}><span>{label}</span><strong>{value}</strong></div>; }
function RouteDiagram({ input, routes }: { input: Input; routes: Route[] }) {
  const rows = [input.depot, ...input.sites];
  const coordinates = rows.map(row => row.location!);
  const west = Math.min(...coordinates.map(p => Number(p.longitude))), east = Math.max(...coordinates.map(p => Number(p.longitude)));
  const south = Math.min(...coordinates.map(p => Number(p.latitude))), north = Math.max(...coordinates.map(p => Number(p.latitude)));
  const point = (row: Row) => [40 + (Number(row.location!.longitude) - west) / (east - west || 1) * 360, 260 - (Number(row.location!.latitude) - south) / (north - south || 1) * 220];
  const colors = ['#086356', '#8870a2', '#b57937', '#577444', '#a14d69'];
  return <><svg role="img" aria-label="Schematic showing example depot and vehicle stop sequences" viewBox="0 0 460 320"><defs><pattern id="route-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#dce5d3" strokeWidth="0.7"/></pattern></defs><rect width="460" height="320" fill="#f4f7ee"/><rect width="460" height="320" fill="url(#route-grid)"/>{routes.map((route, i) => { const stops = [input.depot, ...route.stops.map(stop => input.sites.find(s => s.site_id === stop.site_id)!), input.depot]; return <polyline key={route.vehicle_id} points={stops.map(point).map(p => p.join(',')).join(' ')} stroke={colors[i % colors.length]} fill="none" strokeWidth="2.5"/>; })}{rows.map((row, i) => { const [x, y] = point(row); return <g key={i}><title>{i ? `${row.name} · ${row.confirmation_status} · ${routes.flatMap(r=>r.stops).filter(s=>s.site_id===row.site_id).reduce((sum,s)=>sum+s.planned_litres,0)} L scheduled` : String(row.name)}</title><circle cx={x} cy={y} r={i ? 8 : 11} fill={i ? (routes.some(r=>r.stops.some(s=>s.site_id===row.site_id))?'#d5e6c5':'#fffefa') : '#173d35'} stroke="#173d35" strokeWidth="2" strokeDasharray={i&&row.confirmation_status!=='confirmed'?'3 2':undefined}/><text x={x} y={y + 24} textAnchor="middle" fontSize="12" fill="#173d35">{i ? String(row.site_id) : 'Depot'}</text></g>; })}</svg><div className="route-legend">{routes.map((r,i)=><span key={r.vehicle_id}><b style={{color:colors[i%colors.length]}}>━</b> {r.vehicle_id}</span>)}<span>Filled point: scheduled</span><span>Dashed outline: unconfirmed</span></div></>;
}
