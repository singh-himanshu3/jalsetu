import {useState} from 'react';
import type {Input} from './App';
import {download} from './exports';
const canonical=(value:unknown):string=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`:JSON.stringify(value);
export default function Sources({input}:{input:Input|null}) {
  const [error,setError]=useState('');
  const matrix=input?.travel_matrix;
  const stamp=(value:unknown)=>{
    if(!value)return 'Not recorded; synthetic fixture has no public retrieval';
    const when=Date.parse(String(value));
    if(!Number.isFinite(when))return 'Invalid source timestamp; freshness unknown';
    if(when>Date.now())return 'Future source timestamp; freshness unknown';
    return String(value)+' · age '+Math.floor((Date.now()-when)/3600000)+' hours';
  };
  async function exportLedger(){
    if(!input||!matrix)return;
    try{
      const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(matrix)));
      const sha=[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
      download(JSON.stringify({schema_version:'1.0',data_mode:input.data_mode,project_name:input.name,exported_at:new Date().toISOString(),warning:input.display_warning,
        routing:{snapshot:matrix,content_sha256:sha,hash_format:'SHA-256 of recursively key-sorted compact JSON (matrix as displayed)'},
        context:{weather:'Not loaded',population:'Not loaded; optional context disabled'},
        assumptions:{service_window_policy:input.service_window_policy,loading_mode:input.loading_mode,increment_litres:input.increment_litres,travel_time_multiplier:input.travel_time_multiplier,one_trip_per_vehicle:true,actual_need_independently_verified:false},
        limitations:['Synthetic routing is not road geometry or navigation','No forecast-derived request, priority or stock','No cache freshness is inferred from export time','Operational resource provenance remains attached to each saved input'],input},null,2),'application/json','jalsetu-source-assumption-ledger.json');
      setError('');
    }catch{setError('Could not prepare the source ledger. Retry in a browser with secure-context cryptography.');}
  }
  return <section className="panel"><h3>Sources and freshness</h3><dl className="validation-grid"><div><dt>Routing provider</dt><dd>{matrix?.provider??'No source loaded'}</dd></div><div><dt>Routing snapshot</dt><dd>{String(matrix?.snapshot_id??'None')}</dd></div><div><dt>Provenance</dt><dd>{String(matrix?.provenance??'No matrix')}</dd></div><div><dt>Retrieved</dt><dd>{stamp(matrix?.retrieved_at)}</dd></div><div><dt>Represents</dt><dd>{matrix?.represented_at?String(matrix.represented_at):'Synthetic scenario; no observed traffic period'}</dd></div><div><dt>Attribution</dt><dd>{String(matrix?.attribution??'Not available')}</dd></div></dl><ul>{matrix?.limitations.map(text=><li key={text}>{text}</li>)}</ul><p>Weather: not loaded. Population: not loaded; optional context disabled. Public context never creates a request or supplies water.</p><p className="hint">Rebuilding a synthetic matrix in Inputs refreshes the example only. It does not retrieve road routes or weather. A saved public snapshot requires its original dates, attribution, request hash and explicit freshness policy before reuse.</p><button className="secondary" disabled={!matrix} onClick={exportLedger}>Download source and assumption ledger</button>{error&&<p role="alert">{error}</p>}</section>;
}
