import fs from 'node:fs';
import assert from 'node:assert/strict';

const contract = JSON.parse(fs.readFileSync('coordination/workers/WORKER_IO_ACCOUNTING_CANDIDATE_V1.json','utf8'));
const record = JSON.parse(fs.readFileSync('coordination/portfolio/evidence/prometeo-autonomous-growth/WORKER_IO_ACCOUNTING_REAL_CLOSED_TRACE_V1.json','utf8'));
const counters = Object.keys(contract.counter_contract);

assert.equal(record.schema,'prometeo.worker-io-accounting-record/v1');
assert.equal(record.worker_id,'wc-20260930T005620Z-4f8c2d91a7e6');
assert.ok(record.unit_ref);
assert.ok(record.measurement_scope);
assert.ok(record.model_self_reported?.local_work_summary);
assert.ok(record.local_work_summary?.durable_result_ref);

for (const name of counters) {
  const row = record.externally_observed?.[name];
  assert.ok(row && typeof row === 'object', name + ': counter object required');
  const numeric = Number.isInteger(row.value) && row.value >= 0;
  assert.ok(numeric || row.value === 'UNKNOWN', name + ': invalid value');
  assert.ok(['COMPLETE_FOR_SCOPE','PARTIAL','UNAVAILABLE'].includes(row.coverage), name + ': invalid coverage');
  assert.ok(Array.isArray(row.evidence_refs), name + ': evidence_refs required');
  assert.ok(Array.isArray(row.coverage_evidence_refs), name + ': coverage_evidence_refs required');
  if (row.value === 'UNKNOWN') {
    assert.ok(typeof row.unknown_reason === 'string' && row.unknown_reason.trim(), name + ': UNKNOWN requires reason');
  } else if (row.value === 0) {
    assert.equal(row.coverage,'COMPLETE_FOR_SCOPE', name + ': false-zero');
    assert.ok(row.coverage_evidence_refs.length > 0, name + ': zero requires closed coverage');
  } else {
    assert.ok(row.evidence_refs.length > 0, name + ': positive value requires evidence');
  }
}

assert.equal(record.externally_observed.commits.value,4);
assert.equal(record.externally_observed.artifact_count.value,1);
assert.equal(record.externally_observed.artifact_bytes.value,4529540);
assert.equal(record.externally_observed.external_read_ops.value,'UNKNOWN');
assert.equal(record.externally_observed.external_write_ops.value,'UNKNOWN');
assert.equal(record.externally_observed.workflow_waits.value,'UNKNOWN');
assert.equal(record.externally_observed.retries.value,'UNKNOWN');
assert.equal(contract.coalescing.per_local_operation_event_forbidden,true);
assert.equal(contract.coalescing.event_stream_change_required,false);
assert.ok(contract.does_not_replace.includes('coordination/workers/WORKER_PIPELINE_V1.json'));

console.log('WORKER_IO_ACCOUNTING_REAL_CLOSED_TRACE_V1_PASS');
