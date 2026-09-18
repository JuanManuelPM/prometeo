#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const { buildFastAllocator, recoveryBasisGate } = await import(pathToFileURL(path.join(root, 'scripts/build-fast-allocator.mjs')).href);

const joseReturn = readJson('coordination/portfolio/returns/portfolio-jose-v11-pinned-payload-corruption-recovery-v1/RETURN-wc-20260918T0043Z-mesh03-7f2c-G000003-ROUTE_ABORTED.json');
assert.equal(joseReturn.outcome, 'ROUTE_ABORTED');
assert.match(joseReturn.summary, /SOURCE_DEBT/);

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

console.log('SOURCE_DEBT_RECOVERY_BASIS_GATE_PASS');
