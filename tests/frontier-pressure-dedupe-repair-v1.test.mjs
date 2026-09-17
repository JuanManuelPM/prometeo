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

test('terminal return closes every ready row sharing its dedupe key', () => {
  const result = computeFrontierPressure({
    beacons: [],
    jobs: [
      { job_id: 'old-terminal', dedupe_key: 'same', status: 'ready' },
      { job_id: 'duplicate-row', dedupe_key: 'same', status: 'ready' },
      { job_id: 'free', dedupe_key: 'free', status: 'ready' },
    ],
    owners: [],
    terminal_returns: [{ job_id: 'old-terminal', dedupe_key: 'same', outcome: 'DONE', returned_at: '2026-09-17T19:19:00Z' }],
    material_returns: [],
  }, policy, { now });
  assert.equal(result.frontier.claimable_useful_jobs, 1);
  assert.deepEqual(result.frontier.claimable_job_ids, ['free']);
});

test('terminal closure infers dedupe key from the returned job when return lacks dedupe_key', () => {
  const result = computeFrontierPressure({
    beacons: [],
    jobs: [
      { job_id: 'a', dedupe_key: 'shared', status: 'ready' },
      { job_id: 'b', dedupe_key: 'shared', status: 'ready' },
    ],
    owners: [],
    terminal_returns: [{ job_id: 'a', outcome: 'VERIFIED', returned_at: '2026-09-17T19:19:00Z' }],
    material_returns: [],
  }, policy, { now });
  assert.equal(result.frontier.claimable_useful_jobs, 0);
});

test('duplicate ready rows for one nonterminal dedupe key count as one claimable unit', () => {
  const result = computeFrontierPressure({
    beacons: [],
    jobs: [
      { job_id: 'low', dedupe_key: 'same', status: 'ready', priority: 10 },
      { job_id: 'high', dedupe_key: 'same', status: 'ready', priority: 20 },
    ],
    owners: [], terminal_returns: [], material_returns: [],
  }, policy, { now });
  assert.equal(result.frontier.claimable_useful_jobs, 1);
  assert.deepEqual(result.frontier.claimable_job_ids, ['high']);
});

test('live owner on one row blocks every duplicate row in the dedupe group', () => {
  const result = computeFrontierPressure({
    beacons: [],
    jobs: [
      { job_id: 'owned', dedupe_key: 'same', status: 'ready' },
      { job_id: 'duplicate', dedupe_key: 'same', status: 'ready' },
    ],
    owners: [{ job_id: 'owned', worker_id: 'w', claimed_at: '2026-09-17T19:18:00Z', retry_safe: true }],
    terminal_returns: [], material_returns: [],
  }, policy, { now });
  assert.equal(result.frontier.claimable_useful_jobs, 0);
});

test('replaceable retry-safe owner keeps recovery on the owned row and does not expose duplicate replay', () => {
  const result = computeFrontierPressure({
    beacons: [],
    jobs: [
      { job_id: 'owned', dedupe_key: 'same', status: 'ready', priority: 1 },
      { job_id: 'duplicate', dedupe_key: 'same', status: 'ready', priority: 99 },
    ],
    owners: [{ job_id: 'owned', worker_id: 'w', claimed_at: '2026-09-17T19:00:00Z', retry_safe: true }],
    terminal_returns: [], material_returns: [],
  }, policy, { now });
  assert.equal(result.liveness.replaceable, 1);
  assert.equal(result.frontier.claimable_useful_jobs, 1);
  assert.deepEqual(result.frontier.claimable_job_ids, ['owned']);
});

test('filesystem builder retains dedupe_key on terminal returns and pin owners', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-dedupe-'));
  const write = async (rel, value) => { const file = path.join(root, rel); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(value)); };
  await write('coordination/portfolio/PORTFOLIO.json', { projects: [{ jobs: [{ job_id: 'a', seed_status: 'ready', dedupe_key: 'same' }, { job_id: 'b', seed_status: 'ready', dedupe_key: 'same' }] }] });
  await write('coordination/portfolio/pins/a/G000001.json', { job_id: 'a', dedupe_key: 'same', worker_id: 'w', generation: 1, claimed_at: '2026-09-17T19:18:00Z' });
  await write('coordination/portfolio/returns/a/r.json', { job_id: 'a', dedupe_key: 'same', outcome: 'DONE', returned_at: '2026-09-17T19:19:00Z' });
  const snapshot = await buildSnapshotFromRepo(root);
  assert.equal(snapshot.terminal_returns[0].dedupe_key, 'same');
  assert.equal(snapshot.owners[0].dedupe_key, 'same');
});

test('oracle v1.1 terminal_and_duplicate_dedupe_are_excluded matches claimable_useful_work=1', () => {
  const material_returns = [1, 2, 3].map((n) => ({ return_id: `r${n}`, source_path: `returns/r${n}.json`, returned_at: '2026-09-17T19:10:00Z' }));
  const result = computeFrontierPressure({
    beacons: [{ worker_id: 'w1', launched_at: '2026-09-17T19:15:00Z' }],
    jobs: [
      { job_id: 'old-terminal', dedupe_key: 'same', status: 'ready' },
      { job_id: 'duplicate-row', dedupe_key: 'same', status: 'ready' },
      { job_id: 'free', dedupe_key: 'free', status: 'ready' },
    ],
    owners: [],
    terminal_returns: [{ job_id: 'old-terminal', dedupe_key: 'same', outcome: 'DONE', returned_at: '2026-09-17T19:19:00Z' }],
    material_returns,
  }, policy, { now });
  assert.equal(result.frontier.claimable_useful_jobs, 1);
  assert.equal(result.signals.RETURNS_UNCONSUMED, true);
});
