import assert from 'node:assert/strict';
import { compilePassiveOperationalStats } from '../../../scripts/build-passive-operational-stats.mjs';
import { projectSourceFreshness, scoreRowsWhenFresh } from '../../../current-tree/control-v11/work-score/runtime-freshness.mjs';

const stats = compilePassiveOperationalStats({
  records: [
    { type: 'STARTED', job_id: 'job-1', worker_id: 'wc-test', started_at: '2026-10-04T16:00:00Z', source_ref: 'started.json' },
    { type: 'HEARTBEAT', job_id: 'job-1', worker_id: 'wc-test', at: '2026-10-04T16:00:30Z', source_ref: 'heartbeat.json' },
    { type: 'RETURN', job_id: 'job-1', worker_id: 'wc-test', returned_at: '2026-10-04T16:01:00Z', source_ref: 'return.json' }
  ]
});
assert.equal(stats.units.length, 1);
assert.equal(stats.units[0].facts.liveness.value, 'RETURN');
assert.deepEqual(stats.units[0].facts.liveness.source_refs, ['return.json']);

const now = Date.parse('2026-10-04T16:03:00Z');
const mixed = projectSourceFreshness({
  allocator: { generated_at: '2026-10-04T16:02:55Z' },
  scoreboard: { generated_at: '2026-10-04T16:00:00Z' }
}, { now_ms: now, max_age_ms: 30_000, required: ['allocator', 'scoreboard'] });
assert.equal(mixed.sources.allocator.fresh, true);
assert.equal(mixed.sources.scoreboard.fresh, false);
assert.equal(mixed.all_required_fresh, false);
assert.deepEqual(mixed.stale_sources, ['scoreboard']);
assert.equal(mixed.newest_required_generated_at, '2026-10-04T16:02:55.000Z');
assert.equal(mixed.oldest_required_generated_at, '2026-10-04T16:00:00.000Z');

const staleScore = { generated_at: '2026-10-04T16:00:00Z', launch_measurements: [{ worker_id: 'wc-stale' }] };
assert.deepEqual(scoreRowsWhenFresh(staleScore, { now_ms: now, max_age_ms: 30_000 }), []);
const freshScore = { generated_at: '2026-10-04T16:02:55Z', launch_measurements: [{ worker_id: 'wc-fresh' }] };
assert.equal(scoreRowsWhenFresh(freshScore, { now_ms: now, max_age_ms: 30_000 })[0].worker_id, 'wc-fresh');

console.log('PASS B033 passive stats + per-source freshness');
