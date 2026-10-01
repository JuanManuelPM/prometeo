#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildFastAllocator } from '../../../scripts/build-fast-allocator.mjs';
import { buildClaimFrontier } from '../../../scripts/build-claim-frontier.mjs';

const targetSha256 = '0cf9a40fb53e977dccb40c9755d668a3ee922ccd61883f19229bb4a113139a05';
const dependencyReturnRef = 'coordination/portfolio/returns/portfolio-jose-v12-pinned-v11-material-recovery-v1/RETURN-WC-JOSE-V11-MATERIAL-BOUNDARY-20260918T011637Z-GPT56SOL-A7D4.json';

const policy = {
  schema: 'prometeo.portfolio-recovery-policy/v1',
  job_id: 'portfolio-jose-v12-map-browser-ci-runner-v1',
  mode: 'new_evidence_gate',
  fixed_generation: 3,
  ordinary_next_generation_eligible: false,
  attention_route: 'NEW_EVIDENCE_GATE_RECONCILE',
  gate_id: 'jose-v11-byte-complete-source-v1',
  target_sha256: targetSha256
};

const baseJob = {
  job_id: policy.job_id,
  dedupe_key: 'jose:v12-map-browser:ci-runner:v1',
  project_id: 'jose',
  title: 'José V12 browser CI runner',
  priority: 88,
  state: 'replaceable',
  pin_generation: 3,
  claimed_at: '2026-09-29T04:13:18Z',
  last_signal_at: '2026-09-29T04:13:18Z',
  latest_return: {
    path: 'coordination/portfolio/returns/portfolio-jose-v12-map-browser-ci-runner-v1/RETURN-wc-20260929T034600Z-b8e4d21c7f93-G000002-PARTIAL.json',
    generation: 2,
    outcome: 'PARTIAL',
    returned_at: '2026-09-29T03:54:30Z'
  },
  source_debt_dependency: {
    schema: 'prometeo.source-debt-dependency/v1',
    job_id: 'portfolio-jose-v12-pinned-v11-material-recovery-v1',
    return_ref: dependencyReturnRef,
    structurally_valid: true,
    source_debt: {
      status: 'OPEN',
      exhaustive_negative: true,
      structurally_valid: true,
      path: dependencyReturnRef,
      returned_at: '2026-09-18T01:16:37Z'
    }
  }
};

const feedFor = job => ({
  generated_at: '2026-09-29T11:50:00Z',
  source_sha: 'new-evidence-gate-fixture',
  projects: [{ project_id: job.project_id || 'jose', label: 'José', jobs: [job] }],
  plans: [],
  summary: { workers: {} },
  diagnostics: {}
});

const efficiency = { status: 'HEALTHY', metrics: {}, reasons: [] };

const closed = buildFastAllocator(feedFor(baseJob), efficiency, { recoveryPolicies: [policy], roleContext: null });
assert.equal(closed.recovery.some(row => row.job_id === baseJob.job_id), false, 'elapsed time or stale G3 owner must not expose G4');
const closedAttention = closed.recovery_attention.find(row => row.job_id === baseJob.job_id);
assert.ok(closedAttention, 'unsatisfied exact-byte gate must remain visible as recovery attention');
assert.equal(closedAttention.reason, 'NEW_EVIDENCE_GATE_UNSATISFIED');
assert.equal(closedAttention.new_evidence_gate?.target_sha256, targetSha256);
assert.equal(closedAttention.ordinary_next_generation_eligible, false);
const closedFrontier = buildClaimFrontier(closed);
assert.equal(closedFrontier.candidates.some(row => row.job_id === baseJob.job_id), false, 'unsatisfied gate leaked into compact claim frontier');

const wrongHash = {
  ...baseJob,
  recovery_basis: {
    revision: 1,
    updated_at: '2026-09-29T04:15:00Z',
    source_ref: 'evidence:jose-v11-byte-complete-candidate',
    source_sha256: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    evidence: ['evidence:jose-v11-byte-complete-candidate']
  }
};
const wrong = buildFastAllocator(feedFor(wrongHash), efficiency, { recoveryPolicies: [policy], roleContext: null });
assert.equal(wrong.recovery.some(row => row.job_id === baseJob.job_id), false, 'wrong SHA-256 must not satisfy NEW_EVIDENCE_GATE');
assert.equal(wrong.recovery_attention.find(row => row.job_id === baseJob.job_id)?.reason, 'NEW_EVIDENCE_GATE_SHA_MISMATCH');

const exact = {
  ...baseJob,
  recovery_basis: {
    revision: 1,
    updated_at: '2026-09-29T04:15:00Z',
    source_ref: 'evidence:jose-v11-byte-complete-exact-source',
    source_sha256: targetSha256,
    evidence: ['evidence:jose-v11-byte-complete-exact-source']
  }
};
const opened = buildFastAllocator(feedFor(exact), efficiency, { recoveryPolicies: [policy], roleContext: null });
const g4 = opened.recovery.filter(row => row.job_id === baseJob.job_id);
assert.equal(g4.length, 1, 'exact byte-complete evidence must unlock exactly one bounded route');
assert.equal(g4[0].next_generation, 4);
assert.ok(g4[0].claim_path.endsWith('/G000004.json'));
assert.equal(g4[0].recovery_semantics?.reason, 'NEW_EVIDENCE_GATE_SATISFIED');
assert.equal(buildClaimFrontier(opened).candidates.filter(row => row.job_id === baseJob.job_id).length, 1);

