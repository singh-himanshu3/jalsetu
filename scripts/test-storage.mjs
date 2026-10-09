import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from './local-storage.mjs';

const directory = await mkdtemp(join(tmpdir(), 'jalsetu-storage-test-'));
const path = join(directory, 'operations.json');
try {
  const store = await openStore(path);
  const state = { schema_version: '1.0', operations: { TEST: { version: 1, events: [{ payload: 'पानी' }] } }, requests: {} };
  await store.commit(state);
  assert.deepEqual((await openStore(path)).state, state, 'Restart must read the saved event state');
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), state);
  for (const invalid of ['{broken', 'null', '{"schema_version":"1.0","operations":[],"requests":{}}', '{"schema_version":"2.0","operations":{},"requests":{}}']) {
    await writeFile(path, invalid, 'utf8');
    await assert.rejects(openStore(path));
    assert.equal(await readFile(path, 'utf8'), invalid, 'Corrupt storage must be preserved, never silently reset');
  }
  console.log('Local storage checks passed: atomic commit, restart, Unicode and preservation/rejection of corrupt files.');
} finally {
  // These are the two explicit files created in this uniquely named test folder.
  await rm(path, { force: true }); await rm(`${path}.next`, { force: true }); await rmdir(directory);
}
