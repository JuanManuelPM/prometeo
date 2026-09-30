#!/usr/bin/env node
import assert from 'node:assert/strict';
import { compileRoleFrontier } from '../../../scripts/build-fast-allocator.mjs';

const ret1 = 'coordination/portfolio/returns/portfolio-jose-v12-map-browser-ci-runner-v1/RETURN-a-PARTIAL.json';
const ret2 = 'coordination/portfolio/returns/portfolio-jose-v12-map-browser-ci-runner-v1/RETURN-b-PARTIAL.json';
const source = 'coordination/portfolio/derived/jose/portfolio-jose-v12-map-browser-ci-runner-v1.json';

const jobs = [{
  job_id: 'portfolio-jose-v12-map-browser-ci-runner-v1',
  project_id: 'jose',
  state: 'partial',
  priority: 88,
  source_path: source,
  recent_return_evidence: [
    { path: ret1, outcome: 'PARTIAL', returned_at: '2026-09-29T03:45:00Z' },
    { path: ret2, outcome: 'PARTIAL', returned_at: '2026-09-29T03:54:30Z' }
  ]
}];

const baseContext = {
  metabolism: {
    signals: {
      partial_loop_trigger: 2,
      frontier_floor_absolute: 8,
      frontier_ceiling: 40,
      frontier_per_recent_launch: 1.5
    }
  },
  guidePins: [],
  heartbeats: [],
  beacons: [],
  noAlloc: [],
  projectGuideMesh: null,
  projectGuideStates: [],
  portfolio: { projects: [] },
  growthPolicy: {}
};

const compile = guideReceipts => compileRoleFrontier(
  { workers: [] },
  { status: 'HEALTHY', metrics: {}, reasons: [] },
  jobs,
  [],
  [],
  [],
  { ...baseContext, guideReceipts }
);

const unconsumed = compile([]);
const critic = unconsumed.role_ready.find(row => row.role === 'GUIDE_CRITIC');
assert(critic, 'two unconsumed PARTIAL returns must still compile GUIDE_CRITIC');
assert.equal(critic.trigger, 'PARTIAL_LOOP');
assert(critic.evidence.includes(ret1));
assert(critic.evidence.includes(ret2));

const fullyConsumed = compile([{
  path: 'coordination/guide/receipts/guide-critic-old/receipt.json',
  doc: {
    schema: 'prometeo.guide-receipt/v1',
    guide_work_id: 'guide-critic-old',
    role: 'GUIDE_CRITIC',
    trigger: 'PARTIAL_LOOP',
    consumed_returns: [
      { ref: ret1, disposition: 'CONSUMED' },
      { path: ret2, disposition: 'CONSUMED' }
    ]
  }
}]);
assert(
  !fullyConsumed.role_ready.some(row => row.role === 'GUIDE_CRITIC' && row.trigger === 'PARTIAL_LOOP'),
  'already-consumed PARTIAL returns must not resurrect GUIDE_CRITIC under a new fingerprint'
);
assert.equal(fullyConsumed.metabolism.partial_loop_detected, false);
assert.equal(fullyConsumed.metabolism.partial_loop_return_count, 0);

const oneConsumed = compile([{
  path: 'coordination/guide/receipts/guide-critic-old/receipt.json',
  doc: {
    schema: 'prometeo.guide-receipt/v1',
    guide_work_id: 'guide-critic-old',
    role: 'GUIDE_CRITIC',
    trigger: 'PARTIAL_LOOP',
    consumed_returns: [ret1]
  }
}]);
assert(
  !oneConsumed.role_ready.some(row => row.role === 'GUIDE_CRITIC' && row.trigger === 'PARTIAL_LOOP'),
  'one remaining unconsumed PARTIAL must stay below the two-return critic threshold'
);

console.log('GUIDE_CRITIC_CONSUMED_PARTIAL_SUPPRESSION_PASS');
