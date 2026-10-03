import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildFastAllocator } from '../scripts/build-fast-allocator.mjs';

const efficiency = { status:'OK', metrics:{}, reasons:[] };
const fixedJobId = 'fixed-generation-test-v1';
const baselineEvidence = 'coordination/evidence/old-source.json';
const newEvidence = 'coordination/evidence/new-authoritative-source.json';

const policy = {
  schema:'prometeo.portfolio-recovery-policy/v1',
  job_id:fixedJobId,
  mode:'fixed_generation',
  fixed_generation:6,
  ordinary_next_generation_eligible:false,
  attention_route:'NEW_DURABLE_EVIDENCE_REQUIRED',
  reason:'fixture',
  attention_until:{
    owner_ref:'coordination/portfolio/derived/test.json',
    required_change:'A genuinely new durable source/provenance ref is available.'
  },
  evidence:[baselineEvidence],
  created_at:'2026-10-02T13:15:48Z'
};

const feedFor = job => ({
  generated_at:'2026-10-03T01:40:00Z',
  source_sha:'fixed-generation-test',
  projects:[{
    project_id:'prometeo-autonomous-growth',
    label:'Prometeo',
    jobs:[job]
  }],
  plans:[],
  workers:[],
  summary:{workers:{}}
});

const jobAt = (generation, extra = {}) => ({
  job_id:fixedJobId,
  project_id:'prometeo-autonomous-growth',
  priority:500,
  state:'replaceable',
  required_capabilities:[],
  pin_generation:generation,
  ...extra
});

test('fixed generation stays frozen at G6 while required_change has no new durable evidence', () => {
  const out = buildFastAllocator(feedFor(jobAt(6)), efficiency, { recoveryPolicies:[policy] });
  assert.equal(out.recovery.some(row => row.job_id === fixedJobId), false);
  assert.equal(out.batch_candidates.some(row => row.claim_path?.endsWith('/G000007.json')), false);
  assert.equal(out.fixed_generation_recovery_policy_gate.unlocked, 0);
  assert.equal(out.fixed_generation_recovery_policy_gate.decisions[0].reason, 'FIXED_GENERATION_ATTENTION_UNSATISFIED');
});

test('new durable evidence after policy creation opens exactly one bounded G7 recovery', () => {
  const out = buildFastAllocator(feedFor(jobAt(6, {
    recovery_basis:{
      updated_at:'2026-10-03T01:35:00Z',
      evidence:[newEvidence]
    }
  })), efficiency, { recoveryPolicies:[policy] });
  const row = out.recovery.find(item => item.job_id === fixedJobId);
  assert.ok(row, 'G7 must become recoverable once new durable evidence appears');
  assert.equal(row.next_generation, 7);
  assert.equal(row.claim_path, `coordination/portfolio/pins/${fixedJobId}/G000007.json`);
  assert.equal(out.fixed_generation_recovery_policy_gate.unlocked, 1);
  assert.equal(out.fixed_generation_recovery_policy_gate.decisions[0].reason, 'FIXED_GENERATION_ATTENTION_SATISFIED_ONE_SHOT');
});

test('the same evidence cannot open G8 after the one-shot G7 was consumed', () => {
  const out = buildFastAllocator(feedFor(jobAt(7, {
    recovery_basis:{
      updated_at:'2026-10-03T01:35:00Z',
      evidence:[newEvidence]
    }
  })), efficiency, { recoveryPolicies:[policy] });
  assert.equal(out.recovery.some(row => row.job_id === fixedJobId), false);
  assert.equal(out.batch_candidates.some(row => row.claim_path?.endsWith('/G000008.json')), false);
  assert.equal(out.fixed_generation_recovery_policy_gate.unlocked, 0);
  assert.equal(out.fixed_generation_recovery_policy_gate.decisions[0].reason, 'FIXED_GENERATION_ATTENTION_UNLOCK_CONSUMED');
});

test('unrelated replaceable recovery semantics remain unchanged', () => {
  const unrelated = {
    job_id:'ordinary-recovery-v1',
    project_id:'product-project',
    priority:100,
    state:'replaceable',
    required_capabilities:[],
    pin_generation:4
  };
  const out = buildFastAllocator({
    ...feedFor(jobAt(6)),
    projects:[{ project_id:'product-project', label:'Product', jobs:[unrelated] }]
  }, efficiency, { recoveryPolicies:[policy] });
  const row = out.recovery.find(item => item.job_id === unrelated.job_id);
  assert.ok(row);
  assert.equal(row.next_generation, 5);
  assert.equal(row.claim_path, 'coordination/portfolio/pins/ordinary-recovery-v1/G000005.json');
});

test('real José fixed-generation policy cannot surface G7 without new authoritative source evidence', () => {
  const realPolicy = JSON.parse(fs.readFileSync(
    new URL('../coordination/portfolio/recovery-policies/portfolio-alumnos-jose-v11-authoritative-source-recovery-v1.json', import.meta.url),
    'utf8'
  ));
  const realJob = {
    job_id:realPolicy.job_id,
    project_id:'alumnos',
    priority:500,
    state:'replaceable',
    required_capabilities:[],
    pin_generation:6
  };
  const out = buildFastAllocator(feedFor(realJob), efficiency, { recoveryPolicies:[realPolicy] });
  assert.equal(out.recovery.some(row => row.job_id === realPolicy.job_id), false);
  assert.equal(out.batch_candidates.some(row => row.claim_path?.endsWith('/G000007.json')), false);
  assert.equal(out.fixed_generation_recovery_policy_gate.decisions[0].reason, 'FIXED_GENERATION_ATTENTION_UNSATISFIED');
});
