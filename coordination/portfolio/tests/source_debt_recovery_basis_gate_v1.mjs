#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const { buildFastAllocator, recoveryBasisGate } = await import(pathToFileURL(path.join(root, 'scripts/build-fast-allocator.mjs')).href);
const { buildClaimFrontier } = await import(pathToFileURL(path.join(root, 'scripts/build-claim-frontier.mjs')).href);

const joseReturn = readJson('coordination/portfolio/returns/portfolio-jose-v11-pinned-payload-corruption-recovery-v1/RETURN-wc-20260918T0043Z-mesh03-7f2c-G000003-ROUTE_ABORTED.json');
assert.equal(joseReturn.outcome, 'ROUTE_ABORTED');
assert.match(joseReturn.summary, /SOURCE_DEBT/);

const joseV12DebtReturn = readJson('coordination/portfolio/returns/portfolio-jose-v12-pinned-v11-material-recovery-v1/RETURN-WC-JOSE-V11-MATERIAL-BOUNDARY-20260918T011637Z-GPT56SOL-A7D4.json');
const joseV12LatestReturn = readJson('coordination/portfolio/returns/portfolio-jose-v12-pinned-v11-material-recovery-v1/RETURN-wc-20260918T013450Z-d8c55ec2-G000004-ROUTE_ABORTED.json');
assert.equal(joseV12DebtReturn.source_debt.status, 'OPEN');
assert.equal(joseV12DebtReturn.search_coverage.git_history.result, 'NO_EXACT_MATCH');
assert.equal(joseV12DebtReturn.search_coverage.git_history.exact_matches, 0);
assert.equal(joseV12DebtReturn.exact_source_found, false);

const sourceDebt = {
  job_id: 'portfolio-jose-v11-pinned-payload-corruption-recovery-v1',
  dedupe_key: 'jose:v11-pinned-payload-corruption-recovery:v1',
  project_id: 'jose',
  title: 'Recover byte-complete Jose V11 pinned payload',
  priority: 92,
  state: 'replaceable',
  pin_generation: 3,
  claimed_at: '2026-09-18T00:52:45Z',
  last_signal_at: joseReturn.returned_at,
  evidence: [
    'coordination/portfolio/evidence/portfolio-jose-v12-map-runtime-verification-v1/RUNTIME-WC-20260917T2041Z-A7F3C9.json',
    'coordination/workstreams/jose-study-design-20260911/material/PROMETEO_JOSE_RECOVERY_ENGINE_V11.html.gz.b64@158357fe4e1cb672e4574d9ebe6f317b9418a30f'
  ],
  created_at: '2026-09-17T22:31:05Z',
  latest_pin_recovery_basis: {
    allocator_generated_at: '2026-09-18T00:52:23.317Z',
    predecessor_last_signal_at: '2026-09-18T00:40:27Z',
    allocator_state: 'replaceable'
  },
  latest_return: {
    path: 'coordination/portfolio/returns/portfolio-jose-v11-pinned-payload-corruption-recovery-v1/RETURN-wc-20260918T0043Z-mesh03-7f2c-G000003-ROUTE_ABORTED.json',
    outcome: joseReturn.outcome,
    summary: joseReturn.summary,
    returned_at: joseReturn.returned_at
  }
};

const ordinary = {
  job_id: 'ordinary-silent-owner',
  dedupe_key: 'fixture:ordinary-silent-owner:v1',
  project_id: 'fixture',
  title: 'ordinary silent owner',
  priority: 10,
  state: 'replaceable',
  pin_generation: 1,
  claimed_at: '2026-09-18T00:40:00Z',
  last_signal_at: '2026-09-18T00:40:00Z',
  latest_return: null
};

const fixed = {
  job_id: 'fixed-fixture',
  dedupe_key: 'fixture:fixed:v1',
  project_id: 'fixture',
  title: 'fixed fixture',
  priority: 9,
  state: 'replaceable',
  pin_generation: 1,
  claimed_at: '2026-09-18T00:30:00Z',
  last_signal_at: '2026-09-18T00:30:00Z',
  latest_return: null
};

