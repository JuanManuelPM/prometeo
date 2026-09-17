import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { computeFrontierPressure, buildSnapshotFromRepo } from '../scripts/compile-frontier-pressure.mjs';

const policy = {
  status: 'CANARY',
  signals: {
    recent_launch_window_minutes: 10,
    heartbeat_target_minutes: 3,
    stale_suspect_minutes: 6,
    recovery_eligible_minutes: 10,
    frontier_floor_absolute: 8,
    frontier_per_recent_launch: 1.5,
    frontier_ceiling: 40,
    unconsumed_returns_trigger: 3,
    replaceable_trigger: 3,
  },
};

const now = '2026-09-17T19:20:00Z';

test('superseded portfolio pin generations do not inflate liveness pressure', () => {
  const result = computeFrontierPressure({
    beacons: [],
    jobs: [{ job_id: 'job-A', status: 'ready' }],
    owners: [
      { job_id: 'job-A', worker_id: 'w1', generation: 1, claimed_at: '2026-09-17T18:40:00Z', retry_safe: true, source: 'portfolio_pin' },
      { job_id: 'job-A', worker_id: 'w2', generation: 2, claimed_at: '2026-09-17T18:50:00Z', retry_safe: true, source: 'portfolio_pin' },
      { job_id: 'job-A', worker_id: 'w3', generation: 3, claimed_at: '2026-09-17T19:19:00Z', retry_safe: true, source: 'portfolio_pin' },
    ],
    terminal_returns: [],
    material_returns: [],
  }, policy, { now });

  assert.equal(result.liveness.active, 1);
  assert.equal(result.liveness.replaceable, 0);
  assert.equal(result.signals.REPLACEABLE_PRESSURE, false);
  assert.equal(result.frontier.claimable_useful_jobs, 0);
});

test('malformed highest portfolio pin generation fails closed instead of reviving an older generation', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-frontier-malformed-pin-'));
  const write = async (rel, value) => {
    const file = path.join(root, rel);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(value));
  };
  await write('coordination/portfolio/PORTFOLIO.json', { projects: [{ jobs: [{ job_id: 'job-A', seed_status: 'ready' }] }] });
  await write('coordination/portfolio/pins/job-A/G000001.json', { job_id: 'job-A', worker_id: 'worker-old', generation: 1, claimed_at: '2026-09-17T19:00:00Z' });
  const malformed = path.join(root, 'coordination/portfolio/pins/job-A/G000002.json');
  await fs.mkdir(path.dirname(malformed), { recursive: true });
  await fs.writeFile(malformed, '{not-json', 'utf8');

  const snapshot = await buildSnapshotFromRepo(root);
  assert.ok(snapshot.owners.some((owner) => owner.job_id === 'job-A' && owner.generation === 2 && owner.source === 'portfolio_pin_malformed'));

  const result = computeFrontierPressure(snapshot, policy, { now });
  const job = result.frontier.claimable_job_ids.includes('job-A');
  assert.equal(job, false);
  assert.equal(result.frontier.claimable_useful_jobs, 0);
  assert.equal(result.liveness.replaceable, 0);
});

test('opportunity owners keep their existing liveness behavior', () => {
  const result = computeFrontierPressure({
    beacons: [],
    jobs: [
      { job_id: 'opp-A', status: 'READY' },
      { job_id: 'opp-B', status: 'READY' },
    ],
    owners: [
      { job_id: 'opp-A', worker_id: 'wa', generation: 0, claimed_at: '2026-09-17T19:00:00Z', retry_safe: true, source: 'opportunity_claim' },
      { job_id: 'opp-B', worker_id: 'wb', generation: 0, claimed_at: '2026-09-17T19:00:00Z', retry_safe: true, source: 'opportunity_claim' },
    ],
    terminal_returns: [],
    material_returns: [],
  }, policy, { now });

  assert.equal(result.liveness.replaceable, 2);
  assert.deepEqual(result.frontier.claimable_job_ids, ['opp-A', 'opp-B']);
});