const consumed = {
  ...exact,
  pin_generation: 4,
  claimed_at: '2026-09-29T04:16:00Z'
};
const afterOne = buildFastAllocator(feedFor(consumed), efficiency, { recoveryPolicies: [policy], roleContext: null });
assert.equal(afterOne.recovery.some(row => row.job_id === baseJob.job_id), false, 'same evidence must not unlock G5 after bounded G4 was materialized');
assert.equal(afterOne.recovery_attention.find(row => row.job_id === baseJob.job_id)?.reason, 'NEW_EVIDENCE_GATE_UNLOCK_CONSUMED');

const alumnosPolicy = {
  schema: 'prometeo.portfolio-recovery-policy/v1',
  job_id: 'portfolio-alumnos-jose-v11-browser-ci-runner-v1',
  mode: 'new_evidence_gate',
  fixed_generation: 5,
  ordinary_next_generation_eligible: false,
  attention_route: 'NEW_EVIDENCE_GATE_RECONCILE',
  gate_id: 'jose-v11-byte-complete-source-v1',
  target_sha256: targetSha256
};
const alumnosJob = {
  job_id: alumnosPolicy.job_id,
  dedupe_key: 'alumnos:jose-v11:browser-ci-runner:v1',
  project_id: 'alumnos',
  title: 'José V11 browser CI runner',
  priority: 92,
  state: 'replaceable',
  pin_generation: 5,
  claimed_at: '2026-10-01T19:37:46Z',
  last_signal_at: '2026-10-01T19:41:20Z',
  latest_return: {
    path: 'coordination/portfolio/returns/portfolio-alumnos-jose-v11-browser-ci-runner-v1/wc-20261001T193746Z-623110e95542/return.json',
    generation: 5,
    outcome: 'BOUNDARY',
    returned_at: '2026-10-01T19:41:20Z'
  }
};
const alumnosClosed = buildFastAllocator(feedFor(alumnosJob), efficiency, { recoveryPolicies: [alumnosPolicy], roleContext: null });
assert.equal(alumnosClosed.recovery.some(row => row.job_id === alumnosJob.job_id), false, 'same truncated source must not expose Alumnos G6 from time-only recovery');
assert.equal(alumnosClosed.recovery_attention.find(row => row.job_id === alumnosJob.job_id)?.reason, 'NEW_EVIDENCE_GATE_UNSATISFIED');
assert.equal(buildClaimFrontier(alumnosClosed).candidates.some(row => row.job_id === alumnosJob.job_id), false, 'unsatisfied Alumnos source gate leaked into compact frontier');

const alumnosExact = {
  ...alumnosJob,
  recovery_basis: {
    revision: 1,
    updated_at: '2026-10-01T19:46:00Z',
    source_ref: 'evidence:jose-v11-byte-complete-exact-source',
    source_sha256: targetSha256,
    evidence: ['evidence:jose-v11-byte-complete-exact-source']
  }
};
const alumnosOpened = buildFastAllocator(feedFor(alumnosExact), efficiency, { recoveryPolicies: [alumnosPolicy], roleContext: null });
const g6 = alumnosOpened.recovery.filter(row => row.job_id === alumnosJob.job_id);
assert.equal(g6.length, 1, 'exact byte-complete evidence must unlock exactly one bounded Alumnos route');
assert.equal(g6[0].next_generation, 6);
assert.ok(g6[0].claim_path.endsWith('/G000006.json'));
assert.equal(g6[0].recovery_semantics?.reason, 'NEW_EVIDENCE_GATE_SATISFIED');

const alumnosConsumed = {
  ...alumnosExact,
  pin_generation: 6,
  claimed_at: '2026-10-01T19:47:00Z'
};
const alumnosAfterOne = buildFastAllocator(feedFor(alumnosConsumed), efficiency, { recoveryPolicies: [alumnosPolicy], roleContext: null });
assert.equal(alumnosAfterOne.recovery.some(row => row.job_id === alumnosJob.job_id), false, 'same source evidence must not unlock Alumnos G7 after bounded G6 was materialized');
assert.equal(alumnosAfterOne.recovery_attention.find(row => row.job_id === alumnosJob.job_id)?.reason, 'NEW_EVIDENCE_GATE_UNLOCK_CONSUMED');

console.log(JSON.stringify({
  ok: true,
  stale_owner_suppressed: true,
  wrong_hash_suppressed: true,
  exact_hash_unlocks_one_generation: true,
  same_evidence_cannot_unlock_second_generation: true,
  alumnos_time_only_g6_suppressed: true,
  alumnos_exact_hash_unlocks_one_g6: true,
  alumnos_same_evidence_cannot_unlock_g7: true,
  target_sha256: targetSha256
}, null, 2));
