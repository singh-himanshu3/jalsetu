import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { operationApi } from './local-operations.mjs';
import { openStore } from './local-storage.mjs';

const directory = await mkdtemp(join(tmpdir(), 'jalsetu-operation-race-'));
const path = join(directory, 'operations.json');
try {
  const seed = { operation_id: 'TEST', version: 1, events: [] };
  await (await openStore(path)).commit({ schema_version: '1.0', operations: { TEST: seed }, requests: {} });
  const responses = new Map();
  const jobs = new Map();
  const api = await operationApi({ path, jobs, inputs: new Map(), hasPlanningJob: () => false,
    // Isolate the HTTP/version boundary; the actual domain worker has separate integration tests.
    run: async ({ command, operation, event }) => command === 'replan' ? { revision: { test: true } } : ({ operation: { ...operation, version: operation.version + 1, events: [...operation.events, event] } }),
    send: (res, status, body) => responses.set(res, { status, body }),
    error: (res, status, code) => responses.set(res, { status, code }),
  });
  function request(key) {
    const req = new PassThrough();
    req.url = '/v1/operations/TEST/events'; req.method = 'POST';
    req.headers = { 'idempotency-key': key, 'if-match': '1' };
    return req;
  }
  const delayed = request('delayed'), delayedResponse = {};
  const delayedHandling = api.handle(delayed, delayedResponse);
  delayed.write('{"event":');
  // Ensure the delayed request has entered body reception before a second write.
  await new Promise(resolve => setImmediate(resolve));
  const fast = request('fast'), fastResponse = {};
  fast.end(JSON.stringify({ event: { marker: 'newer accepted update' } }));
  await api.handle(fast, fastResponse);
  assert.equal(responses.get(fastResponse).status, 200);
  delayed.end('{"marker":"stale delayed update"}}');
  await delayedHandling;
  assert.equal(responses.get(delayedResponse).status, 409, 'Delayed stale request overwrote a newer update');
  const saved = (await openStore(path)).state.operations.TEST;
  assert.equal(saved.version, 2);
  assert.equal(saved.events.length, 1);
  assert.equal(saved.events[0].marker, 'newer accepted update');
  console.log('Operation race regression passed: a delayed request cannot overwrite an accepted newer version.');
  for (let i = 0; i < 55; i++) {
    const req = request(`revision-${i}`), res = {};
    req.url = '/v1/operations/TEST/replan'; req.headers['if-match'] = String(2 + i);
    req.end('{"replan_at":"explicit test timestamp"}');
    await api.handle(req, res);
    assert.equal(responses.get(res).status, 202);
    while (api.isBusy()) await new Promise(resolve => setImmediate(resolve));
    const revisionJob = jobs.get(responses.get(res).body.job_id);
    assert.equal(revisionJob.status, 'completed', JSON.stringify(revisionJob.error));
  }
  assert.equal(jobs.size, 50, 'Repeated revisions must not grow an unbounded job cache');
  console.log('Revision-cache regression passed: completed revision jobs remain bounded to 50 records.');
} finally {
  await rm(path, { force: true }); await rm(`${path}.next`, { force: true }); await rmdir(directory);
}
