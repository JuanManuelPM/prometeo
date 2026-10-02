#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  SPECIFICATION_ASSURANCE_SCHEMA,
  SPECIFICATION_QUESTION_POLICY,
  compileSpecificationAssurance,
  validateSpecificationAssuranceRecord
} from '../../../scripts/compiled-dispatch-contract-lib.mjs';

const base = () => ({
  intent: {
    requested: 'Reduce claim latency without changing routing authority.',
    observable_outcome: 'A fresh worker reaches one owned capsule with fewer pre-claim reads.',
    request_class: 'LOCAL',
    non_goals: ['new scheduler', 'new queue'],
    human_success_test: 'A fresh canary can show a durable claim receipt and bounded pre-claim reads.'
  },
  reuse_authority: {
    current_owner_ref: 'coordination/workers/CURRENT_WORKER_REUSE_CONTRACT_V1.json',
    reuse: ['live/claim-frontier.json']
  },
  evidence: {evidence_refs: ['coordination/workers/CURRENT_WORKER_REUSE_CONTRACT_V1.json']},
  decomposition: {blocks: [{block_id:'claim-fast-path'}]}
});

const trivial = compileSpecificationAssurance(base());
assert.equal(trivial.schema, SPECIFICATION_ASSURANCE_SCHEMA);
assert.equal(trivial.policy, SPECIFICATION_QUESTION_POLICY);
assert.equal(trivial.status, 'PASS');
assert.deepEqual(trivial.questions, []);
assert.equal(trivial.reconstruction.private_history_required, false);
assert.equal(validateSpecificationAssuranceRecord(trivial, base()).pass, true);

const conflictBase = base();
const conflict = compileSpecificationAssurance(conflictBase, {literal_request_conflicts_with_outcome:true});
assert.equal(conflict.status, 'NEEDS_CLARIFICATION');
assert(conflict.unresolved_blocking_question_ids.includes('SPEC_LITERAL_OUTCOME_CONFLICT'));
conflictBase.specification_assurance = {
  signals: {literal_request_conflicts_with_outcome:true},
  resolutions: {SPEC_LITERAL_OUTCOME_CONFLICT:'Observable outcome governs; preserve the literal request only where compatible.'}
};
const conflictResolved = compileSpecificationAssurance(conflictBase);
assert.equal(conflictResolved.status, 'PASS');
assert.equal(conflictResolved.questions[0].blocking, false);
assert.equal(validateSpecificationAssuranceRecord(conflictResolved, conflictBase).pass, true);

const metric = compileSpecificationAssurance(base(), {metric_gaming_risk:true});
assert(metric.unresolved_blocking_question_ids.includes('SPEC_METRIC_GAMING'));

const ownerless = base();
ownerless.reuse_authority.current_owner_ref = '';
const owner = compileSpecificationAssurance(ownerless);
assert(owner.unresolved_blocking_question_ids.includes('SPEC_OWNER_REUSE'));

const unverifiable = base();
unverifiable.intent.human_success_test = 'Make it better';
const verify = compileSpecificationAssurance(unverifiable);
assert(verify.unresolved_blocking_question_ids.includes('SPEC_HUMAN_TEST_INCOMPLETE'));

const future = compileSpecificationAssurance(base(), {foreseeable_condition_changes_decomposition:true});
assert(future.unresolved_blocking_question_ids.includes('SPEC_FUTURE_CONDITION'));

const granular = compileSpecificationAssurance(base(), {granularity_or_parallelism_uncertain:true});
assert(granular.unresolved_blocking_question_ids.includes('SPEC_GRANULARITY_PARALLELISM'));

const noEvidence = base();
noEvidence.evidence.evidence_refs = [];
const evidence = compileSpecificationAssurance(noEvidence);
assert(evidence.unresolved_blocking_question_ids.includes('SPEC_VERIFICATION_GAP'));

const bad = structuredClone(trivial);
bad.questions = [{id:'X',dimension:'FIDELITY',question:'x?',information_gain:'HIGH',blocking:true,resolution:null}];
bad.unresolved_blocking_question_ids = ['X'];
bad.status = 'NEEDS_CLARIFICATION';
const badValidation = validateSpecificationAssuranceRecord(bad, base());
assert.equal(badValidation.pass, false);
assert(badValidation.errors.some(error => error.startsWith('SPEC:UNRESOLVED_BLOCKING')));

console.log('AGENTIC_SPECIFICATION_ASSURANCE_PASS');
console.log(JSON.stringify({
  trivial_questions: trivial.questions.length,
  adversarial_cases: [
    'literal_request_conflicts_with_outcome',
    'metric_gaming_risk',
    'owner_or_reuse_omitted',
    'human_test_incomplete',
    'foreseeable_condition_changes_decomposition',
    'granularity_or_parallelism_uncertain',
    'verification_incomplete'
  ],
  private_history_required: trivial.reconstruction.private_history_required
}));
