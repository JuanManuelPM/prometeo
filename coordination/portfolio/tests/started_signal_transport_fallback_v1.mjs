import assert from 'node:assert/strict';
import fs from 'node:fs';

function startupDisposition({ pinCreated, startedPersisted, fallbackHeartbeatPersisted }) {
  if (!pinCreated) return 'STOP_CLAIM_TRANSPORT_BLOCKED';
  if (startedPersisted) return 'ACTIVE_STARTED';
  if (fallbackHeartbeatPersisted) return 'ACTIVE_HEARTBEAT_FALLBACK';
  return 'OWNED_NO_MUTATION_WAIT_RECOVERY';
}

assert.equal(
  startupDisposition({ pinCreated:false, startedPersisted:false, fallbackHeartbeatPersisted:false }),
  'STOP_CLAIM_TRANSPORT_BLOCKED',
  'pre-PIN transport block must stop without authority'
);
assert.equal(
  startupDisposition({ pinCreated:true, startedPersisted:false, fallbackHeartbeatPersisted:true }),
  'ACTIVE_HEARTBEAT_FALLBACK',
  'post-PIN STARTED failure with durable heartbeat must preserve active ownership'
);
assert.equal(
  startupDisposition({ pinCreated:true, startedPersisted:false, fallbackHeartbeatPersisted:false }),
  'OWNED_NO_MUTATION_WAIT_RECOVERY',
  'post-PIN double signal failure must preserve authority but forbid substantive mutation'
);
assert.notEqual(
  startupDisposition({ pinCreated:true, startedPersisted:false, fallbackHeartbeatPersisted:true }),
  'STOP_CLAIM_TRANSPORT_BLOCKED',
  'post-PIN STARTED failure must never be reclassified as claim transport blocked'
);

const wc = fs.readFileSync(new URL('../../../wc', import.meta.url), 'utf8');
const fast = fs.readFileSync(new URL('../../../coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md', import.meta.url), 'utf8');
const pinProtocol = JSON.parse(fs.readFileSync(new URL('../PORTFOLIO_PIN_PROTOCOL_V1.json', import.meta.url), 'utf8'));
const liveBuilder = fs.readFileSync(new URL('../../../.github/scripts/build-live-feed.mjs', import.meta.url), 'utf8');

assert.match(wc, /POST_CLAIM_START_FALLBACK/, 'wc bootstrap must name the heartbeat fallback checkpoint');
assert.match(wc, /CLAIM_TRANSPORT_BLOCKED.*before.*authority/i, 'wc must scope claim transport blocked to pre-authority failures');
assert.match(fast, /POST_CLAIM_START_FALLBACK/, 'fast allocation protocol must define the post-claim fallback');
assert.equal(pinProtocol.post_claim_start_signal?.started_schema, 'prometeo.worker-started/v1', 'canonical STARTED schema missing');
assert.equal(pinProtocol.post_claim_start_signal?.fallback_schema, 'prometeo.worker-heartbeat/v1', 'canonical fallback heartbeat schema missing');
assert.equal(pinProtocol.post_claim_start_signal?.fallback_checkpoint, 'POST_CLAIM_START_FALLBACK', 'fallback checkpoint mismatch');
assert.match(pinProtocol.liveness_rule?.effective_signal || '', /worker heartbeat/i, 'portfolio liveness must consume durable worker heartbeat');
assert.match(pinProtocol.authority_boundary || '', /heartbeats.*never grant.*execution authority/i, 'heartbeat must remain non-authoritative');
assert.match(liveBuilder, /function workerHeartbeatSignal\(workerId, jobId\)/, 'live builder no longer indexes worker heartbeat by worker/job');
assert.match(liveBuilder, /newestIso\(\[timeOf\(latestPin\?\.doc\),timeOf\(authority\?\.doc\),timeOf\(hb\?\.doc\),timeOf\(latestReturn\?\.doc\)\]\)/, 'live builder no longer folds heartbeat into last_signal_at');

console.log(JSON.stringify({
  ok:true,
  preclaim_transport_block:'STOP_CLAIM_TRANSPORT_BLOCKED',
  postclaim_started_block_with_heartbeat:'ACTIVE_HEARTBEAT_FALLBACK',
  postclaim_double_signal_block:'OWNED_NO_MUTATION_WAIT_RECOVERY',
  heartbeat_grants_authority:false,
  live_liveness_consumes_fallback:true
}, null, 2));
