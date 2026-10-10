import http from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, delimiter } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { operationApi } from './local-operations.mjs';
import { projectApi } from './local-projects.mjs';
import { localWeb } from './local-web.mjs';
import { recordsApi, storedRoads } from './local-records.mjs';

const root = resolve(import.meta.dirname, '..');
const serveWeb = process.argv.includes('--serve-web');
const port = Number(process.env.JALSETU_PORT ?? 8787);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('JALSETU_PORT must be a valid port number');
const stateDirectory = resolve(root, process.env.JALSETU_STATE_DIR ?? 'local-state');
let web;
if (serveWeb) {
  try { web = await localWeb(resolve(root, 'apps/web/dist')); }
  catch (error) { console.error(error.message); process.exit(1); }
}
const python = [process.env.JALSETU_PYTHON, resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'), resolve(root, '../../work/jalsetu-venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')].filter(Boolean).find(existsSync);
if (!python) throw new Error('Create .venv or set JALSETU_PYTHON');
const jobs = new Map();
const requests = new Map();
const inputs = new Map();
let activeJob = null;
const workers = new Set();
async function run(message, onStage) {
  const input = message.input ?? message.operation?.input;
  if (input?.data_mode === 'operator_entered') {
    onStage = null;
    message = { ...message, command: message.command ?? (message.kind === 'marginal' ? 'marginal' : 'compare'), road_snapshot: await storedRoads(resolve(stateDirectory, 'roads'), input) };
  }
  return new Promise((resolvePromise, reject) => {
    const child = spawn(python, ['-m', onStage ? 'cloud.offline' : 'jalsetu_planner.bridge', ...(!onStage ? ['--local-records'] : [])], { cwd: root, env: { ...process.env, OPENBLAS_NUM_THREADS: '1', OMP_NUM_THREADS: '1', MKL_NUM_THREADS: '1', NUMEXPR_NUM_THREADS: '1', PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', PYTHONPATH: [resolve(root, 'services/planner'), resolve(root, 'services'), process.env.PYTHONPATH].filter(Boolean).join(delimiter) }, stdio: ['pipe', 'pipe', 'pipe'] });
    workers.add(child);
    let output = '';
    child.stdout.setEncoding('utf8');
    const timer = setTimeout(() => { child.kill(); reject(new Error('WORKER_TIMEOUT')); }, 90_000);
    child.stdout.on('data', chunk => { output += chunk; });
    let progress = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => {
      if (!onStage) return;
      progress += chunk;
      const lines = progress.split('\n'); progress = lines.pop();
      if (progress.length > 64_000) progress = '';
      for (const line of lines) {
        try { const value = JSON.parse(line); if (value.status && Array.isArray(value.stage_history)) onStage(value); } catch { /* Discard worker diagnostics. */ }
      }
    });
    child.stdin.on('error', () => {});
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      workers.delete(child);
      clearTimeout(timer);
      if (code !== 0) return reject(new Error('WORKER_FAILED'));
      try { resolvePromise(JSON.parse(output)); } catch { reject(new Error('INVALID_WORKER_RESPONSE')); }
    });
    child.stdin.end(JSON.stringify(message));
  });
}
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}
function error(res, status, code, message) { send(res, status, { error: { code, message, correlation_id: randomUUID() } }); }
const example = await run({ command: 'example' });
const records = recordsApi({ directory: resolve(stateDirectory, 'roads'), run, send, error });
const projects = await projectApi({ path: resolve(stateDirectory, 'projects.json'), example, send, error });
const operations = await operationApi({ path: process.env.JALSETU_LOCAL_STATE ? resolve(root, process.env.JALSETU_LOCAL_STATE) : resolve(stateDirectory, 'operations.json'), run, jobs, inputs, send, error, hasPlanningJob: () => Boolean(activeJob) });
const server = http.createServer(async (req, res) => {
  try {
    if (web && !req.url?.startsWith('/v1/')) return web(req, res);
    if (await records.handle(req, res)) return;
    if (await projects.handle(req, res)) return;
    if (await operations.handle(req, res)) return;
    if (req.method === 'GET' && req.url === '/v1/health') return send(res, 200, { mode: 'offline_fixture', authentication: 'loopback-only local application', cloud_deployed: false, frontend: serveWeb ? 'built' : 'development' });
    if (req.method === 'GET' && req.url === '/v1/example') return send(res, 200, example);
    if (req.method === 'GET' && req.url?.startsWith('/v1/planning-jobs/')) {
      const job = jobs.get(req.url.slice('/v1/planning-jobs/'.length));
      return job ? send(res, 200, job) : error(res, 404, 'NOT_FOUND', 'Planning job not found');
    }
    if (req.method !== 'POST' || req.url !== '/v1/planning-jobs') return error(res, 404, 'NOT_FOUND', 'Endpoint not found');
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) return error(res, 413, 'INPUT_TOO_LARGE', 'Input exceeds the local 2 MB limit');
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString('utf8');
    let parsed;
    try {
      parsed = JSON.parse(body);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    } catch { return error(res, 400, 'INVALID_JSON', 'Enter a valid JSON object'); }
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || key.length > 128 || !key.length) return error(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'Request requires an idempotency key');
    const hash = createHash('sha256').update(body).digest('hex');
    const existing = requests.get(key);
    if (existing && jobs.has(existing.id)) return existing.hash === hash ? send(res, 202, jobs.get(existing.id)) : error(res, 409, 'IDEMPOTENCY_CONFLICT', 'This key was already used with different inputs');
    if (existing) requests.delete(key); // Its bounded-cache job has expired.
    if (activeJob || operations.isBusy()) return error(res, 429, 'PLANNER_BUSY', 'The local planner is busy. Wait for the current job, then retry.');
    if (!['comparison', 'marginal'].includes(parsed.kind ?? 'comparison')) return error(res, 400, 'INVALID_JOB_KIND', 'Choose comparison or marginal analysis');
    let parentInput;
    if (parsed.kind === 'marginal') {
      const parent = jobs.get(parsed.parent_job_id);
      parentInput = inputs.get(parsed.parent_job_id);
      if (parent?.status !== 'completed' || !parent.plans || !parentInput) return error(res, 409, 'PLAN_NOT_READY', 'Generate a comparison before resource analysis');
    }
    if (jobs.size >= 50) {
      const oldest = jobs.keys().next().value;
      jobs.delete(oldest);
      inputs.delete(oldest);
      for (const [requestKey, record] of requests) if (record.id === oldest) requests.delete(requestKey);
    }
    const job = { job_id: randomUUID(), status: 'queued', mode: 'offline_fixture', created_at: new Date().toISOString() };
    jobs.set(job.job_id, job);
    inputs.set(job.job_id, parsed.input);
    requests.set(key, { id: job.job_id, hash });
    activeJob = job.job_id;
    send(res, 202, job);
    setImmediate(async () => {
      try {
        const result = await run({ input: parsed.input, job_id: job.job_id, kind: parsed.kind, options: parsed.options, parent_job_id: parsed.parent_job_id, parent_input: parentInput }, progress => {
          // Terminal status and published plans arrive together on stdout.
          if (!['completed', 'failed'].includes(progress.status)) Object.assign(job, progress);
        });
        job.status = result.error ? 'failed' : 'completed';
        Object.assign(job, result);
      } catch { job.status = 'failed'; job.error = { code: 'PLANNER_FAILED', message: 'Planning failed or timed out. No unvalidated plan was published.' }; }
      finally { job.completed_at = new Date().toISOString(); job.end_to_end_runtime_seconds = (Date.parse(job.completed_at) - Date.parse(job.created_at)) / 1000; activeJob = null; }
    });
  } catch { error(res, 500, 'LOCAL_API_FAILED', 'The local API could not complete this request'); }
});
server.listen(port, '127.0.0.1', () => console.log(`JalSetu ${serveWeb ? 'app' : 'local API'}: http://127.0.0.1:${server.address().port} (no AWS calls)`));
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Stop the existing JalSetu server before starting another copy.` : 'Could not start local API'); process.exit(1); });
function stop() { for (const child of workers) child.kill(); server.close(); process.exit(0); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
