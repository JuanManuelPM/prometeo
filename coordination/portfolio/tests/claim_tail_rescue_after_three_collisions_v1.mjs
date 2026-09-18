#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const baseline = JSON.parse(fs.readFileSync(path.join(repoRoot, 'coordination/efficiency/RATCHET_BASELINE_V1.json'), 'utf8'));
const eff044 = baseline.items?.find(item => item.id === 'EFF044');
assert(eff044, 'EFF044 must remain in the efficiency ratchet baseline');
assert.equal(eff044.required?.base_fast_claim_attempts, 3);
assert.equal(eff044.required?.pool_tail_rescue_max, 1);
assert.equal(eff044.required?.total_authority_create_max_with_tail, 4);
assert.equal(eff044.required?.requires_three_create_exists, true);
assert.equal(eff044.required?.requires_untried_retained_compatible_candidate, true);
assert.equal(eff044.required?.extra_frontier_read_for_tail_forbidden, true);
assert.equal(eff044.required?.payload_fabrication_for_tail_forbidden, true);
assert.equal(eff044.required?.unbatched_tail_rescue_forbidden, true);
assert.equal(eff044.required?.transport_failure_tail_rescue_forbidden, true);

function attempts({ candidates, pool=true, outcomes=[] }) {
  const base = candidates.slice(0, 3);
  const baseOutcomes = outcomes.slice(0, base.length);
  const allThreeCollided =
    pool &&
    base.length === 3 &&
    baseOutcomes.length === 3 &&
    baseOutcomes.every(value => value === 'CREATE_EXISTS');
  if (!allThreeCollided || candidates.length <= 3) return base;
  return [...base, candidates[3]];
}

const four = ['a','b','c','d'];
assert.deepEqual(
  attempts({candidates:four,pool:true,outcomes:['CREATE_EXISTS','CREATE_EXISTS','CREATE_EXISTS']}),
  four,
  'POOL must reach one retained fourth candidate after three proven collisions'
);
assert.deepEqual(
  attempts({candidates:four,pool:false,outcomes:['CREATE_EXISTS','CREATE_EXISTS','CREATE_EXISTS']}),
  ['a','b','c'],
  'unbatched workers must keep the ordinary three-attempt ceiling'
);
assert.deepEqual(
  attempts({candidates:four,pool:true,outcomes:['CREATE_EXISTS','CLAIM_TRANSPORT_AMBIGUOUS','CREATE_EXISTS']}),
  ['a','b','c'],
  'transport ambiguity must never unlock tail rescue'
);
assert.deepEqual(
  attempts({candidates:['a','b','c'],pool:true,outcomes:['CREATE_EXISTS','CREATE_EXISTS','CREATE_EXISTS']}),
  ['a','b','c'],
  'tail rescue requires an actually untried retained candidate'
);

const wc = fs.readFileSync(path.join(repoRoot, 'wc'), 'utf8');
const fast = fs.readFileSync(path.join(repoRoot, 'coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md'), 'utf8');
for (const text of [wc, fast]) {
  assert(text.includes('POOL_TAIL_RESCUE'), 'binding protocol must name the bounded tail rescue');
  assert(text.includes('three') && text.includes('CREATE_EXISTS'), 'tail rescue must require three proven collisions');
  assert(text.includes('untried') && text.includes('retained'), 'tail rescue must use an already-loaded untried candidate');
  assert(text.includes('total authority CREATE attempts') && text.includes('4'), 'tail rescue must expose the hard total bound of four');
}

console.log('CLAIM_TAIL_RESCUE_AFTER_THREE_COLLISIONS_PASS');
