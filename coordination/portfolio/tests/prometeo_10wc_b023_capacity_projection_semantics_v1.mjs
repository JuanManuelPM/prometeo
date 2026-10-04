import assert from 'node:assert/strict';
import {
  requiredNow,
  isFreshDurableWorkerEvidence,
  countFreshAvailableWorkers,
  deriveCapacityProjectionBase
} from '../../../current-tree/control-v11/work-score/capacity-projection-semantics.mjs';

const now = Date.parse('2026-10-04T16:30:00Z');
const spans = [
  { actor_kind: 'worker', actor_id: 'w1', batch_id: 'BATCH-X', status: 'OBSERVED_WORKING', last_activity_at: '2026-10-04T16:29:00Z' },
  { actor_kind: 'worker', actor_id: 'w2', batch_id: 'BATCH-X', status: 'LAUNCHED', start_at: '2026-10-04T16:20:00Z' },
  { actor_kind: 'worker', actor_id: 'w2', batch_id: 'BATCH-X', status: 'OBSERVED_WORKING', last_activity_at: '2026-10-04T16:28:00Z' },
  { actor_kind: 'worker', actor_id: 'w3', batch_id: 'BATCH-X', status: 'ACTIVE', last_activity_at: '2026-10-04T16:29:30Z' },
  { actor_kind: 'worker', actor_id: 'w4', batch_id: 'BATCH-X', status: 'OBSERVED_WORKING', last_activity_at: '2026-10-04T16:00:00Z' },
  { actor_kind: 'worker', actor_id: 'other', batch_id: 'OTHER', status: 'OBSERVED_WORKING', last_activity_at: '2026-10-04T16:29:00Z' }
];

assert.equal(requiredNow({ target: 10, readyCount: 4, workingCount: 3 }), 7);
assert.equal(requiredNow({ target: 5, readyCount: 9, workingCount: 3 }), 5);
assert.equal(requiredNow({ target: -1, readyCount: 2, workingCount: 2 }), 0);
assert.equal(isFreshDurableWorkerEvidence(spans[0], { nowMs: now, batchId: 'BATCH-X' }), true);
assert.equal(isFreshDurableWorkerEvidence(spans[3], { nowMs: now, batchId: 'BATCH-X' }), false);
assert.equal(isFreshDurableWorkerEvidence(spans[4], { nowMs: now, batchId: 'BATCH-X' }), false);
assert.equal(countFreshAvailableWorkers(spans, { nowMs: now, batchId: 'BATCH-X' }), 2);

assert.deepEqual(
  deriveCapacityProjectionBase({
    target: 10,
    readyCount: 4,
    workingCount: 3,
    workerSpans: spans,
    nowMs: now,
    batchId: 'BATCH-X'
  }),
  {
    authority: 'DERIVED_PROJECTION_ONLY',
    target_wc: 10,
    required_now: 7,
    fresh_available_wc: 2,
    fresh_available_wc_rule: 'fresh durable worker evidence only; old ACTIVE/PARKED labels are not liveness',
    downstream_formula_owner: 'B024_RESERVE_MISSING_REFILL'
  }
);

console.log('PASS B023 capacity projection semantics');
