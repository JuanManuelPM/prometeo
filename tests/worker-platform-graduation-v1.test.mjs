import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

const mission=json('coordination/guide/CURRENT_MISSION_V1.json');
const handoff=json('coordination/guide/GUIDE_WORKER_HANDOFF_V1.json');
const graduation=json('coordination/workers/WORKER_PLATFORM_GRADUATION_V1.json');
const receipt=json('coordination/workers/WORKER_PLATFORM_GRADUATION_RECEIPT_V1.json');
const pipeline=json('coordination/workers/WORKER_PIPELINE_V1.json');
const p2b=json('coordination/launch-packets/CATLAB-P2B-01/P2B_RESULT.json');
const packet=json('coordination/workers/LAUNCH_PACKET_PROTOCOL_V1.json');
const campaign=json('coordination/guide/GROWTH_CAMPAIGN_V1.json');
const head=json('coordination/CONTINUITY_HEAD.json');
const w=read('w');
const wc=read('wc');
const g=read('g');

assert.equal(graduation.status,'PASS_GRADUATED');
assert.equal(graduation.scale_hold.broad_new_worker_launches,'RELEASED');
assert.equal(graduation.benchmark.benchmark_id,'CAT-LAB-V1');
assert.equal(graduation.benchmark.status,'GRADUATED_PASS');
assert.equal(graduation.phase_plan.find(x=>x.id==='P1_LAUNCH_PACKET').status,'DONE_VERIFIED');
assert.equal(graduation.phase_plan.find(x=>x.id==='P2A_EVOLUTION_EXPLORATION').status,'DONE_VERIFIED');
assert.equal(graduation.phase_plan.find(x=>x.id==='P2B_CONFIRMATION').status,'DONE_VERIFIED');
assert.equal(graduation.phase_plan.find(x=>x.id==='P3_RESIDENT_REALLOCATION').status,'DONE_VERIFIED');
assert.equal(graduation.phase_plan.find(x=>x.id==='P4_FREEZE_AND_SCALE').status,'DONE_RELEASED');
assert.equal(graduation.benchmark.pass_rule.includes('3/3'),true);

assert.equal(receipt.status,'PASS');
assert.equal(receipt.promoted_baseline.law,'V3_EVIDENCE_MAP');
assert.equal(receipt.p2b_metrics.assignment,'6/6');
assert.equal(receipt.p2b_metrics.independent_browser_pass,'6/6');
assert.equal(receipt.p2b_metrics.reallocation_complete,'6/6');

assert.equal(p2b.status,'P2B_COMPLETE');
assert.equal(p2b.candidate_results.V3_EVIDENCE_MAP.gate,'PASS_3_OF_3');
assert.equal(p2b.candidate_results.V4_TWO_PASS_REVIEW.gate,'PASS_3_OF_3');
assert.equal(p2b.conclusion.baseline_promotion,'V3_EVIDENCE_MAP');
assert.equal(p2b.conclusion.causal_winner_declared,false);

const e6=pipeline.stages.find(x=>x.id==='E6_VERIFY');
assert.equal(e6.promoted_law.id,'V3_EVIDENCE_MAP');
assert.equal(e6.promoted_law.status,'PROMOTED_BASELINE');
assert.equal(e6.confirmed_optional_law.id,'V4_TWO_PASS_REVIEW');
assert.ok(wc.includes('PROMOTED E6 BASELINE — EVIDENCE MAP'));
assert.ok(w.startsWith('PROMETEO UNIVERSAL COGNITIVE WORKER STABLE v3.30'));
assert.ok(w.includes('CATLAB-P2B-01'));

assert.equal(packet.status,'ACTIVE_BINDING');
assert.equal(packet.human_contract.human_numbers_prompts,false);
assert.equal(packet.human_contract.same_prompt_for_entire_run,true);
assert.equal(packet.slot_model.slot_claim_mode,'ATOMIC_CREATE');

assert.equal(mission.platform_graduation.status,'PASS_GRADUATED');
assert.equal(mission.platform_graduation.broad_scale_hold,false);
assert.equal(mission.current_snapshot.occupancy.recommended_additional_launches_at_snapshot,4);
assert.ok(String(mission.current_snapshot.occupancy.launch_timing).startsWith('GRADUATED_PRODUCTION_'),'post-graduation launch timing must remain a graduated production mode');
assert.equal(handoff.platform_graduation_override.status,'DISABLED_AFTER_PASS');
assert.equal(handoff.current_recommendation_example.recommended_approx_workers,4);
assert.equal(campaign.next_launch.approximate_additional_workers_before_next_guide_return,4);
assert.ok(String(campaign.next_launch.mode).startsWith('GRADUATED_PRODUCTION_'),'campaign must stay in graduated production mode');
assert.equal(head.human_contract.current_approx_workers_before_guide_return,4);
assert.equal(head.human_contract.production_generic_worker_operational,true);
assert.ok(mission.operating_mode.production_invocation.includes('/w'));
assert.ok(g.includes('DISABLED_AFTER_PASS'));
assert.ok(g.includes('stable `/w` production prompt'));

console.log('WORKER_PLATFORM_GRADUATION_V1_PASS');
