import { useEffect, useRef, useState } from 'react';
import type { Input, Row } from './App';
import ResourceEditor from './ResourceEditor';
import SiteImport from './SiteImport';
import { api, postOptions } from './api';

type Props = { input: Input; busy: boolean; onEdit: (input: Input) => void; onGenerate: () => void; onSave: () => void; isSaved: boolean; saveStatus: string };
const steps = ['Water & timing', 'Vehicles', 'Water requests'];

function NumberField({ label, value, onChange, step = 100 }: { label: string; value: unknown; onChange: (value: number | null) => void; step?: number }) {
  return <label>{label}<input type="number" min="0" step={step} value={String(value ?? '')} onChange={event => onChange(event.target.value === '' ? null : Number(event.target.value))}/></label>;
}
function TimeField({ label, value, day, onChange }: { label: string; value: unknown; day: string; onChange: (value: string) => void }) {
  const date = new Date(String(value));
  const local = Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
  return <label>{label}<input type="time" value={local} onInput={event => onChange(event.currentTarget.value ? `${day}T${event.currentTarget.value}:00+05:30` : '')}/></label>;
}

export default function Setup({ input, busy, onEdit, onGenerate, onSave, isSaved, saveStatus }: Props) {
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { window.scrollTo({top:0,behavior:'instant'}); heading.current?.focus({preventScroll:true}); }, [step]);
  function row(section: 'depot' | 'vehicles' | 'sites', index: number, key: string, value: unknown) {
    if (section === 'depot') onEdit({...input,depot:{...input.depot,[key]:value}});
    else onEdit({...input,[section]:input[section].map((item,i) => i === index ? {...item,[key]:value} : item)});
  }
  function next() {
    if (!input.service_window_policy || !input.loading_mode) {
      setMessage('Choose when unloading must finish and how vehicles load.'); setStep(0); window.scrollTo({top:0,behavior:'instant'}); heading.current?.focus({preventScroll:true}); return;
    }
    if (step === 1 && !input.vehicles.some(vehicle => vehicle.status === 'available')) {
      setMessage('Mark at least one vehicle as available before continuing.'); window.scrollTo({top:0,behavior:'instant'}); heading.current?.focus({preventScroll:true}); return;
    }
    if (step === 2 && (!input.travel_matrix || !input.sites.some(site => site.confirmation_status === 'confirmed'))) {
      setMessage(!input.travel_matrix ? 'Open More setup options and rebuild the example travel estimates before planning.' : 'Confirm at least one water request before planning.'); window.scrollTo({top:0,behavior:'instant'}); heading.current?.focus({preventScroll:true}); return;
    }
    setMessage('');
    if (step === 2) onGenerate(); else setStep(step + 1);
  }
  const day = String(input.operating_date);
  return <fieldset className="input-scope" disabled={busy}>
    <nav className="setup-steps" aria-label="Setup steps">{steps.map((label,index) => <button key={label} aria-current={step === index ? 'step' : undefined} className={step === index ? 'current' : ''} onClick={() => { setStep(index); setMessage(''); }}><span>{index + 1}</span>{label}</button>)}</nav>
    <div className="section-head"><div><span className="eyebrow">STEP {step + 1} OF 3</span><h2 tabIndex={-1} ref={heading}>{['How much water can you send?', 'Which vehicles can make the run?', 'Who needs water?'][step]}</h2><p>{['Review the sample stock and choose the two operating rules. All times are India Standard Time.', 'Check each vehicle’s capacity and availability.', 'Only confirmed requests receive a planned visit. Review the sample requests below.'][step]}</p></div></div>
    {message && <p className="attention" role="alert">{message}</p>}
    {step === 0 && <>
      <section className="panel"><h3>Water available at the depot</h3><div className="form-grid"><NumberField label="Available water (litres)" value={input.depot.available_stock_litres} onChange={value => row('depot',0,'available_stock_litres',value)}/><TimeField label="Depot opens (IST)" value={input.depot.opens_at} day={day} onChange={value => row('depot',0,'opens_at',value)}/><TimeField label="Depot closes (IST)" value={input.depot.closes_at} day={day} onChange={value => row('depot',0,'closes_at',value)}/></div><label className="ack"><input type="checkbox" checked={Boolean(input.depot.potable_supply_confirmed)} onChange={event => row('depot',0,'potable_supply_confirmed',event.target.checked)}/> The example operator confirms the water is safe to drink.</label><p className="hint">This is an operator declaration, not a water-quality certification.</p></section>
      <section className="panel"><h3>Two rules for this run</h3><div className="form-grid"><label>When a receiving point closes<select aria-invalid={Boolean(message && !input.service_window_policy)} value={input.service_window_policy ?? ''} onChange={event => onEdit({...input,service_window_policy:event.target.value || null})}><option value="">Choose a closing rule</option><option value="finish_by_close">Finish unloading before it closes</option><option value="start_by_close">Starting before it closes is enough</option></select></label><label>How vehicles load at the depot<select aria-invalid={Boolean(message && !input.loading_mode)} value={input.loading_mode ?? ''} onChange={event => onEdit({...input,loading_mode:event.target.value || null})}><option value="">Choose a loading rule</option><option value="parallel">Vehicles can load at the same time</option><option value="sequential">Only one vehicle can load at a time</option></select></label><NumberField label="Loading time per vehicle (minutes)" step={1} value={input.depot.loading_duration_minutes} onChange={value => row('depot',0,'loading_duration_minutes',value)}/></div></section>
    </>}
    {step === 1 && <section className="panel"><h3>Vehicles for this run</h3>{!input.vehicles.length && <p className="attention">No vehicles yet. Add an example vehicle in More setup options below.</p>}<div className="form-grid">{input.vehicles.map((vehicle,i) => <div className="vehicle" key={String(vehicle.vehicle_id)}><strong>{String(vehicle.name)}</strong><NumberField label="Can carry (litres)" value={vehicle.capacity_litres} onChange={value => row('vehicles',i,'capacity_litres',value)}/><label>Available for this run?<select value={String(vehicle.status)} onChange={event => row('vehicles',i,'status',event.target.value)}><option value="available">Yes, available</option><option value="unavailable">No, unavailable</option></select></label><details><summary>Vehicle working hours</summary><div className="vehicle-hours"><TimeField label={`Starts at for ${vehicle.name} (IST)`} day={day} value={vehicle.opens_at} onChange={value => row('vehicles',i,'opens_at',value)}/><TimeField label={`Must return by for ${vehicle.name} (IST)`} day={day} value={vehicle.closes_at} onChange={value => row('vehicles',i,'closes_at',value)}/></div></details></div>)}</div></section>}
    {step === 2 && <>
      <section className="panel"><h3>Receiving points</h3><p className="hint">“Minimum useful” is the smallest delivery that would help this point. Keep requests within its receiving limit.</p><div className="table-wrap"><table><thead><tr><th>Receiving point</th><th>Requested (L)</th><th>Minimum useful (L)</th><th>Can receive (L)</th><th>Priority</th><th>Request status</th></tr></thead><tbody>{input.sites.map((site,i) => <tr key={String(site.site_id)}><td>{String(site.name)}</td>{[['requested_litres','Requested'],['minimum_useful_litres','Minimum useful'],['receiving_limit_litres','Can receive']].map(([key,label]) => <td key={key}><input aria-label={`${label} for ${site.name}`} type="number" min="0" step="100" value={String(site[key] ?? '')} onChange={event => row('sites',i,key,event.target.value === '' ? null : Number(event.target.value))}/></td>)}<td><select aria-label={`Priority for ${site.name}`} value={String(site.priority_class)} onChange={event => row('sites',i,'priority_class',event.target.value)}><option value="">Choose priority</option>{['critical','high','standard'].map(priority => <option key={priority}>{priority}</option>)}</select></td><td><select aria-label={`Request status for ${site.name}`} value={String(site.confirmation_status)} onChange={event => row('sites',i,'confirmation_status',event.target.value)}><option value="confirmed">Confirmed</option><option value="contacted">Awaiting confirmation</option><option value="draft">Draft</option></select></td></tr>)}</tbody></table></div>{!input.sites.some(site => site.confirmation_status === 'confirmed') && <p className="attention">Confirm at least one request before planning.</p>}</section>
      <details className="panel"><summary>Receiving hours & unloading time</summary>{input.sites.map((site,i) => <div className="resource-row" key={String(site.site_id)}><h4>{String(site.name)}</h4><div className="form-grid"><TimeField label={`Opens for ${site.name} (IST)`} day={day} value={site.opens_at} onChange={value => row('sites',i,'opens_at',value)}/><TimeField label={`Closes for ${site.name} (IST)`} day={day} value={site.closes_at} onChange={value => row('sites',i,'closes_at',value)}/><NumberField label={`Unloading minutes for ${site.name}`} step={1} value={site.service_duration_minutes} onChange={value => row('sites',i,'service_duration_minutes',value)}/></div></div>)}</details>
    </>}
    <div className="wizard-actions"><button className="secondary" disabled={step === 0} onClick={() => { setMessage(''); setStep(step - 1); }}>Back</button><span>{step === 2 ? 'Your plan will show deliveries and any unmet requests.' : 'Your edits stay here as you move between steps.'}</span><button className="primary" onClick={next}>{busy ? 'Creating your plan…' : step === 2 ? 'Create delivery plan' : `Next: ${steps[step + 1]}`} <span aria-hidden="true">→</span></button></div>
    <details className="panel setup-options"><summary>More setup options</summary><label>Run name<input maxLength={120} value={input.name} onChange={event => onEdit({...input,name:event.target.value})}/></label><div className="actions">{isSaved && <button className="secondary" onClick={onSave}>Save changes</button>}<span role="status" className="hint">{saveStatus}</span></div><ResourceEditor input={input} onEdit={onEdit}/><SiteImport key={JSON.stringify(input)} sites={input.sites} disabled={busy} onPreview={async sites => (await api<{input:Input}>('/v1/validate-input',postOptions({input:{...input,sites}}))).input.sites} onApply={sites => onEdit({...input,sites:sites as Row[]})}/></details>
    {!input.travel_matrix && <p className="attention">Travel estimates need updating. Open More setup options, then rebuild the example travel estimates before planning.</p>}
  </fieldset>;
}
