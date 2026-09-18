import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compileRuntime } from '../../../scripts/build-worker-runtime.mjs';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-residency-runtime-'));
const write=(rel,value)=>{
  const p=path.join(root,...rel.split('/'));
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n');
};

const worker='wc-residency-fixture';
write('coordination/workers/beacons/'+worker+'.json',{
  schema:'prometeo.worker-beacon/v1',worker_id:worker,batch_id:'WAVE-RESIDENCY-FIXTURE',
  expected_workers:1,launched_at:'2026-09-18T01:00:00Z'
});
write('coordination/portfolio/pins/job-a/G000001.json',{
  schema:'prometeo.portfolio-pin/v1',worker_id:worker,job_id:'job-a',claimed_at:'2026-09-18T01:00:10Z'
});
write('coordination/portfolio/returns/job-a/RETURN-1.json',{
  schema:'prometeo.portfolio-return/v1',return_id:'RETURN-1',worker_id:worker,job_id:'job-a',
  returned_at:'2026-09-18T01:01:00Z',outcome:'DONE',
  changed_paths:['src/product-a.js'],tests:['PRODUCT_A_PASS']
});
write('coordination/portfolio/returns/job-b/RETURN-2.json',{
  schema:'prometeo.portfolio-return/v1',return_id:'RETURN-2',worker_id:worker,job_id:'job-b',
  returned_at:'2026-09-18T01:02:00Z',outcome:'PARTIAL',
  changed_paths:['coordination/portfolio/derived/p/project-next.json'],spawn_candidates:['job-next']
});
write('coordination/guide/receipts/guide-x/receipt-3.json',{
  schema:'prometeo.guide-receipt/v1',receipt_id:'receipt-3',guide_work_id:'guide-x',worker_id:worker,
  created_at:'2026-09-18T01:03:00Z',role:'GUIDE_RESCATE',productive_unit_counted:true,
  changed_paths:['scripts/mechanism.mjs'],tests:['MECHANISM_PASS']
});
write('coordination/portfolio/returns/job-c/RETURN-ABORT.json',{
  schema:'prometeo.portfolio-return/v1',return_id:'RETURN-ABORT',worker_id:worker,job_id:'job-c',
  returned_at:'2026-09-18T01:04:00Z',outcome:'ROUTE_ABORTED',
  changed_paths:[
    'coordination/portfolio/pins/job-c/G000001.json',
    'coordination/workers/started/'+worker+'-job-c.json'
  ],
  tests:['NO_FABRICATED_EVIDENCE_PASS']
});
write('coordination/portfolio/returns/job-d/RETURN-EXPLICIT-NO.json',{
  schema:'prometeo.portfolio-return/v1',return_id:'RETURN-EXPLICIT-NO',worker_id:worker,job_id:'job-d',
  returned_at:'2026-09-18T01:05:00Z',outcome:'DONE',productive_unit_counted:false,
  changed_paths:['src/should-not-count.js'],tests:['PASS']
});

const runtime=compileRuntime([],root,'2026-09-18T01:06:00Z');
const batch=runtime.batches.find(x=>x.batch_id==='WAVE-RESIDENCY-FIXTURE');
assert.ok(batch);
assert.equal(batch.summary.productive_units_total,3);
assert.equal(batch.summary.productive_units_max,3);
assert.equal(batch.summary.workers_at_checkpoint,1);
assert.equal(batch.summary.workers_at_target,0);
const row=batch.workers.find(x=>x.worker_id===worker);
assert.equal(row.productive_units,3);
assert.equal(row.productive_chain_state,'CHECKPOINT_REACHED');
assert.equal(row.productive_unit_refs.length,3);
assert.ok(!row.productive_unit_refs.some(ref=>ref.includes('RETURN-ABORT')));
assert.ok(!row.productive_unit_refs.some(ref=>ref.includes('RETURN-EXPLICIT-NO')));

fs.rmSync(root,{recursive:true,force:true});
console.log('WORKER_RESIDENCY_RUNTIME_PASS');
