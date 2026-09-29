#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const lineageRel = 'coordination/goal-progress/g05-lineages/g05-lineage-e9ee53d297a9ea7f-g000001.json';
const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const lineage = read(lineageRel);
const pin = read(lineage.claim.pin_ref);
const claim = read(lineage.claim.claim_ref);
const beacon = read(lineage.claim.beacon_ref);

assert.equal(lineage.schema, 'prometeo.g05-lineage-evidence/v1');
assert.equal(lineage.gate_id, 'G05_REAL_PRIVATE_E2E');
assert.equal(lineage.shard_id, 'G05-A');
assert.equal(lineage.scope, 'CAPTURE_SYNC_ATOMIC_CLAIM_SAME_LINEAGE_ONLY');
assert.match(lineage.lineage_id, /^g05-lineage-[a-f0-9]{16}-g\d{6}$/);
assert.match(lineage.capture.capture_digest, /^[a-f0-9]{64}$/);
assert.equal(lineage.capture.raw_capture_public, false);
assert.equal(lineage.capture.sanitized_metadata_only, true);
assert.equal(lineage.capture.ingress_contract, 'prometeo.browser-ingress-request/v1');

assert.equal(pin.job_id, lineage.claim.job_id);
assert.equal(pin.generation, lineage.claim.generation);
assert.equal(pin.worker_id, lineage.claim.worker_id);
assert.equal(claim.job_id, lineage.claim.job_id);
assert.equal(claim.pin_generation, lineage.claim.generation);
assert.equal(claim.worker_id, lineage.claim.worker_id);
assert.equal(beacon.worker_id, lineage.claim.worker_id);
assert.equal(beacon.pool_id, lineage.capture.pool_id);

assert.equal(lineage.evidence.capture_sync, 'PROVEN');
assert.equal(lineage.evidence.atomic_claim, 'PROVEN');
assert.equal(lineage.evidence.same_lineage, 'PROVEN');

const publicText = fs.readFileSync(path.join(root, lineageRel), 'utf8');
for (const forbiddenKey of ['"transcript"', '"private_payload"', '"authorization"', '"access_token"', '"refresh_token"', '"cookie"', '"packet_token"', '"return_token"']) {
  assert.equal(publicText.includes(forbiddenKey), false, `forbidden public key leaked: ${forbiddenKey}`);
}
assert.equal(lineage.privacy.private_packet_present, false);
assert.equal(lineage.privacy.credentials_present, false);
assert.equal(lineage.privacy.tokens_present, false);

for (const downstream of [
  'portfolio-finish-g05-shard-b-private-packet-privacy-v1',
  'portfolio-finish-g05-shard-c-prewrite-return-ingest-v1',
  'portfolio-finish-g05-shard-d-independent-verifier-v1'
]) {
  assert(lineage.consumer_contract.next_shards.includes(downstream));
}

console.log(JSON.stringify({
  schema:'prometeo.g05-shard-a-lineage-test/v1',
  result:'PASS',
  lineage_id:lineage.lineage_id,
  evidence:lineage.evidence,
  raw_capture_public:false
}));
