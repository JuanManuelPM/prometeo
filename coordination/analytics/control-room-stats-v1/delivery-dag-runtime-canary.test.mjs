import assert from 'node:assert/strict';
import { evaluateDeliveryDagRuntimeCanary } from './delivery-dag-runtime-canary.mjs';

const overlap = evaluateDeliveryDagRuntimeCanary({
  producer: {
    delivery_unit_ref: 'delivery:fixture:1',
    started_at: '2026-10-01T00:00:00Z',
    completed_at: '2026-10-01T00:00:10Z'
  },
  qa_precompile: {
    delivery_unit_ref: 'delivery:fixture:1',
    started_at: '2026-10-01T00:00:04Z',
    completed_at: '2026-10-01T00:00:12Z'
  },
  promotion: {
    qa_precompile_advisory_only: true,
    blocker_result: 'FAIL',
    promotion_ready: true,
    reversible_candidate_usable: true,
    collisions: 1,
    retries: 2
  }
});
assert.equal(overlap.runtime.status, 'COMPARABLE_RUNTIME_OVERLAP_OBSERVED');
assert.equal(overlap.runtime.overlap_ms, 6000);
assert.equal(overlap.runtime.serial_baseline_ms, 18000);
assert.equal(overlap.runtime.critical_path_ms, 12000);
assert.equal(overlap.runtime.reduction_vs_serial_ratio, 1 / 3);
assert.equal(overlap.promotion_semantics.qa_precompile_in_promotion_fan_in, false);
assert.equal(overlap.promotion_semantics.promotion_ready, false, 'a real blocker failure must dominate a stale promotion_ready=true input');
assert.equal(overlap.promotion_semantics.blocker_preserves_candidate, true);
assert.equal(overlap.collision_retry_evidence.truth, 'OBSERVED');

const unrelated = evaluateDeliveryDagRuntimeCanary({
  producer: {
    delivery_unit_ref: 'delivery:producer-only',
    started_at: '2026-10-01T00:00:00Z',
    completed_at: '2026-10-01T00:00:10Z'
  },
  qa_precompile: {
    started_at: '2026-10-01T00:00:04Z',
    completed_at: '2026-10-01T00:00:12Z'
  },
  promotion: {
    qa_precompile_advisory_only: true,
    blocker_result: 'PASS',
    reversible_candidate_usable: true
  }
});
assert.equal(unrelated.runtime.status, 'INSUFFICIENT_COMPARABLE_RUNTIME_EVIDENCE');
assert.equal(unrelated.runtime.comparable_relation, false);
assert.equal(unrelated.runtime.overlap_ms, null, 'wall-clock coincidence without explicit lineage must never become an overlap claim');
assert.equal(unrelated.promotion_semantics.qa_precompile_in_promotion_fan_in, false);
assert.equal(unrelated.collision_retry_evidence.truth, 'UNKNOWN_WHEN_NO_BOUND_DURABLE_COUNTERS');

const missingEndpoint = evaluateDeliveryDagRuntimeCanary({
  producer: {
    delivery_unit_ref: 'delivery:fixture:2',
    started_at: '2026-10-01T00:00:00Z'
  },
  qa_precompile: {
    delivery_unit_ref: 'delivery:fixture:2',
    started_at: '2026-10-01T00:00:04Z',
    completed_at: '2026-10-01T00:00:12Z'
  }
});
assert.equal(missingEndpoint.runtime.status, 'INSUFFICIENT_COMPARABLE_RUNTIME_EVIDENCE');
assert.equal(missingEndpoint.runtime.reason, 'COMPARABLE_RELATION_EXISTS_BUT_DURABLE_START_OR_COMPLETE_ENDPOINT_IS_MISSING');

console.log('DELIVERY_DAG_RUNTIME_CANARY_PASS');
