#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = rel => JSON.parse(fs.readFileSync(new URL(rel, import.meta.url), 'utf8'));
const policy = read('../../guide/RECURSIVE_SUCCESSOR_POLICY_V1.json');
const realChildren = [
  read('../derived/prometeo-autonomous-growth/portfolio-chat-canary-served-contract-reconcile-v1.json'),
  read('../derived/prometeo-autonomous-growth/portfolio-eff016b-transport-denial-filter-compatibility-v1.json'),
  read('../derived/prometeo-autonomous-growth/portfolio-allocator-dependency-recovery-gate-v1.json')
];

const required = policy.required_child_fields;
const defaults = policy.defaults;
const missingByJob = {};
for (const child of realChildren) {
  const missing = required.filter(field => child[field] === undefined || child[field] === null);
  missingByJob[child.job_id] = missing;
  assert.deepEqual(missing, [], `${child.job_id} missing recursive child fields: ${missing.join(',')}`);
  assert.equal(child.recursive_lineage.root_ref, child.root_ref, `${child.job_id} root lineage drift`);
  assert.equal(child.recursive_lineage.parent_ref, child.parent_ref, `${child.job_id} parent lineage drift`);
  assert.equal(child.recursive_lineage.depth, 1, `${child.job_id} expected root-child depth 1`);
  assert(child.recursive_lineage.expires_at, `${child.job_id} missing proposal TTL`);
  for (const [key, value] of Object.entries(defaults)) {
    assert(child.recursive_lineage.budget[key] <= value, `${child.job_id} budget ${key} exceeds conservative default without override`);
  }
  assert.equal(typeof child.consumer, 'string');
  assert(child.consumer.length > 0, `${child.job_id} has no consumer`);
  assert(Array.isArray(child.definition_of_done) && child.definition_of_done.length > 0, `${child.job_id} missing DoD`);
  assert(Array.isArray(child.evidence_refs) && child.evidence_refs.length > 0, `${child.job_id} missing evidence refs`);
}

const fingerprints = realChildren.map(child => child.semantic_fingerprint);
assert.equal(new Set(fingerprints).size, fingerprints.length, 'real successor sample contains semantic duplicate fingerprints');
const orphanCount = realChildren.filter(child => !child.consumer || !child.parent_ref || !child.semantic_pin_ref).length;
const duplicateCount = fingerprints.length - new Set(fingerprints).size;
assert.equal(orphanCount, 0, 'real successor sample must have zero ownerless/consumerless orphans');
assert.equal(duplicateCount, 0, 'real successor sample must have zero semantic duplicates');

console.log('GUIDE_RECURSIVE_REAL_SUCCESSOR_CONTRACT_PASS');
console.log(JSON.stringify({
  sample_n: realChildren.length,
  orphan_n: orphanCount,
  orphan_ratio: orphanCount / realChildren.length,
  duplicate_n: duplicateCount,
  duplicate_ratio: duplicateCount / realChildren.length,
  missing_by_job: missingByJob
}));
