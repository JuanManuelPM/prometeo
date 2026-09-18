#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const { buildFastAllocator, authorityBoundaryGate } = await import(pathToFileURL(path.join(root, 'scripts/build-fast-allocator.mjs')).href);

const jobId = 'portfolio-facultad-discover-then-bind-canonical-identity-v1';
const returnRef = 'coordination/portfolio/returns/portfolio-facultad-discover-then-bind-canonical-identity-v1/RETURN-wc-20260917T2234-8f2c91-G000005-ROUTE_ABORTED.json';
const gateRef = 'coordination/portfolio/authority-gates/portfolio-facultad-discover-then-bind-canonical-identity-v1.json';
const g5 = readJson(returnRef);
const gateDoc = readJson(gateRef);

assert.equal(g5.outcome, 'ROUTE_ABORTED');
assert.match(g5.reason, /STALE_HINT|AUTHORITY/i);
assert.equal(gateDoc.schema, 'prometeo.portfolio-authority-gate/v1');
assert.equal(gateDoc.gate, 'NEW_AUTHORITY_GATE');
assert.equal(gateDoc.status, 'OPEN');
assert.equal(gateDoc.boundary_return_ref, returnRef);

const compactGate = {
  path: gateRef,
  schema: gateDoc.schema,
  gate: gateDoc.gate,
  status: gateDoc.status,
  boundary_return_ref: gateDoc.boundary_return_ref,
  boundary_returned_at: gateDoc.boundary_returned_at,
  opened_at: gateDoc.opened_at,
  required_authority: gateDoc.required_authority,
  satisfied_by_evidence_ref_or_null: gateDoc.satisfied_by_evidence_ref_or_null,
  satisfied_at_or_null: gateDoc.satisfied_at_or_null,
  satisfied_ref_exists: false
};

const facultad = {
  job_id: jobId,
  dedupe_key: 'facultad:discover-then-bind:canonical-identity:v1',
  project_id: 'facultad-parciales',
  title: 'Discover then bind Facultad canonical identity',
  priority: 90,
  state: 'replaceable',
  pin_generation: 5,
  claimed_at: '2026-09-18T01:35:10Z',
  last_signal_at: g5.returned_at,
  latest_return: {
    path: returnRef,
    outcome: g5.outcome,
    summary: g5.summary,
    returned_at: g5.returned_at,
    worker_id: g5.worker_id
  },
  authority_gate: compactGate
};

const ordinary = {
  job_id: 'ordinary-retry-safe-authority-control',
  dedupe_key: 'fixture:ordinary-retry-safe-authority-control:v1',
  project_id: 'fixture',
  title: 'Ordinary retry-safe control',
  priority: 10,
  state: 'replaceable',
  pin_generation: 2,
  claimed_at: '2026-09-18T01:20:00Z',
  last_signal_at: '2026-09-18T01:20:00Z',
  latest_return: null
};

const feedFor = jobs => ({
  generated_at: '2026-09-18T01:56:00Z',
  source_sha: 'authority-gate-fixture-source',
  summary: {workers:{}},
  workers: [],
  plans: [],
  projects: [{project_id:'fixture',label:'Fixture',jobs}]
});

const openGate = authorityBoundaryGate(facultad);
assert.equal(openGate.present, true);
assert.equal(openGate.valid, true);
assert.equal(openGate.eligible, false);
assert.equal(openGate.reason, 'AUTHORITY_DEBT_UNSATISFIED');

const blocked = buildFastAllocator(
  feedFor([facultad, ordinary]),
  {status:'HEALTHY',metrics:{},reasons:[]},
  {recoveryPolicies:[],roleContext:null}
);
assert.equal(
  blocked.recovery.some(row => row.job_id === jobId),
  false,
  'Facultad G5 must not emit G6 from elapsed-time replaceability while NEW_AUTHORITY_GATE is OPEN'
);
assert.equal(
  blocked.recovery_attention.some(row => row.job_id === jobId && row.reason === 'AUTHORITY_DEBT_UNSATISFIED'),
  true,
  'OPEN authority debt must remain visible as nonterminal recovery attention'
);
assert.equal(
  blocked.recovery.some(row => row.job_id === ordinary.job_id),
  true,
  'ordinary retry-safe recovery must remain unchanged'
);

const satisfiedGate = {
  ...compactGate,
  status: 'SATISFIED',
  satisfied_by_evidence_ref_or_null: 'coordination/portfolio/evidence/fixture/facultad-owner-authorized-binding.json',
  satisfied_at_or_null: '2026-09-18T01:57:00Z',
  satisfied_ref_exists: true
};
const satisfied = {...facultad, authority_gate:satisfiedGate};
const satisfiedResult = authorityBoundaryGate(satisfied);
assert.equal(satisfiedResult.eligible, true);
assert.equal(satisfiedResult.reason, 'NEW_AUTHORITY_GATE_SATISFIED');

const reopened = buildFastAllocator(
  feedFor([satisfied]),
  {status:'HEALTHY',metrics:{},reasons:[]},
  {recoveryPolicies:[],roleContext:null}
);
const g6 = reopened.recovery.find(row => row.job_id === jobId);
assert.ok(g6, 'durable later authority satisfaction must reopen bounded recovery');
assert.equal(g6.next_generation, 6);
assert.equal(g6.claim_payload_shape.recovery_basis_or_null.authority_gate_ref, gateRef);
assert.equal(g6.claim_payload_shape.recovery_basis_or_null.authority_boundary_return_ref, returnRef);
assert.equal(
  g6.claim_payload_shape.recovery_basis_or_null.authority_satisfied_by_evidence_ref,
  satisfiedGate.satisfied_by_evidence_ref_or_null
);

const missingEvidence = {
  ...facultad,
  authority_gate: {
    ...satisfiedGate,
    satisfied_ref_exists: false
  }
};
assert.equal(authorityBoundaryGate(missingEvidence).eligible, false);
assert.equal(
  authorityBoundaryGate(missingEvidence).reason,
  'AUTHORITY_GATE_SATISFACTION_INVALID_FAIL_CLOSED'
);

const staleSatisfaction = {
  ...facultad,
  authority_gate: {
    ...satisfiedGate,
    satisfied_at_or_null: '2026-09-18T01:37:00Z'
  }
};
assert.equal(authorityBoundaryGate(staleSatisfaction).eligible, false);
assert.equal(
  authorityBoundaryGate(staleSatisfaction).reason,
  'AUTHORITY_GATE_SATISFACTION_INVALID_FAIL_CLOSED'
);

const malformed = {
  ...facultad,
  authority_gate: {
    ...compactGate,
    required_authority: null
  }
};
assert.equal(authorityBoundaryGate(malformed).eligible, false);
assert.equal(authorityBoundaryGate(malformed).reason, 'AUTHORITY_GATE_MALFORMED_FAIL_CLOSED');

console.log('AUTHORITY_BOUNDARY_RECOVERY_GATE_PASS');
