import { useState } from 'react';
import { mergeSiteCsv, encodeCsv } from './csv.mjs';
import { download } from './exports';

export default function SiteImport<T extends Record<string, unknown>>({ sites, disabled, onPreview, onApply }: { sites: T[]; disabled: boolean; onPreview: (sites: T[]) => Promise<T[]>; onApply: (sites: T[]) => void }) {
  const [text, setText] = useState(''); const [preview, setPreview] = useState<T[] | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const headers = ['site_id', 'requested_litres', 'minimum_useful_litres', 'receiving_limit_litres', 'priority_class', 'confirmation_status'];
  function template() {
    download(encodeCsv([headers, ...sites.map(s => headers.map(key => s[key]))]), 'text/csv;charset=utf-8', 'jalsetu-example-sites.csv');
  }
  async function validate() {
    setBusy(true); setError(''); setPreview(null);
    try { setPreview(await onPreview(mergeSiteCsv(sites, text))); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <details className="panel"><summary>Preview a CSV update to these example points</summary><p className="hint">Updates existing IDs only. Coordinates and travel matrices stay together in the full input. Select both operating rules before validating an import.</p><div className="actions"><button className="secondary" onClick={template}>Download example CSV template</button><label>Read a CSV file locally<input type="file" accept=".csv,text/csv" disabled={busy || disabled} onChange={async e => { const file = e.target.files?.[0]; if (file) { if (file.size > 1024 * 1024) { setError('CSV exceeds the local 1 MB limit'); return; } setText(await file.text()); setPreview(null); setError(''); } }}/></label></div><textarea aria-label="Site CSV content" placeholder="Paste CSV here or select a local file" value={text} onChange={e => { setText(e.target.value); setPreview(null); }}/><button className="secondary" disabled={busy || disabled || !text.trim()} onClick={validate}>{busy ? 'Validating…' : 'Validate CSV preview'}</button>{error && <div className="error" role="alert">{error}</div>}{preview && <div className="table-wrap"><p className="hint">Validated preview shown below. Use the separate Apply button to change the draft.</p><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{preview.map(s => <tr key={String(s.site_id)}>{headers.map(h => <td key={h}>{String(s[h])}</td>)}</tr>)}</tbody></table><div className="actions"><button className="primary" disabled={busy || disabled} onClick={() => { onApply(preview); setPreview(null); }}>Apply validated CSV to draft</button></div></div>}</details>;
}
