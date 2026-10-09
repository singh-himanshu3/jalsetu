import { useState } from 'react';
import { api, postOptions } from './api';

export type Project<T> = { project_id: string; version: number; input: T; updated_at: string; archived_at?: string | null };
export default function Projects<T>({ busy, onOpen, onArchive }: { busy: boolean; onOpen: (project: Project<T>) => void; onArchive: (id: string) => void }) {
  const [name, setName] = useState(''); const [day, setDay] = useState(''); const [mode, setMode] = useState('');
  const [ack, setAck] = useState(false); const [working, setWorking] = useState(false); const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [saved, setSaved] = useState<{ project_id: string; name: string; version: number; data_mode: string; archived?: boolean }[]>([]);
  async function create() {
    setWorking(true); setError('');
    try { onOpen((await api<{ project: Project<T> }>('/v1/projects', postOptions({ name, operating_date: day, data_mode: mode }))).project); }
    catch (e) { setError((e as Error).message); } finally { setWorking(false); }
  }
  async function list(archived = showArchived) { setWorking(true);setError(''); try { const result = await api<{ projects: typeof saved }>(archived ? '/v1/projects?archived=true' : '/v1/projects'); setShowArchived(archived); setSaved(result.projects); if (!result.projects.length) setError(archived ? 'No archived projects.' : 'No active saved projects. Create an example or restore an archived project.'); } catch(e) { setError((e as Error).message); }finally{setWorking(false);} }
  async function open(id: string) { setWorking(true); setError(''); try { onOpen((await api<{ project: Project<T> }>(`/v1/projects/${id}`)).project); } catch(e) { setError((e as Error).message); } finally { setWorking(false); } }
  async function changeState(project: typeof saved[number], action: 'archive' | 'restore') {
    setWorking(true); setError('');
    try { await api(`/v1/projects/${project.project_id}/${action}`, postOptions({}, project.version)); if (action === 'archive') onArchive(project.project_id); await list(); }
    catch(e) { setError((e as Error).message); } finally { setWorking(false); }
  }
  return <section className="panel"><h3>Create or reopen a project</h3><p className="hint">The team selected an example-only hackathon deployment. Public context does not create requests or establish resources.</p>
    <fieldset className="input-scope" disabled={busy || working}><div className="form-grid"><label>Project name<input maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><label>Operating date · IST<input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label><label>Data mode<select value={mode} onChange={e=>setMode(e.target.value)}><option value="">Choose data mode</option><option value="example">Published synthetic example</option></select></label></div>
    <label className="ack"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/> I understand this project starts with published synthetic resources, sites and travel estimates.</label>
    <div className="actions"><button className="primary" disabled={!name.trim() || !day || mode !== 'example' || !ack} onClick={create}>Create example project</button><button className="secondary" onClick={()=>list(false)}>Open saved projects</button><button className="secondary" onClick={()=>list(true)}>Open archived projects</button></div></fieldset>
    <p className="hint">Archiving hides a saved draft and can be undone here. Approved operations and delivery reports remain available in Operations.</p>
    {working&&<p role="status">Processing project request…</p>}
    {error && <p role="status" className="explanation">{error}</p>}
    {saved.map(p=><div className="actions" key={p.project_id}>{p.archived ? <span>{p.name} · archived · version {p.version}</span> : <button className="secondary" disabled={busy || working} onClick={()=>open(p.project_id)}>{p.name} · {p.data_mode} · version {p.version}</button>}<button className="secondary" aria-label={`${p.archived ? 'Restore' : 'Archive'} ${p.name}`} disabled={busy || working} onClick={()=>changeState(p,p.archived ? 'restore' : 'archive')}>{p.archived ? 'Restore project' : 'Archive project'}</button></div>)}
  </section>;
}
