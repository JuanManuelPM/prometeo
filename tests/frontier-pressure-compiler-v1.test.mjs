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

test('computes target claimable from distinct recent workers and clamps floor/ceiling', () => {
  const beacons = Array.from({ length: 10 }, (_, i) => ({ worker_id: `w${i}`, launched_at: '2026-09-17T19:15:00Z' }));
  beacons.push({ worker_id: 'w0', launched_at: '2026-09-17T19:16:00Z' });
  const result = computeFrontierPressure({ beacons, jobs: [], owners: [], terminal_returns: [], material_returns: [] }, policy, { now });
  assert.equal(result.launch_pressure.distinct_recent_workers, 10);
  assert.equal(result.launch_pressure.target_claimable, 15);
  assert.equal(result.signals.FRONTIER_THIN, true);
});

test('excludes terminal jobs and live owners while allowing replaceable retry-safe work', () => {
  const jobs = [
    { job_id: 'a', status: 'ready' },
    { job_id: 'b', status: 'ready' },
    { job_id: 'c', status: 'ready' },
    { job_id: 'd', status: 'ready' },
  ];
  const owners = [
    { job_id: 'a', worker_id: 'wa', claimed_at: '2026-09-17T19:18:00Z', retry_safe: true },
    { job_id: 'b', worker_id: 'wb', claimed_at: '2026-09-17T19:00:00Z', retry_safe: true },
    { job_id: 'd', worker_id: 'wd', claimed_at: '2026-09-17T19:00:00Z', retry_safe: false },
  ];
  const terminal_returns = [{ job_id: 'c', returned_at: '2026-09-17T19:19:00Z', outcome: 'DONE' }];
  const result = computeFrontierPressure({ beacons: [], jobs, owners, terminal_returns, material_returns: [] }, policy, { now });
  assert.deepEqual(result.frontier.claimable_job_ids, ['b']);
  assert.equal(result.liveness.active, 1);
  assert.equal(result.liveness.replaceable, 1);
});

test('heartbeat newer than claim prevents stale takeover', () => {
  const result = computeFrontierPressure({
    beacons: [],
    jobs: [{ job_id: 'a', status: 'ready' }],
    owners: [{ job_id: 'a', worker_id: 'wa', claimed_at: '2026-09-17T19:00:00Z', heartbeat_at: '2026-09-17T19:18:30Z', latest_signal_at: '2026-09-17T19:18:30Z', retry_safe: true }],
    terminal_returns: [], material_returns: [],
  }, policy, { now });
  assert.equal(result.liveness.active, 1);
  assert.equal(result.frontier.claimable_useful_jobs, 0);
});

test('signals replaceable pressure and recent unconsumed returns', () => {
  const owners = ['a', 'b', 'c'].map((job_id, i) => ({ job_id, worker_id: `w${i}`, claimed_at: '2026-09-17T19:00:00Z', retry_safe: true }));
  const jobs = ['a', 'b', 'c'].map((job_id) => ({ job_id, status: 'ready' }));
  const material_returns = [1, 2, 3, 4].map((n) => ({ return_id: `r${n}`, source_path: `returns/r${n}.json`, returned_at: '2026-09-17T19:10:00Z' }));
  const result = computeFrontierPressure({ beacons: [], jobs, owners, terminal_returns: [], material_returns, consumed_return_refs: ['returns/r4.json'] }, policy, { now, returnWindowMinutes: 30 });
  assert.equal(result.signals.REPLACEABLE_PRESSURE, true);
  assert.equal(result.signals.RETURNS_UNCONSUMED, true);
  assert.equal(result.returns.recent_material_unconsumed, 3);
});

test('filesystem builder reads allocator-current portfolio/derived jobs, current queue-ready items and durable state', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-frontier-'));
  const write = async (rel, value) => { const file = path.join(root, rel); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(value)); };
  await write('coordination/guide/METABOLISM_POLICY_V1.json', policy);
  await write('coordination/portfolio/PORTFOLIO.json', { projects: [{ project_id: 'p', priority: 100, jobs: [{ job_id: 'seed', seed_status: 'ready', priority: 100 }] }] });
  await write('coordination/portfolio/derived/p/d.json', { project_id: 'p', job_id: 'derived', seed_status: 'ready', priority: 90 });
  await write('coordination/workers/beacons/w.json', { worker_id: 'w', launched_at: '2026-09-17T19:15:00Z' });
  await write('coordination/portfolio/pins/derived/G000001.json', { job_id: 'derived', worker_id: 'w', generation: 1, claimed_at: '2026-09-17T19:00:00Z' });
  await write('coordination/workers/heartbeats/w/h.json', { worker_id: 'w', job_id: 'derived', heartbeat_at: '2026-09-17T19:19:00Z' });
  await write('coordination/opportunities/Q_QUEUE.json', { queue_id: 'Q', opportunities: [{ opportunity_id: 'opp', status: 'READY', priority: 80 }] });
  await write('coordination/opportunities/returns/opp/r.json', { opportunity_id: 'opp', outcome: 'DONE', returned_at: '2026-09-17T19:18:00Z' });
  const snapshot = await buildSnapshotFromRepo(root);
  assert.equal(snapshot.beacons.length, 1);
  assert.ok(snapshot.jobs.some((j) => j.job_id === 'seed'));
  assert.ok(snapshot.jobs.some((j) => j.job_id === 'derived'));
  assert.ok(!snapshot.jobs.some((j) => j.job_id === 'opp'));
  assert.ok(snapshot.repository_history.opportunity_rows.some((j) => j.opportunity_id === 'opp'));
  assert.ok(snapshot.terminal_returns.some((r) => r.job_id === 'opp'));
  assert.equal(snapshot.owners.find((o) => o.job_id === 'derived').heartbeat_at, '2026-09-17T19:19:00Z');
});