const feedFor = jobs => ({
  generated_at: '2026-09-18T01:15:00Z',
  source_sha: 'source-debt-gate-fixture',
  summary: { workers: {} },
  workers: [],
  plans: [],
  projects: [{ project_id: 'fixture', label: 'Fixture', jobs }]
});

const policies = [{
  job_id: 'fixed-fixture',
  mode: 'fixed_generation',
  fixed_generation: 1,
  ordinary_next_generation_eligible: false,
  attention_route: 'FIXED_GENERATION_RECONCILE'
}];

const first = buildFastAllocator(
  feedFor([sourceDebt, ordinary, fixed]),
  { status: 'HEALTHY', metrics: {}, reasons: [] },
  { recoveryPolicies: policies, roleContext: null }
);

assert.equal(
  first.recovery.some(row => row.job_id === sourceDebt.job_id),
  false,
  'unchanged evidence-bound SOURCE_DEBT must not emit a time-only next generation'
);
assert.equal(
  first.recovery_attention.some(row => row.job_id === sourceDebt.job_id && row.reason === 'SOURCE_DEBT_BASIS_UNCHANGED'),
  true,
  'suppressed SOURCE_DEBT must remain visible as nonterminal recovery attention'
);
assert.equal(first.recovery.some(row => row.job_id === ordinary.job_id), true, 'ordinary stale-owner recovery must remain unchanged');
assert.equal(first.recovery.some(row => row.job_id === fixed.job_id), false, 'fixed-generation fixture must not leak into ordinary recovery');
assert.equal(first.fixed_generation_attention.some(row => row.job_id === fixed.job_id), true, 'fixed-generation attention must remain unchanged');

const repeated = buildFastAllocator(
  feedFor([sourceDebt, ordinary, fixed]),
  { status: 'HEALTHY', metrics: {}, reasons: [] },
  { recoveryPolicies: policies, roleContext: null }
);
assert.equal(repeated.recovery.some(row => row.job_id === sourceDebt.job_id), false, 'repeated allocator builds must stay suppressed without a new basis');

const newBasis = {
  ...sourceDebt,
  recovery_basis: {
    revision: 1,
    updated_at: '2026-09-18T01:00:00Z',
    evidence: ['external-artifact:v11-byte-complete'],
    required_capabilities: ['external_artifact_reader']
  },
  required_capabilities: ['external_artifact_reader'],
  updated_at: '2026-09-18T01:00:00Z'
};
assert.equal(recoveryBasisGate(newBasis).eligible, true, 'materially new durable basis must re-enable recovery');

const withBasis = buildFastAllocator(
  feedFor([newBasis]),
  { status: 'HEALTHY', metrics: {}, reasons: [] },
  { recoveryPolicies: [], roleContext: null }
);
const g4 = withBasis.recovery.find(row => row.job_id === sourceDebt.job_id);
assert.ok(g4, 'new recovery basis must expose deterministic next generation');
assert.equal(g4.next_generation, 4);
assert.equal(g4.claim_payload_shape.recovery_basis_or_null.basis_revision, 1);
assert.ok(g4.claim_payload_shape.recovery_basis_or_null.basis_fingerprint);

const repeatedAfterCompletedG4 = {
  ...newBasis,
  pin_generation: 4,
  claimed_at: '2026-09-18T01:01:00Z',
  last_signal_at: '2026-09-18T01:05:00Z',
  latest_pin_recovery_basis: g4.claim_payload_shape.recovery_basis_or_null,
  latest_return: {
    ...sourceDebt.latest_return,
    returned_at: '2026-09-18T01:05:00Z'
  }
};
assert.equal(recoveryBasisGate(repeatedAfterCompletedG4).eligible, false, 'same stamped basis must suppress another completed SOURCE_DEBT retry');

const silentAfterG4 = {
  ...repeatedAfterCompletedG4,
  latest_return: sourceDebt.latest_return,
  last_signal_at: '2026-09-18T01:01:00Z'
};
assert.equal(
  recoveryBasisGate(silentAfterG4).reason,
  'SILENT_OWNER_STALE_AFTER_LAST_RETURN',
  'a worker that claims a new basis and then goes silent must preserve ordinary stale-owner recovery'
);
assert.equal(recoveryBasisGate(silentAfterG4).eligible, true);

