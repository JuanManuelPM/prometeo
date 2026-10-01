#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { discoveryFingerprint } from './discovery-dedup-lib.mjs';

const specPath = process.argv[2] || 'coordination/guide/ORTHOGONAL_VERIFIER_MATRIX_V1.json';
const fixturePath = process.argv[3] || 'tests/fixtures/guide-orthogonal-verifier-matrix-v1.json';
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const requiredDimensions = [
  'SOURCE_STATIC','CONTRACT_TEST','PUBLISHED_BYTES','SERVED_UI_INTERACTION',
  'VISUAL','E2E','REGRESSION','ADVERSARIAL'
];

assert.equal(spec.schema, 'prometeo.orthogonal-verifier-matrix/v1');
assert.equal(spec.authority_boundary.creates_execution_authority, false);
assert.equal(spec.authority_boundary.creates_promotion_authority, false);
assert.equal(spec.dedupe.fingerprint_function, 'scripts/discovery-dedup-lib.mjs#discoveryFingerprint');

const slices = new Map(spec.slices.map(slice => [slice.slice_id, slice]));
assert.deepEqual([...slices.keys()].sort(), [...requiredDimensions].sort(), 'required dimensions must exist exactly once');

for (const [sliceId, slice] of slices) {
  assert.ok(Array.isArray(slice.preconditions) && slice.preconditions.length >= 3, `${sliceId}: preconditions`);
  assert.ok(Array.isArray(slice.required_capabilities), `${sliceId}: required_capabilities`);
  assert.ok(Array.isArray(slice.acceptance) && slice.acceptance.length >= 3, `${sliceId}: acceptance`);
  assert.equal(slice.output_schema.schema, 'prometeo.orthogonal-verifier-result/v1', `${sliceId}: output schema`);
  assert.ok(Array.isArray(slice.output_schema.required) && slice.output_schema.required.length > 0, `${sliceId}: required output fields`);
  assert.ok(slice.consumer_judge?.consumer && slice.consumer_judge?.judge, `${sliceId}: consumer/judge`);
}

function applicableSlices(signals = {}) {
  return spec.slices
    .filter(slice => slice.applies_when.any_signal.some(key => Boolean(signals[key])))
    .map(slice => slice.slice_id);
}

for (const testCase of fixture.cases) {
  const actual = applicableSlices(testCase.signals);
  assert.deepEqual(actual, testCase.expected_slices, `${testCase.id}: applicable slices`);
  const mode = actual.length === 1 ? 'ONE_VERIFIER_SUFFICIENT' : 'N_ORTHOGONAL';
  assert.equal(mode, testCase.expected_parallelism, `${testCase.id}: parallelism`);
  assert.equal(new Set(actual).size, actual.length, `${testCase.id}: duplicate slice`);
}

function semanticCandidate(identity) {
  const slice = slices.get(identity.slice_id);
  assert.ok(slice, `unknown slice ${identity.slice_id}`);
  return {
    root: identity.project_id,
    target: {
      artifact_key: identity.artifact_key,
      artifact_version_ref: identity.artifact_version_ref,
      slice_id: identity.slice_id,
      target_scope: identity.target_scope,
      fixture_revision: identity.fixture_revision,
      replica_index: identity.replica_index
    },
    problem: 'orthogonal_verifier_slice',
    acceptance: slice.acceptance
  };
}

for (const testCase of fixture.dedupe_cases) {
  const fa = discoveryFingerprint(semanticCandidate(testCase.a));
  const fb = discoveryFingerprint(semanticCandidate(testCase.b));
  assert.equal(fa === fb, testCase.expect_same_fingerprint, `${testCase.id}: fingerprint relation`);
  if (testCase.a.replica_index !== testCase.b.replica_index) {
    assert.equal(testCase.replication?.declared_before_claim, true, `${testCase.id}: replicas must be declared before claim`);
    assert.ok(testCase.replication.required_replicas > 1, `${testCase.id}: replica count must be explicit`);
  }
}

assert.ok(spec.result_schema.classification_enum.includes('REGRESSION'));
assert.ok(spec.result_schema.classification_enum.includes('HUMAN_DECISION_REQUIRED'));
assert.ok(spec.parallelism_policy.anti_pattern.includes('same default slice'));

console.log(JSON.stringify({
  schema: 'prometeo.orthogonal-verifier-harness-result/v1',
  status: 'PASS',
  slices: requiredDimensions.length,
  applicability_cases: fixture.cases.length,
  dedupe_cases: fixture.dedupe_cases.length,
  assertions: 'all'
}));
