import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFastAllocator } from '../scripts/build-fast-allocator.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const requiredPinFields = [
  'schema','pin_id','job_id','dedupe_key','project_id','generation','worker_id','claim_id',
  'claimed_at','expires_at','source_head','predecessor_pin_ref_or_null',
  'predecessor_claim_ref_or_null','recovery_basis_or_null'
];
const requiredRoleFields = [
  'schema','pin_id','guide_work_id','role','trigger','generation','worker_id','claim_id',
  'claimed_at','expires_at','source_head','evidence','predecessor_pin_ref_or_null'
];

const syntheticFeed={
  generated_at:new Date().toISOString(),
  source_sha:'synthetic-sha',
  summary:{workers:{}},
  workers:[],
  projects:[{project_id:'p',label:'P',jobs:[{
    job_id:'job-ready',dedupe_key:'p:job-ready:v1',project_id:'p',title:'Ready',priority:100,state:'ready',pin_generation:0,
    source_path:'coordination/portfolio/derived/p/job-ready.json',returns:[],collisions:[]
  }]}],
  plans:[]
};
const roleContext={
  metabolism:{signals:{recent_launch_window_minutes:10,frontier_floor_absolute:8,frontier_per_recent_launch:1.5,frontier_ceiling:40,unconsumed_returns_trigger:3,replaceable_trigger:3,collision_pressure_trigger:3,partial_loop_trigger:2,young_active_pin_guard_age_minutes:3,young_active_pin_guard_minimum:4,young_active_pin_guard_fraction_of_recent_launches:.5}},
  guideReceipts:[],guidePins:[],heartbeats:[],noAlloc:[],beacons:[]
};
const allocator=buildFastAllocator(syntheticFeed,{status:'HEALTHY',metrics:{},reasons:[]},{roleContext});

test('central allocator emits every immutable portfolio pin field before CREATE', () => {
  assert.equal(allocator.schema,'prometeo.fast-allocator/v3');
  assert.deepEqual(allocator.preferred_order,['ready','queue_ready','role_ready','recovery']);
  assert.equal(allocator.ready.length,1);
  const payload=allocator.ready[0].claim_payload_shape;
  for(const field of requiredPinFields) assert.ok(Object.hasOwn(payload,field),`missing ${field}`);
  assert.equal(payload.worker_id,'<worker_id>');
  assert.equal(payload.claimed_at,'<now_iso>');
  assert.equal(payload.expires_at,'<now_plus_10m_iso>');
  assert.equal(payload.source_head,'synthetic-sha');
});

test('thin grounded frontier compiles a first-class atomic Guide role without worker archaeology', () => {
  assert.ok(allocator.role_ready.length>=1,'expected compiled role_ready');
  const planner=allocator.role_ready.find(x=>x.role==='GUIDE_PLANNER');
  assert.ok(planner,'expected GUIDE_PLANNER');
  assert.equal(planner.claim_mode,'GUIDE_ROLE_PIN_CREATE');
  assert.match(planner.claim_path,/^coordination\/guide\/pins\/guide-planner-[a-f0-9]{12}\/G000001\.json$/);
  for(const field of requiredRoleFields) assert.ok(Object.hasOwn(planner.claim_payload_shape,field),`missing role field ${field}`);
  assert.deepEqual(planner.evidence,['coordination/portfolio/derived/p/job-ready.json']);
});

test('/wc refuses incomplete immutable pins and routes role_ready before recovery', () => {
  const wc=read('wc');
  assert.ok(wc.includes('Candidate order for unbatched workers is `ready` -> `queue_ready` -> `role_ready` -> `recovery`'));
  assert.ok(wc.includes('candidate.claim_payload_shape'));
  assert.ok(wc.includes('ALLOCATOR_PIN_PAYLOAD_INVALID'));
  assert.ok(wc.includes('GUIDE_ROLE_PIN_CREATE'));
  assert.ok(wc.includes('Lane diversification: after 2 CREATE_EXISTS outcomes in the same lane'));
  assert.ok(wc.includes('BRANCH_HEAD_MOVED'));
  assert.ok(wc.includes('retry the same exact claim path and payload once'));
  assert.ok(wc.includes('does NOT consume an authority CREATE attempt'));
  assert.ok(wc.includes('CLAIM_TRANSPORT_UNSTABLE'));
  assert.ok(wc.includes('Never CREATE an immutable malformed pin'));
  assert.ok(wc.includes('FORBIDDEN before ownership:'));
});

test('fast allocation preserves claim-first while making latent Guide work centrally claimable', () => {
  const fast=read('coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md');
  assert.ok(fast.includes('3. `role_ready` centrally compiled Guide work;'));
  assert.ok(fast.includes('METABOLISM_POLICY_V1.json -> durable signals -> role_ready -> atomic role PIN'));
  assert.ok(fast.includes('DO NOT pre-read the candidate\'s pin directory'));
  assert.ok(fast.includes('Attempt the atomic CREATE first only after the bounded allocator payload has passed the structural field check.'));
});

test('efficiency ratchet records immutable payload and latent-work regressions', () => {
  const baseline=JSON.parse(read('coordination/efficiency/RATCHET_BASELINE_V1.json'));
  const immutable=baseline.items.find(x=>x.id==='EFF011');
  const latent=baseline.items.find(x=>x.id==='EFF013');
  assert.ok(immutable,'EFF011 must exist');
  assert.equal(immutable.required.allocator_claim_payload_complete,true);
  assert.ok(latent,'EFF013 must exist');
  assert.equal(latent.required.role_ready_compiled_centrally,true);
  assert.deepEqual(latent.required.candidate_order,['ready','queue_ready','role_ready','recovery']);
  assert.equal(latent.required.false_no_allocation_with_usable_role_ready_forbidden,true);
  assert.equal(baseline.runtime_baseline_activated_at,'2026-09-17T20:15:00Z','ordinary ratchet edit must not reset runtime epoch');
});
