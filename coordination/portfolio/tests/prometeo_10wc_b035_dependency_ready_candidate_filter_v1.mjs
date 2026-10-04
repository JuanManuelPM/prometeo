import assert from 'node:assert/strict';
import {
  readyDependencyGate,
  applyDependencyRecoveryGate
} from '../../../scripts/build-fast-allocator.mjs';

const feedWith = (dependency, child) => ({
  projects: [{ project_id: 'test-project', jobs: [dependency, child] }]
});

const claimedDependency = { job_id: 'upstream', state: 'claimed' };
const readyChild = { job_id: 'child', state: 'ready', dependency_ids: ['upstream'] };

const directBlocked = readyDependencyGate(readyChild, [claimedDependency, readyChild]);
assert.equal(directBlocked.required, true);
assert.equal(directBlocked.eligible, false);
assert.equal(directBlocked.reason, 'WAIT_FOR_DEPENDENCIES');
assert.deepEqual(directBlocked.blockers.map(row => row.job_id), ['upstream']);

const blocked = applyDependencyRecoveryGate(feedWith(claimedDependency, readyChild));
const blockedChild = blocked.feed.projects[0].jobs.find(job => job.job_id === 'child');
assert.equal(blockedChild.state, 'dependency_blocked');
assert.equal(blockedChild.dependency_recovery_gate.reason, 'WAIT_FOR_DEPENDENCIES');
assert.equal(blocked.decisions[0].gate, 'READY_DEPENDENCY_GATE');
assert.equal(blocked.decisions[0].eligible, false);

const completedDependency = {
  job_id: 'upstream',
  state: 'done',
  completed_at: '2026-10-04T16:00:00Z'
};
const released = applyDependencyRecoveryGate(feedWith(completedDependency, readyChild));
const releasedChild = released.feed.projects[0].jobs.find(job => job.job_id === 'child');
assert.equal(releasedChild.state, 'ready');
assert.equal(released.decisions[0].eligible, true);
assert.equal(released.decisions[0].reason, 'DEPENDENCIES_MATERIALIZED');

const missing = applyDependencyRecoveryGate({
  projects: [{ project_id: 'test-project', jobs: [readyChild] }]
});
assert.equal(missing.feed.projects[0].jobs[0].state, 'dependency_blocked');
assert.equal(missing.decisions[0].blockers[0].reason, 'DEPENDENCY_MISSING');

const independent = applyDependencyRecoveryGate({
  projects: [{ project_id: 'test-project', jobs: [{ job_id: 'independent', state: 'ready' }] }]
});
assert.equal(independent.feed.projects[0].jobs[0].state, 'ready');
assert.equal(independent.decisions.length, 0);

console.log('PASS B035 dependency-aware READY candidate filter');
