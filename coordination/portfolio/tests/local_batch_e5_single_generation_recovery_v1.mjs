import assert from 'node:assert/strict';
import { buildFastAllocator, normalizeRecoveryPolicy } from '../../../scripts/build-fast-allocator.mjs';

const jobId='portfolio-worker-local-batch-e5-lb0-direct-r1-v1';
const policy={job_id:jobId,mode:'fixed_generation',fixed_generation:1,attention_route:'LOCAL_BATCH_E5_SINGLE_OWNER_ATTENTION',reason:'fixture'};
const normalized=normalizeRecoveryPolicy({job_id:jobId,pin_generation:1},policy);
assert.equal(normalized.mode,'fixed_generation');
assert.equal(normalized.fixed_generation,1);
assert.equal(normalized.ordinary_next_generation_eligible,false);
assert.equal(normalized.valid,true);

const feed={
 generated_at:'2026-09-30T01:56:00Z',
 source_sha:'fixture',
 projects:[{project_id:'prometeo-autonomous-growth',label:'fixture',jobs:[{
   job_id:jobId,dedupe_key:'fixture',project_id:'prometeo-autonomous-growth',
   state:'replaceable',priority:1,pin_generation:1,required_capabilities:[],
   last_signal_at:'2026-09-30T01:36:00Z'
 }]}],
 plans:[],
 summary:{workers:{}}
};
const out=buildFastAllocator(feed,{status:'OK',metrics:{},reasons:[]},{recoveryPolicies:[policy],roleContext:null});
assert.equal(out.recovery.some(x=>x.job_id===jobId),false);
assert.equal(out.fixed_generation_attention.some(x=>x.job_id===jobId),true);
const attention=out.fixed_generation_attention.find(x=>x.job_id===jobId);
assert.equal(attention.fixed_generation,1);
assert.equal(attention.route,'LOCAL_BATCH_E5_SINGLE_OWNER_ATTENTION');

const preClaimFeed=structuredClone(feed);
preClaimFeed.projects[0].jobs[0].state='ready';
preClaimFeed.projects[0].jobs[0].pin_generation=0;
const pre=buildFastAllocator(preClaimFeed,{status:'OK',metrics:{},reasons:[]},{recoveryPolicies:[policy],roleContext:null});
assert.equal(pre.ready.some(x=>x.job_id===jobId),true);

console.log('PASS local_batch_e5_single_generation_recovery_v1');
