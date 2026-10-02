import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

const wc=read('wc');
const policy=json('coordination/workers/WORKER_FRESH_LAUNCH_POLICY_V1.json');
const examSpec=json('coordination/workers/WORKER_PRODUCTIVITY_EXAM_V1.json');
const growth=json('coordination/workers/WORKER_GROWTH_POLICY_V1.json');
const strategy=json('coordination/workers/WORKER_STRATEGY_EXPERIMENT_V1.json');
const handoff=json('coordination/guide/GUIDE_WORKER_HANDOFF_V1.json');
const exitAudit=json('coordination/workers/WORKER_EXIT_AUDIT_V1.json');
const mission=json('coordination/guide/CURRENT_MISSION_V1.json');
const oldExam=json('coordination/workers/exams/wc-20260918T212321Z-94fec87501.json');
const oldBeacon=json('coordination/workers/beacons/wc-20260918T212321Z-94fec87501.json');
const scoreboard=read('scripts/build-worker-scoreboard.mjs');
const residencyGuard=read('scripts/worker-residency-integrity.mjs');
const poolPrompt=read('coordination/workers/POOL_PROD01_PROMPT.txt');
const site=process.argv[3]?path.resolve(process.argv[3]):null;

assert.equal(policy.status,'ACTIVE_BINDING');
assert.equal(policy.human_inline_launch_guard.status,'ACTIVE_BINDING');
assert.equal(policy.productive_smoke.status,'ACTIVE');
assert.equal(policy.smoke_gate.status,'SMOKE_PASS');
assert.equal(policy.productive_smoke.target_productive_units,6);
const residentPoolAlias=policy.launch_envelope.canary_resident_pool_alias;
assert.equal(policy.launch_envelope.parser_owner,'THIS_OBJECT','launch envelope parser owner must remain singular');
assert.deepEqual(policy.launch_envelope.explicit_precedence,['RUN','BATCH','POOL'],'explicit launch identities must keep precedence');
assert.equal(residentPoolAlias.status,'ACTIVE_CANARY');
assert.equal(residentPoolAlias.surface,'/wc');
assert.equal(residentPoolAlias.launch_class,'POOL');
assert.equal(residentPoolAlias.pool_id,mission.operating_mode.pool_id,'canary resident alias must target CURRENT pool');
assert.equal(residentPoolAlias.batch_id,`POOL-${mission.operating_mode.pool_id}`,'canary resident alias batch identity must derive from CURRENT pool');
assert.equal(residentPoolAlias.expected_workers,null);
assert.equal(residentPoolAlias.authority,false,'launch alias must never grant execution authority');
assert.equal(residentPoolAlias.explicit_identity_always_wins,true);
assert.equal(residentPoolAlias.stable_production_unchanged,true,'canary fallback must not change /w parsing');
assert.ok(policy.launch_envelope.forms.canary_resident_pool_alias.includes('RESIDENTE_POOL'),'policy must define the human-envelope trigger');
assert.ok(policy.launch_envelope.downstream_predicate_rule.includes('parsed launch_class'),'downstream pool predicates must use parsed class rather than literal-token reparsing');
assert.ok(policy.launch_envelope.downstream_predicate_rule.includes('POOL_TAIL_RESCUE'),'pool tail rescue must inherit parsed pool classification');
assert.equal(mission.human_prompts.worker.prompt,mission.operating_mode.invocation,'worker human prompt alias must equal canonical operating invocation');
assert.equal(mission.human_prompts.worker_production.prompt,mission.operating_mode.production_invocation,'production worker prompt alias must equal canonical production invocation');
if(mission.operating_mode.production_wave?.status==='ARMED'){
  assert.ok(mission.operating_mode.production_wave_invocation.includes('/w'),'production wave must use /w');
  assert.ok(mission.operating_mode.production_wave_invocation.includes('NUEVO_WORKER=1'),'production wave missing fresh marker');
  assert.ok(mission.operating_mode.production_wave_invocation.includes('RESIDENTE_BATCH'),'production wave missing batch residency');
  assert.ok(mission.operating_mode.production_wave_invocation.includes(`BATCH ${mission.operating_mode.production_wave.batch_id} EXPECTED ${mission.operating_mode.production_wave.expected_workers}`),'production wave marker mismatch');
}
assert.ok(mission.operating_mode.production_invocation.includes('/w'),'production invocation must use /w');
assert.ok(mission.operating_mode.production_invocation.includes('NUEVO_WORKER=1'),'production invocation missing fresh launch marker');
assert.ok(mission.operating_mode.invocation.includes(`POOL ${residentPoolAlias.pool_id}`),'preferred canonical /wc invocation must remain explicit even with fallback alias');
assert.ok(mission.operating_mode.production_invocation.includes(`POOL ${residentPoolAlias.pool_id}`),'stable /w invocation must remain explicit-only');
assert.equal(poolPrompt,mission.operating_mode.invocation+'\n','POOL PROD-01 prompt alias must equal canonical operating invocation plus final newline');
for(const marker of policy.human_inline_launch_guard.required_markers){
  assert.ok(mission.operating_mode.invocation.includes(marker),'mission invocation missing inline guard '+marker);
  assert.ok(mission.human_prompts.worker.prompt.includes(marker),'worker human prompt alias missing inline guard '+marker);
  assert.ok(poolPrompt.includes(marker),'POOL PROD-01 prompt alias missing inline guard '+marker);
}
assert.equal(policy.incident.diagnosis,'FRESH_LAUNCH_REPLAY');
assert.equal(policy.incident.historical_exam_ref,'coordination/workers/exams/wc-20260918T212321Z-94fec87501.json');
assert.equal(oldExam.worker_id,'wc-20260918T212321Z-94fec87501');
assert.equal(oldExam.protocol_version,'v3.28');
assert.equal(oldExam.closed_at,'2026-09-18T21:38:00Z');
assert.equal(oldBeacon.worker_id,oldExam.worker_id);
assert.notEqual(oldBeacon.canary_protocol,'v3.30');

