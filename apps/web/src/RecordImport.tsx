import { useState } from 'react';
import type { Input } from './App';
import { readRecordSites, recordTemplate } from './record-csv.mjs';
import { download } from './exports';
import { api, postOptions } from './api';

export default function RecordImport({input,busy,onEdit}:{input:Input;busy:boolean;onEdit:(next:Input)=>void}) {
  const [file,setFile]=useState(''),[preview,setPreview]=useState<Input|null>(null),[message,setMessage]=useState(''),[working,setWorking]=useState(false);
  async function validate() {
    setWorking(true);setMessage('');setPreview(null);
    try {
      const sites=readRecordSites(file,String(input.operating_date));
      const result=await api<{input:Input}>('/v1/records/review',postOptions({input:{...input,sites,travel_matrix:null}}));
      setPreview(result.input);
    } catch(e) {setMessage((e as Error).message);} finally {setWorking(false);}
  }
  return <details className="panel"><summary>Import receiving points from a spreadsheet</summary><p>Fill the blank template using actual records, then save it as CSV. This replaces the draft’s entire receiving-point list after you review it. Saved approvals stay unchanged.</p><p className="hint">Use 24-hour HH:MM times. Priority: critical, high or standard. Request status: draft, contacted or confirmed. Enter source notes, depot, vehicles and both operating rules first. No missing values are invented.</p>
    <div className="actions"><button className="secondary" disabled={busy||working} onClick={()=>download(recordTemplate(),'text/csv;charset=utf-8','jalsetu-receiving-points-blank.csv')}>Download blank receiving-point template</button><label>Select your CSV file<input type="file" accept=".csv,text/csv" disabled={busy||working} onChange={async e=>{setPreview(null);setMessage('');setFile('');const f=e.target.files?.[0];if(f){if(f.size>1024*1024){setMessage('The file exceeds the 1 MB limit');return;}setFile(await f.text());}}}/></label><button className="secondary" disabled={busy||working||!file} onClick={validate}>{working?'Checking records…':'Check & preview receiving points'}</button></div>
    {message&&<p className="attention" role="alert">{message}</p>}{preview&&<><div className="table-wrap"><table><thead><tr><th>Point</th><th>Requested litres</th><th>Receiving hours · IST</th><th>Request status</th></tr></thead><tbody>{preview.sites.map(s=><tr key={String(s.site_id)}><td>{String(s.name)}</td><td>{String(s.requested_litres)}</td><td>{String(s.opens_at).slice(11,16)}–{String(s.closes_at).slice(11,16)}</td><td>{String(s.confirmation_status)}</td></tr>)}</tbody></table></div><button className="primary" disabled={busy||working} onClick={()=>onEdit(preview)}>Replace draft points with these records</button><p className="hint">After applying, fetch matching roads and save your changes.</p></>}
  </details>;
}
