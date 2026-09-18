#!/usr/bin/env node
import assert from 'node:assert/strict';
import { suppressConcurrentGuideRescate } from '../../../scripts/suppress-concurrent-guide-rescate.mjs';

const now = Date.parse('2026-09-18T18:28:30Z');
const staleGeneratedAt = '2026-09-18T18:12:55.258Z';

const staleCriticPath = 'coordination/guide/pins/guide-critic-stale/G000001.json';
const stalePlannerPath = 'coordination/guide/pins/guide-planner-stale/G000001.json';
const freshIntegratorPath = 'coordination/guide/pins/guide-integrator-fresh/G000001.json';

const allocator = {
  schema: 'prometeo.fast-allocator/v3',
  generated_at: staleGeneratedAt,
  counts: { ready: 0, queue_ready: 0, role_ready: 3, recovery: 0 },
  role_ready: [
    {
      role: 'GUIDE_CRITIC',
      guide_work_id: 'guide-critic-stale',
      trigger: 'PARTIAL_LOOP',
      claim_path: staleCriticPath,
      claim_payload_shape: { schema: 'prometeo.guide-role-pin/v1' }
    },
    {
      role: 'GUIDE_PLANNER',
      guide_work_id: 'guide-planner-stale',
      trigger: 'FRONTIER_THIN',
      claim_path: stalePlannerPath,
      claim_payload_shape: { schema: 'prometeo.guide-role-pin/v1' }
    },
    {
      role: 'GUIDE_INTEGRATOR',
      guide_work_id: 'guide-integrator-fresh',
      trigger: 'RETURNS_UNCONSUMED',
      claim_path: freshIntegratorPath,
      claim_payload_shape: { schema: 'prometeo.guide-role-pin/v1' }
    }
  ],
  diagnostics: { fixture: 'STALE_FRONTIER_TWO_ALREADY_CLAIMED' }
};

const state = {
  guidePins: [
    {
      path: staleCriticPath,
      doc: {
        schema: 'prometeo.guide-role-pin/v1',
        guide_work_id: 'guide-critic-stale',
        role: 'GUIDE_CRITIC',
        generation: 1,
        claimed_at: '2026-09-18T18:15:00Z'
      }
    },
    {
      path: stalePlannerPath,
      doc: {
        schema: 'prometeo.guide-role-pin/v1',
        guide_work_id: 'guide-planner-stale',
        role: 'GUIDE_PLANNER',
        generation: 1,
        claimed_at: '2026-09-18T18:16:00Z'
      }
    }
  ],
  heartbeats: [],
  receipts: []
};

assert(now - Date.parse(staleGeneratedAt) > 10 * 60_000, 'fixture must reproduce a materially stale frontier');

const next = suppressConcurrentGuideRescate(allocator, state, now);

assert.equal(next.role_ready.length, 1, 'already-owned immutable role paths must be removed before publication');
assert.equal(next.role_ready[0].guide_work_id, 'guide-integrator-fresh', 'fresh compatible successor must remain claimable');
assert.equal(next.role_ready[0].claim_path, freshIntegratorPath);
assert.equal(next.counts.role_ready, 1);
assert.equal(next.diagnostics.fixture, 'STALE_FRONTIER_TWO_ALREADY_CLAIMED');

const diag = next.diagnostics.guide_claim_path_suppression;
assert.equal(diag.schema, 'prometeo.guide-claim-path-suppression/v1');
assert.equal(diag.policy, 'SUPPRESS_EXACT_EXISTING_IMMUTABLE_PIN_PATH');
assert.equal(diag.suppressed_candidates.length, 2);
assert.deepEqual(
  diag.suppressed_candidates.map(row => row.claim_path).sort(),
  [staleCriticPath, stalePlannerPath].sort()
);
assert.equal(
  next.diagnostics.guide_rescate_active_suppression,
  undefined,
  'exact-path suppression must not require or fabricate an active GUIDE_RESCATE gate'
);

console.log('ROLE_READY_CLAIM_PATH_SUPPRESSION_PASS');
