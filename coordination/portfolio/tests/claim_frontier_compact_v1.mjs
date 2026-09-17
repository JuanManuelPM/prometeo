#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildClaimFrontier } from '../../scripts/build-claim-frontier.mjs';

const payload=i=>({
  schema:'prometeo.portfolio-pin/v1',
  pin_id:'pin-'+i+'-<worker_id>',
  job_id:'job-'+i,
  dedupe_key:'d:'+i,
  project_id:'p'+(i%5),
  generation:1,
  worker_id:'<worker_id>',
  claim_id:'claim-'+i+'-<worker_id>',
  claimed_at:'<now_iso>',
  expires_at:'<now_plus_10m_iso>',
  source_head:'abc',
  predecessor_pin_ref_or_null:null,
  predecessor_claim_ref_or_null:null,
  recovery_basis_or_null:null
});
const ready=Array.from({length:15},(_,i)=>({
  job_id:'job-'+i,project_id:'p'+(i%5),title:'Job '+i,priority:100-i,
  mission:'X'.repeat(5000),evidence:Array(100).fill('very-long-evidence-'+i),
  claim_mode:'PORTFOLIO_PIN_CREATE',claim_path:'pins/job-'+i+'.json',
  claim_payload_shape:payload(i),required_capabilities:[]
}));
const roles=Array.from({length:15},(_,i)=>({
  role_id:'guide-'+i,guide_work_id:'guide-'+i,scope_project_id:'p'+(i%5),
  title:'Guide '+i,role:'GUIDE_PLANNER',trigger:'PROJECT_FRONTIER_THIN',priority:90-i,
  mission:'Y'.repeat(5000),evidence:Array(100).fill('very-long-role-evidence-'+i),
  claim_mode:'GUIDE_ROLE_PIN_CREATE',claim_path:'guide/'+i+'.json',
  claim_payload_shape:{schema:'prometeo.guide-role-pin/v1',pin_id:'g'+i,guide_work_id:'guide-'+i,role:'GUIDE_PLANNER',trigger:'PROJECT_FRONTIER_THIN',generation:1,worker_id:'<worker_id>',claim_id:'c'+i,claimed_at:'<now_iso>',expires_at:'<now_plus_10m_iso>',source_head:'abc',evidence:['state:'+i],predecessor_pin_ref_or_null:null}
}));
const allocator={
  schema:'prometeo.fast-allocator/v3',generated_at:'2026-09-17T23:00:00Z',source_sha:'abc',
  batch_strategy:'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD',preferred_order:['ready','queue_ready','role_ready','recovery'],
  ready,queue_ready:[],role_ready:roles,recovery:[],
  batch_candidates:[...ready.slice(0,8).map(x=>({lane:'ready',...x})),...roles.slice(0,12).map(x=>({lane:'role_ready',...x}))]
};
const f=buildClaimFrontier(allocator);
assert.equal(f.schema,'prometeo.claim-frontier/v1');
assert.equal(f.candidate_count,24);
assert.equal(f.candidates[0].lane,'ready');
assert(f.candidates.some(x=>x.lane==='role_ready'));
assert(f.candidates.every(x=>!('evidence' in x)));
assert(f.candidates.every(x=>!x.mission || x.opportunity_id));
assert(f.candidates.every(x=>x.claim_path && x.claim_payload_shape));
const bytes=Buffer.byteLength(JSON.stringify(f));
assert(bytes<64000,`compact frontier too large: ${bytes}`);
console.log('CLAIM_FRONTIER_COMPACT_PASS',bytes);
