import assert from 'node:assert/strict';
import { projectClockTime, formatClockTime, buildClockTimeTicks } from '../../../current-tree/control-v11/work-score/clock-time-projection-geometry.mjs';

const domain = {
  startMs: Date.parse('2026-10-04T15:00:00Z'),
  endMs: Date.parse('2026-10-04T16:00:00Z')
};

assert.equal(projectClockTime('2026-10-04T15:30:00Z', domain), 50);
assert.equal(projectClockTime('2026-10-04T14:00:00Z', domain), 0);
assert.equal(projectClockTime('2026-10-04T17:00:00Z', domain), 100);
assert.equal(formatClockTime('2026-10-04T15:00:00Z', { timeZone: 'UTC' }), '15:00');
assert.equal(formatClockTime('2026-10-04T15:00:00Z', { timeZone: 'America/Argentina/Buenos_Aires' }), '12:00');
assert.deepEqual(
  buildClockTimeTicks(domain, 3, { timeZone: 'UTC' }).map(x => [x.leftPct, x.label]),
  [[0, '15:00'], [50, '15:30'], [100, '16:00']]
);
assert.equal(projectClockTime('bad', domain), null);

console.log('PASS B006 clock-time geometry');
