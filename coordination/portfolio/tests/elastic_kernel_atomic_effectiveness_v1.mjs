#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { shouldAtomize } from '../../scripts/guide-atomic-work-decomposer-v1.mjs';

const benchmark = JSON.parse(fs.readFileSync(
  new URL('../evidence/prometeo-autonomous-growth/ELASTIC_ATOMIC_EFFECTIVENESS_BENCHMARK_V1.json', import.meta.url),
  'utf8'
));

const split = benchmark.same_outcome_fixture;
assert.equal(split.serial.estimated_critical_path_minutes, 24);
assert.equal(split.atomic_dag.estimated_critical_path_minutes, 16);
assert.equal(split.atomic_dag.gross_path_saving_minutes, 8);
assert.equal(split.atomic_dag.net_path_saving_minutes, 6);
assert.ok(split.atomic_dag.coordination_overhead_minutes < split.atomic_dag.gross_path_saving_minutes);

const splitDecision = shouldAtomize({
  independent_done_when_clusters: 2,
  independent_lifecycle_phases: 2,
  distinct_capability_lanes: 2,
  shared_mutation: false,
  independent_consumers_or_validators: 2,
  coordination_cost: split.atomic_dag.coordination_overhead_minutes,
  execution_or_recovery_savings: split.atomic_dag.gross_path_saving_minutes
});
assert.equal(splitDecision.atomize, true);

const noSplit = benchmark.no_split_fixture;
assert.ok(noSplit.hypothetical_atomic_dag.coordination_overhead_minutes >= noSplit.hypothetical_atomic_dag.gross_path_saving_minutes);
const noSplitDecision = shouldAtomize({
  independent_done_when_clusters: 2,
  independent_lifecycle_phases: 2,
  distinct_capability_lanes: 2,
  shared_mutation: true,
  small_shared_serial_object: true,
  coordination_cost: noSplit.hypothetical_atomic_dag.coordination_overhead_minutes,
  execution_or_recovery_savings: noSplit.hypothetical_atomic_dag.gross_path_saving_minutes
});
assert.equal(noSplitDecision.atomize, false);
assert.equal(noSplitDecision.veto, true);

for (const unit of split.serial.sequence) {
  assert.ok(unit.consumer, `${unit.id} missing consumer`);
  assert.ok(Array.isArray(unit.done_when) && unit.done_when.length > 0, `${unit.id} missing done_when`);
  assert.ok(Array.isArray(unit.evidence) && unit.evidence.length > 0, `${unit.id} missing evidence`);
}

console.log('ELASTIC_KERNEL_ATOMIC_EFFECTIVENESS_V1_PASS');
