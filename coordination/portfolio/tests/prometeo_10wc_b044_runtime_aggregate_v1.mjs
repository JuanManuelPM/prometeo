import assert from 'node:assert/strict';
import { compilePassiveOperationalStats } from '../../../scripts/build-passive-operational-stats.mjs';
import {
  aggregateRequiredSourceFreshness,
  classifyWorkerEvidence,
  validateScoreboardGenerationBinding
} from '../../../current-tree/control-v11/work-score/freshness-model.mjs';

const now = '2026-10-04T16:40:00Z';
const stats = compilePassiveOperationalStats({
  records: [
    { type: 'STARTED', job_id: 'job-1', worker_id: 'wc-a', started_at: '2026-10-04T16:35:00Z', source_ref: 'started.json' },
    { type: 'RETURN', job_id: 'job-1', worker_id: 'wc-a', returned_at: '2026-10-04T16:36:00Z', source_ref: 'return.json' }
  ]
});
assert.equal(stats.units[0].facts.liveness.value, 'RETURN', 'latest terminal lifecycle evidence must beat older STARTED');

const scoreboard = {
  schema: 'prometeo.worker-scoreboard/v1',
  generated_at: '2026-10-04T16:37:00Z',
  launch_measurements: [{ worker_id: 'wc-a' }]
};
const sidecar = {
  schema: 'prometeo.worker-scoreboard-generation-freshness/v1',
  status: 'SOURCE_BOUND',
  scoreboard_generated_at: scoreboard.generated_at,
  source_sha: '0123456789abcdef0123456789abcdef01234567'
};
const binding = validateScoreboardGenerationBinding(scoreboard, sidecar);
assert.equal(binding.status, 'SOURCE_BOUND');
assert.match(binding.truth_boundary, /not read-time freshness/i);

const mixedFreshness = aggregateRequiredSourceFreshness({
  allocator: { generated_at: '2026-10-04T16:39:55Z' },
  scoreboard
}, { now, staleAfterMs: 30_000, required: ['allocator', 'scoreboard'] });
assert.equal(mixedFreshness.per_source.allocator.status, 'FRESH');
assert.equal(mixedFreshness.per_source.scoreboard.status, 'STALE');
assert.equal(mixedFreshness.status, 'STALE', 'fresh allocator must not mask stale scoreboard');
assert.equal(mixedFreshness.stalest_age_ms, 180_000);

const retained = aggregateRequiredSourceFreshness({
  scoreboard: { generated_at: '2026-10-04T16:39:55Z', current_fetch_ok: false, fetch_error: 'HTTP_503' }
}, { now, staleAfterMs: 30_000, required: ['scoreboard'] });
assert.equal(retained.status, 'LAST_GOOD_ERROR');

assert.equal(classifyWorkerEvidence('2026-10-04T16:35:01Z', { now }).contributes_live_capacity, true);
assert.equal(classifyWorkerEvidence('2026-10-04T16:33:30Z', { now }).status, 'STALE_SUSPECT');
assert.equal(classifyWorkerEvidence('2026-10-04T16:29:59Z', { now }).status, 'REPLACEABLE');

console.log('PASS B044 runtime aggregate');
