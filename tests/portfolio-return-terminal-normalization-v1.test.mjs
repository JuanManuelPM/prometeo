import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSnapshotFromRepo, computeFrontierPressure } from '../scripts/compile-frontier-pressure-base.mjs';

const JOB = 'portfolio-atomic-append-create-retry-v1';
const REVIEWED = 'coordination/portfolio/returns/portfolio-atomic-append-create-retry-v1/RETURN-wc-chatgpt-20260917T1922Z-7c41d9.json';
const policy = {
  status:'CANARY',
  signals:{
    recent_launch_window_minutes:10,
    heartbeat_target_minutes:3,
    stale_suspect_minutes:6,
    recovery_eligible_minutes:10,
    frontier_floor_absolute:8,
    frontier_per_recent_launch:1.5,
    frontier_ceiling:40,
    unconsumed_returns_trigger:3,
    replaceable_trigger:3
  }
};

async function put(root, rel, value) {
  const file = path.join(root, rel);
  await fs.mkdir(path.dirname(file), { recursive:true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n');
}

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-terminal-alias-'));
  await put(root, 'coordination/portfolio/PORTFOLIO.json', {
    projects:[{project_id:'prometeo-autonomous-growth',jobs:[{
      job_id:JOB,
      dedupe_key:'control-plane:atomic-append-create-retry:v1',
      seed_status:'ready',
      priority:90
    }]}]
  });
  await put(root, 'coordination/portfolio/RETURN_OUTCOME_SEMANTICS_V1.json', {
    terminal_outcomes:['DONE','VERIFIED','NO_ACTION_NEEDED','SUPERSEDED'],
    historical_terminal_aliases:{
      SUCCESS:{
        mode:'EXACT_RETURN_REF_ALLOWLIST_FAIL_CLOSED',
        normalized_outcome:'DONE',
        return_refs:[{
          path:REVIEWED,
          job_id:JOB,
          return_id:'RETURN-wc-chatgpt-20260917T1922Z-7c41d9'
        }]
      }
    }
  });
  return root;
}

test('exact reviewed historical SUCCESS normalizes to canonical terminal outcome', async () => {
  const root = await fixture();
  await put(root, REVIEWED, {
    schema:'prometeo.portfolio-return/v1',
    return_id:'RETURN-wc-chatgpt-20260917T1922Z-7c41d9',
    job_id:JOB,
    dedupe_key:'control-plane:atomic-append-create-retry:v1',
    outcome:'SUCCESS',
    returned_at:'2026-09-17T19:22:15Z',
    changed_paths:['scripts/append-only-create-retry-lib.mjs'],
    tests:['PASS 5/5']
  });
  const snapshot = await buildSnapshotFromRepo(root);
  assert.equal(snapshot.terminal_returns.length, 1);
  assert.equal(snapshot.terminal_returns[0].outcome, 'DONE');
  assert.equal(snapshot.terminal_returns[0].original_outcome, 'SUCCESS');

  const result = computeFrontierPressure(snapshot, policy, { now:'2026-09-17T20:00:00Z' });
  assert.equal(result.frontier.claimable_job_ids.includes(JOB), false);
  assert.equal(result.frontier.terminal_jobs, 1);
});

test('unlisted SUCCESS fails closed and remains claimable', async () => {
  const root = await fixture();
  await put(root, `coordination/portfolio/returns/${JOB}/RETURN-unreviewed.json`, {
    schema:'prometeo.portfolio-return/v1',
    return_id:'RETURN-unreviewed',
    job_id:JOB,
    dedupe_key:'control-plane:atomic-append-create-retry:v1',
    outcome:'SUCCESS',
    returned_at:'2026-09-17T19:22:15Z'
  });
  const snapshot = await buildSnapshotFromRepo(root);
  assert.equal(snapshot.terminal_returns.length, 0);
  const result = computeFrontierPressure(snapshot, policy, { now:'2026-09-17T20:00:00Z' });
  assert.equal(result.frontier.claimable_job_ids.includes(JOB), true);
});

test('nonterminal BOUNDARY never becomes terminal even at an allowlisted path', async () => {
  const root = await fixture();
  await put(root, REVIEWED, {
    schema:'prometeo.portfolio-return/v1',
    return_id:'RETURN-wc-chatgpt-20260917T1922Z-7c41d9',
    job_id:JOB,
    dedupe_key:'control-plane:atomic-append-create-retry:v1',
    outcome:'BOUNDARY',
    returned_at:'2026-09-17T19:22:15Z'
  });
  const snapshot = await buildSnapshotFromRepo(root);
  assert.equal(snapshot.terminal_returns.length, 0);
});