const basis2 = {
  ...repeatedAfterCompletedG4,
  recovery_basis: {
    revision: 2,
    updated_at: '2026-09-18T01:06:00Z',
    evidence: ['external-artifact:v11-byte-complete-v2'],
    retry_safe_trigger: 'EXTERNAL_ARTIFACT_REVISION_2'
  },
  updated_at: '2026-09-18T01:06:00Z'
};

assert.equal(recoveryBasisGate(basis2).eligible, true, 'new artifact/evidence revision or retry-safe trigger must re-enable recovery');

const structuredJoseDebt = {
  job_id: 'portfolio-jose-v12-pinned-v11-material-recovery-v1',
  dedupe_key: 'jose:v12-pinned-v11-material-recovery:v1',
  project_id: 'jose',
  title: 'Recover byte-complete Jose V11 material',
  priority: 92,
  state: 'replaceable',
  pin_generation: 4,
  claimed_at: '2026-09-18T01:35:00Z',
  last_signal_at: joseV12LatestReturn.returned_at,
  latest_return: {
    path: 'coordination/portfolio/returns/portfolio-jose-v12-pinned-v11-material-recovery-v1/RETURN-wc-20260918T013450Z-d8c55ec2-G000004-ROUTE_ABORTED.json',
    outcome: joseV12LatestReturn.outcome,
    summary: 'Post-claim validation found no materially new recovery basis.',
    returned_at: joseV12LatestReturn.returned_at
  },
  latest_source_debt_return: {
    path: 'coordination/portfolio/returns/portfolio-jose-v12-pinned-v11-material-recovery-v1/RETURN-WC-JOSE-V11-MATERIAL-BOUNDARY-20260918T011637Z-GPT56SOL-A7D4.json',
    returned_at: joseV12DebtReturn.returned_at,
    status: joseV12DebtReturn.source_debt.status,
    exhaustive_negative: (
      joseV12DebtReturn.exact_source_found === false &&
      joseV12DebtReturn.search_coverage.git_history.result === 'NO_EXACT_MATCH' &&
      joseV12DebtReturn.search_coverage.git_history.exact_matches === 0
    ),
    structurally_valid: Boolean(
      joseV12DebtReturn.source_debt.status === 'OPEN' &&
      joseV12DebtReturn.source_debt.missing &&
      joseV12DebtReturn.source_debt.acceptable_future_source &&
      joseV12DebtReturn.exact_source_found === false &&
      joseV12DebtReturn.search_coverage.git_history.result === 'NO_EXACT_MATCH' &&
      joseV12DebtReturn.search_coverage.git_history.exact_matches === 0
    )
  }
};

const structuredGate = recoveryBasisGate(structuredJoseDebt);
assert.equal(structuredGate.eligible, false, 'structured OPEN exhaustive-negative SOURCE_DEBT must suppress time-only recovery even without summary keywords');
assert.equal(structuredGate.reason, 'SOURCE_DEBT_BASIS_UNCHANGED');

const structuredAllocator = buildFastAllocator(
  feedFor([structuredJoseDebt]),
  { status: 'HEALTHY', metrics: {}, reasons: [] },
  { recoveryPolicies: [], roleContext: null }
);
assert.equal(
  structuredAllocator.recovery.some(row => row.job_id === structuredJoseDebt.job_id),
  false,
  'portfolio-jose-v12-pinned-v11-material-recovery-v1 must not emit a G5 recovery from age alone'
);
assert.equal(
  structuredAllocator.recovery_attention.some(row => row.job_id === structuredJoseDebt.job_id && row.reason === 'SOURCE_DEBT_BASIS_UNCHANGED'),
  true,
  'structured SOURCE_DEBT remains visible as unresolved recovery attention'
);

