import assert from 'node:assert/strict';
import { applyUsefulReserveOrdering } from '../../../scripts/useful-reserve-allocator-v1.mjs';

const policy = {
  schema: 'prometeo.guide-useful-reserve-policy/v1',
  status: 'CANARY',
  reserve_target: { floor: 0 }
};

const candidate = job_id => ({ job_id, lane: 'ready' });
const validReserve = (job_id, evidence) => ({
  job_id,
  reserve_contract: {
    evidence,
    owner_current: 'guide',
    consumer: 'integrator',
    done_when: 'deterministic harness passes',
    observable_change: 'allocator choice changes only after higher-priority work is absent'
  }
});

const jobs = [
  { job_id: 'human', human_durable_intent: true },
  { job_id: 'product', kind: 'implementation' },
  { job_id: 'return-backlog', kind: 'recovery' },
  validReserve('reserve-good', 'return:1'),
  { job_id: 'reserve-bad', reserve_contract: { evidence: '', owner_current: 'guide', consumer: null, done_when: 'pass', observable_change: 'x' } },
  validReserve('reserve-good-2', 'exit-audit:2')
];

const mixed = ['reserve-good', 'reserve-bad', 'return-backlog', 'product', 'human', 'reserve-good-2'].map(candidate);
const ordered = applyUsefulReserveOrdering(mixed, { jobs, policy });
assert.deepEqual(
  ordered.ordered.map(row => row.job_id),
  ['human', 'product', 'return-backlog', 'reserve-good', 'reserve-good-2']
);
assert.equal(ordered.report.higher_priority_claimable_before, 3);
assert.equal(ordered.report.verified_reserve_candidates_before, 2);
assert.equal(ordered.report.reserve_admitted, 2);
assert.equal(ordered.report.rejected_reserve, 1);
assert.equal(ordered.report.reserve_floor, 0);
assert.equal(ordered.report.started_exclusive_preemption_attempted, false);

const reserveJobs = Array.from({ length: 8 }, (_, i) => validReserve(`reserve-${i}`, `evidence:${i}`));
const excessShellCase = applyUsefulReserveOrdering(
  reserveJobs.map(row => candidate(row.job_id)),
  { jobs: reserveJobs, policy }
);
assert.equal(excessShellCase.report.higher_priority_claimable_before, 0);
assert.equal(excessShellCase.report.reserve_admitted, 8);
assert.deepEqual(excessShellCase.ordered.map(row => row.job_id), reserveJobs.map(row => row.job_id));

const disabled = applyUsefulReserveOrdering(mixed, { jobs, policy: { ...policy, status: 'DRAFT' } });
assert.deepEqual(disabled.ordered, mixed);
assert.equal(disabled.report.enabled, false);

console.log('PASS useful_reserve_allocator_integration_v1');
