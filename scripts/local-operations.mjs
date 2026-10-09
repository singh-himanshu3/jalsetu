import { randomUUID, createHash } from 'node:crypto';
import { openStore } from './local-storage.mjs';

export async function operationApi({ path, run, jobs, inputs, send, error, hasPlanningJob }) {
  const store = await openStore(path);
  const draftJobs = new Map();
  let busy = false;
  async function handle(req, res) {
    if (!req.url?.startsWith('/v1/operations') && !['/v1/approvals', '/v1/validate-input'].includes(req.url)) return false;
    if (req.method === 'GET' && req.url === '/v1/operations') {
      send(res, 200, { operations: Object.values(store.state.operations).map(op => ({ operation_id: op.operation_id, name: op.input.name, version: op.version, actor: op.approvals[0].actor })).reverse() }); return true;
    }
    const match = req.url.match(/^\/v1\/operations\/([^/]+)(?:\/(events|replan|approve-revision))?$/);
    if (match && req.method === 'GET' && !match[2]) {
      const operation = store.state.operations[match[1]];
      operation ? send(res, 200, { operation }) : error(res, 404, 'NOT_FOUND', 'Operation not found'); return true;
    }
    if (req.method !== 'POST' || (!match && !['/v1/approvals', '/v1/validate-input'].includes(req.url))) { error(res, 404, 'NOT_FOUND', 'Endpoint not found'); return true; }
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) { error(res, 413, 'INPUT_TOO_LARGE', 'Input exceeds the local 2 MB limit'); return true; }
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString('utf8'); let payload;
    try { payload = JSON.parse(body); if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error(); }
    catch { error(res, 400, 'INVALID_JSON', 'Enter a valid JSON object'); return true; }
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || !key || key.length > 128) { error(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'Request requires an idempotency key'); return true; }
    const hash = createHash('sha256').update(`${req.url}\n${body}`).digest('hex');
    const prior = store.state.requests[key];
    if (prior) {
      prior.hash === hash ? send(res, 200, { operation: store.state.operations[prior.operation_id] }) : error(res, 409, 'IDEMPOTENCY_CONFLICT', 'This key was used with different inputs'); return true;
    }
    const jobPrior = draftJobs.get(key);
    if (jobPrior && jobs.has(jobPrior.job_id)) { jobPrior.hash === hash ? send(res, 202, jobs.get(jobPrior.job_id)) : error(res, 409, 'IDEMPOTENCY_CONFLICT', 'This key was used with different inputs'); return true; }
    if (jobPrior) draftJobs.delete(key);
    if (busy || hasPlanningJob()) { error(res, 429, 'PLANNER_BUSY', 'A local calculation or update is running. Wait, then retry.'); return true; }
    // Read the current version after receiving the body. A slow request may
    // have started before another update committed while its body was arriving.
    const operation = match && store.state.operations[match[1]];
    let message;
    if (req.url === '/v1/validate-input') message = { command: 'validate', input: payload.input };
    else if (req.url === '/v1/approvals') {
      const job = jobs.get(payload.job_id);
      const candidate = job?.plans?.find(p => p.strategy === payload.strategy);
      if (job?.status !== 'completed' || !candidate) { error(res, 409, 'PLAN_NOT_READY', 'Generate and review a completed planning job first'); return true; }
      message = { command: 'approve', input: inputs.get(payload.job_id), plan: candidate, actor: payload.actor, operation_id: randomUUID() };
    } else {
      if (!operation) { error(res, 404, 'NOT_FOUND', 'Operation not found'); return true; }
      if (req.headers['if-match'] !== String(operation.version)) { error(res, 409, 'STALE_VERSION', 'This operation changed. Reload it before another update.'); return true; }
      if (match[2] === 'replan') {
        if (jobs.size >= 50) {
          const oldest = jobs.keys().next().value;
          jobs.delete(oldest); inputs.delete(oldest);
        }
        for (const [requestKey, record] of draftJobs) if (!jobs.has(record.job_id)) draftJobs.delete(requestKey);
        const job = { job_id: randomUUID(), status: 'queued', created_at: new Date().toISOString(), operation_id: operation.operation_id };
        jobs.set(job.job_id, job); draftJobs.set(key, { job_id: job.job_id, hash }); busy = true;
        send(res, 202, job);
        setImmediate(async () => {
          job.status = 'validating_and_solving';
          try {
            const result = await run({ command: 'replan', operation, replan_at: payload.replan_at });
            if (!result.error) {
              const next = { ...operation, revision_draft: result.revision, version: operation.version + 1 };
              await store.commit({ ...store.state, operations: { ...store.state.operations, [next.operation_id]: next } });
              result.operation = next;
            }
            Object.assign(job, result); job.status = result.error ? 'failed' : 'completed';
          } catch { job.status = 'failed'; job.error = { code: 'REPLAN_FAILED', message: 'Revision could not be saved; the approved plan remains available.' }; }
          finally { busy = false; job.completed_at = new Date().toISOString(); }
        });
        return true;
      }
      if (match[2] === 'events') message = { command: 'event', operation, event: { ...payload.event, idempotency_key: key } };
      else if (match[2] === 'approve-revision') message = { command: 'approve_revision', operation, actor: payload.actor };
      else { error(res, 404, 'NOT_FOUND', 'Endpoint not found'); return true; }
    }
    busy = true;
    try {
      const result = await run(message);
      if (result.error) { send(res, 400, result); return true; }
      if (result.operation) {
        const next = result.operation;
        await store.commit({ ...store.state, operations: { ...store.state.operations, [next.operation_id]: next }, requests: { ...store.state.requests, [key]: { hash, operation_id: next.operation_id } } });
      }
      send(res, 200, result); return true;
    } finally { busy = false; }
  }
  return { handle, isBusy: () => busy };
}