const structuredWithNewBasis = {
  ...structuredJoseDebt,
  recovery_basis: {
    revision: 1,
    updated_at: '2026-09-18T01:47:00Z',
    evidence: ['external-artifact:new-byte-exact-v11-source']
  },
  updated_at: '2026-09-18T01:47:00Z'
};
assert.equal(recoveryBasisGate(structuredWithNewBasis).eligible, true, 'durable evidence newer than the latest return must reopen bounded recovery');
assert.equal(recoveryBasisGate(structuredWithNewBasis).reason, 'SOURCE_DEBT_BASIS_CHANGED');

const malformedStructuredDebt = {
  ...structuredJoseDebt,
  latest_source_debt_return: {
    ...structuredJoseDebt.latest_source_debt_return,
    structurally_valid: false,
    exhaustive_negative: false
  }
};
assert.equal(recoveryBasisGate(malformedStructuredDebt).eligible, false, 'malformed structured SOURCE_DEBT must fail closed');
assert.equal(recoveryBasisGate(malformedStructuredDebt).reason, 'SOURCE_DEBT_MALFORMED_FAIL_CLOSED');


const dependentBoundaryRef = 'coordination/portfolio/returns/portfolio-jose-v12-payload-base64-runtime-fix-v1/RETURN-wc-prod01-gpt56sol-20260918T115600Z-a7f3-G000005-BOUNDARY.json';
const dependentBoundary = readJson(dependentBoundaryRef);
const dependencyReturnRef = 'coordination/portfolio/returns/portfolio-jose-v12-pinned-v11-material-recovery-v1/RETURN-WC-JOSE-V11-MATERIAL-BOUNDARY-20260918T011637Z-GPT56SOL-A7D4.json';
const liveTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prometeo-source-debt-live-'));
const liveOut = path.join(liveTmp, 'feed.json');
const liveRun = spawnSync(
  process.execPath,
  [path.join(root, '.github/scripts/build-live-feed.mjs'), root, liveOut],
  { cwd: root, encoding: 'utf8' }
);
assert.equal(liveRun.status, 0, `live feed build must succeed: ${liveRun.stderr || liveRun.stdout}`);
const liveFeed = JSON.parse(fs.readFileSync(liveOut, 'utf8'));
const dependentProjection = (liveFeed.projects || [])
  .flatMap(project => project.jobs || [])
  .find(job => job.job_id === 'portfolio-jose-v12-payload-base64-runtime-fix-v1');
assert.ok(dependentProjection, 'dependent Jose payload job must remain projected in Live feed');
assert.equal(dependentProjection.source_debt_dependency?.ref_bounded, true, 'dependency must use one bounded exact portfolio return ref');
assert.equal(dependentProjection.source_debt_dependency?.structurally_valid, true, 'exact dependency ref must resolve to valid structured SOURCE_DEBT');
assert.equal(dependentProjection.source_debt_dependency?.return_ref, dependencyReturnRef);
assert.equal(dependentProjection.source_debt_dependency?.source_debt?.status, 'OPEN');
assert.equal(dependentProjection.source_debt_dependency?.source_debt?.path, dependencyReturnRef);

const dependentSourceDebt = {
  job_id: 'portfolio-jose-v12-payload-base64-runtime-fix-v1',
  dedupe_key: 'jose:v12-payload-base64-runtime-fix:v1',
  project_id: 'jose',
  title: 'Repair Jose V12 pinned payload browser decode and rerun runtime gate',
  priority: 88,
  state: 'replaceable',
  pin_generation: 5,
  claimed_at: '2026-09-18T11:59:00Z',
  last_signal_at: dependentBoundary.returned_at,
  created_at: '2026-09-17T20:42:30Z',
  evidence: dependentProjection.evidence || [],
  required_capabilities: [],
  source_debt_dependency: dependentProjection.source_debt_dependency,
  latest_return: {
    path: dependentBoundaryRef,
    outcome: dependentBoundary.outcome,
    summary: dependentBoundary.summary,
    returned_at: dependentBoundary.returned_at
  },
  latest_pin_recovery_basis: null
};

