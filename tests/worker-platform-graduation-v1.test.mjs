import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

const mission=json('coordination/guide/CURRENT_MISSION_V1.json');
const handoff=json('coordination/guide/GUIDE_WORKER_HANDOFF_V1.json');
const graduation=json('coordination/workers/WORKER_PLATFORM_GRADUATION_V1.json');
const packet=json('coordination/workers/LAUNCH_PACKET_PROTOCOL_V1.json');
const campaign=json('coordination/guide/GROWTH_CAMPAIGN_V1.json');
const head=json('coordination/CONTINUITY_HEAD.json');
const g=read('g');

assert.equal(graduation.status,'ACTIVE_BINDING');
assert.equal(graduation.scale_hold.broad_new_worker_launches,'HOLD');
assert.equal(graduation.benchmark.benchmark_id,'CAT-LAB-V1');
assert.ok(['EVOLUTION_PACKET_READY_FOR_ARM','EVOLUTION_RUN_ARMED','CONFIRMATION_RUN_ARMED'].includes(graduation.benchmark.status));
assert.equal(graduation.phase_plan[0].id,'P1_LAUNCH_PACKET');
assert.equal(graduation.phase_plan[1].id,'P2A_EVOLUTION_EXPLORATION');
assert.equal(graduation.phase_plan[1].run_id,'CATLAB-EVO-01');
assert.equal(graduation.benchmark.pass_rule.includes('3/3'),true);
assert.equal(packet.status,'ACTIVE_BINDING');
assert.equal(packet.human_contract.human_numbers_prompts,false);
assert.equal(packet.human_contract.same_prompt_for_entire_run,true);
assert.equal(packet.slot_model.slot_claim_mode,'ATOMIC_CREATE');
assert.equal(packet.capability_aware_occupancy.oversubscription_default,1);
assert.equal(mission.platform_graduation.status,'ACTIVE_BINDING');
assert.equal(mission.platform_graduation.broad_scale_hold,true);
assert.equal(mission.current_snapshot.occupancy.recommended_additional_launches_at_snapshot,0);
assert.ok(String(mission.current_snapshot.occupancy.launch_timing||'').startsWith('BROAD_HOLD_') && String(mission.current_snapshot.occupancy.launch_timing||'').endsWith('RUN_ARMED'));
assert.equal(handoff.platform_graduation_override.status,'ACTIVE');
assert.equal(handoff.current_recommendation_example.recommended_approx_workers,0);
assert.equal(campaign.next_launch.approximate_additional_workers_before_next_guide_return,0);
assert.equal(head.human_contract.current_approx_workers_before_guide_return,0);
assert.ok(g.includes('### PLATFORM GRADUATION OVERRIDE'));
assert.ok(g.includes('WORKER LAUNCH: HOLD'));

console.log('WORKER_PLATFORM_GRADUATION_V1_PASS');
