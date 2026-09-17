import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const builder = path.join(repoRoot, 'scripts/build-efficiency-snapshot.mjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prometeo-efficiency-window-'));
const out = path.join(root, 'efficiency.json');
const now = Date.now();
const isoAgo = ms => new Date(now - ms).toISOString();

const writeJson = (rel, doc) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(doc, null, 2)}\n`);
};

writeJson('coordination/efficiency/RATCHET_BASELINE_V1.json', {
  schema: 'prometeo.efficiency-ratchet/v1',
  runtime_baseline_activated_at: isoAgo(2 * 60 * 60_000),
  updated_at: isoAgo(30 * 60_000),
  items: [{
    id: 'EFF009',
    required: { claim_transport_blocked_regression_window_minutes: 10 }
  }]
});

const beacon = (worker, agoMs) => writeJson(`coordination/workers/beacons/${worker}.json`, {
  worker_id: worker,
  launched_at: isoAgo(agoMs)
});
const blocked = (worker, launchAgoMs, closeAgoMs) => {
  beacon(worker, launchAgoMs);
  writeJson(`coordination/workers/no-allocation/${worker}.json`, {
    worker_id: worker,
    closed_at: isoAgo(closeAgoMs),
    reason: 'CLAIM_TRANSPORT_BLOCKED'
  });
};
const allocated = (worker, launchAgoMs, claimAgoMs) => {
  beacon(worker, launchAgoMs);
  writeJson(`coordination/portfolio/pins/job-${worker}/G000001.json`, {
    worker_id: worker,
    claimed_at: isoAgo(claimAgoMs)
  });
};
const build = () => {
  execFileSync(process.execPath, [builder, root, out], { stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(fs.readFileSync(out, 'utf8'));
};

// Old repaired incidents remain visible historically, but must not keep the
// current runtime in permanent regression after the observation window closes.
blocked('old-block-1', 42 * 60_000, 41 * 60_000);
blocked('old-block-2', 38 * 60_000, 37 * 60_000);
allocated('alloc-1', 9 * 60_000, 8.7 * 60_000);
allocated('alloc-2', 8 * 60_000, 7.7 * 60_000);
allocated('alloc-3', 7 * 60_000, 6.7 * 60_000);

const historicalOnly = build();
assert.equal(historicalOnly.metrics.claim_transport_blocked, 2);
assert.equal(historicalOnly.metrics.claim_transport_blocked_recent, 0);
assert.equal(historicalOnly.metrics.claim_transport_blocked_regression_window_minutes, 10);
assert.equal(historicalOnly.status, 'HEALTHY');
assert.deepEqual(historicalOnly.reasons, []);

// Two fresh durable transport blocks inside the bounded window are still a
// real current regression and must trigger GUIDE_RESCATE.
blocked('recent-block-1', 5 * 60_000, 4.5 * 60_000);
blocked('recent-block-2', 4 * 60_000, 3.5 * 60_000);

const currentRepeat = build();
assert.equal(currentRepeat.metrics.claim_transport_blocked, 4);
assert.equal(currentRepeat.metrics.claim_transport_blocked_recent, 2);
assert.equal(currentRepeat.status, 'REGRESSION');
assert.deepEqual(currentRepeat.reasons, ['CLAIM_TRANSPORT_BLOCKED_REPEAT']);
assert.equal(currentRepeat.rescue?.recommended_role, 'GUIDE_RESCATE');

console.log('EFFICIENCY_RECENT_TRANSPORT_REGRESSION_PASS');
