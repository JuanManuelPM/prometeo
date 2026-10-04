import assert from 'node:assert/strict';
import {
  deriveRunRelativeDomain,
  projectRunRelativeTime,
  projectRunRelativeSpan,
  buildRunRelativeTicks
} from '../../../current-tree/control-v11/work-score/run-relative-time-geometry.mjs';

const minute = 60_000;
const now = Date.parse('2026-10-04T16:20:00Z');
const spans = [
  { start_at: '2026-10-04T16:00:00Z', end_at: '2026-10-04T16:04:00Z' },
  { start_at: '2026-10-04T16:05:00Z', last_activity_at: '2026-10-04T16:19:00Z' },
  { start_at: 'not-a-date', end_at: '2026-10-04T16:20:00Z' }
];

const domain = deriveRunRelativeDomain(spans, { nowMs: now });
assert.equal(domain.source, 'RUN_OBSERVED');
assert.equal(domain.startMs, Date.parse('2026-10-04T16:00:00Z'));
assert.equal(domain.endMs, now);
assert.equal(domain.durationMs, 20 * minute);
assert.equal(domain.observedSpanCount, 2);
assert.equal(projectRunRelativeTime('2026-10-04T16:00:00Z', domain), 0);
assert.equal(projectRunRelativeTime('2026-10-04T16:10:00Z', domain), 50);
assert.equal(projectRunRelativeTime('2026-10-04T16:20:00Z', domain), 100);
assert.equal(projectRunRelativeTime('2026-10-04T15:00:00Z', domain), 0);
assert.equal(projectRunRelativeTime('2026-10-04T17:00:00Z', domain), 100);
assert.deepEqual(projectRunRelativeSpan({ start_at: '2026-10-04T16:05:00Z', end_at: '2026-10-04T16:15:00Z' }, domain), {
  leftPct: 25,
  rightPct: 75,
  widthPct: 50
});
assert.deepEqual(buildRunRelativeTicks(domain, 3).map(t => [t.leftPct, t.label]), [[0, '0m'], [50, '10m'], [100, '20m']]);

const fallback = deriveRunRelativeDomain([], { nowMs: now, fallbackWindowMs: 30 * minute });
assert.equal(fallback.source, 'FALLBACK_WINDOW');
assert.equal(fallback.startMs, now - 30 * minute);
assert.equal(fallback.endMs, now);
assert.equal(fallback.observedSpanCount, 0);

const min = deriveRunRelativeDomain([{ start_at: now }], { nowMs: now, minWindowMs: 2 * minute });
assert.equal(min.durationMs, 2 * minute);
assert.equal(projectRunRelativeTime(now + minute, min), 50);

console.log('PASS B005 run-relative geometry');
