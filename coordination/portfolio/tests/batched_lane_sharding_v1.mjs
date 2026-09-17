#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const baseline = JSON.parse(fs.readFileSync(path.join(repoRoot, 'coordination/efficiency/RATCHET_BASELINE_V1.json'), 'utf8'));
const eff021 = baseline.items?.find(item => item.id === 'EFF021');
assert(eff021, 'EFF021 must remain in the efficiency ratchet baseline');
assert.equal(eff021.required?.batched_unified_candidate_sharding, true);
assert.equal(eff021.required?.batch_strategy, 'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD');
assert.equal(eff021.required?.seed_source, 'beacon_commit_sha_first_8_hex');
assert.equal(eff021.required?.batch_candidates_required_when_present, true);
assert.equal(eff021.required?.batched_reimpose_lane_priority_forbidden, true);
assert.equal(eff021.required?.unbatched_lane_priority_preserved, true);
assert.equal(eff021.required?.unbatched_allocator_order_preserved, true);
assert.equal(eff021.required?.no_extra_preclaim_reads_or_writes, true);
assert.equal(eff021.required?.max_fast_claim_attempts, 3);

const routedOrder = (length, shaPrefix8) => {
  if (!Number.isInteger(length) || length < 1) return [];
  const n=Number.parseInt(String(shaPrefix8).slice(0,8),16);
  const start = Number.isFinite(n) ? n % length : 0;
  return Array.from({length}, (_, i) => (start + i) % length);
};

for (let length = 1; length <= 40; length++) {
  for (let seed = 0; seed < 256; seed++) {
    const order = routedOrder(length, seed.toString(16).padStart(8,'0'));
    assert.equal(order.length, length);
    assert.equal(new Set(order).size, length, 'rotation must visit every unified candidate exactly once');
    assert(order.every(i => i >= 0 && i < length));
  }
}
const firstChoices=new Set(Array.from({length:256},(_,n)=>routedOrder(13,n.toString(16).padStart(8,'0'))[0]));
assert.equal(firstChoices.size,13,'8-hex seed space should cover every candidate index');

const wc = fs.readFileSync(path.join(repoRoot, 'wc'), 'utf8');
const fast = fs.readFileSync(path.join(repoRoot, 'coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md'), 'utf8');
for (const text of [wc, fast]) {
  assert(text.includes('beacon_commit_sha') && text.includes('first 8 hex'), 'binding protocol must define the same deterministic seed');
  assert(text.includes('claim-frontier') && text.includes('candidates'), 'binding protocol must route explicit batches through compact claim-frontier candidates');
  assert(text.toLowerCase().includes('unified'), 'binding protocol must describe unified batch sharding');
  assert(text.toLowerCase().includes('no extra preclaim read or write'), 'sharding must not add coordination overhead');
}

assert(fast.includes('Unbatched workers preserve normal allocator lane order: `ready -> queue_ready -> role_ready -> recovery`.'), 'unbatched lane order must remain explicit');

const allocator = fs.readFileSync(path.join(repoRoot, 'scripts/build-fast-allocator.mjs'), 'utf8');
assert(allocator.includes("batch_strategy: 'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD'"));
assert(allocator.includes('batch_candidates: batchCandidates.slice(0, 40)'));
const compact = fs.readFileSync(path.join(repoRoot, 'scripts/build-claim-frontier.mjs'), 'utf8');
assert(compact.includes("schema:'prometeo.claim-frontier/v1'"));

const workflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/live-feed.yml'), 'utf8');
assert(workflow.includes('node source/coordination/portfolio/tests/batched_lane_sharding_v1.mjs'), 'live allocator publication must execute the batch-sharding regression guard');

console.log('BATCHED_UNIFIED_SHARDING_PASS');
