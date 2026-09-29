#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const source=new URL('../../../scripts/arm-mp10-current-handoff.mjs',import.meta.url);
const script=fileURLToPath(source);
function fixture(n){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mp10-handoff-'));
 fs.mkdirSync(path.join(root,'coordination/integration-runs/PROMETEO-MP10-01/returns'),{recursive:true});
 for(let i=1;i<=n;i++){
   const id='S'+String(i).padStart(3,'0');
   fs.writeFileSync(path.join(root,'coordination/integration-runs/PROMETEO-MP10-01/returns',id+'.json'),JSON.stringify({schema:'prometeo.multipyramid-return/v1',slot_id:id,worker_id:'w'+i,returned_at:'2026-09-29T03:00:00Z'}));
 }
 return root;
}
function run(root){return JSON.parse(execFileSync(process.execPath,[script,root],{encoding:'utf8',env:{...process.env,PROMETEO_NOW:'2026-09-29T04:00:00Z'}}))}
{
 const root=fixture(9),r=run(root);
 assert.equal(r.ready,false);assert.equal(r.created,false);
 assert.equal(fs.existsSync(path.join(root,'coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-mp10-integrate-into-current-v1.json')),false);
}
{
 const root=fixture(10),r=run(root);
 assert.equal(r.ready,true);assert.equal(r.created,true);
 const p=path.join(root,'coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-mp10-integrate-into-current-v1.json');
 const job=JSON.parse(fs.readFileSync(p,'utf8'));
 assert.equal(job.guide_role,'GUIDE_INTEGRATOR');
 assert.equal(job.source_primary_returns.length,10);
 assert(job.mission.includes('EFF021')&&job.mission.includes('EFF030')&&job.mission.includes('EFF043'));
 const statePath=path.join(root,'coordination/integration-runs/PROMETEO-MP10-01/CURRENT_HANDOFF.json');
 const before=fs.readFileSync(statePath,'utf8');
 const r2=run(root);assert.equal(r2.created,false,'second run must be idempotent');assert.equal(r2.state_changed,false,'semantic no-op must not rewrite handoff state');assert.equal(fs.readFileSync(statePath,'utf8'),before,'semantic no-op bytes must remain identical');
}
{
 const root=fixture(10);
 fs.mkdirSync(path.join(root,'coordination/launch-packets/PROMETEO-MP10-01/reallocation-claims'),{recursive:true});
 fs.mkdirSync(path.join(root,'coordination/integration-runs/PROMETEO-MP10-01/reallocation'),{recursive:true});
 fs.writeFileSync(path.join(root,'coordination/launch-packets/PROMETEO-MP10-01/reallocation-claims/R001.json'),'{}');
 fs.writeFileSync(path.join(root,'coordination/integration-runs/PROMETEO-MP10-01/reallocation/R002.json'),'{}');
 run(root);
 const job=JSON.parse(fs.readFileSync(path.join(root,'coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-mp10-integrate-into-current-v1.json'),'utf8'));
 assert.equal(job.observed_reallocation_state[0].state,'CLAIMED');
 assert.equal(job.observed_reallocation_state[1].state,'RETURNED');
}
console.log('MP10_CURRENT_HANDOFF_PASS');
