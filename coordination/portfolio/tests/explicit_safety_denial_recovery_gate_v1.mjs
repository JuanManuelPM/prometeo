#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const {
  buildFastAllocator,
  normalizeExplicitSafetyDenialAuthorityGates,
  authorityBoundaryGate
} = await import(pathToFileURL(path.join(root, 'scripts/build-fast-allocator.mjs')).href);

const denialRef = 'coordination/portfolio/returns/portfolio-stt-private-audio-receipt-privacy-guard-v1/RETURN-wc-20261003T004101Z-0368f23528e5-G000006-BOUNDARY.json';
const denied = {
  job_id: 'portfolio-stt-private-audio-receipt-privacy-guard-v1',
  dedupe_key: 'tool:stt:private-audio:receipt-privacy-guard:v1',
  project_id: 'audio-speech-to-text',
  title: 'STT privacy guard',
  priority: 90,
  state: 'replaceable',
  pin_generation: 6,
  claimed_at: '2026-10-03T01:03:00Z',
  last_signal_at: '2026-10-03T01:13:02Z',
  // Reproduce the real Live Feed shape: compact latest/recent rows omit completion_class.
  latest_return: {
    path: denialRef,
    generation: 6,
    outcome: 'BOUNDARY',
    returned_at: '2026-10-03T01:13:02Z',
    summary: 'Inherited explicit safety denial; do not retry or bypass.'
  },
  recent_return_evidence: [{
    path: denialRef,
    outcome: 'BOUNDARY',
    returned_at: '2026-10-03T01:13:02Z'
  }],
  // Full durable return rows retain the causal completion class.
  returns: [{
    path: denialRef,
    generation: 6,
    outcome: 'BOUNDARY',
    completion_class: 'EXPLICIT_SAFETY_BOUNDARY_INHERITED',
    returned_at: '2026-10-03T01:13:02Z',
    summary: 'Inherited explicit safety denial; do not retry or bypass.'
  }]
};

const ordinary = {
  job_id: 'ordinary-retry-safe-control',
  dedupe_key: 'fixture:ordinary-retry-safe-control:v1',
  project_id: 'fixture',
  title: 'Ordinary retry-safe control',
  priority: 10,
  state: 'replaceable',
  pin_generation: 2,
  claimed_at: '2026-10-03T01:00:00Z',
  last_signal_at: '2026-10-03T01:00:00Z',
  latest_return: null,
  recent_return_evidence: [],
  returns: []
};

const feedFor = jobs => ({
  generated_at: '2026-10-03T01:40:00Z',
  source_sha: 'explicit-safety-denial-fixture-source',
  summary: {workers:{}},
  workers: [],
  plans: [],
  projects: [{project_id:'fixture', label:'Fixture', jobs}]
});

const normalized = normalizeExplicitSafetyDenialAuthorityGates(feedFor([denied, ordinary]));
const normalizedDenied = normalized.feed.projects[0].jobs.find(row => row.job_id === denied.job_id);
assert.equal(normalized.decisions.length, 1);
assert.equal(normalized.decisions[0].normalized, true);
assert.equal(normalizedDenied.authority_gate.status, 'OPEN');
assert.equal(normalizedDenied.authority_gate.boundary_return_ref, denialRef);
assert.equal(normalizedDenied.authority_gate.required_authority.kind, 'EXPLICIT_SAFETY_DENIAL_LIFT');
assert.equal(authorityBoundaryGate(normalizedDenied).eligible, false);
assert.equal(authorityBoundaryGate(normalizedDenied).reason, 'AUTHORITY_DEBT_UNSATISFIED');

const blocked = buildFastAllocator(
  feedFor([denied, ordinary]),
  {status:'HEALTHY',metrics:{},reasons:[]},
  {recoveryPolicies:[],roleContext:null}
);
assert.equal(
  blocked.recovery.some(row => row.job_id === denied.job_id),
  false,
  'explicit safety denial must suppress ordinary age-based recovery'
);
assert.equal(
  blocked.recovery_attention.some(row => row.job_id === denied.job_id && row.reason === 'AUTHORITY_DEBT_UNSATISFIED'),
  true,
  'explicit safety denial must remain visible as recovery attention'
);
assert.equal(
  blocked.recovery.some(row => row.job_id === ordinary.job_id),
  true,
  'generic retry-safe recovery must remain unchanged'
);
assert.equal(blocked.explicit_safety_denial_recovery_gate.synthesized_open_gates, 1);

const lifted = {
  ...denied,
  authority_gate: {
    schema: 'prometeo.portfolio-authority-gate/v1',
    gate: 'NEW_AUTHORITY_GATE',
    status: 'SATISFIED',
    boundary_return_ref: denialRef,
    boundary_returned_at: '2026-10-03T01:13:02Z',
    opened_at: '2026-10-03T01:13:02Z',
    required_authority: {kind:'EXPLICIT_SAFETY_DENIAL_LIFT'},
    satisfied_by_evidence_ref_or_null: 'coordination/portfolio/evidence/fixture/explicit-safety-denial-lift.json',
    satisfied_at_or_null: '2026-10-03T01:41:00Z',
    satisfied_ref_exists: true
  }
};
const liftedNormalization = normalizeExplicitSafetyDenialAuthorityGates(feedFor([lifted]));
assert.equal(liftedNormalization.decisions[0].normalized, false);
assert.equal(liftedNormalization.decisions[0].reason, 'EXPLICIT_SAFETY_GATE_ALREADY_PRESENT');
assert.equal(authorityBoundaryGate(liftedNormalization.feed.projects[0].jobs[0]).eligible, true);

const reopened = buildFastAllocator(
  feedFor([lifted]),
  {status:'HEALTHY',metrics:{},reasons:[]},
  {recoveryPolicies:[],roleContext:null}
);
assert.equal(
  reopened.recovery.some(row => row.job_id === denied.job_id),
  true,
  'durable explicit lift evidence after the denial must reopen bounded recovery'
);

console.log('EXPLICIT_SAFETY_DENIAL_RECOVERY_GATE_PASS');
