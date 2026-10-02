#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  compileMissionEnvelope,
  validateMissionEnvelope,
  classifyMissionSignal,
  missionEnvelopeContract
} from '../../workers/worker-mission-envelope-lib.mjs';

const contract = missionEnvelopeContract();
assert.deepEqual(contract.mission_modes, [
  'LEAF',
  'AGENTIC_MISSION',
  'INTEGRATION_MISSION',
  'SPECIFICATION_MISSION'
]);
assert.equal(contract.authority_invariants.scope_expansion_allowed, false);
assert.equal(contract.authority_invariants.authority_expansion_allowed, false);
assert.equal(contract.pipeline_binding.E0_E9_unchanged, true);
assert.equal(contract.pipeline_binding.pin_claim_generation_fencing_unchanged, true);
assert.equal(contract.pipeline_binding.submit_next_unchanged, true);

const historicalBlock = {
  block_id: 'legacy-block',
  allowed_scope: ['existing/path'],
  forbidden_scope: ['authority/**']
};
const legacy = compileMissionEnvelope(historicalBlock);
assert.equal(legacy.mission_mode, 'LEAF');
assert.equal(legacy.compatibility, 'LEGACY_PASSTHROUGH');
assert.equal(legacy.local_permissions, null);
assert.equal(legacy.limits, null);
assert.deepEqual(validateMissionEnvelope(legacy), {pass: true, errors: []});
assert.deepEqual(historicalBlock.allowed_scope, ['existing/path']);

const agentic = compileMissionEnvelope({
  block_id: 'agentic-block',
  allowed_scope: ['owned/**'],
  forbidden_scope: ['outside/**'],
  mission_envelope: {
    mission_mode: 'AGENTIC_MISSION',
    limits: {
      max_local_repairs: 99,
      max_alternate_safe_paths: 99,
      child_proposal_budget: 99
    }
  }
});
assert.equal(validateMissionEnvelope(agentic).pass, true);
assert.equal(agentic.mission_mode, 'AGENTIC_MISSION');
assert.equal(agentic.scope_boundary, 'OWNED_WORKBLOCK_ONLY');
assert.equal(agentic.authority_expansion_allowed, false);
for (const permission of [
  'inspect', 'local_plan', 'patch', 'test', 'bounded_retry',
  'local_repair', 'alternate_safe_path', 'child_proposal'
]) assert.equal(agentic.local_permissions[permission], true, permission);
assert.equal(agentic.limits.max_local_repairs, 2);
assert.equal(agentic.limits.max_alternate_safe_paths, 1);
assert.equal(agentic.limits.child_proposal_budget, 1);

const firstLocalFailure = classifyMissionSignal(agentic, {
  test_passed: false,
  local_failure_repairable: true,
  local_repairs_used: 0
});
assert.deepEqual(firstLocalFailure, {
  action: 'LOCAL_REPAIR_AND_RETEST',
  reason: 'REPAIRABLE_WITHIN_BUDGET'
});
const retestPass = classifyMissionSignal(agentic, {
  test_passed: true,
  local_repairs_used: 1
});
assert.deepEqual(retestPass, {
  action: 'VERIFY_AND_RETURN_DONE',
  reason: 'TEST_PASS'
});
const hardBoundary = classifyMissionSignal(agentic, {boundary: 'SCOPE'});
assert.deepEqual(hardBoundary, {action: 'RETURN_HARD_BOUNDARY', reason: 'SCOPE'});
const capabilityBoundary = classifyMissionSignal(agentic, {boundary: 'CAPABILITY'});
assert.deepEqual(capabilityBoundary, {action: 'RETURN_HARD_BOUNDARY', reason: 'CAPABILITY'});
const exhausted = classifyMissionSignal(agentic, {
  test_passed: false,
  local_failure_repairable: true,
  local_repairs_used: 2
});
assert.equal(exhausted.action, 'RETURN_SAFE_PARTIAL_WITH_EVIDENCE');

for (const mission_mode of ['INTEGRATION_MISSION', 'SPECIFICATION_MISSION']) {
  const envelope = compileMissionEnvelope({mission_envelope: {mission_mode}});
  assert.equal(validateMissionEnvelope(envelope).pass, true);
  assert.equal(envelope.local_permissions.patch, false);
  assert.equal(envelope.authority_expansion_allowed, false);
}

assert.throws(
  () => compileMissionEnvelope({mission_envelope: {mission_mode: 'SCHEDULER_GOD_MODE'}}),
  /MISSION_MODE_INVALID/
);

console.log('WORKER_MISSION_ENVELOPE_PASS');
