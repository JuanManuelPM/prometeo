import assert from 'node:assert/strict';
import fs from 'node:fs';
import {summarizeTransportTrace,validateTransportTrace} from '../scripts/summarize-worker-io-transport-trace-v1.mjs';

const contract=JSON.parse(fs.readFileSync('coordination/workers/WORKER_IO_TRANSPORT_TRACE_CANDIDATE_V1.json','utf8'));
const fixtures=JSON.parse(fs.readFileSync('coordination/portfolio/evidence/prometeo-autonomous-growth/WORKER_IO_TRANSPORT_TRACE_FIXTURE_V1.json','utf8'));

assert.equal(contract.status,'CANDIDATE_EXPERIMENT_ONLY_NO_PROMOTION');
assert.equal(contract.worker_interface_change,false);
assert.equal(contract.coalescing.local_reasoning_events_forbidden,true);
assert.equal(contract.coalescing.per_local_operation_persist_forbidden,true);
assert.equal(contract.coalescing.worker_hot_path_change_required,false);
assert.match(contract.authority,/NO_CURRENT_NO_PIPELINE_NO_SCHEDULER/);

const closed=fixtures.scenarios.closed_nonzero;
validateTransportTrace(closed.trace);
const closedSummary=summarizeTransportTrace(closed.trace);
for(const [counter,value] of Object.entries(closed.expected)){
  assert.equal(closedSummary.externally_observed[counter].value,value,counter+' exact closed count');
  assert.equal(closedSummary.externally_observed[counter].coverage,'COMPLETE_FOR_SCOPE');
  assert.ok(closedSummary.externally_observed[counter].coverage_evidence_refs.length>0);
}
assert.equal(closedSummary.local_work_events_persisted,0);
assert.equal(closedSummary.externally_observed.external_write_ops.value,3,'WRITE conflict + successful write + WRITE retry all count as observed mutation attempts');
assert.equal(closedSummary.externally_observed.retries.value,1,'retry counted exactly once as retry');

const zero=fixtures.scenarios.closed_zero;
const zeroSummary=summarizeTransportTrace(zero.trace);
for(const [counter,value] of Object.entries(zero.expected)){
  assert.equal(zeroSummary.externally_observed[counter].value,value,counter+' closed-zero semantics');
}
assert.equal(zeroSummary.externally_observed.workflow_waits.value,0);
assert.ok(zeroSummary.externally_observed.workflow_waits.coverage_evidence_refs.length>0,'zero wait needs closed evidence');
assert.equal(zeroSummary.externally_observed.retries.value,0);
assert.ok(zeroSummary.externally_observed.retries.coverage_evidence_refs.length>0,'zero retries need closed evidence');

const real=fixtures.scenarios.partial_real_sample;
const realSummary=summarizeTransportTrace(real.trace);
assert.equal(realSummary.externally_observed.external_read_ops.value,'UNKNOWN');
assert.equal(realSummary.externally_observed.external_write_ops.value,'UNKNOWN');
assert.equal(realSummary.externally_observed.external_write_ops.observed_minimum,3);
assert.equal(realSummary.externally_observed.workflow_waits.value,'UNKNOWN');
assert.equal(realSummary.externally_observed.retries.value,'UNKNOWN');
assert.equal(realSummary.local_work_events_persisted,0);

const noCoverage=structuredClone(zero.trace);
noCoverage.trace_id='fixture-bad-zero-without-coverage';
noCoverage.coverage.workflow_waits.coverage_evidence_refs=[];
assert.throws(()=>summarizeTransportTrace(noCoverage),/complete coverage requires evidence/);

const partialWithoutReason=structuredClone(real.trace);
partialWithoutReason.trace_id='fixture-bad-partial-no-reason';
partialWithoutReason.coverage.external_write_ops.unknown_reason='';
assert.throws(()=>summarizeTransportTrace(partialWithoutReason),/incomplete coverage requires unknown_reason/);

const localEvent=structuredClone(zero.trace);
localEvent.trace_id='fixture-bad-local-event';
localEvent.operations.push({operation_id:'LOCAL1',class:'LOCAL',external_target_family:'memory',outcome:'SUCCESS',durable_evidence_or_null:null,retry_of_operation_id_or_null:null,retry_of_class_or_null:null});
assert.throws(()=>summarizeTransportTrace(localEvent),/invalid class/);

const brokenRetry=structuredClone(closed.trace);
brokenRetry.trace_id='fixture-bad-retry-lineage';
const retry=brokenRetry.operations.find(x=>x.class==='RETRY');
retry.retry_of_class_or_null=null;
assert.throws(()=>summarizeTransportTrace(brokenRetry),/RETRY needs retry_of_class_or_null/);

console.log(JSON.stringify({
  ok:true,
  closed:closedSummary.externally_observed,
  closed_zero:zeroSummary.externally_observed,
  real_partial:realSummary.externally_observed,
  worker_interface_change:contract.worker_interface_change
}));
