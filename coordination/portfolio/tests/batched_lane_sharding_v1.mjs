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
assert.equal(eff021.required?.capability_filter_before_hash, true);
assert.equal(eff021.required?.compatibility_source, 'allocator_required_capabilities_plus_known_runtime_surface');
assert.equal(eff021.required?.definitively_absent_only, true);
assert.equal(eff021.required?.unknown_capability_retained, true);
assert.equal(eff021.required?.filtered_view_preserves_published_order, true);
assert.equal(eff021.required?.collision_rotation_within_filtered_view, true);
assert.equal(eff021.required?.empty_filtered_view_attempts_zero_authority_creates, true);

const eff027 = baseline.items?.find(item => item.id === 'EFF027');
assert(eff027, 'EFF027 must remain in the efficiency ratchet baseline');
assert.equal(eff027.required?.batched_capability_filter_before_hash, true);
assert.equal(eff027.required?.stable_survivor_order, true);
assert.equal(eff027.required?.unknown_capability_is_not_absence, true);
assert.equal(eff027.required?.no_extra_preclaim_reads_or_writes, true);

const compatibleView = (candidates, definitelyAbsent = new Set()) =>
  candidates.filter(candidate =>
    !(candidate.required_capabilities || []).some(capability => definitelyAbsent.has(capability))
  );

const routedOrder = (candidates, shaPrefix8, definitelyAbsent = new Set()) => {
  const compatible = compatibleView(candidates, definitelyAbsent);
  if (!compatible.length) return [];
  const n=Number.parseInt(String(shaPrefix8).slice(0,8),16);
  const start = Number.isFinite(n) ? n % compatible.length : 0;
  return Array.from({length:compatible.length}, (_, i) => compatible[(start + i) % compatible.length]);
};

for (let length = 1; length <= 40; length++) {
  const candidates=Array.from({length},(_,i)=>({id:`c-${i}`,required_capabilities:[]}));
  for (let seed = 0; seed < 256; seed++) {
    const order = routedOrder(candidates, seed.toString(16).padStart(8,'0'));
    assert.equal(order.length, length);
    assert.equal(new Set(order.map(row=>row.id)).size, length, 'rotation must visit every compatible unified candidate exactly once');
  }
}
const fullCandidates=Array.from({length:13},(_,i)=>({id:`c-${i}`,required_capabilities:[]}));
const firstChoices=new Set(Array.from({length:256},(_,n)=>routedOrder(fullCandidates,n.toString(16).padStart(8,'0'))[0].id));
assert.equal(firstChoices.size,13,'8-hex seed space should cover every compatible candidate index');

const mixed=[
  {id:'browser-only',required_capabilities:['representative_javascript_browser']},
  {id:'generic-a',required_capabilities:[]},
  {id:'touch-only',required_capabilities:['mobile_touch_input']},
  {id:'unknown-kept',required_capabilities:['runtime_capability_not_proven_absent']},
  {id:'generic-b',required_capabilities:[]}
];
const absent=new Set(['representative_javascript_browser','mobile_touch_input']);
assert.deepEqual(
  compatibleView(mixed,absent).map(row=>row.id),
  ['generic-a','unknown-kept','generic-b'],
  'filtering must happen before hashing, preserve survivor order, and retain unknown capabilities'
);
for(let seed=0;seed<64;seed++){
  const order=routedOrder(mixed,seed.toString(16).padStart(8,'0'),absent).map(row=>row.id);
  assert.deepEqual(new Set(order),new Set(['generic-a','unknown-kept','generic-b']));
  assert.equal(order.length,3);
}
const compatibleFirstChoices=new Set(Array.from({length:256},(_,n)=>
  routedOrder(mixed,n.toString(16).padStart(8,'0'),absent)[0].id
));
assert.equal(compatibleFirstChoices.size,3,'hashing the filtered view must still spread workers across every compatible survivor');
assert.deepEqual(
  routedOrder([{id:'only-incompatible',required_capabilities:['mobile_touch_input']}],'00000000',absent),
  [],
  'an empty compatible view must produce zero authority candidates'
);

const missing = new Set(['representative_javascript_browser']);
const mesh = [
  ...Array.from({length:9},(_,i)=>({id:'special-'+i, required_capabilities:['representative_javascript_browser']})),
  {id:'generic-a', required_capabilities:[]},
  {id:'generic-b', required_capabilities:[]},
  {id:'generic-c', required_capabilities:[]}
];
const compatible = mesh.filter(c => !c.required_capabilities.some(cap => missing.has(cap)));
assert.deepEqual(compatible.map(c=>c.id), ['generic-a','generic-b','generic-c'], 'capability filtering must preserve published survivor order');
const oldPostSkipFirst = shaPrefix8 => {
  const order=routedOrder(mesh.length, shaPrefix8);
  return order.map(i=>mesh[i]).find(c=>!c.required_capabilities.some(cap=>missing.has(cap)))?.id || null;
};
const oldSeedChoices = Array.from({length:9},(_,n)=>oldPostSkipFirst(n.toString(16).padStart(8,'0')));
assert.equal(new Set(oldSeedChoices).size,1,'fixture must demonstrate post-hash capability-skip convergence');
const filteredSeedChoices = new Set(Array.from({length:9},(_,n)=>compatible[routedOrder(compatible.length,n.toString(16).padStart(8,'0'))[0]].id));
assert.equal(filteredSeedChoices.size,3,'filter-before-hash must spread the same seeds across all compatible candidates');

const wc = fs.readFileSync(path.join(repoRoot, 'wc'), 'utf8');
const fast = fs.readFileSync(path.join(repoRoot, 'coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md'), 'utf8');
for (const text of [wc, fast]) {
  assert(text.includes('beacon_commit_sha') && text.includes('first 8 hex'), 'binding protocol must define the same deterministic seed');
  assert(text.includes('claim-frontier') && text.includes('candidates'), 'binding protocol must route explicit batches through compact claim-frontier candidates');
  assert(text.toLowerCase().includes('unified'), 'binding protocol must describe unified batch sharding');
  assert(text.toLowerCase().includes('no extra preclaim read or write'), 'sharding must not add coordination overhead');
  assert(text.includes('batch_compatible_candidates'), 'binding protocol must filter definitively incompatible candidates before hashing');
  assert(text.includes('required_capabilities'), 'compatibility filtering must use allocator-supplied capability metadata');
  assert(text.toLowerCase().includes('unknown') && text.toLowerCase().includes('not absence'), 'unknown capabilities must remain eligible');
  assert(text.includes('batch_compatible_candidates'), 'batched sharding must filter definitively incompatible candidates before hashing');
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
console.log('BATCHED_CAPABILITY_FILTERED_SHARDING_PASS');
