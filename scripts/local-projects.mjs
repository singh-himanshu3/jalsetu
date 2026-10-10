import { randomUUID, createHash } from 'node:crypto';
import { openStore } from './local-storage.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const row = value => object(value) && typeof value.name === 'string' && typeof value.opens_at === 'string' && typeof value.closes_at === 'string';
const validRecordSource = input => input.data_mode !== "operator_entered" || (object(input.operational_source) && typeof input.operational_source.description === "string" && typeof input.operational_source.recorded_date === "string" && typeof input.operational_source.reviewed === "boolean");
const validDraftShape = input => object(input) && validRecordSource(input) && row(input.depot) && object(input.depot.location) && typeof input.operating_date === 'string' && typeof input.display_warning === 'string' && Array.isArray(input.vehicles) && input.vehicles.length <= 5 && input.vehicles.every(row) && Array.isArray(input.sites) && input.sites.length <= 20 && input.sites.every(site => row(site) && object(site.location)) && (input.travel_matrix === null || (object(input.travel_matrix) && typeof input.travel_matrix.provider === 'string' && Array.isArray(input.travel_matrix.limitations)));

export function blankRecords(example) {
  return { ...structuredClone(example), data_mode: 'operator_entered',
    display_warning: 'OPERATOR-ENTERED RECORDS · Source declarations and delivery reports are not independently verified. Roads are estimates; no vehicles are dispatched.',
    service_window_policy: null, loading_mode: null, travel_matrix: null,
    operational_source: { description: '', recorded_date: '', reviewed: false },
    depot: { depot_id: 'DEPOT-1', name: '', location: { longitude: null, latitude: null }, available_stock_litres: null,
      opens_at: '', closes_at: '', loading_duration_minutes: null, potable_supply_confirmed: false, provenance: 'operator_entered' },
    vehicles: [], sites: [] };
}

export async function projectApi({ path, example, send, error }) {
  const store = await openStore(path);
  let busy = false;
  return { async handle(req, res) {
    if (!req.url?.startsWith('/v1/projects')) return false;
    const url = new URL(req.url, 'http://localhost');
    const match = url.pathname.match(/^\/v1\/projects\/([a-zA-Z0-9-]+)(?:\/(archive|restore))?$/);
    if (req.method === 'GET') {
      if (url.pathname === '/v1/projects') send(res, 200, { projects: Object.values(store.state.operations).filter(p => Boolean(p.archived_at) === (url.searchParams.get('archived') === 'true')).map(p => ({ project_id: p.project_id, name: p.input.name, data_mode: p.input.data_mode, version: p.version, updated_at: p.updated_at, archived: Boolean(p.archived_at) })) });
      else if (match && !match[2] && store.state.operations[match[1]]) send(res, 200, { project: store.state.operations[match[1]] });
      else error(res, 404, 'NOT_FOUND', 'Project not found');
      return true;
    }
    if (!['POST', 'PUT'].includes(req.method)) { error(res, 405, 'METHOD_NOT_ALLOWED', 'Use project creation or draft saving'); return true; }
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 2 * 1024 * 1024) { error(res, 413, 'INPUT_TOO_LARGE', 'Project exceeds 2 MB'); return true; } chunks.push(chunk); }
    let payload;
    try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error(); }
    catch { error(res, 400, 'INVALID_JSON', 'Enter a JSON object'); return true; }
    if (busy) { error(res, 429, 'PROJECT_BUSY', 'Another project save is running; retry shortly'); return true; }
    let project, receipt;
    if (req.method === 'POST' && req.url === '/v1/projects') {
      if (typeof payload.name !== 'string' || !payload.name.trim() || payload.name.length > 120 || !['example', 'operator_entered'].includes(payload.data_mode) || !/^\d{4}-\d{2}-\d{2}$/.test(payload.operating_date ?? '') || Number.isNaN(Date.parse(payload.operating_date)) || new Date(payload.operating_date).toISOString().slice(0,10) !== payload.operating_date) { error(res, 400, 'INVALID_PROJECT', 'Enter a project name, valid operating date and supported project type'); return true; }
      const input = payload.data_mode === 'operator_entered' ? blankRecords(example) : structuredClone(example), id = randomUUID();
      input.project_id = id; input.name = payload.name.trim(); input.operating_date = payload.operating_date;
      if (input.data_mode === 'example') for (const row of [input.depot, ...input.vehicles, ...input.sites]) for (const field of ['opens_at', 'closes_at']) row[field] = payload.operating_date + row[field].slice(10);
      project = { project_id: id, version: 1, input, updated_at: new Date().toISOString() };
    } else if (req.method === 'POST' && match?.[2]) {
      const prior = store.state.operations[match[1]];
      if (!prior) { error(res, 404, 'NOT_FOUND', 'Project not found'); return true; }
      const key = req.headers['idempotency-key'];
      if (typeof key !== 'string' || !key || key.length > 128) { error(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'This action needs an idempotency key'); return true; }
      const requestKey = `project:${prior.project_id}:${key}`;
      const hash = createHash('sha256').update(`${url.pathname}\n${JSON.stringify(payload)}`).digest('hex');
      const existing = store.state.requests[requestKey];
      if (existing) { existing.hash === hash ? send(res, 200, { project: prior }) : error(res, 409, 'IDEMPOTENCY_CONFLICT', 'This key was used with different inputs'); return true; }
      if (req.headers['if-match'] !== String(prior.version)) { error(res, 409, 'STALE_VERSION', 'The project changed. Reload it before updating'); return true; }
      project = { ...prior, archived_at: match[2] === 'archive' ? new Date().toISOString() : null, version: prior.version + 1, updated_at: new Date().toISOString() };
      receipt = { key: requestKey, value: { hash, project_id: prior.project_id } };
    } else if (req.method === 'PUT' && match && !match[2]) {
      const prior = store.state.operations[match[1]];
      if (!prior) { error(res, 404, 'NOT_FOUND', 'Project not found'); return true; }
      if (req.headers['if-match'] !== String(prior.version)) { error(res, 409, 'STALE_VERSION', 'The project changed. Reload it before saving'); return true; }
      if (prior.archived_at) { error(res, 409, 'PROJECT_ARCHIVED', 'Restore this archived project before saving'); return true; }
      const input = payload.input;
      if (!validDraftShape(input) || input.project_id !== prior.project_id || input.data_mode !== prior.input.data_mode || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120) { error(res, 400, 'INVALID_PROJECT', 'Draft identity/mode, resource fields or supported resource count is invalid'); return true; }
      project = { ...prior, input, version: prior.version + 1, updated_at: new Date().toISOString() };
    } else { error(res, 404, 'NOT_FOUND', 'Project endpoint not found'); return true; }
    busy = true;
    try { await store.commit({ ...store.state, operations: { ...store.state.operations, [project.project_id]: project }, requests: receipt ? { ...store.state.requests, [receipt.key]: receipt.value } : store.state.requests }); send(res, 200, { project }); }
    finally { busy = false; }
    return true;
  } };
}
