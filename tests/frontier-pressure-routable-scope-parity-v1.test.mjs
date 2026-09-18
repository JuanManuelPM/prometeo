import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSnapshotFromRepo, computeFrontierPressure } from '../scripts/compile-frontier-pressure.mjs';

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
const now = '2026-09-17T21:20:00Z';

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-frontier-routable-'));
  const write = async (rel, value) => {
    const file = path.join(root, rel);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(value));
  };

  await write('coordination/portfolio/PORTFOLIO.json', {
    projects: [{
      project_id: 'p',
      priority: 100,
      jobs: [
        { job_id: 'portfolio-ready', dedupe_key: 'portfolio-ready', seed_status: 'ready', priority: 100 },
        { job_id: 'portfolio-recovery', dedupe_key: 'portfolio-recovery', seed_status: 'ready', priority: 90 },
      ],
    }],
  });
  await write('coordination/portfolio/derived/p/derived.json', {
    project_id: 'p', job_id: 'portfolio-derived', dedupe_key: 'portfolio-derived', seed_status: 'ready', priority: 80,
  });
  await write('coordination/portfolio/pins/portfolio-recovery/G000001.json', {
    job_id: 'portfolio-recovery', dedupe_key: 'portfolio-recovery', worker_id: 'stale-worker', generation: 1,
    claimed_at: '2026-09-17T21:00:00Z',
  });

  const historical = Array.from({ length: 24 }, (_, i) => ({
    opportunity_id: `historical-${String(i).padStart(2, '0')}`,
    status: 'READY',
    priority: 5,
  }));
  await write('coordination/opportunities/HISTORICAL_QUEUE_V0.json', { queue_id: 'historical', opportunities: historical });
  for (const item of historical) {
    await write(`coordination/opportunities/returns/${item.opportunity_id}/r.json`, {
      opportunity_id: item.opportunity_id,
      outcome: 'DONE',
      returned_at: '2026-09-17T20:00:00Z',
    });
  }

  await write('coordination/opportunities/CURRENT_QUEUE_V1.json', {
    queue_id: 'current',
    opportunities: [
      { opportunity_id: 'queue-ready', status: 'READY', priority: 70 },
      { opportunity_id: 'queue-claimed', status: 'READY', priority: 60 },
      { opportunity_id: 'queue-returned', status: 'READY', priority: 50 },
      { opportunity_id: 'queue-waiting', status: 'WAITING', priority: 40 },
    ],
  });
  await write('coordination/opportunities/claims/queue-claimed.json', {
    schema: 'prometeo.opportunity-claim/v1', worker_id: 'queue-worker', opportunity_id: 'queue-claimed', claimed_at: '2026-09-17T21:19:00Z',
  });
  await write('coordination/opportunities/returns/queue-returned/r.json', {
    opportunity_id: 'queue-returned', outcome: 'DONE', returned_at: '2026-09-17T21:10:00Z',
  });
  return root;
}

test('historical READY queue rows are diagnostic-only and cannot suppress FRONTIER_THIN', async () => {
  const root = await fixture();
  const snapshot = await buildSnapshotFromRepo(root);
  const result = computeFrontierPressure(snapshot, policy, { now });

  assert.equal(result.launch_pressure.target_claimable, 8);
  assert.equal(result.repository_history.declared_ready_rows, 27);
  assert.equal(result.repository_history.participates_in_frontier, false);
  assert.equal(result.routing_domain.historical_rows_participate_in_frontier, false);
  assert.equal(result.frontier.claimable_useful_jobs, 4);
  assert.equal(result.signals.FRONTIER_THIN, true);
  assert.ok(!result.frontier.claimable_job_ids.some((id) => id.startsWith('historical-')));
});

test('frontier claimable ids reconcile with /wc normalized ready + recovery + queue_ready semantics', async () => {
  const root = await fixture();
  const snapshot = await buildSnapshotFromRepo(root);
  const result = computeFrontierPressure(snapshot, policy, { now });

  const expectedAllocatorRoutable = [
    'portfolio-derived',
    'portfolio-ready',
    'portfolio-recovery',
    'queue-ready',
  ].sort();
  assert.deepEqual(result.frontier.claimable_job_ids, expectedAllocatorRoutable);
  assert.equal(result.routing_domain.portfolio_jobs, 3);
  assert.equal(result.routing_domain.queue_ready_opportunities, 1);
  assert.ok(!result.frontier.claimable_job_ids.includes('queue-claimed'));
  assert.ok(!result.frontier.claimable_job_ids.includes('queue-returned'));
  assert.ok(!result.frontier.claimable_job_ids.includes('queue-waiting'));
});
