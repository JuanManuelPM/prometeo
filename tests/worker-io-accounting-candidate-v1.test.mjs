import fs from 'node:fs';
import assert from 'node:assert/strict';

const contract = JSON.parse(fs.readFileSync('coordination/workers/WORKER_IO_ACCOUNTING_CANDIDATE_V1.json','utf8'));
const counters = Object.keys(contract.counter_contract);

function validateCounter(name, row) {
  assert.ok(row && typeof row === 'object', name + ': counter object required');
  const v = row.value;
  const numeric = Number.isInteger(v) && v >= 0;
  assert.ok(numeric || v === 'UNKNOWN', name + ': value must be nonnegative integer or UNKNOWN');
  assert.ok(['COMPLETE_FOR_SCOPE','PARTIAL','UNAVAILABLE'].includes(row.coverage), name + ': coverage invalid');
  assert.ok(Array.isArray(row.evidence_refs), name + ': evidence_refs array required');
  assert.ok(Array.isArray(row.coverage_evidence_refs), name + ': coverage_evidence_refs array required');
  if (v === 'UNKNOWN') {
    assert.ok(typeof row.unknown_reason === 'string' && row.unknown_reason.trim(), name + ': UNKNOWN requires unknown_reason');
    return;
  }
  if (v === 0) {
    assert.equal(row.coverage, 'COMPLETE_FOR_SCOPE', name + ': false-zero without complete coverage');
    assert.ok(row.coverage_evidence_refs.length > 0, name + ': zero requires closed coverage evidence');
  }
  if (v > 0) assert.ok(row.evidence_refs.length > 0, name + ': positive count requires evidence');
}

function validateRecord(record) {
  assert.equal(record.schema, 'prometeo.worker-io-accounting-record/v1');
  assert.ok(record.worker_id);
  assert.ok(record.unit_ref);
  assert.ok(record.measurement_scope);
  assert.ok(record.externally_observed && typeof record.externally_observed === 'object');
  for (const name of counters) {
    assert.ok(Object.hasOwn(record.externally_observed, name), 'missing counter ' + name);
    validateCounter(name, record.externally_observed[name]);
  }
  assert.ok(record.model_self_reported && typeof record.model_self_reported.local_work_summary === 'string');
  assert.ok(record.local_work_summary && record.local_work_summary.durable_result_ref);
  return true;
}

const closed = ['fixture:closed-external-trace'];
const unknown = reason => ({value:'UNKNOWN',coverage:'UNAVAILABLE',evidence_refs:[],coverage_evidence_refs:[],unknown_reason:reason});
const zero = () => ({value:0,coverage:'COMPLETE_FOR_SCOPE',evidence_refs:[],coverage_evidence_refs:closed});

const validUnknown = {
  schema:'prometeo.worker-io-accounting-record/v1',
  worker_id:'fixture-worker',
  unit_ref:'fixture:return',
  measurement_scope:'fixture with no externally complete trace',
  model_self_reported:{local_work_summary:'Many local operations were coalesced; no external counts are invented.'},
  externally_observed:Object.fromEntries(counters.map(k=>[k,unknown('trace unavailable in fixture')])),
  local_work_summary:{stage_ids:['E5_IMPLEMENT','E6_VERIFY','E7_RETURN'],summary:'coalesced local block',durable_result_ref:'fixture:return'}
};
assert.equal(validateRecord(validUnknown), true);

const validObserved = structuredClone(validUnknown);
validObserved.measurement_scope='closed fixture trace';
validObserved.externally_observed={
  external_read_ops:{value:3,coverage:'COMPLETE_FOR_SCOPE',evidence_refs:['fixture:read:1','fixture:read:2','fixture:read:3'],coverage_evidence_refs:closed},
  external_write_ops:{value:1,coverage:'COMPLETE_FOR_SCOPE',evidence_refs:['commit:abc'],coverage_evidence_refs:closed},
  commits:{value:1,coverage:'COMPLETE_FOR_SCOPE',evidence_refs:['commit:abc'],coverage_evidence_refs:closed},
  workflow_waits:zero(),
  retries:zero(),
  artifact_count:{value:1,coverage:'COMPLETE_FOR_SCOPE',evidence_refs:['artifact:42'],coverage_evidence_refs:closed},
  artifact_bytes:{value:40222,coverage:'COMPLETE_FOR_SCOPE',evidence_refs:['artifact:42:size=40222'],coverage_evidence_refs:closed}
};
assert.equal(validateRecord(validObserved), true);

const falseZero = structuredClone(validObserved);
falseZero.externally_observed.external_read_ops={value:0,coverage:'PARTIAL',evidence_refs:[],coverage_evidence_refs:[]};
assert.throws(()=>validateRecord(falseZero), /false-zero/);

const missingEvidence = structuredClone(validObserved);
missingEvidence.externally_observed.external_write_ops={value:2,coverage:'COMPLETE_FOR_SCOPE',evidence_refs:[],coverage_evidence_refs:closed};
assert.throws(()=>validateRecord(missingEvidence), /positive count requires evidence/);

const unknownWithoutReason = structuredClone(validObserved);
unknownWithoutReason.externally_observed.retries={value:'UNKNOWN',coverage:'UNAVAILABLE',evidence_refs:[],coverage_evidence_refs:[]};
assert.throws(()=>validateRecord(unknownWithoutReason), /UNKNOWN requires unknown_reason/);

assert.equal(contract.coalescing.per_local_operation_event_forbidden, true);
assert.equal(contract.coalescing.event_stream_change_required, false);
assert.ok(contract.does_not_replace.includes('coordination/workers/WORKER_PIPELINE_V1.json'));
console.log('WORKER_IO_ACCOUNTING_CANDIDATE_V1_PASS');
