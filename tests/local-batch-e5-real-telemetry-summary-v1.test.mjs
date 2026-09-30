import assert from 'node:assert/strict';
import fs from 'node:fs';

const path='coordination/portfolio/evidence/prometeo-autonomous-growth/WORKER_LOCAL_BATCH_E5_REAL_TELEMETRY_SUMMARY_V1.json';
const report=JSON.parse(fs.readFileSync(path,'utf8'));

assert.equal(report.schema,'prometeo.worker-local-batch-telemetry-report/v1');
assert.equal(report.experiment_id,'LOCAL-BATCH-E5-01');
assert.match(report.clock_source,/git commit timestamps only/i);
assert.equal(report.replicas.length,6);
assert.equal(report.aggregate.winner,null);
assert.equal(report.aggregate.automatic_promotion,false);

const byId=new Map(report.replicas.map(r=>[r.job_id,r]));
const must=id=>{assert.ok(byId.has(id),'missing replica '+id);return byId.get(id)};

const lb0r1=must('portfolio-worker-local-batch-e5-lb0-direct-r1-v1');
assert.equal(lb0r1.status,'INVALID_COMPARISON');
assert.equal(lb0r1.reason,'RESULT_COMPARISON_BOUNDARY');
assert.equal(lb0r1.start_present,true);
assert.equal(lb0r1.result_present,true);
assert.equal(lb0r1.timing_eligible,false);
assert.equal(lb0r1.elapsed_external_ms,null);
assert.ok(lb0r1.observed_elapsed_external_ms>=0);
assert.ok(lb0r1.comparison_boundary.some(x=>x.includes('INVALID_FOR_LOCAL_BATCH_COMPARISON')));

const lb0r2=must('portfolio-worker-local-batch-e5-lb0-direct-r2-v1');
assert.equal(lb0r2.status,'NOT_READY');
assert.equal(lb0r2.reason,'MISSING_RESULT');
assert.equal(lb0r2.start_present,true);
assert.equal(lb0r2.result_present,false);
assert.equal(lb0r2.timing_eligible,false);
assert.equal(lb0r2.elapsed_external_ms,null);

const lb1r1=must('portfolio-worker-local-batch-e5-lb1-block-audit-r1-v1');
assert.equal(lb1r1.status,'COMPLETE');
assert.equal(lb1r1.start_present,true);
assert.equal(lb1r1.result_present,true);
assert.equal(lb1r1.timing_eligible,true);
assert.ok(Number.isInteger(lb1r1.elapsed_external_ms)&&lb1r1.elapsed_external_ms>=0);

const lb1r2=must('portfolio-worker-local-batch-e5-lb1-block-audit-r2-v1');
assert.equal(lb1r2.status,'INVALID_COMPARISON');
assert.equal(lb1r2.reason,'RESULT_COMPARISON_BOUNDARY');
assert.equal(lb1r2.timing_eligible,false);
assert.equal(lb1r2.elapsed_external_ms,null);
assert.ok(lb1r2.observed_elapsed_external_ms>=0);
assert.ok(lb1r2.comparison_boundary.some(x=>x.includes('BRANCH_HEAD_CONFLICT')));

const lb2r1=must('portfolio-worker-local-batch-e5-lb2-fill-template-r1-v1');
assert.equal(lb2r1.status,'COMPLETE');
assert.equal(lb2r1.start_present,true);
assert.equal(lb2r1.result_present,true);
assert.equal(lb2r1.timing_eligible,true);
assert.ok(Number.isInteger(lb2r1.elapsed_external_ms)&&lb2r1.elapsed_external_ms>=0);

const lb2r2=must('portfolio-worker-local-batch-e5-lb2-fill-template-r2-v1');
assert.equal(lb2r2.status,'NOT_READY');
assert.equal(lb2r2.reason,'MISSING_START');
assert.equal(lb2r2.start_present,false);
assert.equal(lb2r2.result_present,false);
assert.equal(lb2r2.timing_eligible,false);
assert.equal(lb2r2.elapsed_external_ms,null);

assert.deepEqual(
  Object.fromEntries(Object.entries(report.aggregate.variants).map(([k,v])=>[k,{sample_count:v.sample_count,status:v.status}])),
  {
    LB0_DIRECT:{sample_count:0,status:'INSUFFICIENT_SAMPLES'},
    LB1_BLOCK_AUDIT:{sample_count:1,status:'INSUFFICIENT_SAMPLES'},
    LB2_FILL_TEMPLATE:{sample_count:1,status:'INSUFFICIENT_SAMPLES'}
  }
);
assert.deepEqual(report.aggregate.variants.LB0_DIRECT.elapsed_external_ms,[]);
assert.equal(report.aggregate.variants.LB1_BLOCK_AUDIT.elapsed_external_ms.length,1);
assert.equal(report.aggregate.variants.LB2_FILL_TEMPLATE.elapsed_external_ms.length,1);
assert.match(report.truth_boundary,/no automatic winner/i);

console.log(JSON.stringify({
  ok:true,
  experiment_id:report.experiment_id,
  statuses:Object.fromEntries(report.replicas.map(r=>[r.job_id,{status:r.status,reason:r.reason,timing_eligible:r.timing_eligible,elapsed_external_ms:r.elapsed_external_ms,observed_elapsed_external_ms:r.observed_elapsed_external_ms??null}])),
  aggregate:report.aggregate
}));
