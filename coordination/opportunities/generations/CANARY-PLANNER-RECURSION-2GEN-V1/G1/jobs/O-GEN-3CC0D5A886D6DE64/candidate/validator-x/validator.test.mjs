import assert from 'node:assert/strict';
import test from 'node:test';
import {validateValidatorCandidatePayload} from './validator.mjs';

const valid = {
  schema: 'canary.validator-x-payload/v1',
  candidate_id: 'validator-v',
  evidence_refs: ['canary://g1/build/R1'],
  status: 'CANDIDATE',
  authority_label: 'CANDIDATE_ONLY'
};

test('accepts valid canary candidate payload', () => {
  assert.deepEqual(validateValidatorCandidatePayload(valid), {ok: true, errors: []});
});

test('rejects non-object payload', () => {
  assert.equal(validateValidatorCandidatePayload(null).ok, false);
});

test('rejects missing candidate id', () => {
  assert.equal(validateValidatorCandidatePayload({...valid, candidate_id: ''}).ok, false);
});

test('rejects missing evidence', () => {
  assert.equal(validateValidatorCandidatePayload({...valid, evidence_refs: []}).ok, false);
});

test('rejects forbidden authority promotion', () => {
  assert.equal(validateValidatorCandidatePayload({...valid, authority_label: 'CURRENT'}).ok, false);
});