const dependentGate = recoveryBasisGate(dependentSourceDebt);
assert.equal(dependentGate.eligible, false, 'dependent SOURCE_DEBT must suppress time-only recovery');
assert.equal(dependentGate.reason, 'SOURCE_DEBT_BASIS_UNCHANGED');
assert.equal(dependentGate.source_debt?.dependency_job_id, 'portfolio-jose-v12-pinned-v11-material-recovery-v1');
assert.equal(dependentGate.source_debt?.dependency_return_ref, dependencyReturnRef);

const dependentAllocator = buildFastAllocator(
  feedFor([dependentSourceDebt]),
  { status: 'HEALTHY', metrics: {}, reasons: [] },
  { recoveryPolicies: [], roleContext: null }
);
assert.equal(
  dependentAllocator.recovery.some(row => row.job_id === dependentSourceDebt.job_id),
  false,
  'dependent wrapper must not emit G6 from elapsed time while referenced SOURCE_DEBT is unchanged'
);
const dependentAttention = dependentAllocator.recovery_attention.find(row => row.job_id === dependentSourceDebt.job_id);
assert.ok(dependentAttention, 'dependent SOURCE_DEBT must remain visible in recovery_attention');
assert.equal(dependentAttention.reason, 'SOURCE_DEBT_BASIS_UNCHANGED');
assert.equal(dependentAttention.source_debt?.dependency_return_ref, dependencyReturnRef);

const dependentClaimFrontier = buildClaimFrontier(dependentAllocator);
assert.equal(
  dependentClaimFrontier.candidates.some(row => row.job_id === dependentSourceDebt.job_id),
  false,
  'dependent SOURCE_DEBT must remain non-claimable in compact claim frontier'
);
const dependentFrontierAttention = dependentClaimFrontier.recovery_attention.find(row => row.job_id === dependentSourceDebt.job_id);
assert.ok(dependentFrontierAttention, 'compact claim frontier must keep dependent SOURCE_DEBT observable');
assert.equal(dependentFrontierAttention.reason, 'SOURCE_DEBT_BASIS_UNCHANGED');
assert.equal(dependentFrontierAttention.source_debt_job_id, 'portfolio-jose-v12-pinned-v11-material-recovery-v1');
assert.equal(dependentFrontierAttention.source_debt_ref, dependencyReturnRef);
assert.equal(dependentFrontierAttention.ordinary_claim_eligible, false);

const dependentWithNewBasis = {
  ...dependentSourceDebt,
  recovery_basis: {
    revision: 1,
    updated_at: '2026-09-18T12:10:00Z',
    evidence: ['external-artifact:intact-v11-byte-exact-source'],
    retry_safe_trigger: 'AUTHORITATIVE_V11_SOURCE_RECOVERED'
  },
  updated_at: '2026-09-18T12:10:00Z'
};
const dependentChangedGate = recoveryBasisGate(dependentWithNewBasis);
assert.equal(dependentChangedGate.eligible, true, 'materially new durable basis must reopen dependent SOURCE_DEBT recovery');
assert.equal(dependentChangedGate.reason, 'SOURCE_DEBT_BASIS_CHANGED');

const dependentReopened = buildFastAllocator(
  feedFor([dependentWithNewBasis]),
  { status: 'HEALTHY', metrics: {}, reasons: [] },
  { recoveryPolicies: [], roleContext: null }
);
const dependentG6 = dependentReopened.recovery.find(row => row.job_id === dependentSourceDebt.job_id);
assert.ok(dependentG6, 'new durable basis must expose one deterministic dependent G6');
assert.equal(dependentG6.next_generation, 6);
assert.ok(dependentG6.claim_payload_shape.recovery_basis_or_null.basis_fingerprint);
assert.equal(
  dependentG6.claim_payload_shape.recovery_basis_or_null.source_debt_dependency_job_id,
  'portfolio-jose-v12-pinned-v11-material-recovery-v1'
);
assert.equal(
  dependentG6.claim_payload_shape.recovery_basis_or_null.source_debt_dependency_return_ref,
  dependencyReturnRef
);

console.log('SOURCE_DEBT_RECOVERY_BASIS_GATE_PASS');
