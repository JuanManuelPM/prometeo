#!/usr/bin/env node
import assert from 'node:assert/strict';
import { normalizeCurrentSourceDebtReturnShapes, recoveryBasisGate } from '../../../scripts/build-fast-allocator.mjs';

const returnRef = 'coordination/portfolio/returns/portfolio-jose-v11-exact-source-recovery-v1/RETURN-wc-test-G000004-SOURCE-DEBT.json';
const joseJob = {
  job_id: 'portfolio-jose-v11-exact-source-recovery-v1',
  state: 'replaceable',
  pin_generation: 4,
  claimed_at: '2026-10-03T01:27:40Z',
  created_at: '2026-10-02T21:52:31Z',
  evidence: ['coordination/portfolio/derived/jose/portfolio-jose-v11-exact-source-recovery-v1.json'],
  latest_return: {
    path: returnRef,
    generation: 4,
    returned_at: '2026-10-03T01:32:08Z',
    outcome: 'BOUNDARY_SOURCE_DEBT_EXACT_V11_BYTES_NOT_FOUND',
    boundary_code: 'SOURCE_DEBT_EXACT_V11_BYTES_NOT_FOUND',
    summary: 'Bounded primary-source recovery found no exact V11 source bytes; the exact source remains unavailable.'
  },
  recent_return_evidence: [{
    path: returnRef,
    generation: 4,
    returned_at: '2026-10-03T01:32:08Z',
    outcome: 'BOUNDARY_SOURCE_DEBT_EXACT_V11_BYTES_NOT_FOUND',
    boundary_code: 'SOURCE_DEBT_EXACT_V11_BYTES_NOT_FOUND',
    summary: 'Bounded primary-source recovery found no exact V11 source bytes.'
  }]
};

const normalized = normalizeCurrentSourceDebtReturnShapes({ projects: [{ project_id: 'jose', jobs: [joseJob] }] });
assert.equal(normalized.decisions.length, 1);
assert.equal(normalized.decisions[0].normalized, true);
const normalizedJob = normalized.feed.projects[0].jobs[0];
assert.deepEqual(normalizedJob.latest_source_debt_return, {
  status: 'OPEN',
  exhaustive_negative: true,
  structurally_valid: true,
  path: returnRef,
  returned_at: '2026-10-03T01:32:08Z',
  normalized_from: 'BOUNDARY_SOURCE_DEBT_RETURN_V1',
  original_outcome: 'BOUNDARY_SOURCE_DEBT_EXACT_V11_BYTES_NOT_FOUND'
});

const unchanged = recoveryBasisGate(normalizedJob);
assert.equal(unchanged.evidence_bound, true);
assert.equal(unchanged.eligible, false);
assert.equal(unchanged.reason, 'SOURCE_DEBT_BASIS_UNCHANGED');

const materiallyNew = recoveryBasisGate({
  ...normalizedJob,
  recovery_basis: {
    revision: 1,
    updated_at: '2026-10-03T01:40:00Z',
    evidence: ['coordination/evidence/new-exact-source-candidate.json']
  }
});
assert.equal(materiallyNew.evidence_bound, true);
assert.equal(materiallyNew.eligible, true);
assert.equal(materiallyNew.reason, 'SOURCE_DEBT_BASIS_CHANGED');

const generic = recoveryBasisGate({
  job_id: 'generic-retry-safe-job',
  state: 'replaceable',
  pin_generation: 2,
  latest_return: {
    path: 'coordination/portfolio/returns/generic/RETURN.json',
    generation: 2,
    returned_at: '2026-10-03T01:32:08Z',
    outcome: 'BOUNDARY',
    summary: 'Transient browser capability boundary.'
  }
});
assert.equal(generic.evidence_bound, false);
assert.equal(generic.eligible, true);
assert.equal(generic.reason, 'NOT_EVIDENCE_BOUND_SOURCE_DEBT');

const unprovenDebtLabel = normalizeCurrentSourceDebtReturnShapes({ projects: [{ jobs: [{
  job_id: 'ambiguous-debt',
  latest_return: {
    path: 'coordination/portfolio/returns/ambiguous/RETURN.json',
    returned_at: '2026-10-03T01:32:08Z',
    outcome: 'BOUNDARY_SOURCE_DEBT',
    summary: 'A source might exist elsewhere.'
  }
}] }] });
assert.equal(unprovenDebtLabel.decisions.length, 0);
assert.equal(unprovenDebtLabel.feed.projects[0].jobs[0].latest_source_debt_return, undefined);

console.log(JSON.stringify({
  status: 'PASS',
  fixture: 'jose-current-source-debt-shape',
  unchanged_basis: unchanged.reason,
  materially_new_basis: materiallyNew.reason,
  generic_retry: generic.reason
}, null, 2));
