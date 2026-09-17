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

test('accepts omitted authority label as candidate-only default boundary', () => {
  const {authority_label, ...withoutAuthority} = valid;
  assert.equal(validateValidatorCandidatePayload(withoutAuthority).ok, true);
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

test('rejects forbidden authority with trailing whitespace', () => {
  const r = validateValidatorCandidatePayload({...valid, authority_label: 'CURRENT '});
  assert.equal(r.ok, false);
  assert.ok(r.errors.includes('FORBIDDEN_AUTHORITY_PROMOTION'));
});

test('rejects forbidden authority with space separator alias', () => {
  const r = validateValidatorCandidatePayload({...valid, authority_label: 'HUMAN ACCEPTED'});
  assert.equal(r.ok, false);
  assert.ok(r.errors.includes('FORBIDDEN_AUTHORITY_PROMOTION'));
});

test('rejects non-string authority labels', () => {
  const r = validateValidatorCandidatePayload({...valid, authority_label: {role: 'CURRENT'}});
  assert.equal(r.ok, false);
  assert.ok(r.errors.includes('INVALID_AUTHORITY_LABEL_TYPE'));
});

test('rejects unknown authority labels fail closed', () => {
  const r = validateValidatorCandidatePayload({...valid, authority_label: 'UNKNOWN'});
  assert.equal(r.ok, false);
  assert.ok(r.errors.includes('INVALID_AUTHORITY_LABEL'));
});

test('rejects lowercase non-canonical candidate authority', () => {
  const r = validateValidatorCandidatePayload({...valid, authority_label: 'candidate_only'});
  assert.equal(r.ok, false);
  assert.ok(r.errors.includes('INVALID_AUTHORITY_LABEL'));
});
