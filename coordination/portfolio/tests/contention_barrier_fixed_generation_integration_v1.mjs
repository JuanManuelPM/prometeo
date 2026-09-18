import assert from 'node:assert/strict';
import { buildFastAllocator } from '../../../scripts/build-fast-allocator.mjs';
import { applyContentionBarrierRouting } from '../../../scripts/apply-fast-allocator-contention-barriers.mjs';

const jobId = 'synthetic-fixed-contention-fixture';
const policy = {
  schema: 'prometeo.portfolio-recovery-policy/v1',
  job_id: jobId,
  mode: 'fixed_generation',
  fixed_generation: 1,
  ordinary_next_generation_eligible: false,
  attention_route: 'FIXED_GENERATION_RECONCILE',
  attention_until: { metric: 'collision_count', gte: 4 }
};

const feed = job => ({
  generated_at: '2026-09-17T21:00:30Z',
  source_sha: 'synthetic-source',
  projects: [{ label: 'Synthetic', jobs: [job] }],
  plans: [],
  summary: { workers: {} }
});

const fixedJob = overrides => ({
  job_id: jobId,
  dedupe_key: 'synthetic:fixed-contention',
  project_id: 'synthetic',
  title: 'Synthetic fixed contention fixture',
  priority: 100,
  state: 'ready',
  pin_generation: 0,
  collision_count: 0,
  ...overrides
});

const barrierRow = release => ({
  fixture_id: 'synthetic-fixed-barrier',
  job_id: jobId,
  barrier_ref: 'coordination/portfolio/contention_barriers/synthetic-fixed-barrier/BARRIER.json',
  release_ref: 'coordination/portfolio/contention_barriers/synthetic-fixed-barrier/RELEASE.json',
  barrier: {
    schema: 'prometeo.portfolio-contention-barrier/v1',
    contention_barrier_mode: true,
    fixture_id: 'synthetic-fixed-barrier',
    job_id: jobId,
    required_contenders: 5,
    opened_at: '2026-09-17T21:00:00Z',
    deadline_at: '2026-09-17T21:02:00Z'
  },
  release
});

const base = buildFastAllocator(feed(fixedJob()), {}, { recoveryPolicies: [policy] });
assert.equal(base.ready.length, 1);
assert.equal(base.ready[0].claim_generation_mode, 'FIXED');
assert.equal(base.ready[0].next_generation, 1);
assert.match(base.ready[0].claim_path, /G000001\.json$/);
assert.equal(base.recovery.length, 0);

const armed = applyContentionBarrierRouting(base, [barrierRow(null)], '2026-09-17T21:00:30Z');
assert.equal(armed.ready[0].claim_mode, 'PORTFOLIO_BARRIER_ENTER');
assert.equal(armed.ready[0].claim_payload_shape.grants_execution_authority, false);
assert.equal(armed.ready[0].post_release_claim.claim_generation_mode, 'FIXED');
assert.equal(armed.ready[0].post_release_claim.next_generation, 1);
assert.match(armed.ready[0].post_release_claim.claim_path, /G000001\.json$/);

const release = {
  schema: 'prometeo.portfolio-contention-release/v1',
  fixture_id: 'synthetic-fixed-barrier',
  released_at: '2026-09-17T21:00:45Z',
  required_contenders: 5,
  entrant_worker_ids: ['w1', 'w2', 'w3', 'w4', 'w5'],
  grants_execution_authority: false,
  next_action: 'RACE_DETERMINISTIC_PIN'
};
const released = applyContentionBarrierRouting(base, [barrierRow(release)], '2026-09-17T21:00:50Z');
assert.equal(released.ready[0].claim_mode, 'PORTFOLIO_BARRIER_RELEASED');
assert.equal(released.ready[0].claim_path, null);
assert.equal(released.ready[0].post_release_claim.claim_generation_mode, 'FIXED');
assert.equal(released.ready[0].post_release_claim.next_generation, 1);
assert.match(released.ready[0].post_release_claim.claim_path, /G000001\.json$/);
assert.deepEqual(released.ready[0].contention_barrier.entrant_worker_ids, ['w1', 'w2', 'w3', 'w4', 'w5']);

const timedOut = applyContentionBarrierRouting(base, [barrierRow(null)], '2026-09-17T21:03:00Z');
assert.equal(timedOut.ready[0].claim_mode, 'PORTFOLIO_BARRIER_TIMEOUT');
assert.equal(timedOut.ready[0].claim_payload_shape.pin_attempted, false);
assert.equal(timedOut.ready[0].post_release_claim, null);

const incomplete = buildFastAllocator(feed(fixedJob({ state: 'done', pin_generation: 1, collision_count: 3 })), {}, { recoveryPolicies: [policy] });
assert.equal(incomplete.ready.length, 0);
assert.equal(incomplete.recovery.length, 0);
assert.equal(incomplete.fixed_generation_attention.length, 1);
assert.equal(incomplete.fixed_generation_attention[0].fixed_generation, 1);
assert.equal(incomplete.fixed_generation_attention[0].ordinary_next_generation_eligible, false);

const complete = buildFastAllocator(feed(fixedJob({ state: 'done', pin_generation: 1, collision_count: 4 })), {}, { recoveryPolicies: [policy] });
assert.equal(complete.ready.length, 0);
assert.equal(complete.recovery.length, 0);
assert.equal(complete.fixed_generation_attention.length, 0);

const ordinaryReady = buildFastAllocator(feed({ ...fixedJob(), job_id: 'ordinary-ready', dedupe_key: 'ordinary:ready' }), {}, { recoveryPolicies: [] });
const ordinaryRouted = applyContentionBarrierRouting(ordinaryReady, [], '2026-09-17T21:00:30Z');
assert.equal(ordinaryRouted.ready[0].claim_mode, 'PORTFOLIO_PIN_CREATE');
assert.match(ordinaryRouted.ready[0].claim_path, /G000001\.json$/);

const ordinaryRecovery = buildFastAllocator(feed({ ...fixedJob(), job_id: 'ordinary-recovery', dedupe_key: 'ordinary:recovery', state: 'replaceable', pin_generation: 1 }), {}, { recoveryPolicies: [] });
assert.equal(ordinaryRecovery.recovery.length, 1);
assert.equal(ordinaryRecovery.recovery[0].claim_generation_mode, 'NEXT');
assert.equal(ordinaryRecovery.recovery[0].next_generation, 2);
assert.match(ordinaryRecovery.recovery[0].claim_path, /G000002\.json$/);

console.log('CONTENTION_BARRIER_FIXED_GENERATION_INTEGRATION_PASS');
