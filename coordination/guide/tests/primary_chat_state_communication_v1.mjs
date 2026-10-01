import fs from 'node:fs';
import assert from 'node:assert/strict';
const c = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const n=v=>Number.isFinite(Number(v))?Number(v):0;
function compile(s, cfg={projection_stale_threshold_seconds:300,reserve_low_threshold:3}) {
  const rules=[
    ['PROJECTION_STALE',n(s.projection_age_seconds)>cfg.projection_stale_threshold_seconds],
    ['HUMAN_DECISION_REQUIRED',s.human_decision_required===true],
    ['CLAIM_TRANSPORT_DEGRADED',n(s.claim_transport_blocked_count)>0],
    ['HUMAN_INTENT_WAITING_NO_CAPACITY',n(s.pending_human_intent_count)>0&&n(s.live_worker_count)===0&&n(s.capacity_gap)>0],
    ['RETURNS_UNCONSUMED',n(s.unconsumed_returns_count)>0],
    ['RECOVERY_PRESSURE',n(s.recovery_attention_count)>0],
    ['REFILL_N',n(s.capacity_gap)>0&&n(s.claimable_generic_count)+n(s.claimable_specialized_count)>0],
    ['BUFFER_LOW',n(s.capacity_gap)===0&&n(s.reserve_workers)<=cfg.reserve_low_threshold&&n(s.core_demand)>0],
    ['CAPACITY_OK',n(s.core_demand)>0&&n(s.capacity_gap)===0&&n(s.live_worker_count)>0],
    ['WORKERS_ACTIVE_NO_ACTION',n(s.live_worker_count)>0],
    ['CAMPAIGN_COMPLETE',s.campaign_complete===true]
  ];
  return rules.find(([,ok])=>ok)?.[0]||'NO_SAFE_WORK';
}
function metric(events,a,b){const x=events[a],y=events[b];return Number.isFinite(x)&&Number.isFinite(y)&&y>=x?y-x:null;}
function humanIdle(now,lastHuman){return Number.isFinite(now)&&Number.isFinite(lastHuman)&&now>=lastHuman?now-lastHuman:null;}
assert.equal(compile({projection_age_seconds:301,human_decision_required:true}),'PROJECTION_STALE');
assert.equal(compile({human_decision_required:true}),'HUMAN_DECISION_REQUIRED');
assert.equal(compile({claim_transport_blocked_count:1,live_worker_count:3}),'CLAIM_TRANSPORT_DEGRADED');
assert.equal(compile({pending_human_intent_count:1,live_worker_count:0,capacity_gap:2,claimable_generic_count:4}),'HUMAN_INTENT_WAITING_NO_CAPACITY');
assert.equal(compile({unconsumed_returns_count:2,live_worker_count:3}),'RETURNS_UNCONSUMED');
assert.equal(compile({recovery_attention_count:2,live_worker_count:2}),'RECOVERY_PRESSURE');
assert.equal(compile({capacity_gap:2,claimable_generic_count:5,live_worker_count:0}),'REFILL_N');
assert.equal(compile({capacity_gap:0,reserve_workers:2,core_demand:4,live_worker_count:4}),'BUFFER_LOW');
assert.equal(compile({capacity_gap:0,reserve_workers:6,core_demand:4,live_worker_count:4}),'CAPACITY_OK');
assert.equal(compile({live_worker_count:2}),'WORKERS_ACTIVE_NO_ACTION');
assert.equal(compile({campaign_complete:true}),'CAMPAIGN_COMPLETE');
assert.equal(compile({}),'NO_SAFE_WORK');
const hour=3600000;
assert.equal(humanIdle(2*hour,0),2*hour);
assert.equal(metric({CLAIM:100,STARTED:250},'CLAIM','STARTED'),150);
assert.equal(metric({CLAIM:100},'CLAIM','STARTED'),null);
assert.equal(metric({CLAIM:250,STARTED:100},'CLAIM','STARTED'),null);
assert.equal(c.timing.worker_signals_must_not_reset_human_idle,true);
assert.equal(c.human_boundary_wait.human_silence_alone,'NOT_A_BOTTLENECK');
console.log('PASS primary_chat_state_communication_v1');