assert.ok(wc.startsWith('PROMETEO UNIVERSAL COGNITIVE WORKER CANARY v3.30'));
for(const needle of [
  'FRESH LAUNCH / ANTI-REPLAY',
  'WORKER_FRESH_LAUNCH_POLICY_V1.json',
  'fresh_launch=true',
  'launch_nonce',
  'FRESH_LAUNCH_BEACON_NOT_CREATED',
  'A terminal human response for a new launch is FORBIDDEN',
  'CREATE_EXISTS, DISCARD that worker_id'
]) assert.ok(wc.includes(needle),'wc missing '+needle);
assert.ok(wc.indexOf('atomically CREATE \`coordination/workers/beacons/<worker_id>.json\`') < wc.indexOf('Read ONE compact claim frontier directly:'),'fresh beacon must precede frontier read');

assert.ok(wc.includes('HUMAN INLINE LAUNCH GUARD'),'wc must carry defense-in-depth launch envelope semantics');
assert.ok(wc.includes('RESIDENT CONTINUATION GUARD'),'wc must carry resident continuation guard');
assert.ok(wc.includes('After every nonterminal productive RETURN'),'wc must make RETURN -> NEXT explicit');
assert.ok(wc.includes('For **BATCH and POOL launches**'),'POOL residency target must be explicit');
assert.ok(wc.includes("historical worker's exhaustion/no-allocation evidence never satisfies this launch"),'below-target close cannot inherit historical exhaustion');
assert.equal(examSpec.current_worker_protocol_version,'v3.30');
assert.equal(examSpec.v330_pool_residency.target_productive_units,6);
assert.ok(examSpec.v330_pool_residency.conditional_terminal_fields.includes('close_reason'));
assert.ok(examSpec.v330_pool_residency.conditional_terminal_fields.includes('close_evidence_refs'));
assert.equal(examSpec.v330_fresh_launch.policy_ref,'coordination/workers/WORKER_FRESH_LAUNCH_POLICY_V1.json');
assert.equal(growth.worker_protocol_min_version,'v3.30');
assert.equal(strategy.protocol_min_version,'v3.30');
assert.equal(exitAudit.status,'CANARY_BINDING');
assert.equal(exitAudit.durable_owner.existing_owner,'coordination/workers/exams/<worker_id>.json');
assert.equal(exitAudit.durable_owner.field,'exit_audit_v1');
assert.ok(exitAudit.privacy_and_reasoning_rules.some(x=>x.includes('hidden chain-of-thought')));
assert.equal(handoff.integrity_smoke_override.status,'DISABLED_AFTER_SMOKE_PASS');
assert.equal(handoff.integrity_smoke_override.pass_gate,'gh-pages:live/worker-scoreboard.json#fresh_launch_integrity.status == SMOKE_PASS');
assert.equal(mission.operating_mode.current_worker_protocol_version,'v3.30');
assert.equal(mission.current_snapshot.fresh_launch_incident.status,'MITIGATED_SMOKE_PASS');
assert.ok(Number.isInteger(mission.current_snapshot.occupancy.recommended_additional_launches_at_snapshot));
const platformHold=mission?.platform_graduation?.status==='ACTIVE_BINDING'&&mission?.platform_graduation?.broad_scale_hold===true;
assert.ok(platformHold?mission.current_snapshot.occupancy.recommended_additional_launches_at_snapshot===0:(mission.current_snapshot.occupancy.recommended_additional_launches_at_snapshot>=4&&mission.current_snapshot.occupancy.recommended_additional_launches_at_snapshot<=20));

