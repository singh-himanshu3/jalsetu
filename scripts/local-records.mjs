import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Pydantic writes UTC as Z; equivalent +00:00 input must find the same snapshot.
export const roadKey = matrix => createHash('sha256').update(JSON.stringify([matrix?.snapshot_id,
  typeof matrix?.retrieved_at === 'string' ? matrix.retrieved_at.replace(/\+00:00$/, 'Z') : null])).digest('hex');
export async function storedRoads(directory, input) {
  if (input?.data_mode !== 'operator_entered' || !input.travel_matrix) return null;
  try { return JSON.parse(await readFile(join(directory, `${roadKey(input.travel_matrix)}.json`), 'utf8')); }
  catch { return null; }
}

export function recordsApi({ directory, run, send, error }) {
  let busy = false, lastAttempt = 0;
  return { async handle(req, res) {
    if (!['/v1/records/review', '/v1/records/roads'].includes(req.url)) return false;
    if (req.method !== 'POST') { error(res, 405, 'METHOD_NOT_ALLOWED', 'Use the record review form'); return true; }
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) { error(res, 413, 'INPUT_TOO_LARGE', 'Records exceed the 2 MB limit'); return true; }
      chunks.push(chunk);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error(); }
    catch { error(res, 400, 'INVALID_RECORDS', 'Use the record review form'); return true; }
    const fetchRoads = req.url.endsWith('/roads');
    if (fetchRoads && body.allow_coordinate_sharing !== true) { error(res, 400, 'SHARING_REQUIRED', 'Confirm that these locations may be sent to the public road provider'); return true; }
    if (busy || (fetchRoads && Date.now() - lastAttempt < 2000)) { error(res, 429, 'ROAD_BUSY', 'Wait for the current review, then retry'); return true; }
    busy = true;
    if (fetchRoads) lastAttempt = Date.now();
    try {
      const result = await run({ command: fetchRoads ? 'fetch_roads' : 'review_records', input: body.input });
      if (result.error) { send(res, 400, result); return true; }
      if (fetchRoads) {
        await mkdir(directory, { recursive: true });
        const path = join(directory, `${roadKey(result.input.travel_matrix)}.json`);
        try { await writeFile(path, JSON.stringify(result.road_snapshot), { encoding: 'utf8', flag: 'wx' }); }
        catch (err) { if (err.code !== 'EEXIST' || await readFile(path, 'utf8') !== JSON.stringify(result.road_snapshot)) throw err; }
      }
      send(res, 200, { input: result.input });
    } catch { error(res, 503, 'ROADS_UNAVAILABLE', 'Could not save checked roads. Your draft is unchanged; no sample estimates were substituted.'); }
    finally { busy = false; }
    return true;
  } };
}
