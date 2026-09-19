#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const builder=path.join(repoRoot,'scripts/build-efficiency-snapshot.mjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-eff-guide-ttfa-'));
const out=path.join(root,'efficiency.json');
const now=Date.now();
const iso=ms=>new Date(ms).toISOString();
const write=(rel,data)=>{
  const p=path.join(root,rel);
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n');
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

const beacon=(id,launchAgoMs)=>write(`coordination/workers/beacons/${id}.json`,{
  schema:'prometeo.worker-beacon/v1',worker_id:id,launched_at:iso(now-launchAgoMs)
});
const portfolioPin=(id,claimAgoMs)=>write(`coordination/portfolio/pins/job-${id}/G000001.json`,{
  schema:'prometeo.portfolio-pin/v1',worker_id:id,claimed_at:iso(now-claimAgoMs)
});
const guidePin=(id,claimAgoMs)=>write(`coordination/guide/pins/guide-planner-${id}/G000001.json`,{
  schema:'prometeo.guide-role-pin/v1',worker_id:id,claimed_at:iso(now-claimAgoMs)
});

for(let i=1;i<=4;i++){
  const id=`portfolio-fast-${i}`;
  beacon(id,(9-i)*60_000);
  portfolioPin(id,(9-i)*60_000-20_000);
}

const guide='guide-first';
beacon(guide,5*60_000);
guidePin(guide,4.5*60_000);
portfolioPin(guide,1*60_000);

execFileSync(process.execPath,[builder,root,out],{stdio:'pipe'});
const snapshot=JSON.parse(fs.readFileSync(out,'utf8'));
const row=snapshot.latest_launches.find(x=>x.worker_id===guide);
assert(row,'guide-first worker must be projected');
assert.equal(row.authority_kind,'guide-pin','Guide role PIN is execution authority and must win earliest-authority selection');
assert.equal(row.time_to_first_authority_ms,30_000,'TTFA must stop at Guide PIN, not a later portfolio PIN');
assert.equal(snapshot.metrics.ttfa_recent,5);
assert.equal(snapshot.metrics.ttfa_p90_recent_ms,30_000,'later portfolio work must not inflate recent TTFA');
assert.equal(snapshot.status,'HEALTHY','a healthy Guide-first cohort must not create a false TTFA regression');
assert.deepEqual(snapshot.reasons,[]);

fs.rmSync(root,{recursive:true,force:true});
console.log('EFFICIENCY_GUIDE_AUTHORITY_TTFA_PASS');
