#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const builder=path.join(repoRoot,'scripts/build-efficiency-snapshot.mjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-eff-ttfa-'));
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

const beacon=(id,launched)=>write(`coordination/workers/beacons/${id}.json`,{
  schema:'prometeo.worker-beacon/v1',worker_id:id,launched_at:iso(launched)
});
const pin=(id,claimed)=>write(`coordination/portfolio/pins/job-${id}/G000001.json`,{
  schema:'prometeo.portfolio-pin/v1',worker_id:id,claimed_at:iso(claimed)
});
const build=()=>{
  execFileSync(process.execPath,[builder,root,out],{stdio:'pipe'});
  return JSON.parse(fs.readFileSync(out,'utf8'));
};

for(let i=0;i<5;i++){
  const launched=now-(30*60_000+i*1_000);
  const id=`old-slow-${i}`;
  beacon(id,launched);
  pin(id,launched+120_000);
}
for(let i=0;i<5;i++){
  const launched=now-(2*60_000+i*1_000);
  const id=`recent-fast-${i}`;
  beacon(id,launched);
  pin(id,launched+10_000);
}

const historical=build();
assert.equal(historical.metrics.ttfa_p90_ms,120_000,'cumulative historical TTFA p90 must remain visible');
assert.equal(historical.metrics.ttfa_recent,5,'recent TTFA sample should include only recent authority events');
assert.equal(historical.metrics.ttfa_p90_recent_ms,10_000);
assert.equal(historical.metrics.ttfa_regression_window_minutes,10);
assert(!historical.reasons.includes('TTFA_P90_GT_90S'),'historical-only TTFA tail must not pin current regression');
assert.equal(historical.status,'HEALTHY');

for(let i=0;i<2;i++){
  const launched=now-(5*60_000+i*1_000);
  const id=`recent-slow-${i}`;
  beacon(id,launched);
  pin(id,launched+(100_000+i*10_000));
}
const recent=build();
assert.equal(recent.metrics.ttfa_recent,7);
assert.equal(recent.metrics.ttfa_p90_recent_ms,110_000);
assert(recent.reasons.includes('TTFA_P90_GT_90S'),'recent slow authority acquisition must still trigger the regression');
assert.equal(recent.status,'REGRESSION');
assert.equal(recent.metrics.ttfa_p90_ms,120_000,'recent windowing must not erase cumulative TTFA telemetry');

fs.rmSync(root,{recursive:true,force:true});
console.log('EFFICIENCY_RECENT_TTFA_REGRESSION_PASS');
