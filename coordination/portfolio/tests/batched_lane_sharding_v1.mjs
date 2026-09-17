#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const baseline = JSON.parse(fs.readFileSync(path.join(repoRoot, 'coordination/efficiency/RATCHET_BASELINE_V1.json'), 'utf8'));
const eff020 = baseline.items?.find(item => item.id === 'EFF021');
assert(eff020, 'EFF021 must remain in the efficiency ratchet baseline');
assert.equal(eff020.required?.batched_lane_local_sharding, true);
assert.equal(eff020.required?.seed_source, 'beacon_commit_sha_first_hex_nibble');
assert.equal(eff020.required?.lane_priority_preserved, true);
assert.equal(eff020.required?.unbatched_allocator_order_preserved, true);
assert.equal(eff020.required?.no_extra_preclaim_reads_or_writes, true);
assert.equal(eff020.required?.max_fast_claim_attempts, 3);
assert.equal(eff020.required?.lane_diversification_after_same_lane_collisions, 2);

const routedOrder = (length, firstNibble) => {
  if (!Number.isInteger(length) || length < 1) return [];
  const start = (firstNibble & 0x0f) % length;
  return Array.from({length}, (_, i) => (start + i) % length);
};

for (let length = 1; length <= 16; length++) {
  for (let nibble = 0; nibble < 16; nibble++) {
    const order = routedOrder(length, nibble);
    assert.equal(order.length, length);
    assert.equal(new Set(order).size, length, 'rotation must visit every candidate exactly once');
    assert(order.every(i => i >= 0 && i < length));
  }
}

const sixWorkerFirstChoices = Array.from({length:6}, (_, nibble) => routedOrder(6, nibble)[0]);
assert.equal(new Set(sixWorkerFirstChoices).size, 6, 'six distinct beacon nibbles should spread six workers across six candidates');

const wc = fs.readFileSync(path.join(repoRoot, 'wc'), 'utf8');
const fast = fs.readFileSync(path.join(repoRoot, 'coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md'), 'utf8');
for (const text of [wc, fast]) {
  assert(text.includes('beacon_commit_sha') && text.includes('first hex nibble'), 'binding protocol must define the same lane-local seed');
  assert(text.includes('preserve allocator order'), 'binding protocol must preserve allocator order when batching seed is unavailable');
  assert(text.includes('Lane priority does not change'), 'binding protocol must preserve ready > queue_ready > role_ready > recovery');
  assert(text.includes('no extra preclaim read or write'), 'sharding must not add coordination overhead');
}

console.log('BATCHED_LANE_SHARDING_PASS');
