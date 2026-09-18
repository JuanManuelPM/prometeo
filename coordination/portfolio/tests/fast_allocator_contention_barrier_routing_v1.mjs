import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyContentionBarrierRouting } from '../../../scripts/apply-fast-allocator-contention-barriers.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const baseline = JSON.parse(fs.readFileSync(path.join(repoRoot, 'coordination/efficiency/RATCHET_BASELINE_V1.json'), 'utf8'));
const eff018 = baseline.items?.find(item => item.id === 'EFF018');
assert(eff018, 'EFF018 must remain in the efficiency ratchet baseline');
assert.equal(eff018.required?.first_timeout_receipt_preserved, true);
assert.equal(eff018.required?.repeated_timeout_fast_lane_suppressed, true);
assert.equal(eff018.required?.timeout_receipt_grants_authority, false);
assert.equal(eff018.required?.regression_test, 'coordination/portfolio/tests/fast_allocator_contention_barrier_routing_v1.mjs');

const baseCandidate = (jobId='fixture-job') => ({
  job_id: jobId,
  dedupe_key: `dedupe:${jobId}`,
  project_id: 'test',
  priority: 100,
  state: 'ready',
  pin_generation: 0,
  next_generation: 1,
  claim_mode: 'PORTFOLIO_PIN_CREATE',
  claim_path: `coordination/portfolio/pins/${jobId}/G000001.json`,
  claim_payload_shape: {
    schema: 'prometeo.portfolio-pin/v1', pin_id: `pin-${jobId}-G000001-<worker_id>`, job_id: jobId,
    dedupe_key: `dedupe:${jobId}`, project_id: 'test', generation: 1, worker_id: '<worker_id>',
    claim_id: `claim-${jobId}-G000001-<worker_id>`, claimed_at: '<now_iso>', expires_at: '<now_plus_10m_iso>',
    source_head: 'abc', predecessor_pin_ref_or_null: null, predecessor_claim_ref_or_null: null, recovery_basis_or_null: null
  },
  post_claim_validate: true
});

const allocator = candidate => ({schema:'prometeo.fast-allocator/v3',generated_at:'2026-09-17T21:00:30Z',counts:{ready:1,recovery:0},ready:[candidate],recovery:[]});
const barrier = (required=2, release=null, timeoutWorkerIds=[]) => ({
  fixture_id:`fixture-${required}`,job_id:'fixture-job',
  barrier:{schema:'prometeo.portfolio-contention-barrier/v1',contention_barrier_mode:true,fixture_id:`fixture-${required}`,job_id:'fixture-job',required_contenders:required,opened_at:'2026-09-17T21:00:00Z',deadline_at:'2026-09-17T21:02:00Z'},
  release,
  timeout_worker_ids: timeoutWorkerIds,
  barrier_ref:`coordination/portfolio/contention_barriers/fixture-${required}/BARRIER.json`,
  release_ref:`coordination/portfolio/contention_barriers/fixture-${required}/RELEASE.json`
});

for (const n of [2,5]) {
  const out=applyContentionBarrierRouting(allocator(baseCandidate()),[barrier(n)],'2026-09-17T21:00:30Z');
  const c=out.ready[0];
  assert.equal(c.claim_mode,'PORTFOLIO_BARRIER_ENTER');
  assert.match(c.claim_path,/entrants\/<worker_id>\.json$/);
  assert.equal(c.claim_payload_shape.grants_execution_authority,false);
  assert.equal(c.contention_barrier.required_contenders,n);
  assert.equal(c.post_release_claim.claim_mode,'PORTFOLIO_PIN_CREATE');
  assert.equal(c.post_release_claim.claim_path,'coordination/portfolio/pins/fixture-job/G000001.json');
}

{
  const release={schema:'prometeo.portfolio-contention-release/v1',fixture_id:'fixture-2',released_at:'2026-09-17T21:00:20Z',required_contenders:2,entrant_worker_ids:['w1','w2'],grants_execution_authority:false,next_action:'RACE_DETERMINISTIC_PIN'};
  const c=applyContentionBarrierRouting(allocator(baseCandidate()),[barrier(2,release)],'2026-09-17T21:00:30Z').ready[0];
  assert.equal(c.claim_mode,'PORTFOLIO_BARRIER_RELEASED');
  assert.equal(c.claim_path,null);
  assert.equal(c.contention_barrier.state,'RELEASED');
  assert.deepEqual(c.contention_barrier.entrant_worker_ids,['w1','w2']);
  assert.equal(c.next_action,'CHECK_RELEASE_MEMBERSHIP');
  assert.equal(c.post_release_claim.claim_mode,'PORTFOLIO_PIN_CREATE');
  assert.equal(c.post_release_claim.claim_path,'coordination/portfolio/pins/fixture-job/G000001.json');
}

{
  const out=applyContentionBarrierRouting(allocator(baseCandidate()),[barrier(2)],'2026-09-17T21:03:00Z');
  const c=out.ready[0];
  assert.equal(c.claim_mode,'PORTFOLIO_BARRIER_TIMEOUT');
  assert.equal(c.claim_payload_shape.pin_attempted,false);
  assert.equal(c.claim_payload_shape.grants_execution_authority,false);
  assert.equal(c.post_release_claim,null);
  assert.equal(out.counts.barrier_timeout,1);
  assert.equal(out.counts.barrier_expired_suppressed,0);
}

{
  const out=applyContentionBarrierRouting(allocator(baseCandidate()),[barrier(2,null,['w-timeout-1'])],'2026-09-17T21:03:00Z');
  assert.equal(out.ready.length,0,'expired barrier with durable timeout evidence must leave the fast ready lane');
  assert.equal(out.counts.ready,0);
  assert.equal(out.counts.barrier_timeout,0,'later workers must not be routed to another timeout receipt');
  assert.equal(out.counts.barrier_expired_suppressed,1);
  assert.equal(out.contention_barrier_routing.expired_after_first_timeout_evidence,true);
  assert.deepEqual(out.contention_barrier_routing.suppressed_expired_candidates,[{
    job_id:'fixture-job',fixture_id:'fixture-2',timeout_evidence_count:1,timeout_worker_ids:['w-timeout-1'],reason:'DURABLE_TIMEOUT_ALREADY_OBSERVED',next_action:'SKIP_EXPIRED_BARRIER'
  }]);
}

{
  const c=applyContentionBarrierRouting(allocator(baseCandidate('ordinary-job')),[],'2026-09-17T21:00:30Z').ready[0];
  assert.equal(c.claim_mode,'PORTFOLIO_PIN_CREATE');
  assert.equal(c.claim_path,'coordination/portfolio/pins/ordinary-job/G000001.json');
}

{
  const lateRelease={schema:'prometeo.portfolio-contention-release/v1',fixture_id:'fixture-2',released_at:'2026-09-17T21:02:30Z',required_contenders:2,entrant_worker_ids:['w1','w2'],grants_execution_authority:false,next_action:'RACE_DETERMINISTIC_PIN'};
  const c=applyContentionBarrierRouting(allocator(baseCandidate()),[barrier(2,lateRelease)],'2026-09-17T21:03:00Z').ready[0];
  assert.equal(c.claim_mode,'PORTFOLIO_BARRIER_TIMEOUT');
}

await import('./fast_allocator_capability_fit_v1.mjs');

console.log('FAST_ALLOCATOR_CONTENTION_BARRIER_ROUTING_PASS');
