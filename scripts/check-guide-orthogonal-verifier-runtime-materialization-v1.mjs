#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveOrthogonalVerifierMaterialization } from './guide-orthogonal-verifier-materializer-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matrix = JSON.parse(fs.readFileSync(path.join(root, 'coordination/guide/ORTHOGONAL_VERIFIER_MATRIX_V1.json'), 'utf8'));
const now = '2026-10-01T21:20:00.000Z';

function proposal({id, version='sha-v1', signals=['source_changed'], source=`coordination/opportunities/proposals/${id}.json`} = {}) {
  return {
    schema: 'prometeo.worker-proposal/v1',
    proposal_id: id,
    _source_ref: source,
    root_ref: 'coordination/guide/root/prometeo-autonomous-growth.json',
    priority: 42,
    evidence_refs: [`evidence/${version}.json`],
    orthogonal_verification_v1: {
      artifact_identity: {
        project_id: 'prometeo-autonomous-growth',
        artifact_key: 'guide-runtime',
        artifact_version_ref: version,
        target_scope: 'scripts/prometeo-metabolism-tick.mjs'
      },
      fixture_revision: 'qa-fixture-r1',
      signals
    }
  };
}

const input = [
  proposal({id:'P-A', signals:['source_changed','served_ui_claim']}),
  proposal({id:'P-B', signals:['served_ui_claim','source_changed']}),
  proposal({id:'P-C', version:'sha-v2', signals:['source_changed']}),
  proposal({id:'P-NO-SLICE', version:'sha-v3', signals:['not_a_matrix_signal']}),
  {
    proposal_id:'P-MALFORMED',
    _source_ref:'coordination/opportunities/proposals/P-MALFORMED.json',
    orthogonal_verification_v1:{signals:['source_changed'], fixture_revision:'qa-fixture-r1', artifact_identity:{project_id:'x'}}
  }
];

const result = deriveOrthogonalVerifierMaterialization({matrix, proposals:input, now});
assert.equal(result.schema, 'prometeo.orthogonal-verifier-runtime-materialization/v1');
assert.equal(result.authority, 'DERIVED_SHADOW_ONLY_NO_EXECUTION_OR_PROMOTION_AUTHORITY');
assert.equal(result.metrics.opted_in_proposals, 5);
assert.equal(result.metrics.materialized_slices, 3);
assert.equal(result.metrics.duplicates_suppressed, 2);
assert.equal(result.metrics.skipped, 2);
assert.equal(result.candidates.length, 3);
assert.equal(new Set(result.candidates.map(row => row.semantic_fingerprint)).size, 3);

const v1Source = result.candidates.find(row => row.artifact_identity.artifact_version_ref === 'sha-v1' && row.slice_id === 'SOURCE_STATIC');
const v1Ui = result.candidates.find(row => row.artifact_identity.artifact_version_ref === 'sha-v1' && row.slice_id === 'SERVED_UI_INTERACTION');
const v2Source = result.candidates.find(row => row.artifact_identity.artifact_version_ref === 'sha-v2' && row.slice_id === 'SOURCE_STATIC');
assert.ok(v1Source);
assert.ok(v1Ui);
assert.ok(v2Source);
assert.notEqual(v1Source.semantic_fingerprint, v2Source.semantic_fingerprint, 'new immutable artifact version must produce a new semantic fingerprint');
assert.deepEqual(v1Source.required_capabilities, []);
assert.deepEqual(v1Ui.required_capabilities, ['browser_network_navigation_to_target','representative_javascript_browser']);
assert.match(v1Ui.semantic_pin_ref, /^coordination\/guide\/successor-pins\/pdf-[a-f0-9]{32}\.json$/);

for (const candidate of result.candidates) {
  assert.equal(candidate.authority, 'CANDIDATE_VERIFIER_SLICE_ONLY_NO_EXECUTION_OR_PROMOTION_AUTHORITY');
  for (const forbidden of ['mutation_authority','allowed_paths','tool_policy','execution_authority','promotion_authority','shell_identity']) {
    assert.equal(Object.prototype.hasOwnProperty.call(candidate.successor, forbidden), false, `authority leak: ${forbidden}`);
  }
  assert.equal(candidate.successor.semantic_fingerprint, candidate.semantic_fingerprint);
  assert.equal(candidate.successor.semantic_pin_ref, candidate.semantic_pin_ref);
}

assert.ok(result.skipped.some(row => row.reason === 'NO_APPLICABLE_SLICE'));
assert.ok(result.skipped.some(row => String(row.reason).includes('artifact_identity.artifact_key_required')));

const reversed = deriveOrthogonalVerifierMaterialization({matrix, proposals:[...input].reverse(), now});
assert.deepEqual(
  reversed.candidates.map(row => row.semantic_fingerprint),
  result.candidates.map(row => row.semantic_fingerprint),
  'proposal order must not change materialized semantic identities'
);
assert.equal(reversed.metrics.duplicates_suppressed, result.metrics.duplicates_suppressed);

const empty = deriveOrthogonalVerifierMaterialization({matrix, proposals:[], now});
assert.equal(empty.candidates.length, 0);
assert.equal(empty.metrics.materialized_slices, 0);

console.log(JSON.stringify({
  ok:true,
  schema:'prometeo.orthogonal-verifier-runtime-materialization-test/v1',
  cases:{
    applicable_slice_selection:'PASS',
    semantic_dedupe:'PASS',
    immutable_version_rotation:'PASS',
    required_capabilities_preserved:'PASS',
    authority_non_expansion:'PASS',
    deterministic_ordering:'PASS',
    malformed_descriptor_bounded:'PASS',
    empty_input:'PASS'
  },
  metrics:result.metrics,
  fingerprints:result.candidates.map(row => ({slice_id:row.slice_id, version:row.artifact_identity.artifact_version_ref, fingerprint:row.semantic_fingerprint}))
}, null, 2));
