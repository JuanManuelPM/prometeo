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
assert.equal(eff021.required?.seed_source, 'beacon_commit_sha_first_hex_nibble');
assert.equal(eff021.required?.batch_candidates_required_when_present, true);
assert.equal(eff021.required?.batched_reimpose_lane_priority_forbidden, true);
assert.equal(eff021.required?.unbatched_lane_priority_preserved, true);
assert.equal(eff021.required?.unbatched_allocator_order_preserved, true);
assert.equal(eff021.required?.no_extra_preclaim_reads_or_writes, true);
assert.equal(eff021.required?.max_fast_claim_attempts, 3);

const routedOrder = (length, firstNibble) => {
  if (!Number.isInteger(length) || length < 1) return [];
  const start = (firstNibble & 0x0f) % length;
  return Array.from({length}, (_, i) => (start + i) % length);
};

for (let length = 1; length <= 40; length++) {
  for (let nibble = 0; nibble < 16; nibble++) {
    const order = routedOrder(length, nibble);
    assert.equal(order.length, length);
    assert.equal(new Set(order).size, length, 'rotation must visit every unified candidate exactly once');
    assert(order.every(i => i >= 0 && i < length));
  }
}

const eightWorkerFirstChoices = Array.from({length:8}, (_, nibble) => routedOrder(13, nibble)[0]);
assert.equal(new Set(eightWorkerFirstChoices).size, 8, 'eight distinct beacon nibbles should spread an eight-worker wave across the unified candidate mesh');

const wc = fs.readFileSync(path.join(repoRoot, 'wc'), 'utf8');
const fast = fs.readFileSync(path.join(repoRoot, 'coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md'), 'utf8');
for (const text of [wc, fast]) {
  assert(text.includes('beacon_commit_sha') && text.includes('first hex nibble'), 'binding protocol must define the same deterministic seed');
  assert(text.includes('batch_candidates'), 'binding protocol must route explicit batches through allocator batch_candidates');
  assert(text.toLowerCase().includes('unified'), 'binding protocol must describe unified batch sharding');
  assert(text.includes('no extra preclaim read or write'), 'sharding must not add coordination overhead');
}

assert(fast.includes('Unbatched workers preserve normal allocator lane order: `ready -> queue_ready -> role_ready -> recovery`.'), 'unbatched lane order must remain explicit');

const allocator = fs.readFileSync(path.join(repoRoot, 'scripts/build-fast-allocator.mjs'), 'utf8');
assert(allocator.includes("batch_strategy: 'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD'"));
assert(allocator.includes('batch_candidates: batchCandidates.slice(0, 40)'));

const workflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/live-feed.yml'), 'utf8');
assert(workflow.includes('node source/coordination/portfolio/tests/batched_lane_sharding_v1.mjs'), 'live allocator publication must execute the batch-sharding regression guard');

console.log('BATCHED_UNIFIED_SHARDING_PASS');
