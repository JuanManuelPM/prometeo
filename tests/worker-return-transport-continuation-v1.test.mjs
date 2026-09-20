import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

const wc=read('wc');
const w=read('w');
const pipeline=json('coordination/workers/WORKER_PIPELINE_V1.json');
const growth=json('coordination/workers/WORKER_GROWTH_POLICY_V1.json');
const examA=json('coordination/workers/exams/w-20260920T2329Z-7c4e91b2a6fd.json');
const examB=json('coordination/workers/exams/w-20260920T233011Z-c7fe7e63889d.json');
const boundaryA=json('coordination/workers/receipts/w-20260920T2329Z-7c4e91b2a6fd-transport-boundary.json');

for (const exam of [examA,examB]) {
  assert.equal(exam.protocol_version,'v3.30');
  assert.equal(exam.close_reason,'TRANSPORT_BOUNDARY');
  assert.equal(exam.pipeline_first_non_pass_stage,'E7_RETURN');
  assert.equal(exam.stage_trace.E5_PRODUCE,'PASS');
  assert.equal(exam.stage_trace.E6_VERIFY,'PASS');
  assert.equal(exam.stage_trace.E7_RETURN,'BOUNDARY');
}
assert.equal(boundaryA.truth_boundary.includes('No canonical portfolio RETURN was committed'),true);

const e7=pipeline.stages.find(x=>x.id==='E7_RETURN');
const e8=pipeline.stages.find(x=>x.id==='E8_REALLOCATE');
assert.equal(e7.transport_continuation.status,'ACTIVE_BINDING');
assert.equal(e7.transport_continuation.scope,'NON_RUN_BATCH_OR_POOL_ONLY');
assert.equal(e7.transport_continuation.run_mode.includes('DISALLOWED'),true);
for (const forbidden of [
  'retry_denied_operation_or_path',
  'alternate_path_used_as_fake_RETURN',
  'count_blocked_unit_as_productive',
  'release_or_overwrite_prior_authority',
  'reinterpret E7 as PASS'
]) assert.ok(e7.transport_continuation.forbidden.includes(forbidden),forbidden);
assert.ok(e8.hard_rule.includes('never counts the blocked unit'));
assert.equal(growth.postclaim_return_transport_continuation.status,'ACTIVE_BINDING');
assert.equal(growth.postclaim_return_transport_continuation.run_mode_default,'NO_CONTINUATION');

for (const needle of [
  'POST-OWNERSHIP E7 TRANSPORT CONTINUATION',
  'DO NOT retry the denied RETURN/receipt operation or path',
  'the blocked unit does NOT increment',
  'immediately enter E8',
  'RUN packet mode is excluded by default'
]) assert.ok(wc.includes(needle),'wc missing '+needle);

for (const needle of [
  'ENTER AT ITS POST-BEACON ORDINARY NON-RUN STEP',
  'Do NOT create a second beacon',
  'E7 transport-continuation rules remain binding'
]) assert.ok(w.includes(needle),'w missing '+needle);

console.log('WORKER_RETURN_TRANSPORT_CONTINUATION_V1_PASS');
