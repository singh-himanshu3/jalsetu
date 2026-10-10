import { useEffect, useRef, useState } from 'react';
import type { Input } from './App';
import { api, postOptions } from './api';

export default function RecordSource({ input, busy, onEdit }: { input: Input; busy: boolean; onEdit: (value: Input) => void }) {
  const [sharing, setSharing] = useState(false), [working, setWorking] = useState(false), [message, setMessage] = useState('');
  const current = useRef(input); current.current = input;
  const coordinates = JSON.stringify([input.depot.location, ...input.sites.map(s => s.location)]);
  useEffect(() => { setSharing(false); }, [coordinates]);
  const source = input.operational_source as {description:string;recorded_date:string;reviewed:boolean};
  function change(key: string, value: unknown) { onEdit({...input, operational_source:{...source, reviewed:false, [key]:value}}); }
  async function roads() {
    setWorking(true); setMessage(''); const original = JSON.stringify(input);
    try {
      const result = await api<{input:Input}>('/v1/records/roads', postOptions({input, allow_coordinate_sharing:sharing}));
      if (JSON.stringify(current.current) !== original) { setMessage('Setup changed while roads were fetched. Review it and fetch again.'); return; }
      onEdit(result.input); setMessage('Matching road estimates are ready. Save changes to keep this setup.');
    } catch (e) { setMessage((e as Error).message); } finally { setWorking(false); }
  }
  return <section className="panel"><h3>Where these records came from</h3><p>Start with one actual delivery day. Enter recorded quantities and hours; leave unknown values blank. This pilot supports one small Delhi area, five vehicles and twenty receiving points.</p>
    <fieldset className="input-scope" disabled={busy || working}><div className="form-grid"><label>Record source / reference<input maxLength={500} placeholder="Organization or anonymized dispatch-log reference" value={source.description} onChange={e=>change('description',e.target.value)}/></label><label>Date these records were recorded<input type="date" value={source.recorded_date} onInput={e=>change('recorded_date',e.currentTarget.value)}/></label><label>Planning quantity step (litres)<input type="number" min="1" max="10000" value={String(input.increment_litres??'')} onChange={e=>onEdit({...input,increment_litres:e.target.value===''?null:Number(e.target.value)})}/></label></div>
    <p className="hint">Quantities must fit this step exactly; JalSetu rejects mismatches instead of rounding your records. Keep the area within 0.1° longitude and latitude inside Delhi.</p>
    <label className="ack"><input type="checkbox" checked={source.reviewed} onChange={e=>change('reviewed',e.target.checked)}/> I checked these entries against permitted operational records, including locations and receiving conditions.</label>
    <h3>Road estimates for your locations</h3><p>Finish the depot, vehicles and requests first, then fetch roads. This sends only their coordinates to the public OSRM service, which may log the request. Car routes do not confirm tanker access or live traffic.</p>
    <label className="ack"><input type="checkbox" checked={sharing} onChange={e=>setSharing(e.target.checked)}/> These locations may be shared with the public road provider.</label>
    <button className="secondary" disabled={!sharing || !source.reviewed} onClick={roads}>{working ? 'Checking records and fetching roads…' : 'Check records & fetch matching roads'}</button>
    {input.travel_matrix && <p className="hint">Road estimates retrieved: {new Date(String(input.travel_matrix.retrieved_at)).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST. {input.travel_matrix.represented_at ? `Map date: ${input.travel_matrix.represented_at}` : 'Underlying map date not supplied.'} Saved estimates are reused; there is no automatic refresh.</p>}
    <p className="hint">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> · OSRM / FOSSGIS · <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noreferrer">Provider policy</a> · <a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer">Fix the map</a></p>
    </fieldset>{message && <p className="attention" role="status">{message}</p>}
  </section>;
}
