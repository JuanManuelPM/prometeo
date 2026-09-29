#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyEff034EvidenceDoc,
  scanEff034RuntimeEvidence
} from '../../../scripts/scan-eff034-runtime-evidence.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const actual = scanEff034RuntimeEvidence(root);
assert.equal(actual.schema, 'prometeo.eff034-runtime-evidence-scan/v1');
assert.equal(actual.runtime_observation_only, true);
assert.equal(actual.artificial_collision_or_delay_performed, false);
assert(actual.corpus.json_files_scanned > 0, 'scanner must inspect the durable worker evidence corpus');
assert(['OBSERVED','UNOBSERVED'].includes(actual.status));
if (actual.status === 'OBSERVED') {
  assert(actual.qualifying_cases.length > 0);
  for (const row of actual.qualifying_cases) {
    assert(!String(row.source_path).includes('fixture'), 'runtime OBSERVED may only originate from durable repository evidence');
    assert.equal(row.create_exists_count, 2);
    assert(row.snapshot_age_ms > 90_000);
    assert.equal(row.refresh_count, 1);
    assert.equal(row.refresh_path, 'gh-pages:live/claim-frontier.json');
    assert(row.authority_attempts <= 3);
    assert(Object.values(row.checks).every(Boolean));
  }
} else {
  assert.equal(actual.qualifying_cases.length, 0);
  assert.match(actual.boundary, /^BOUNDARY_UNOBSERVED_/);
}

// Static classifier contract only. This fixture proves parser/check logic and MUST NOT
// be counted or persisted as runtime observation evidence.
const classifierFixture = {
  worker_id:'STATIC_CLASSIFIER_FIXTURE_ONLY',
  observed_at:'2026-09-29T00:02:00Z',
  beacon_commit_sha:'abcdef1234567890',
  claim_attempts:[
    { outcome:'CREATE_EXISTS', completed_at:'2026-09-29T00:01:35Z', claim_path:'coordination/portfolio/pins/a/G000001.json' },
    { outcome:'CREATE_EXISTS', completed_at:'2026-09-29T00:01:40Z', claim_path:'coordination/portfolio/pins/b/G000001.json' },
    { outcome:'WON', completed_at:'2026-09-29T00:01:45Z', claim_path:'coordination/portfolio/pins/c/G000001.json' }
  ],
  eff034_runtime_observation:{
    snapshot_generated_at:'2026-09-29T00:00:00Z',
    post_second_create_exists_decision_at:'2026-09-29T00:01:40Z',
    refresh_count:1,
    refresh_path:'gh-pages:live/claim-frontier.json',
    beacon_commit_sha:'abcdef1234567890',
    shard_seed_before:'abcdef1234567890',
    shard_seed_after:'abcdef1234567890',
    shard_seed_reused:true,
    capability_filter_rebuilt:true,
    authority_attempts:3
  }
};
const classified = classifyEff034EvidenceDoc(classifierFixture, '<STATIC_CLASSIFIER_FIXTURE_ONLY>');
assert.equal(classified.qualifying, true);
assert.equal(classified.create_exists_count, 2);
assert.equal(classified.snapshot_age_ms, 100_000);
assert.equal(classified.refresh_count, 1);
assert.equal(classified.authority_attempts, 3);

const oneCollision = classifyEff034EvidenceDoc({
  ...classifierFixture,
  claim_attempts:[classifierFixture.claim_attempts[0]]
}, '<STATIC_NEGATIVE_FIXTURE_ONLY>');
assert.equal(oneCollision.qualifying, false);
assert.equal(oneCollision.checks.create_exists_exactly_two, false);

console.log('EFF034_RUNTIME_EVIDENCE_SCANNER_PASS');
console.log(JSON.stringify({
  runtime_status:actual.status,
  corpus:actual.corpus,
  qualifying_cases:actual.qualifying_cases.length,
  closest_cases:actual.closest_cases
}));