test('filesystem builder does not let a heartbeat for job-B refresh job-A owned by the same worker', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-frontier-cross-job-'));
  const write = async (rel, value) => { const file = path.join(root, rel); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(value)); };
  await write('coordination/portfolio/PORTFOLIO.json', { projects: [{ jobs: [{ job_id: 'job-A', seed_status: 'ready' }] }] });
  await write('coordination/portfolio/pins/job-A/G000001.json', { job_id: 'job-A', worker_id: 'worker-W', generation: 1, claimed_at: '2026-09-17T19:00:00Z' });
  await write('coordination/workers/heartbeats/worker-W/h.json', { worker_id: 'worker-W', job_id: 'job-B', heartbeat_at: '2026-09-17T19:19:00Z' });

  const snapshot = await buildSnapshotFromRepo(root);
  const owner = snapshot.owners.find((o) => o.job_id === 'job-A');
  assert.equal(owner.heartbeat_at, null);
  assert.equal(owner.latest_signal_at, '2026-09-17T19:00:00Z');

  const result = computeFrontierPressure(snapshot, policy, { now });
  assert.deepEqual(result.liveness.replaceable_job_ids, ['job-A']);
  assert.deepEqual(result.frontier.claimable_job_ids, ['job-A']);
});

test('filesystem builder keeps matching job heartbeat active even when same worker has a newer heartbeat elsewhere', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-frontier-matching-job-'));
  const write = async (rel, value) => { const file = path.join(root, rel); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(value)); };
  await write('coordination/portfolio/PORTFOLIO.json', { projects: [{ jobs: [{ job_id: 'job-A', seed_status: 'ready' }] }] });
  await write('coordination/portfolio/pins/job-A/G000001.json', { job_id: 'job-A', worker_id: 'worker-W', generation: 1, claimed_at: '2026-09-17T19:00:00Z' });
  await write('coordination/workers/heartbeats/worker-W/a.json', { worker_id: 'worker-W', job_id: 'job-A', heartbeat_at: '2026-09-17T19:18:00Z' });
  await write('coordination/workers/heartbeats/worker-W/b.json', { worker_id: 'worker-W', job_id: 'job-B', heartbeat_at: '2026-09-17T19:19:30Z' });

  const snapshot = await buildSnapshotFromRepo(root);
  const owner = snapshot.owners.find((o) => o.job_id === 'job-A');
  assert.equal(owner.heartbeat_at, '2026-09-17T19:18:00Z');

  const result = computeFrontierPressure(snapshot, policy, { now });
  assert.equal(result.liveness.active, 1);
  assert.equal(result.frontier.claimable_useful_jobs, 0);
});

test('opportunity claims support canonical worker_id heartbeats and ignore unrelated heartbeats', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-frontier-opportunity-heartbeat-'));
  const write = async (rel, value) => { const file = path.join(root, rel); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(value)); };
  await write('coordination/opportunities/Q_QUEUE.json', { queue_id: 'Q', opportunities: [
    { opportunity_id: 'opp-A', status: 'READY', priority: 80 },
    { opportunity_id: 'opp-C', status: 'READY', priority: 70 },
  ] });
  await write('coordination/opportunities/claims/opp-A.json', { opportunity_id: 'opp-A', worker_id: 'worker-W', claimed_at: '2026-09-17T19:00:00Z' });
  await write('coordination/opportunities/claims/opp-C.json', { opportunity_id: 'opp-C', worker_id: 'worker-X', claimed_at: '2026-09-17T19:00:00Z' });
  await write('coordination/workers/heartbeats/worker-W/b.json', { worker_id: 'worker-W', job_id: 'opp-B', heartbeat_at: '2026-09-17T19:19:30Z' });
  await write('coordination/workers/heartbeats/worker-X/no-id.json', { worker_id: 'worker-X', heartbeat_at: '2026-09-17T19:19:30Z' });

  const snapshot = await buildSnapshotFromRepo(root);
  const ownerA = snapshot.owners.find((o) => o.job_id === 'opp-A');
  const ownerC = snapshot.owners.find((o) => o.job_id === 'opp-C');
  assert.equal(ownerA.heartbeat_at, null);
  assert.equal(ownerC.heartbeat_at, null);
  assert.ok(!snapshot.jobs.some((j) => ['opp-A', 'opp-C'].includes(j.job_id)));

  const result = computeFrontierPressure(snapshot, policy, { now });
  assert.deepEqual(result.frontier.claimable_job_ids, []);
});
