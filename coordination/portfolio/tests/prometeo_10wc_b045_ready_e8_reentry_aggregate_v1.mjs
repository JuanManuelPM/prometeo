import assert from 'node:assert/strict';
import { readyDependencyGate } from '../../../scripts/build-fast-allocator.mjs';
import { resolveFiniteRunE8 } from '../../../scripts/finite-run-e8-semantics.mjs';
import { resolveMaterialReturnConsumerReentry } from '../../../scripts/material-return-consumer-reentry.mjs';

const upstreamWorking = { job_id: 'upstream', state: 'claimed' };
const downstream = { job_id: 'downstream', state: 'ready', dependency_ids: ['upstream'] };
const blocked = readyDependencyGate(downstream, [upstreamWorking, downstream]);
assert.equal(blocked.eligible, false);
assert.equal(blocked.reason, 'WAIT_FOR_DEPENDENCIES');

const upstreamDone = { job_id: 'upstream', state: 'done', completed_at: '2026-10-04T16:00:00Z' };
const released = readyDependencyGate(downstream, [upstreamDone, downstream]);
assert.equal(released.eligible, true);
assert.equal(released.reason, 'DEPENDENCIES_MATERIALIZED');

const primary = { primary_complete: true, productive_unit_counted: true };
const e8 = resolveFiniteRunE8({
  reallocation_pool: null,
  reallocation_slots: [{ slot_id: 'R001' }],
  common_capsule: { execution_rules: ['no POOL'] }
}, primary);
assert.equal(e8.action, 'E8_REALLOCATE');
assert.equal(e8.surface, 'REALLOCATION_SLOTS');
assert.equal(e8.preserve_primary_result, true);

const reentry = resolveMaterialReturnConsumerReentry({
  close: { status: 'CONTINUE', continuity_request: ['downstream'] },
  allocator_candidates: [{
    job_id: 'downstream',
    claim_mode: 'PORTFOLIO_PIN_CREATE',
    claim_path: 'coordination/portfolio/pins/downstream/G000001.json',
    source_path: 'coordination/portfolio/derived/p/downstream.json'
  }]
});
assert.equal(reentry.decision, 'REENTER_EXISTING_ALLOCATOR');
assert.equal(reentry.allocator_matches[0].claim_mode, 'PORTFOLIO_PIN_CREATE');
assert.equal(reentry.boundary, null);

const noFakeReentry = resolveMaterialReturnConsumerReentry({
  close: { status: 'CONTINUE', continuity_request: ['unknown'] },
  allocator_candidates: []
});
assert.equal(noFakeReentry.decision, 'DURABLE_BOUNDARY_REQUIRED');
assert.equal(noFakeReentry.boundary.code, 'CONTINUITY_REQUEST_UNRESOLVED');

console.log('B045_READY_E8_REENTRY_AGGREGATE_PASS');