for(const needle of ['fresh_launch_integrity','pool_residency_integrity','beacon_launch_nonce','exam_launch_nonce','SMOKE_PASS']) assert.ok(scoreboard.includes(needle),'scoreboard missing '+needle);
assert.ok(residencyGuard.includes('EARLY_CLOSE_UNJUSTIFIED'),'residency helper must classify unjustified early terminal');

if(site){
  const publicWc=fs.readFileSync(path.join(site,'wc','index.html'),'utf8');
  const publicExit=fs.readFileSync(path.join(site,'wc','exit','index.html'),'utf8');
  const publicW=fs.readFileSync(path.join(site,'w','index.html'),'utf8');
  assert.ok(publicWc.includes(mission.operating_mode.invocation),'public /wc must render exact canonical mission invocation');
  assert.ok(publicW.includes(mission.operating_mode.production_invocation),'public /w must render exact canonical production invocation');
  assert.ok(publicExit.includes('PROMETEO WORKER EXIT AUDIT'),'public /wc/exit must render exit audit');
  assert.ok(publicExit.includes('exit_audit_v1'),'public /wc/exit must name existing E9 field');
  assert.ok(publicExit.includes('Never reveal hidden chain-of-thought'),'public /wc/exit must forbid hidden reasoning disclosure');
  assert.ok(publicW.includes('PRODUCTION STABLE'),'public /w must identify stable production');
  assert.ok(publicW.includes('V3_EVIDENCE_MAP'),'public /w must expose promoted E6 baseline');
  assert.ok(publicW.includes('source=/w'),'public /w must expose stable beacon source');
  assert.ok(publicW.includes('missing_expected'),'public /w must expose exact finite-wave refill accounting');
  for(const marker of policy.human_inline_launch_guard.required_markers){
    assert.ok(publicWc.includes(marker),'public /wc missing inline guard '+marker);
    assert.ok(publicW.includes(marker),'public /w missing inline guard '+marker);
  }
}

console.log('WORKER_FRESH_LAUNCH_V1_PASS');
