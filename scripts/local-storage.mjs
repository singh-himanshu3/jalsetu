import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function openStore(path) {
  await mkdir(dirname(path), { recursive: true });
  let state;
  try { state = JSON.parse(await readFile(path, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Local operation file could not be read. Preserve it and inspect it before restarting.');
    state = { schema_version: '1.0', operations: {}, requests: {} };
  }
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!record(state) || state.schema_version !== '1.0' || !record(state.operations) || !record(state.requests)) throw new Error('Unsupported local operation file');
  return {
    get state() { return state; },
    async commit(next) {
      const temporary = `${path}.next`;
      await writeFile(temporary, JSON.stringify(next, null, 2), 'utf8');
      await rename(temporary, path);
      state = next;
    },
  };
}
