import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const exp=json('coordination/workers/WORKER_STRATEGY_EXPERIMENT_V1.json');
assert.equal(exp.schema,'prometeo.worker-strategy-experiment/v1');
assert.equal(exp.experiment_id,'EXP-STRATEGY-AB');
assert.equal(exp.status,'ACTIVE_CANARY');
assert.equal(exp.applies_after,'OWNERSHIP');
assert.equal(exp.authority_boundary.preclaim_reads_added,0);
assert.equal(exp.authority_boundary.claim_authority_changed,false);
assert.equal(exp.measurement.min_independent_workers_per_variant,3);
for(const c of ['MUTATION','VERIFICATION','INTEGRATION','GUIDE_FRONTIER']) assert.equal(exp.classes[c].variants.length,2,c+' must have two variants');

const wc=read('wc');
assert.ok(wc.startsWith('PROMETEO UNIVERSAL COGNITIVE WORKER CANARY v3.28'));
const after=wc.indexOf('## AFTER OWNERSHIP');
const expRef=wc.indexOf('coordination/workers/WORKER_STRATEGY_EXPERIMENT_V1.json');
assert.ok(after>=0 && expRef>after,'strategy experiment must load only after ownership');
assert.equal(wc.includes('### POOL YIELD-PATTERN REPRODUCTION'),false);
assert.ok(wc.includes('Do NOT newly propagate it, assign it, or write it as `pattern_id`'));
assert.ok(wc.includes('strategy_assignment_basis="beacon_commit_sha_first_8_hex_mod_variant_count"'));

const exam=json('coordination/workers/WORKER_PRODUCTIVITY_EXAM_V1.json');
assert.equal(exam.current_worker_protocol_version,'v3.28');
assert.equal(exam.pattern_measurement.active_pattern_ref,null);
assert.equal(exam.pattern_measurement.historical_candidate_ref,'coordination/workers/YIELD_PATTERN_CANDIDATE_V1.json');
assert.equal(exam.strategy_measurement.active_experiment_ref,'coordination/workers/WORKER_STRATEGY_EXPERIMENT_V1.json');
assert.equal(exam.strategy_policy.cross_class_universal_winner_forbidden,true);

const retired=json('coordination/workers/YIELD_PATTERN_CANDIDATE_V1.json');
assert.equal(retired.status,'REJECTED_AS_UNIVERSAL_PATTERN_RETAINED_AS_EVIDENCE');

const scoreboard=read('scripts/build-worker-scoreboard.mjs');
for(const needle of ['strategy_experiment_health','experimental_productive_slots','preclaim_diagnostics','causal_for_variant:false']) assert.ok(scoreboard.includes(needle),'scoreboard missing '+needle);

const compass=json('coordination/guide/GUIDE_POWER_COMPASS_V1.json');
assert.equal(compass.creative_lever_catalog.find(x=>x.id==='A_B_WORKER_STRATEGIES').current_status,'ACTIVE');
assert.ok(compass.creative_lever_catalog.find(x=>x.id==='PATTERN_REPRODUCTION').current_status.startsWith('RETIRED_'));
assert.equal(compass.current_priority_experiments.find(x=>x.id==='EXP-STRATEGY-AB').status,'ACTIVE_RUNNING_CANARY');

const trajectory=json('coordination/guide/GROWTH_TRAJECTORY_V1.json');
assert.equal(trajectory.current_state.active_stage,'S3_JOB_CLASS_STRATEGIES');
assert.equal(trajectory.current_state.active_experiment,'EXP-STRATEGY-AB');
assert.equal(trajectory.roadmap.find(x=>x.stage==='S3_JOB_CLASS_STRATEGIES').status,'ACTIVE_EXPERIMENT_RUNNING');

const mission=json('coordination/guide/CURRENT_MISSION_V1.json');
assert.equal(mission.operating_mode.current_worker_protocol_version,'v3.28');
assert.equal(mission.strategy_experiment_ref,'coordination/workers/WORKER_STRATEGY_EXPERIMENT_V1.json');

const campaign=json('coordination/guide/GROWTH_CAMPAIGN_V1.json');
assert.equal(campaign.strategy_boundary.role,'OPERATIONAL_POOL_CAPACITY_ONLY');
assert.equal(campaign.strategy_boundary.may_choose_or_promote_worker_strategy,false);

const brief=read('scripts/build-guide-brief.mjs');
assert.ok(brief.includes('Experimento estratégico'));
assert.ok(brief.includes('Patrón reproducible'));

console.log('WORKER_STRATEGY_EXPERIMENT_V1_PASS');
