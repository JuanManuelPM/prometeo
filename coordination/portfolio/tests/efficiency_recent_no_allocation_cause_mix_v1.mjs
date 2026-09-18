#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const builder=path.join(repoRoot,'scripts/build-efficiency-snapshot.mjs');
const { buildFastAllocator } = await import(pathToFileURL(path.join(repoRoot,'scripts/build-fast-allocator.mjs')).href);
const root=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-eff-cause-mix-'));
const out=path.join(root,'efficiency.json');
const now=Date.now();
const iso=ms=>new Date(ms).toISOString();
const write=(rel,data)=>{
  const p=path.join(root,rel);
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n');
  return rel;
};

write('coordination/efficiency/RATCHET_BASELINE_V1.json',{
  schema:'prometeo.efficiency-ratchet/v1',
  runtime_baseline_activated_at:iso(now-60*60_000),
  updated_at:iso(now-60*60_000),
  items:[
    {id:'EFF009',required:{claim_transport_blocked_regression_window_minutes:10}},
    {id:'EFF028',required:{no_allocation_regression_window_minutes:10}},
    {id:'EFF037',required:{ttfa_regression_window_minutes:10}}
  ]
});

const close=(id,minutesAgo,reason,durationMs=20_000)=>{
  const launched=now-minutesAgo*60_000;
  write(`coordination/workers/beacons/${id}.json`,{schema:'prometeo.worker-beacon/v1',worker_id:id,launched_at:iso(launched)});
  return write(`coordination/workers/no-allocation/${id}.json`,{
    schema:'prometeo.worker-no-allocation/v1',worker_id:id,closed_at:iso(launched+durationMs),reason
  });
};

const expected=[
  ['truncated',2,'ALLOCATOR_READ_TRUNCATED_JSON'],
  ['races',3,'CLAIM_ATTEMPTS_EXHAUSTED'],
  ['blocked',4,'CLAIM_TRANSPORT_BLOCKED'],
  ['ambiguous',5,'CLAIM_TRANSPORT_AMBIGUOUS'],
  ['capability',6,'CAPABILITY_MISMATCH_PRECLAIM_EXHAUSTED']
];
const expectedRefs=new Map(expected.map(([id,minutes,reason])=>[reason,close(id,minutes,reason)]));
close('historical',25,'HISTORICAL_ONLY');

execFileSync(process.execPath,[builder,root,out],{stdio:'pipe'});
const efficiency=JSON.parse(fs.readFileSync(out,'utf8'));
assert.equal(efficiency.metrics.no_allocation,6);
assert.equal(efficiency.metrics.no_allocation_recent,5);
assert.equal(efficiency.no_allocation_causes.window_minutes,10);
assert.equal(efficiency.no_allocation_causes.recent_total,5);
assert.equal(efficiency.no_allocation_causes.cumulative_total,6);
assert.equal(efficiency.no_allocation_causes.histogram_cumulative.HISTORICAL_ONLY,1);
assert.equal(efficiency.no_allocation_causes.histogram_recent.HISTORICAL_ONLY,undefined,'historical-only cause must not pin current mix');
for(const [reason,ref] of expectedRefs){
  assert.equal(efficiency.no_allocation_causes.histogram_recent[reason],1,`missing exact recent reason ${reason}`);
  assert(efficiency.no_allocation_causes.recent_receipts.some(row=>row.reason===reason && row.ref===ref),`missing exact receipt ref for ${reason}`);
}
assert.equal(efficiency.no_allocation_causes.recent_receipts.length,5);

const roleContext={
  metabolism:{signals:{}},
  guideReceipts:[],guidePins:[],heartbeats:[],beacons:[],noAlloc:[],
  projectGuideMesh:null,projectGuideStates:[],portfolio:null
};
const baseFeed={generated_at:iso(now),source_sha:'cause-mix-fixture',workers:[],plans:[],projects:[],summary:{workers:{}},diagnostics:{}};
const allocator=buildFastAllocator(baseFeed,{...efficiency,status:'REGRESSION',reasons:['CAUSE_MIX_FIXTURE']},{recoveryPolicies:[],roleContext});
const rescate=allocator.role_ready.find(row=>row.role==='GUIDE_RESCATE' && row.trigger==='LOW_YIELD');
assert(rescate,'efficiency regression must compile LOW_YIELD GUIDE_RESCATE');
assert(rescate.evidence.includes('gh-pages:live/efficiency.json#no_allocation_causes'));
for(const [reason,ref] of expectedRefs){
  if(reason==='CLAIM_TRANSPORT_BLOCKED'){
    assert(!rescate.evidence.includes(ref),`explicit transport denial must stay telemetry-only, not repair evidence: ${ref}`);
  }else{
    assert(rescate.evidence.includes(ref),`rescate missing actionable recent receipt ${ref}`);
  }
}
assert.deepEqual(allocator.efficiency.no_allocation_causes.histogram_recent,efficiency.no_allocation_causes.histogram_recent);

const claimFeed={
  ...baseFeed,
  projects:[{project_id:'fixture',label:'Fixture',jobs:[{
    job_id:'claim-semantics-fixture',
    dedupe_key:'fixture:claim-semantics:v1',
    project_id:'fixture',
    title:'Claim semantics fixture',
    source_path:'coordination/portfolio/derived/fixture/claim-semantics-fixture.json',
    required_capabilities:[],
    priority:10,
    state:'ready',
    pin_generation:0
  }]}]
};
const healthy=buildFastAllocator(claimFeed,{status:'HEALTHY',metrics:{},reasons:[]},{recoveryPolicies:[],roleContext});
const withCauses=buildFastAllocator(claimFeed,{...efficiency,status:'REGRESSION',reasons:['CAUSE_MIX_FIXTURE']},{recoveryPolicies:[],roleContext});
const healthyClaim=healthy.ready.find(row=>row.job_id==='claim-semantics-fixture');
const causeClaim=withCauses.ready.find(row=>row.job_id==='claim-semantics-fixture');
assert(healthyClaim && causeClaim);
assert.equal(causeClaim.claim_mode,healthyClaim.claim_mode);
assert.equal(causeClaim.claim_path,healthyClaim.claim_path);
assert.deepEqual(causeClaim.claim_payload_shape,healthyClaim.claim_payload_shape,'cause telemetry must not alter authority payload semantics');

fs.rmSync(root,{recursive:true,force:true});
console.log('EFFICIENCY_RECENT_NO_ALLOCATION_CAUSE_MIX_PASS');
