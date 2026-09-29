#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyG05LineageBundle } from '../../../scripts/verify-g05-lineage.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const contract=JSON.parse(fs.readFileSync(path.join(root,'coordination/goal-progress/G05_REAL_PRIVATE_E2E_EVIDENCE_CONTRACT_V1.json'),'utf8'));
const lineage='g05-lineage-test-0001';
const builder='builder-worker';
const verifier='independent-worker';
const nine=Object.fromEntries(contract.required_evidence.filter(k=>k!=='independent_verifier').map(k=>[k,'PROVEN']));

const pass=verifyG05LineageBundle({
  lineage_id:lineage,
  verifier_worker_id:verifier,
  contributions:[{lineage_id:lineage,worker_id:builder,ref:'fixture:builder',evidence:nine}]
},contract);
assert.equal(pass.status,'PASS');
assert.equal(pass.evidence.independent_verifier,'PROVEN');
assert.equal(pass.missing_evidence.length,0);

const self=verifyG05LineageBundle({
  lineage_id:lineage,
  verifier_worker_id:builder,
  contributions:[{lineage_id:lineage,worker_id:builder,ref:'fixture:builder',evidence:nine}]
},contract);
assert.equal(self.status,'REJECT_BUILDER_SELF_VERIFY');
assert(self.failure_codes.includes('BUILDER_SELF_VERIFIED'));
assert.equal(self.evidence.independent_verifier,'NOT_PROVEN');

const cross=verifyG05LineageBundle({
  lineage_id:lineage,
  verifier_worker_id:verifier,
  contributions:[
    {lineage_id:lineage,worker_id:builder,ref:'fixture:a',evidence:{capture_sync:'PROVEN'}},
    {lineage_id:'different-lineage',worker_id:'builder-b',ref:'fixture:b',evidence:{atomic_claim:'PROVEN'}}
  ]
},contract);
assert.equal(cross.status,'REJECT_CROSS_LINEAGE');
assert(cross.failure_codes.includes('CROSS_LINEAGE_EVIDENCE'));

const incomplete=verifyG05LineageBundle({
  lineage_id:lineage,
  verifier_worker_id:verifier,
  contributions:[{lineage_id:lineage,worker_id:builder,ref:'fixture:a',evidence:{capture_sync:'PROVEN',atomic_claim:'PROVEN',same_lineage:'PROVEN'}}]
},contract);
assert.equal(incomplete.status,'BLOCKED_MISSING_EVIDENCE');
assert(incomplete.missing_evidence.includes('private_packet_post_claim'));
assert.equal(incomplete.evidence.independent_verifier,'PROVEN');

console.log('G05_INDEPENDENT_LINEAGE_VERIFIER_PASS');
