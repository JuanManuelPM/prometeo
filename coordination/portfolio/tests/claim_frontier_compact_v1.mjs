#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildClaimFrontier } from '../../../scripts/build-claim-frontier.mjs';

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
  source_path:'coordination/portfolio/derived/p'+(i%5)+'/job-'+i+'.json',
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
assert.equal(f.candidate_total,24);
assert.equal(f.transport_bytes_max,24000);
assert.equal(f.candidates[0].lane,'ready');
assert(f.candidates.some(x=>x.lane==='role_ready'));
assert(f.candidates.every(x=>!('evidence' in x)));
assert(f.candidates.every(x=>!('mission' in x) || x.opportunity_id));
assert(f.candidates.every(x=>!('title' in x) || x.opportunity_id));
assert(f.candidates.every(x=>!('dedupe_key' in x)));
assert(f.candidates.every(x=>!('project_id' in x)));
assert(f.candidates.every(x=>x.claim_path && x.claim_payload_shape));
assert(f.candidates.filter(x=>x.job_id).every(x=>x.source_path));
const bytes=Buffer.byteLength(JSON.stringify(f));
assert(bytes<=24000,`compact frontier too large: ${bytes}`);

const bloatedRoles=Array.from({length:24},(_,i)=>({
  role_id:'bloated-'+i,guide_work_id:'bloated-'+i,
  claim_mode:'GUIDE_ROLE_PIN_CREATE',claim_path:'guide/bloated-'+i+'.json',
  claim_payload_shape:{
    schema:'prometeo.guide-role-pin/v1',pin_id:'bg'+i,guide_work_id:'bloated-'+i,
    role:'GUIDE_RESCATE',trigger:'LOW_YIELD',generation:1,worker_id:'<worker_id>',
    claim_id:'bc'+i,claimed_at:'<now_iso>',expires_at:'<now_plus_10m_iso>',
    source_head:'abc',evidence:Array.from({length:20},(_,j)=>'evidence/'+i+'/'+j+'/'+'z'.repeat(40)),
    predecessor_pin_ref_or_null:null
  }
}));
const bounded=buildClaimFrontier({
  ...allocator,ready:[],role_ready:bloatedRoles,
  batch_candidates:bloatedRoles.map(x=>({lane:'role_ready',...x}))
},24,8000);
const boundedBytes=Buffer.byteLength(JSON.stringify(bounded));
assert(bounded.candidate_count>0 && bounded.candidate_count<24,'byte budget must trim before transport overflow');
assert(boundedBytes<=8000,`transport budget exceeded: ${boundedBytes}`);
for (const candidate of bounded.candidates) {
  const source=bloatedRoles.find(x=>x.claim_path===candidate.claim_path);
  assert.deepEqual(candidate.claim_payload_shape,source.claim_payload_shape,'published authority payload was altered');
}

const capabilityRow=(i,required_capabilities)=>({
  job_id:'job-'+i,
  project_id:'p-cap',
  title:'Capability job '+i,
  priority:1000-i,
  source_path:'coordination/portfolio/derived/p-cap/job-'+i+'.json',
  claim_mode:'PORTFOLIO_PIN_CREATE',
  claim_path:'pins/job-'+i+'.json',
  claim_payload_shape:payload(i),
  required_capabilities
});
const browserRecovery=Array.from({length:8},(_,i)=>capabilityRow(100+i,['representative_javascript_browser']));
const publicHttpRecovery=Array.from({length:3},(_,i)=>capabilityRow(200+i,['unrestricted_public_http_origin_fetch']));
const diversityAllocator={
  schema:'prometeo.fast-allocator/v3',
  generated_at:'2026-09-18T21:39:22Z',
  source_sha:'capability-diversity-fixture',
  batch_strategy:'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD',
  preferred_order:['ready','queue_ready','role_ready','recovery'],
  ready:[],queue_ready:[],role_ready:[],
  recovery:[...browserRecovery,...publicHttpRecovery],
  batch_candidates:[...browserRecovery,...publicHttpRecovery].map(x=>({lane:'recovery',...x}))
};
const diverse=buildClaimFrontier(diversityAllocator,6,24000);
assert.equal(diverse.candidate_count,6,'bounded capability fixture must keep the requested candidate budget');
assert.equal(diverse.candidates[0].job_id,'job-100','capability diversity must preserve the allocator-preferred prefix');
assert.equal(
  diverse.candidates.some(x=>JSON.stringify(x.required_capabilities)===JSON.stringify(['representative_javascript_browser'])),
  true,
  'browser capability signature must remain represented'
);
assert.equal(
  diverse.candidates.some(x=>JSON.stringify(x.required_capabilities)===JSON.stringify(['unrestricted_public_http_origin_fetch'])),
  true,
  'compact frontier must promote an HTTP-only capability signature before truncation'
);
assert.equal(
  diverse.candidates.findIndex(x=>JSON.stringify(x.required_capabilities)===JSON.stringify(['unrestricted_public_http_origin_fetch'])) < 6,
  true,
  'HTTP-only recovery must be visible inside the bounded compact frontier'
);

console.log('CLAIM_FRONTIER_CAPABILITY_DIVERSITY_PASS',diverse.candidate_count);
console.log('CLAIM_FRONTIER_COMPACT_PASS',bytes,boundedBytes,bounded.candidate_count);
