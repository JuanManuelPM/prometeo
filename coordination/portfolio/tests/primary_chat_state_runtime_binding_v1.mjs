#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(repoRoot,rel),'utf8');
const index=read('current-tree/control-v11/chat-canary/index.html');
const progress=read('current-tree/control-v11/chat-canary/progress-v1.js');
const contract=JSON.parse(read('coordination/guide/PRIMARY_CHAT_STATE_COMMUNICATION_CONTRACT_V1.json'));

assert.match(index,/src="\.\/progress-v1\.js(?:\?v=[^"]+)?"/,'served canary must load the CURRENT progress/state compiler');
assert.doesNotMatch(index,/src="\.\/current-first-v1\.js"/,'dead/stale current-first compiler must not become a second runtime owner');

assert.match(progress,/function\s+compileContractState\s*\(/,'runtime compiler required');
assert.match(progress,/\['RETURNS_UNCONSUMED',\s*n\(input\.unconsumed_returns_count\)\s*>\s*0\s*&&\s*n\(input\.live_worker_count\)\s*>\s*0\]/,'unconsumed returns require a live consumer');
assert.match(progress,/\['RECOVERY_PRESSURE',\s*n\(input\.recovery_attention_count\)\s*>\s*0\s*&&\s*n\(input\.live_worker_count\)\s*>\s*0\]/,'recovery pressure requires a live consumer');
assert.match(progress,/\['REFILL_N',\s*n\(input\.capacity_gap\)\s*>\s*0\s*&&\s*\(n\(input\.claimable_generic_count\)\s*\+\s*n\(input\.claimable_specialized_count\)\)\s*>\s*0\]/,'capacity refill must derive from durable gap + claimable frontier');
assert.match(progress,/const\s+live\s*=\s*rows\.filter\(row\s*=>\s*!row\.terminal\s*&&\s*row\.age_seconds\s*\*\s*1000\s*<\s*LIVE_MS\)\.length/,'ACTIVE must require a recent durable worker signal');
assert.match(progress,/worker\?\.close\?\.at\s*\|\|\s*worker\?\.last_event_at\s*\|\|\s*worker\?\.claim\?\.at\s*\|\|\s*worker\?\.routed\?\.at\s*\|\|\s*worker\?\.first_event_at/,'worker freshness must derive from durable timestamps');
assert.match(progress,/runtime\?\.generated_at/,'runtime projection timestamp required');
assert.match(progress,/frontier\?\.generated_at/,'frontier projection timestamp required');
assert.match(progress,/const\s+ALLOCATOR_URL\s*=\s*['"][^'"]*live\/allocator\.json['"]/,'allocator fallback source required');
assert.match(progress,/async\s+function\s+getRuntimeForCapacity\s*\(/,'runtime fallback loader required');
assert.match(progress,/worker_projection\?\.working/,'allocator fallback must preserve explicit working count');
assert.match(progress,/metabolism\?\.unconsumed_returns/,'allocator fallback must preserve unconsumed returns');
assert.match(progress,/getRuntimeForCapacity\(\),\s*getJson\(FRONTIER_URL\)/,'capacity load must use runtime fallback loader');
assert.match(progress,/isFreshClaimTransportBlock/,'claim transport degradation must be freshness bounded');
assert.match(progress,/explicitQa\(/,'QA must derive from explicit durable metadata');

for(const [label,expected] of [
  ['0 workers + trabajo','REFILL_N'],
  ['returns sin worker vivo pide refill','REFILL_N'],
  ['recovery sin worker vivo pide refill','REFILL_N'],
  ['returns unconsumed','RETURNS_UNCONSUMED'],
  ['recovery pressure','RECOVERY_PRESSURE'],
  ['proyección stale','PROJECTION_STALE'],
  ['human decision boundary','HUMAN_DECISION_REQUIRED'],
  ['claim transport blocked','CLAIM_TRANSPORT_DEGRADED']
]){
  const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.match(progress,new RegExp(`scenario\\(['\"]${escaped}['\"][\\s\\S]{0,220}['\"]${expected}['\"]\\)`),`${label} must remain covered by runtime harness`);
}

const precedence=contract.state_precedence||[];
for(const state of ['PROJECTION_STALE','HUMAN_DECISION_REQUIRED','CLAIM_TRANSPORT_DEGRADED','RETURNS_UNCONSUMED','RECOVERY_PRESSURE','REFILL_N','BUFFER_LOW','CAPACITY_OK','WORKERS_ACTIVE_NO_ACTION','CAMPAIGN_COMPLETE','NO_SAFE_WORK']){
  assert.ok(precedence.includes(state),`contract precedence must include ${state}`);
}
assert.equal(contract.authority,'NON_AUTHORITATIVE_DERIVED_PROJECTION','state compiler must remain a derived projection, never authority');

console.log(JSON.stringify({
  schema:'prometeo.primary-chat-state-runtime-binding-test/v1',
  overall:'PASS',
  runtime_owner:'current-tree/control-v11/chat-canary/progress-v1.js',
  duplicate_runtime_owner_loaded:false,
  live_worker_requires_recent_durable_signal:true,
  no_live_consumer_refill_cases:true,
  contract_authority:contract.authority
},null,2));
