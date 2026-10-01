import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { compileAtomicWorkTelemetry } from './atomic-work-telemetry.mjs';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-atomic-work-'));
const put=(p,obj)=>{const f=path.join(root,...p.split('/'));fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(obj)+'\n');return p;};
try{
  for(let i=1;i<=3;i++){
    put(`coordination/portfolio/derived/p/v${i}.json`,{job_id:`v${i}`,project_id:'p',kind:'verification_analysis',created_at:'2026-10-01T00:00:00Z'});
    put(`coordination/portfolio/pins/v${i}/G000001.json`,{job_id:`v${i}`,project_id:'p',generation:1,worker_id:`w${i}`,claimed_at:`2026-10-01T00:00:${10*i}Z`});
    put(`coordination/workers/started/w${i}-v${i}.json`,{job_id:`v${i}`,project_id:'p',generation:1,worker_id:`w${i}`,started_at:`2026-10-01T00:00:${10*i+5}Z`});
  }
  const r1=put('coordination/portfolio/returns/v1/r1.json',{job_id:'v1',project_id:'p',generation:1,worker_id:'w1',outcome:'VERIFIED',returned_at:'2026-10-01T00:00:30Z'});
  const r2=put('coordination/portfolio/returns/v2/r2.json',{job_id:'v2',project_id:'p',generation:1,worker_id:'w2',outcome:'VERIFIED',returned_at:'2026-10-01T00:00:50Z'});
  put('coordination/portfolio/returns/v3/r3.json',{job_id:'v3',project_id:'p',generation:1,worker_id:'w3',outcome:'BOUNDARY',boundary_code:'BROWSER_CAPABILITY',returned_at:'2026-10-01T00:01:10Z'});

  put('coordination/guide/pins/g-int/G000001.json',{guide_work_id:'g-int',role:'GUIDE_INTEGRATOR',trigger:'RETURNS_UNCONSUMED',generation:1,worker_id:'wi',claimed_at:'2026-10-01T00:01:15Z'});
  put('coordination/workers/started/wi-g-int.json',{work_id:'g-int',role:'GUIDE_INTEGRATOR',generation:1,worker_id:'wi',started_at:'2026-10-01T00:01:20Z'});
  put('coordination/guide/receipts/g-int/r.json',{guide_work_id:'g-int',role:'GUIDE_INTEGRATOR',trigger:'RETURNS_UNCONSUMED',generation:1,worker_id:'wi',created_at:'2026-10-01T00:01:40Z',productive_unit:true,consumed_returns:[r1,r2]});

  put('coordination/workers/no-allocation/collision.json',{job_id:'v1',reason:'CREATE_EXISTS_EXHAUSTED'});
  put('coordination/portfolio/derived/p/recovery.json',{job_id:'recovery',project_id:'p',kind:'backend_recovery',created_at:'2026-10-01T00:00:00Z'});
  put('coordination/workers/no-allocation/blocked.json',{job_id:'recovery',classification:'CLAIM_TRANSPORT_BLOCKED',retry_count:1});

  const d=compileAtomicWorkTelemetry({root,now:'2026-10-01T00:02:00Z'});
  assert.equal(d.schema,'prometeo.atomic-work-telemetry/v1');
  assert.equal(d.authority,'OBSERVABILITY_ONLY');
  assert.equal(d.coverage.completed_units,4);
  assert.equal(d.useful_yield.consumed_return_refs,2);
  assert.equal(d.useful_yield.executed_units,4);
  assert.equal(d.useful_yield.ratio,0.5);
  assert.equal(d.by_task_class.VERIFIER.completed_units,3);
  assert.equal(d.by_task_class.INTEGRATOR.completed_units,1);
  assert.equal(d.by_task_class.VERIFIER.collisions,1);
  assert.equal(d.by_task_class.RECOVERY.transport_boundaries,1);
  assert.equal(d.by_task_class.RECOVERY.retries,1);
  assert.equal(d.by_task_class.VERIFIER.stage_latency.execution.sample_count,3);
  assert.equal(d.by_task_class.VERIFIER.stage_latency.execution.sufficiency,'P50_P95_OUTLIERS');
  assert.notEqual(d.by_task_class.VERIFIER.stage_latency.execution.p95_ms,null);
  assert.equal(d.by_task_class.INTEGRATOR.stage_latency.fan_in_wait.sample_count,2);
  assert.equal(d.missing_data.first_material_write_timing,'UNKNOWN_NOT_DURABLY_NORMALIZED');
  assert(d.units.every(u=>['PRODUCER','VERIFIER','CRITIC','INTEGRATOR','RECOVERY'].includes(u.task_class)));
  console.log('ATOMIC_WORK_TELEMETRY_PASS');
}finally{
  fs.rmSync(root,{recursive:true,force:true});
}
