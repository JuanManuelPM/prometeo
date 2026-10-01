import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyUsefulReserveOrdering,validUsefulReserve} from '../../../scripts/useful-reserve-allocator-v1.mjs';

const policy=JSON.parse(fs.readFileSync('coordination/guide/USEFUL_RESERVE_POLICY_V1.json','utf8'));
const mk=(id,extra={})=>({lane:'ready',job_id:id,...extra});
const jobs=[
  {job_id:'human',human_durable_intent:true,kind:'implementation'},
  {job_id:'product',kind:'implementation'},
  {job_id:'integrate',kind:'integration'},
  {job_id:'reserve-good',kind:'control_plane_reuse',useful_reserve:{evidence:'exit-audit:1',owner_current:'guide',consumer:'allocator',done_when:'choice changes',observable_change:'lower idle waste'}},
  {job_id:'reserve-bad',kind:'control_plane_reuse',useful_reserve:{owner_current:'guide',done_when:'words'}}
];
const input=[mk('reserve-good'),mk('reserve-bad'),mk('integrate'),mk('product'),mk('human')];
const r=applyUsefulReserveOrdering(input,{jobs,policy});
assert.deepEqual(r.ordered.map(x=>x.job_id),['human','product','integrate','reserve-good']);
assert.equal(r.report.rejected_reserve,1);
assert.equal(r.report.reserve_admitted,1);
assert.equal(r.report.reserve_floor,0);
assert.equal(r.report.started_exclusive_preemption_attempted,false);
assert.equal(validUsefulReserve(jobs[3].useful_reserve),true);
assert.equal(validUsefulReserve(jobs[4].useful_reserve),false);

const excess=applyUsefulReserveOrdering([mk('reserve-good')],{jobs,policy});
assert.deepEqual(excess.ordered.map(x=>x.job_id),['reserve-good'],'reserve may fill otherwise idle frontier when evidence-backed');
const empty=applyUsefulReserveOrdering([],{jobs,policy});
assert.equal(empty.ordered.length,0,'reserve floor may be zero');

const source=fs.readFileSync('scripts/build-fast-allocator.mjs','utf8');
assert.match(source,/applyUsefulReserveOrdering/,'CURRENT allocator must import/use useful reserve helper');
assert.match(source,/usefulReservePolicy: fs\.existsSync/,'CURRENT role context must load reserve policy');
assert.match(source,/useful_reserve: usefulReserve\.report/,'allocator output must expose bounded before\/after signals');
assert.match(source,/batch_candidates: usefulReserve\.ordered\.slice/,'claim frontier source must consume ordered output');
console.log(JSON.stringify({schema:'prometeo.useful-reserve-allocator-wiring-regression/v1',status:'PASS',ordered:r.ordered.map(x=>x.job_id),report:r.report},null,2));
