import assert from 'node:assert/strict';
import { istLocalValue, istStamp } from '../apps/web/src/date-time.ts';

// API timestamps must retain their instant regardless of the browser's zone.
for (const zone of ['UTC','America/New_York','Asia/Kolkata']) {
  process.env.TZ=zone;
  assert.equal(istLocalValue('2026-10-09T18:30:00Z'),'2026-10-10T00:00:00');
  assert.equal(istLocalValue('2026-10-10T01:30:45Z'),'2026-10-10T07:00:45');
  const edited=istStamp('2026-10-10T07:00:45');
  assert.equal(new Date(edited).toISOString(),'2026-10-10T01:30:45.000Z');
  assert.equal(istLocalValue(edited),'2026-10-10T07:00:45');
}
assert.equal(istStamp('2026-10-10T07:00'),'2026-10-10T07:00:00+05:30');
assert.equal(istLocalValue(''),'');
assert.equal(istLocalValue('not a timestamp'),'');
assert.equal(istStamp(''),'');
assert.equal(istStamp('2026-10-10T07:00Z'),'');
console.log('Report pickers preserve IST dates, midnight and seconds across three browser time zones.');
