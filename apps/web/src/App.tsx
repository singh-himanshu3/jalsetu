import { useEffect, useState, useRef } from 'react';
import Operations, { type Operation } from './Operations';
import RouteMap from './DriverMap';
import { api, postOptions } from './api';
import { exportCards, exportStops, isApprovedPlan, type ExportMeta } from './exports';
import Projects, { type Project } from './Projects';
import ComparisonCharts from './ComparisonCharts';
import Sources from './Sources';
import PublicRoadEvidence from './PublicRoadEvidence';
import HistoricalComparison from './HistoricalComparison';
import Marginal, {type Analysis} from './Marginal';
import Overview from './Overview';
import WorkspaceNav from './WorkspaceNav';
import SiteFooter from './SiteFooter';
import { PageTransition } from './Motion';
import Setup from './Setup';
import ExampleGuide, { ExampleWelcome } from './ExampleGuide';
import { exampleStep } from './example-progress';

export type Row = { [key: string]: unknown; location?: { longitude: number | null; latitude: number | null } };
export type Input = { operational_source?: {description:string;recorded_date:string;reviewed:boolean}; name: string; display_warning: string; data_mode: string; service_window_policy: string | null; loading_mode: string | null; depot: Row; vehicles: Row[]; sites: Row[]; travel_matrix: { provider: string; limitations: string[]; [key:string]:unknown } | null; [key: string]: unknown };
type Stop = { site_id: string; planned_litres: number; estimated_arrival: string; estimated_departure: string };
type Route = { vehicle_id: string; planned_load_litres: number; capacity_litres: number; stops: Stop[] };
type Plan = { strategy: string; status: string; created_at: string; approval_blockers: string[]; approvable: boolean; explanation: string; runtime_seconds: number; input_snapshot_sha256: string; metrics: Record<string, number | string | null>; validation: { valid: boolean; errors: string[] }; site_results: { site_id: string; requested_litres: number; scheduled_litres: number; unmet_litres: number; reason: string | null }[]; vehicle_routes: Route[]; limitations: string[] };
type Job = { job_id: string; status: string; stage?: string; stage_history?: {stage:string;completed_at:string}[]; created_at: string; end_to_end_runtime_seconds?:number; plans?: Plan[]; analysis?: Analysis; operation?: Operation; error?: { code?:string; message: string; details?: { field: string; message: string }[] } };
const statusLabels: Record<string,string> = { queued:'Waiting to start', validating:'Validating inputs', routing:'Reading stored travel estimates', solving:'Calculating delivery options', checking:'Checking route times and quantities', persisting:'Saving checked result', explaining:'Preparing your results', completed:'Completed', failed:'Failed', validating_and_solving:'Validating and calculating' };
const labels: Record<string, string> = { jalsetu: 'JalSetu', equal_share: 'Equal share', demand_proportional: 'Demand proportional', greedy: 'Priority-first greedy' };
const litres = (n: unknown) => `${Number(n).toLocaleString('en-IN')} L`;
const time = (stamp: string) => new Date(stamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

export default function App({cloud=false}:{cloud?:boolean}) {
  const [tab, setTab] = useState('Overview');
  function navigateTab(next:string){setTab(next);if(next===tab){document.getElementById('workspace')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}}
  const previousTab=useRef(tab);
  useEffect(()=>{if(previousTab.current!==tab){document.getElementById('workspace')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});previousTab.current=tab;}},[tab]);
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
  const [welcome,setWelcome]=useState(false);
  const [guideStarted,setGuideStarted]=useState(false);
  const [guideVisible,setGuideVisible]=useState(false);
  const real = input?.data_mode === 'operator_entered';
  const shownInput = tab === 'Operations' && operation ? operation.input : input;
  const shownReal = shownInput?.data_mode === 'operator_entered';
  const busy = loading || Boolean(job && !['completed', 'failed'].includes(job.status));
  const chosen = plans.find(p => p.strategy === selectedStrategy);
  const approved = isApprovedPlan(chosen, operation?.approved_plan);
  const exportMeta: ExportMeta = { route_input: input ?? undefined, vehicle_names:Object.fromEntries((input?.vehicles ?? []).map(row=>[String(row.vehicle_id),String(row.name)])),site_names:Object.fromEntries((input?.sites ?? []).map(row=>[String(row.site_id),String(row.name)])), source_reference: input?.operational_source?.description, records_date: input?.operational_source?.recorded_date, project_name: input?.name ?? 'Local example', revision: plansJob?.job_id ?? 'local draft', data_mode: input?.data_mode ?? 'example', created_at: chosen?.created_at ?? plansJob?.created_at ?? new Date().toISOString(), approval_state: isApprovedPlan(chosen, operation?.approved_plan) ? 'approved' : 'draft', source_age: input?.travel_matrix?.retrieved_at ? String(input.travel_matrix.retrieved_at) : 'Not applicable: synthetic exercise matrix' };
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
  async function loadExample(guided = true) {
    setLoading(true); setError('');
    try { const next = await api<Input>('/v1/example'); setProject(null); setOperation(null); edit(next); setGuideStarted(guided); setGuideVisible(guided); setWelcome(false); setTab('Inputs'); }
    catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }
  function openProject(next:Project<Input>) {setGuideStarted(false);setGuideVisible(false);setProject(next);edit(next.input);setSavedMessage('');setTab('Inputs');}
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
  function guideNavigate(next:string) {
    setTab(next);
    requestAnimationFrame(() => {
      const target = next==='Operations' ? 'report-form' : next==='Plan' ? 'approve-plan' : 'workspace';
      document.getElementById(target)?.scrollIntoView({block:'start'});
    });
  }
  return <div className={tab==='Overview'?'app home-shell':'app'}>
    <a className="skip-link" href="#workspace">Skip to workspace</a>
    <WorkspaceNav tab={tab} onNavigate={navigateTab} onExample={()=>setWelcome(true)} real={real} cloud={cloud} busy={busy}/>
    <main tabIndex={-1} id="workspace" className={tab === 'Overview' ? 'overview-page' : 'workspace-page'}><header className="workspace-header"><div><span className="eyebrow">DELHI / WATER RELIEF</span><h1>{tab==='Overview'?'Your water-relief workspace':shownInput?.name??'Plan the next water-relief run'}</h1></div><div className="workspace-context">{shownInput&&<span className="context-date">{String(shownInput.operating_date??'')} · IST</span>}{tab==='Operations'&&operation&&<span className="revision-chip">Revision {operation.current_plan_revision}</span>}<span className="mode"><span className="status-dot"/>{shownReal?'Operator records':'Example workspace'}</span></div></header>
      {shownInput && tab !== 'Overview' && <div className="banner"><strong>{shownReal?"OPERATOR-ENTERED RECORDS":"EXAMPLE ONLY"}</strong><span>{shownReal?"Records are declared by the operator. Road estimates and reports are not independently verified. No vehicles are dispatched.":"Sample requests, vehicles and travel times. No real vehicles are dispatched."}</span></div>}
      {error && <div className="error" role="alert">{error}</div>}
      {busy && <div className="job" role="status"><span className="spinner"/> {job && !['completed', 'failed'].includes(job.status) ? `Creating your plan: ${statusLabels[job.status]??job.status.replaceAll('_', ' ')}` : 'Processing request…'}<span>{job && !['completed', 'failed'].includes(job.status) ? 'You can review the result when it is ready.' : 'Please wait.'}</span></div>}
      {statusReadError && <p className="attention" role="status">{statusReadError}</p>}
      {welcome && <ExampleWelcome busy={busy} onStart={loadExample} onClose={() => setWelcome(false)}/>}
      {guideStarted && input && (guideVisible ? <ExampleGuide step={exampleStep(Boolean(input.service_window_policy&&input.loading_mode),Boolean(chosen),Boolean(operation),Boolean(operation&&Object.values(operation.ledger.reported_delivered_litres).some(n=>n>0)))} loaded={Boolean(operation&&Object.values(operation.ledger.vehicles).some(vehicle=>vehicle.loaded))} busy={busy} onNavigate={guideNavigate} onHide={()=>setGuideVisible(false)}/> : <button className="text-button guide-resume" onClick={()=>setGuideVisible(true)}>Show my example guide →</button>)}
      <PageTransition key={tab}>
      {tab === 'Overview' && <><Overview input={input} busy={busy} onLoad={()=>setWelcome(true)} onNavigate={navigateTab} hasPlan={Boolean(chosen)}/><details className="project-drawer"><summary><div><span className="eyebrow">YOUR WORKSPACE</span><h3>Saved projects & operational records</h3></div><span className="drawer-chevron" aria-hidden="true">+</span></summary><Projects<Input> cloud={cloud} busy={busy} onOpen={openProject} onArchive={id=>{if(project?.project_id===id){setProject(null);setInput(null);setPlans([]);setPlansJob(null);setJob(null);setSavedMessage('');}}}/></details></>}
      {tab === 'Inputs' && (!input ? <Empty action={() => {setTab('Overview');setWelcome(true);}} hasInput={false}/> : <Setup input={input} busy={busy} onEdit={edit} onGenerate={generate} onSave={saveProject} isSaved={Boolean(project)} saveStatus={project ? savedMessage || 'Saved run. Save changes before leaving.' : 'This example is not saved. You can create a saved example from Home.'}/>)}
      {tab === 'Plan' && (!chosen ? <Empty action={() => {setTab(input?'Inputs':'Overview');if(!input)setWelcome(true);}} hasInput={Boolean(input)}/> : <>
        <div className="section-head"><div><h2>{chosen.approvable ? 'Your delivery plan' : 'This plan needs attention'}</h2><p>{labels[chosen.strategy]} option · Review the stops and quantities before approving. Times are estimates.</p></div><span className={chosen.approvable ? 'validated' : 'attention'}>{chosen.approvable ? '✓ Stock, capacity & timing checked' : (chosen.approval_blockers?.[0] ?? chosen.status.replaceAll('_', ' '))}</span></div>
        <div className="metrics"><Metric label="Water planned for delivery" value={litres(chosen.metrics.on_time_scheduled_litres)}/><Metric warning label="Requests still unmet" value={litres(chosen.metrics.unmet_requested_litres)}/><Metric label="Points receiving their minimum" value={String(chosen.metrics.sites_meeting_minimum)}/><Metric label="Vehicles used" value={String(chosen.vehicle_routes.length)}/></div>
        <p className="plan-explanation">{litres(chosen.metrics.on_time_scheduled_litres)} is planned for confirmed requests. {Number(chosen.metrics.unmet_requested_litres) > 0 ? `${litres(chosen.metrics.unmet_requested_litres)} remains unmet. Review these gaps before approving.` : "All confirmed requests are covered within the selected rules."}</p><div className="actions"><button className="secondary" onClick={() => setTab('Compare')}>Compare other options</button><button className="text-button" onClick={() => setTab('Inputs')}>Change setup →</button></div><RouteMap key={plansJob?.job_id+selectedStrategy} input={input!} routes={chosen.vehicle_routes} approved={approved} states={approved?operation?.ledger.vehicles:undefined} closed={approved?operation?.ledger.closed_site_ids:undefined} reported={approved?operation?.ledger.reported_delivered_litres:undefined}/>
        <details className="panel"><summary>Checks and limits</summary><p>{chosen.validation.valid ? "Stock, vehicle capacity, loading and receiving times were checked against your setup." : "This plan did not pass its checks. Update the setup and create a new plan before approving."}</p><p className="hint">Only confirmed requests receive visits. Planned quantities and times are estimates; deliveries need separate reports. Routes are approximate and are not road navigation.</p></details>
        <section className="panel"><h3>What each point will receive</h3><div className="table-wrap"><table><thead><tr><th>Point</th><th>Requested</th><th>Planned delivery</th><th>Unmet</th><th>Status</th></tr></thead><tbody>{chosen.site_results.map(site => <tr key={site.site_id}><td>{String(input?.sites.find(point => point.site_id === site.site_id)?.name ?? site.site_id)}</td><td>{litres(site.requested_litres)}</td><td>{litres(site.scheduled_litres)}</td><td>{litres(site.unmet_litres)}</td><td>{site.reason ?? (site.unmet_litres > 0 ? 'Partially covered' : 'Covered')}</td></tr>)}</tbody></table></div></section>
        <section id="approve-plan" className="panel approval-panel">{approved ? <><span className="validated">✓ {real?"Approved record-based plan":"Approved example plan"}</span><h3>Your plan is ready to track.</h3><p>Record loading and deliveries as they happen. Approval alone does not move any water.</p><button className="primary" onClick={() => setTab('Operations')}>Track deliveries →</button></> : <><h3>{real?"Ready to approve this proposed plan?":"Ready to use this example plan?"}</h3><p>Approve after reviewing the stops and unmet requests. Water stays at the depot until loading is recorded.</p><div className="form-grid"><label>Your name or team label<input maxLength={120} value={actor} onChange={e => setActor(e.target.value)} placeholder="For example: Demo coordinator"/></label></div><div className="actions"><button className="primary" disabled={busy || !actor.trim() || !chosen.approvable || !plansJob?.plans} onClick={() => operationAction('/v1/approvals', {job_id:plansJob!.job_id,strategy:chosen.strategy,actor})}>{real?"Approve plan & track reports":"Approve example plan & track deliveries"} →</button></div><p className="hint">{cloud ? 'Saved under your signed-in account with the label above.' : 'Saved locally with the label above. The team label is self-entered, not a verified identity.'}</p></>}</section>
        <section className="panel"><h3>Download your plan</h3><div className="actions"><button className="secondary" onClick={() => exportStops(chosen, exportMeta)}>Download delivery list (CSV)</button><button className="secondary" onClick={() => exportCards(chosen, exportMeta)}>Download printable vehicle instructions</button></div><p className="hint">The download includes the data label and approval status. Open the printable file to print or save as PDF.</p></section>
      </>)}
      {tab === 'Plan' && chosen && <div className="plan-next"><span>{approved ? 'This example plan has been approved.' : 'Review the stops and unmet requests before approving.'}</span>{approved ? <button className="primary" onClick={() => setTab('Operations')}>Track deliveries →</button> : <a className="primary" href="#approve-plan">Review & approve →</a>}</div>}
      {tab === 'Operations' && <Operations cloud={cloud} operation={operation} busy={busy} onRestore={next => { setGuideStarted(false); setGuideVisible(false); setOperation(next); setTab('Operations'); }} onAction={operationAction} onNeedPlan={() => setTab(chosen ? 'Plan' : input ? 'Inputs' : 'Overview')}/>}
      {tab === 'Compare' && (!plans.length ? <Empty action={() => {setTab(input?'Inputs':'Overview');if(!input)setWelcome(true);}} hasInput={Boolean(input)}/> : <><div className="section-head"><div><h2>Compare the same resources</h2><p>No strategy is assumed to win every metric. All results are independently checked.</p></div></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Strategy</th><th>Scheduled</th><th>Unmet</th><th>Critical minimum</th><th>Lowest fulfilment</th><th>Travel</th><th>Review</th></tr></thead><tbody>{plans.map(plan => <tr key={plan.strategy} className={plan.strategy === selectedStrategy ? 'selected-row' : ''}><td><strong>{labels[plan.strategy]}</strong></td><td>{litres(plan.metrics.on_time_scheduled_litres)}</td><td>{litres(plan.metrics.unmet_requested_litres)}</td><td>{litres(plan.metrics.critical_minimum_litres)}</td><td>{(Number(plan.metrics.minimum_fulfilment_ratio) * 100).toFixed(1)}%</td><td>{(Number(plan.metrics.total_travel_distance_metres) / 1000).toFixed(1)} km</td><td><button className="secondary" aria-label={`Review ${labels[plan.strategy]} plan`} onClick={() => { setSelectedStrategy(plan.strategy); setTab('Plan'); }}>Review plan</button></td></tr>)}</tbody></table></div></section><ComparisonCharts plans={plans} sites={input?.sites}/>{input&&<Marginal key={plansJob?.job_id} input={input} busy={busy} parentReady={Boolean(plansJob?.plans)} analysis={analysis} onRun={marginal}/>}<p className="hint">Priority commitments take precedence over total volume in the JalSetu policy. Arrival estimates use the same stored travel matrix for every strategy. Review and approve the strategy whose tradeoffs you accept. Aggregate metrics include confirmed requests only.</p></>)}
      {tab === 'History' && real && !cloud && input && <HistoricalComparison key={JSON.stringify(input)} input={input} busy={busy}/>}
      {tab === 'Evidence' && <><div className="section-head"><div><h2>{real?'About these records':'About the example'}</h2><p>{real?'Review declared sources and what still needs checking.':'Understand what the sample can show and what still needs checking.'}</p></div></div><Sources input={input}/><PublicRoadEvidence/></>}
      </PageTransition>
      <SiteFooter onNavigate={navigateTab} cloud={cloud}/>
    </main>
  </div>;
}
function Empty({ action, hasInput = true }: { action: () => void; hasInput?: boolean }) { return <section className="empty"><h2>Your next relief run starts here.</h2><p>Start with the example, then review water, vehicles and requests in three short steps.</p><button className="primary" onClick={action}>{hasInput ? 'Continue setup' : 'Try the example'}</button></section>; }
function Metric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) { return <div className={warning ? 'metric-unmet' : undefined}><span>{label}</span><strong>{value}</strong></div>; }
