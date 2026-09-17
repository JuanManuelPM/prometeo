import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { buildPlannerSourceFromLedger } from '../scripts/build-planner-source-from-ledger.mjs';

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const bytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');

function fixture() {
  const buildRef = 'coordination/canary/G1/BUILD_RETURN.json';
  const criticRef = 'coordination/canary/G1/CRITIC_RETURN.json';
  const build = {
    schema: 'prometeo.canary-child-return/v1', opportunity_id: 'O-BUILD', worker_instance_id: 'worker-build', state: 'RETURNED_CANDIDATE', result: 'PASS_CANDIDATE'
  };
  const critic = {
    schema: 'prometeo.canary-child-return/v1', opportunity_id: 'O-CRITIC', worker_instance_id: 'worker-critic', state: 'RETURNED_CANDIDATE',
    planning_atom_candidate: {
      project_id: 'project-canary', semantic_target_id: 'capability-x/falsification', problem_signature: 'candidate needs independent falsification',
      type: 'VERIFY', desired_output_class: 'falsification_return', owner_refs: ['owner-verifier'], dependency_ids: ['O-BUILD'],
      allowed_write_scope: ['candidate/falsification/**'], privacy_class: 'PUBLIC_COORDINATION_ONLY', authority_resolved: true
    }
  };
  const buildBytes = bytes(build);
  const criticBytes = bytes(critic);
  const previousOutput = {
    schema: 'prometeo.planner-generation-output/v1', generation_id: 'CANARY-G1', parent_generation_id: 'CANARY-G0',
    output_digest: 'a'.repeat(64), north_star_ref: 'fixture://north-star', opportunities: [{opportunity_id:'O-BUILD'}, {opportunity_id:'O-CRITIC'}]
  };
  const ledger = {
    schema: 'prometeo.integration-disposition-ledger/v1', integration_batch_id: 'IB-G1-G2-001', generation_id: 'CANARY-G2',
    decision_actor_id: 'worker-steward-independent', source_head_cutoff: 'b'.repeat(40), created_at: '2026-09-17T19:20:00Z',
    authority: 'PLANNING_CONSUMPTION_ONLY_NOT_PRODUCT_PROMOTION', selection_policy: 'EVIDENCE_SCOPED_NO_RECENCY_PRIORITY',
    entries: [
      {
        entry_id: 'build-return', return_ref: buildRef, source_content_sha256: sha256(buildBytes), source_worker_instance_id: 'worker-build',
        source_authority_label: 'CANDIDATE_EVIDENCE_ONLY', visibility_state: 'DISPOSITIONED', scopes: [{
          scope_id: 'build-terminal', semantic_target: 'capability-x/validator', disposition: 'CONSUMED', reason: 'Terminal build is dependency evidence only.',
          decision_basis_refs: ['fixture://decision/build'], effect_authority: 'PLANNING_CONSUMPTION_ONLY_NOT_PRODUCT_PROMOTION'
        }]
      },
      {
        entry_id: 'critic-return', return_ref: criticRef, source_content_sha256: sha256(criticBytes), source_worker_instance_id: 'worker-critic',
        source_authority_label: 'CANDIDATE_STRATEGIC_CRITIQUE_ONLY', visibility_state: 'DISPOSITIONED', scopes: [{
          scope_id: 'critic-next-work', semantic_target: 'capability-x/falsification', disposition: 'CONSUMED', reason: 'Critic explicitly supplied next planning atom.',
          decision_basis_refs: ['fixture://decision/critic'], effect_authority: 'PLANNING_CONSUMPTION_ONLY_NOT_PRODUCT_PROMOTION'
        }]
      }
    ]
  };
  return { buildRef, criticRef, buildBytes, criticBytes, previousOutput, ledger };
}

function run(f = fixture()) {
  return buildPlannerSourceFromLedger({ledger: f.ledger, previousOutput: f.previousOutput, returnBytesByRef: new Map([[f.buildRef, f.buildBytes], [f.criticRef, f.criticBytes]])});
}

test('validated ledger deterministically projects explicit RETURN atoms and dependency satisfaction', () => {
  const a = run(); const b = run();
  assert.deepEqual(a, b); assert.equal(a.generationId, 'CANARY-G2'); assert.deepEqual(a.satisfiedDependencyIds, ['O-BUILD', 'O-CRITIC']);
  assert.equal(a.dispositionLedger.dispositions.length, 2);
  const critic = a.dispositionLedger.dispositions.find(x => x.scope_id === 'critic-next-work');
  assert.equal(critic.planning_atoms.length, 1); assert.equal(critic.planning_atoms[0].type, 'VERIFY');
  const build = a.dispositionLedger.dispositions.find(x => x.scope_id === 'build-terminal');
  assert.deepEqual(build.planning_atoms, []); assert.equal(a.source_receipt.validated_ledger_schema, 'prometeo.integration-disposition-ledger/v1');
});

test('tampered RETURN bytes fail closed before Planner source emission', () => {
  const f = fixture(); f.criticBytes = Buffer.from(f.criticBytes.toString('utf8').replace('independent falsification', 'silently changed text'));
  assert.throws(() => run(f), /RETURN_HASH_MISMATCH/);
});

test('source worker cannot consume its own RETURN', () => {
  const f = fixture(); f.ledger.decision_actor_id = 'worker-critic'; assert.throws(() => run(f), /INVALID_INTEGRATION_DISPOSITION_LEDGER/);
});

test('non-consumed scopes never leak planning atoms or satisfy dependencies', () => {
  const f = fixture(); f.ledger.entries[1].scopes[0].disposition = 'DEFERRED'; const out = run(f);
  const critic = out.dispositionLedger.dispositions.find(x => x.scope_id === 'critic-next-work');
  assert.deepEqual(critic.planning_atoms, []); assert.deepEqual(out.satisfiedDependencyIds, ['O-BUILD']);
});
