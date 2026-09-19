#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const wc=fs.readFileSync(path.join(ROOT,'wc'),'utf8');
const fast=fs.readFileSync(path.join(ROOT,'coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md'),'utf8');
const baseline=JSON.parse(fs.readFileSync(path.join(ROOT,'coordination/efficiency/RATCHET_BASELINE_V1.json'),'utf8'));
const eff=baseline.items.find(x=>x.id==='EFF062');

assert(eff,'EFF062 ratchet item must exist');
assert.equal(eff.required?.batch_or_pool_only,true);
assert.equal(eff.required?.requires_real_create_exists,true);
assert.equal(eff.required?.requires_retained_exact_initial_frontier_blob_sha,true);
assert.equal(eff.required?.replay_transport,'GITHUB_FETCH_BLOB');
assert.equal(eff.required?.immutable_replay_max_per_worker_lifecycle,1);
assert.equal(eff.required?.byte_identical_original_snapshot_only,true);
assert.equal(eff.required?.newer_state_visibility,false);
assert.equal(eff.required?.state_discovery_added,0);
assert.equal(eff.required?.authority_attempt_accounting_unchanged,true);
assert.equal(eff.required?.base_authority_create_attempts_max,3);
assert.equal(eff.required?.pool_tail_rescue_max,1);
assert.equal(eff.required?.initial_routing_replay_forbidden,true);
assert.equal(eff.required?.stale_refresh_replay_forbidden,true);
assert.equal(eff.required?.transport_denial_or_ambiguity_replay_forbidden,true);
assert.equal(eff.required?.branch_head_only_movement_replay_forbidden,true);
assert.equal(eff.required?.capability_mismatch_replay_forbidden,true);
assert.equal(eff.required?.barrier_timing_replay_forbidden,true);
assert.equal(eff.required?.payload_fabrication_forbidden,true);
assert.equal(eff.required?.directory_archaeology_forbidden,true);

for (const text of [wc,fast]) {
  assert.match(text,/IMMUTABLE FRONTIER REPLAY/);
  assert.match(text,/fetch_blob/);
  assert.match(text,/byte-identical/);
  assert.match(text,/CREATE_EXISTS/);
  assert.match(text,/POOL_TAIL_RESCUE/);
}
assert.match(wc,/unavailable without the exact initial blob SHA/);
assert.match(fast,/unavailable when the initial exact blob SHA was not retained/);

console.log('CLAIM_FRONTIER_IMMUTABLE_REPLAY_PASS');
