import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { compileStats } from './compiler.mjs';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-stats-'));
const projection=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-projection-'));
const put=(base,p,obj)=>{const f=path.join(base,...p.split('/'));fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(obj));};

put(root,'coordination/workers/beacons/w1.json',{worker_id:'w1',run_id:'RUN1',launched_at:'2026-09-29T00:00:00Z'});
put(root,'coordination/workers/beacons/w2.json',{worker_id:'w2',run_id:'RUN1',launched_at:'2026-09-29T00:00:00Z'});
put(root,'coordination/launch-packets/RUN1/PACKET.json',{run_id:'RUN1',status:'ARMED',slots:[{slot_id:'S001'},{slot_id:'S002'}]});
put(root,'coordination/launch-packets/RUN1/claims/S001.json',{worker_id:'w1',run_id:'RUN1',slot_id:'S001',claimed_at:'2026-09-29T00:00:10Z'});
put(root,'coordination/integration-runs/RUN1/returns/S001.json',{run_id:'RUN1',slot_id:'S001',completed_at:'2026-09-29T00:01:10Z'});
put(root,'coordination/workers/exams/w1.json',{worker_id:'w1',closed_at:'2026-09-29T00:02:00Z',collisions:1,no_allocation_count:0,slots:[{kind:'MUTATION',evidence_ref:'x',visible_change:true}]});
put(root,'coordination/workers/benchmark-receipts/RUN1/w1.json',{worker_id:'w1',run_id:'RUN1',primary_complete:true,reallocation_complete:false,stage_trace:{E0_ENVELOPE:{status:'PASS'},E1_IDENTITY:{status:'PASS'},E2_ASSIGN:{status:'PASS'},E3_CONTEXT:{status:'PASS'},E4_PLAN_LOCK:{status:'PASS'},E5_PRODUCE:{status:'PASS'},E6_VERIFY:{status:'BOUNDARY',failure_code:'NO_BROWSER'}}});
put(projection,'live/claim-frontier.json',{generated_at:'2026-09-29T00:03:00Z',recovery_attention_total:3});
put(projection,'live/worker-scoreboard.json',{generated_at:'2026-09-29T00:03:00Z',measurement_coverage:{total_beacons:2},launch_runs:[{run_id:'PROMETEO-MP10-01',slots_total:10}]});

const d=compileStats({root,projection,now:'2026-09-29T00:04:00Z'});
assert.equal(d.schema,'prometeo.control-room-stats/v1');
assert.equal(d.useful_output.evidence_backed_productive_exam_units.value,1);
assert.equal(d.useful_output.workers_with_visible_change.value,1);
assert.equal(d.wasted_time.collisions_observed.value,1);
assert.equal(d.wasted_time.beacons_without_primary_claim.value,1);
assert.equal(d.wasted_time.primary_claims_without_return.value,0);
assert.equal(d.latency_proxies.beacon_to_primary_claim.median_ms,10000);
assert.equal(d.latency_proxies.primary_claim_to_return.median_ms,60000);
assert.equal(d.stale_work.recovery_attention_total.value,3);
assert.equal(d.runs[0].slots_claimed,1);
assert.equal(d.runs[0].primary_returns,1);
assert.equal(d.wasted_time.first_non_pass_by_stage.value['E6_VERIFY:BOUNDARY:NO_BROWSER'],1);
console.log(JSON.stringify({ok:true}));
