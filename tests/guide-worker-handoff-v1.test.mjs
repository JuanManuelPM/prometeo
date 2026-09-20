import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

const policy=json('coordination/guide/GUIDE_WORKER_HANDOFF_V1.json');
const mission=json('coordination/guide/CURRENT_MISSION_V1.json');
const head=json('coordination/CONTINUITY_HEAD.json');
const focus=json('coordination/workstreams/chat-native-control-plane-v1/FOCUS.json');
const chat=json('coordination/workstreams/chat-native-control-plane-v1/CHAT_OBJECT.json');
const g=read('g');
const writeback=read('coordination/guide/GUIDE_CURRENT_MISSION_WRITEBACK_V1.md');
const builder=read('scripts/build-guide-brief.mjs');
const approx=mission.current_snapshot.occupancy.recommended_additional_launches_at_snapshot;

assert.equal(policy.status,'ACTIVE_BINDING');
assert.equal(policy.response_contract.required_bottom_shape,'MANDÁ ~<N> /wc Y VOLVÉ A /g · <short evidence reason>');
assert.equal(policy.response_contract.production_bottom_shape,'MANDÁ ~<N> /w Y VOLVÉ A /g · <short evidence reason>');
assert.equal(policy.launch_estimator.bounded_canary.minimum,4);
assert.equal(policy.integrity_smoke_override.status,'DISABLED_AFTER_SMOKE_PASS');
assert.equal(policy.integrity_smoke_override.pass_gate,'gh-pages:live/worker-scoreboard.json#fresh_launch_integrity.status == SMOKE_PASS');
assert.equal(policy.launch_estimator.bounded_canary.maximum,20);
assert.equal(policy.launch_estimator.bounded_canary.frontier_multiplier,0.5);
const platformHold=policy?.platform_graduation_override?.status==='ACTIVE';
assert.ok(Number.isInteger(approx)&&(platformHold?approx===0:(approx>=4&&approx<=20)));
assert.equal(policy.current_recommendation_example.recommended_approx_workers,approx);
assert.equal(mission.operating_mode.current_worker_protocol_version,'v3.30');
assert.equal(mission.current_snapshot.fresh_launch_incident.status,'MITIGATED_SMOKE_PASS');

assert.equal(mission.worker_handoff_policy_ref,'coordination/guide/GUIDE_WORKER_HANDOFF_V1.json');
assert.equal(mission.operating_mode.worker_handoff.require_exhaustive_same_turn_work_before_handoff,true);
assert.equal(mission.operating_mode.worker_handoff.canonical_prompt_must_be_first_copyable_block,true);
assert.ok(platformHold?approx===0:(approx>=4&&approx<=20));
assert.equal(mission.current_snapshot.occupancy.recommendation_exact,platformHold?true:false);

assert.equal(head.worker_handoff_policy_ref,'coordination/guide/GUIDE_WORKER_HANDOFF_V1.json');
assert.equal(head.human_contract.current_approx_workers_before_guide_return,approx);
assert.equal(head.active_operating_mode.current_approx_worker_handoff,approx);
assert.equal(focus.current_approx_worker_handoff,approx);
if(chat.current_approx_worker_handoff!==approx) assert.equal(mission?.continuity_boundaries?.chat_object_update?.code,'TOOL_SAFETY_DENIAL','stale CHAT_OBJECT requires explicit durable boundary');

for(const needle of [
  'GUIDE_WORKER_HANDOFF_V1.json',
  'WORKER HANDOFF RESPONSE OVERRIDE',
  'first visible copyable block',
  'MANDÁ ~<N> /w Y VOLVÉ A /g'
]) assert.ok(g.includes(needle),'g missing '+needle);

for(const needle of [
  'GUIDE_WORKER_HANDOFF_V1.json',
  'first visible copyable block',
  'MANDÁ ~<N> /w Y VOLVÉ A /g'
]) assert.ok(writeback.includes(needle),'writeback missing '+needle);

for(const needle of [
  'approximate_additional_workers_before_next_guide_return',
  'frontier_multiplier',
  'strategy_sample_gaps',
  'worker_handoff:workerHandoff',
  'Próximo handoff'
]) assert.ok(builder.includes(needle),'guide brief builder missing '+needle);

console.log('GUIDE_WORKER_HANDOFF_V1_PASS');
