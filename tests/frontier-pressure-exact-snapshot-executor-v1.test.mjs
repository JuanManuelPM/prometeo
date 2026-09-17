import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { collectCanaryRefs, reconcileCanary } from '../scripts/run-frontier-pressure-exact-snapshot.mjs';

const JOB = 'portfolio-exclusive-job-pin-live-race-2-v1';

async function put(root, rel, value) {
  const file = path.join(root, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'frontier-pressure-exact-'));
  await put(root, `coordination/portfolio/pins/${JOB}/G000001.json`, {
    job_id: JOB, generation: 1, worker_id: 'worker-old', claim_id: 'claim-old', claimed_at: '2026-09-17T18:00:00Z',
  });
  await put(root, `coordination/portfolio/pins/${JOB}/G000002.json`, {
    job_id: JOB, generation: 2, worker_id: 'worker-new', claim_id: 'claim-new', claimed_at: '2026-09-17T19:28:38Z',
  });
  await put(root, `coordination/portfolio/claims/${JOB}/claim-old.json`, {
    job_id: JOB, claim_id: 'claim-old', worker_id: 'worker-old', pin_generation: 1, claimed_at: '2026-09-17T18:00:00Z',
  });
  await put(root, `coordination/portfolio/claims/${JOB}/claim-new.json`, {
    job_id: JOB, claim_id: 'claim-new', worker_id: 'worker-new', pin_generation: 2, claimed_at: '2026-09-17T19:28:38Z',
  });
  await put(root, `coordination/workers/heartbeats/worker-new/20260917T192945Z.json`, {
    worker_id: 'worker-new', job_id: JOB, heartbeat_at: '2026-09-17T19:29:45Z',
  });
  await put(root, `coordination/portfolio/returns/${JOB}/RETURN.json`, {
    job_id: JOB, worker_id: 'worker-new', outcome: 'PARTIAL', returned_at: '2026-09-17T19:30:22Z',
  });
  return root;
}

test('collectCanaryRefs resolves highest generation and all durable lanes', async () => {
  const root = await fixture();
  const canary = await collectCanaryRefs(root, JOB);
  assert.equal(canary.highest_generation, 2);
  assert.equal(canary.highest_pin_worker_id, 'worker-new');
  assert.equal(canary.matching_claim_ref, `coordination/portfolio/claims/${JOB}/claim-new.json`);
  assert.equal(canary.latest_owner_signal_at, '2026-09-17T19:29:45Z');
  assert.equal(canary.refs.pins.length, 2);
  assert.equal(canary.refs.claims.length, 2);
  assert.equal(canary.refs.heartbeats.length, 1);
  assert.equal(canary.refs.returns.length, 1);
});

test('reconcileCanary passes when stale nonterminal owner is compiler-replaceable', async () => {
  const root = await fixture();
  const canary = await collectCanaryRefs(root, JOB);
  const result = reconcileCanary(canary, {
    observed_at: '2026-09-17T20:00:00Z',
    windows: { recovery_eligible_minutes: 10 },
    liveness: { replaceable_job_ids: [JOB] },
    frontier: { claimable_job_ids: [JOB] },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.expected_replaceable, true);
  assert.equal(result.compiler_replaceable, true);
});

test('reconcileCanary fails closed on compiler/ref mismatch', async () => {
  const root = await fixture();
  const canary = await collectCanaryRefs(root, JOB);
  assert.throws(() => reconcileCanary(canary, {
    observed_at: '2026-09-17T20:00:00Z',
    windows: { recovery_eligible_minutes: 10 },
    liveness: { replaceable_job_ids: [] },
    frontier: { claimable_job_ids: [] },
  }), /reconciliation mismatch/);
});
