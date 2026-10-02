#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  dependencyRecoveryGate,
  applyDependencyRecoveryGate
} from './build-fast-allocator.mjs';

const boundary = (generation, returnedAt) => ({
  path: `coordination/portfolio/returns/downstream/G${generation}-BOUNDARY.json`,
  generation,
  outcome: 'BOUNDARY',
  returned_at: returnedAt
});

const unresolvedDependency = {
  job_id: 'dependency',
  state: 'replaceable',
  latest_return: {
    path: 'coordination/portfolio/returns/dependency/G000002-BOUNDARY.json',
    outcome: 'BOUNDARY',
    returned_at: '2026-10-02T10:00:00Z'
  }
};

const downstream = {
  job_id: 'downstream',
  state: 'replaceable',
  dependency_ids: ['dependency'],
  pin_generation: 3,
  claimed_at: '2026-10-02T10:25:00Z',
  recent_return_evidence: [
    boundary(1, '2026-10-02T10:10:00Z'),
    boundary(2, '2026-10-02T10:20:00Z'),
    boundary(3, '2026-10-02T10:30:00Z')
  ]
};

const unrelated = {
  job_id: 'unrelated',
  state: 'replaceable',
  pin_generation: 2,
  recent_return_evidence: [boundary(2, '2026-10-02T10:30:00Z')]
};

const blocked = dependencyRecoveryGate(downstream, [downstream, unresolvedDependency, unrelated]);
assert.equal(blocked.eligible, false);
assert.equal(blocked.boundary_count, 3);
assert.equal(blocked.reason, 'DEPENDENCY_TERMINAL_NON_SUCCESS');

const blockedFeed = applyDependencyRecoveryGate({
  projects: [{ id: 'fixture', jobs: [downstream, unresolvedDependency, unrelated] }]
});
const blockedJobs = blockedFeed.feed.projects[0].jobs;
assert.equal(blockedJobs.find(row => row.job_id === 'downstream').state, 'dependency_blocked');
assert.equal(blockedJobs.find(row => row.job_id === 'unrelated').state, 'replaceable');
assert.equal(blockedFeed.decisions.length, 1);
assert.equal(blockedFeed.decisions[0].eligible, false);

const refOnlyDependency = {
  job_id: 'dependency',
  state: 'replaceable',
  recovery_basis: {
    source_ref: 'coordination/portfolio/evidence/dependency/new.json',
    updated_at: '2026-10-02T10:40:00Z'
  }
};
const refOnly = dependencyRecoveryGate(downstream, [downstream, refOnlyDependency, unrelated]);
assert.equal(refOnly.eligible, false, 'source_ref without exact sha256 must not unlock recovery');

const exactEvidenceDependency = {
  job_id: 'dependency',
  state: 'replaceable',
  recovery_basis: {
    source_ref: 'coordination/portfolio/evidence/dependency/new.json',
    source_sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    updated_at: '2026-10-02T10:40:00Z'
  }
};
const exactEvidenceUnlock = dependencyRecoveryGate(downstream, [downstream, exactEvidenceDependency, unrelated]);
assert.equal(exactEvidenceUnlock.eligible, true);
assert.equal(exactEvidenceUnlock.reason, 'DEPENDENCY_MATERIAL_SUCCESS_UNLOCK');

const satisfiedDependency = {
  job_id: 'dependency',
  state: 'done',
  latest_return: {
    path: 'coordination/portfolio/returns/dependency/G000003-DONE.json',
    outcome: 'SUCCESS',
    returned_at: '2026-10-02T10:40:00Z'
  },
  completed_at: '2026-10-02T10:40:00Z'
};

const unlocked = dependencyRecoveryGate(downstream, [downstream, satisfiedDependency, unrelated]);
assert.equal(unlocked.eligible, true);
assert.equal(unlocked.reason, 'DEPENDENCY_MATERIAL_SUCCESS_UNLOCK');
assert.equal(unlocked.unlock_consumed, false);

const consumedDownstream = {
  ...downstream,
  pin_generation: 4,
  claimed_at: '2026-10-02T10:41:00Z'
};
const consumed = dependencyRecoveryGate(consumedDownstream, [consumedDownstream, satisfiedDependency, unrelated]);
assert.equal(consumed.eligible, false);
assert.equal(consumed.reason, 'DEPENDENCY_MATERIAL_SUCCESS_UNLOCK_CONSUMED');
assert.equal(consumed.unlock_consumed, true);

const unrelatedGate = dependencyRecoveryGate(unrelated, [unrelated]);
assert.equal(unrelatedGate.required, false);
assert.equal(unrelatedGate.eligible, true);
assert.equal(unrelatedGate.reason, 'NO_DEPENDENCIES');

process.stdout.write('fast allocator dependency recovery gate v1: PASS\n');
