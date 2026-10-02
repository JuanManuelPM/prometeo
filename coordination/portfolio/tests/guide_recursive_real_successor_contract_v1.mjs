#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import './guide_pre_dispatch_compile_gate_v1.mjs';

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
const structuralOrphanCount = realChildren.filter(child => !child.consumer || !child.parent_ref || !child.semantic_pin_ref).length;
const duplicateCount = fingerprints.length - new Set(fingerprints).size;
assert.equal(structuralOrphanCount, 0, 'real successor sample must have zero ownerless/consumerless structural orphans');
assert.equal(duplicateCount, 0, 'real successor sample must have zero semantic duplicates');

// Deterministic lifecycle audit of the same three real descendants at the allocator snapshot
// that exposed the owned orphan-audit job. This distinguishes a stale execution PIN from an
// orphan and forces grounded blockers to carry durable evidence instead of being recycled as
// generic recovery forever.
const auditAt = new Date('2026-10-02T12:18:11.084Z');
const byId = Object.fromEntries(realChildren.map(child => [child.job_id, child]));
const chatPin = read('../pins/portfolio-chat-canary-served-contract-reconcile-v1/G000001.json');
const effDone = read('../returns/portfolio-eff016b-transport-denial-filter-compatibility-v1/RETURN-wc-20261002T093330Z-e10abfbb8079-G000003-DONE.json');
const dependencyAbort = read('../returns/portfolio-allocator-dependency-recovery-gate-v1/RETURN-20261002T121749Z-ROUTE_ABORTED-f6bac1d273db.json');

assert(new Date(chatPin.expires_at) < auditAt, 'chat-canary historical execution PIN should be expired at audit snapshot');
assert(new Date(byId['portfolio-chat-canary-served-contract-reconcile-v1'].recursive_lineage.expires_at) > auditAt, 'chat-canary proposal TTL should still be live at audit snapshot');
assert.equal(effDone.outcome, 'DONE', 'EFF016B descendant must have durable DONE evidence');
assert.equal(dependencyAbort.outcome, 'ROUTE_ABORTED', 'dependency-gate descendant must retain durable route blocker evidence');

const lifecycleSample = [
  {
    job_id: 'portfolio-chat-canary-served-contract-reconcile-v1',
    lifecycle_class: 'CLAIMABLE',
    evidence_ref: 'coordination/portfolio/pins/portfolio-chat-canary-served-contract-reconcile-v1/G000001.json',
    rationale_code: 'EXECUTION_PIN_EXPIRED_PROPOSAL_TTL_LIVE'
  },
  {
    job_id: 'portfolio-eff016b-transport-denial-filter-compatibility-v1',
    lifecycle_class: 'CONSUMED',
    evidence_ref: 'coordination/portfolio/returns/portfolio-eff016b-transport-denial-filter-compatibility-v1/RETURN-wc-20261002T093330Z-e10abfbb8079-G000003-DONE.json',
    rationale_code: 'DURABLE_DONE_RETURN'
  },
  {
    job_id: 'portfolio-allocator-dependency-recovery-gate-v1',
    lifecycle_class: 'BLOCKED_GROUNDED',
    evidence_ref: 'coordination/portfolio/returns/portfolio-allocator-dependency-recovery-gate-v1/RETURN-20261002T121749Z-ROUTE_ABORTED-f6bac1d273db.json',
    blocker_ref: 'coordination/portfolio/returns/portfolio-allocator-dependency-recovery-gate-v1/RETURN-20261002T121749Z-ROUTE_ABORTED-f6bac1d273db.json',
    blocker_code: 'STALE_ALLOCATOR_ROUTE_MISSING_ALLOWED_PATHS'
  }
];

const allowedClasses = new Set(policy.lifecycle_audit_contract.allowed_classes);
for (const row of lifecycleSample) {
  assert(byId[row.job_id], `lifecycle audit references unknown descendant ${row.job_id}`);
  assert(allowedClasses.has(row.lifecycle_class), `unsupported lifecycle class ${row.lifecycle_class}`);
  assert(row.evidence_ref, `${row.job_id} lifecycle classification needs durable evidence`);
  if (row.lifecycle_class === 'BLOCKED_GROUNDED') {
    assert(row.blocker_ref && row.blocker_code, `${row.job_id} grounded blocker requires blocker_ref + blocker_code`);
  }
}

const count = lifecycleClass => lifecycleSample.filter(row => row.lifecycle_class === lifecycleClass).length;
const lifecycleMetrics = {
  sample_n: lifecycleSample.length,
  consumed_n: count('CONSUMED'),
  claimable_n: count('CLAIMABLE'),
  blocked_grounded_n: count('BLOCKED_GROUNDED'),
  duplicate_or_superseded_n: count('DUPLICATE_OR_SUPERSEDED'),
  orphan_n: count('ORPHAN'),
  orphan_ratio: count('ORPHAN') / lifecycleSample.length,
  duplicate_ratio: count('DUPLICATE_OR_SUPERSEDED') / lifecycleSample.length
};
assert.deepEqual(lifecycleMetrics, {
  sample_n: 3,
  consumed_n: 1,
  claimable_n: 1,
  blocked_grounded_n: 1,
  duplicate_or_superseded_n: 0,
  orphan_n: 0,
  orphan_ratio: 0,
  duplicate_ratio: 0
});

console.log('GUIDE_RECURSIVE_REAL_SUCCESSOR_CONTRACT_PASS');
console.log(JSON.stringify({
  sample_n: realChildren.length,
  orphan_n: lifecycleMetrics.orphan_n,
  orphan_ratio: lifecycleMetrics.orphan_ratio,
  duplicate_n: lifecycleMetrics.duplicate_or_superseded_n,
  duplicate_ratio: lifecycleMetrics.duplicate_ratio,
  lifecycle: lifecycleMetrics,
  missing_by_job: missingByJob
}));
