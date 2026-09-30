import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker='prod01-20260929T2257-03-229ca3deaf7e';
const p='coordination/portfolio/evidence/prometeo-autonomous-growth/MACRO_BATCH_AB_COMPARE_'+worker+'_G000002.json';
const x=JSON.parse(fs.readFileSync(p,'utf8'));
const br=JSON.parse(fs.readFileSync(x.sources.block_review.candidate_ref,'utf8'));
const sp=JSON.parse(fs.readFileSync(x.sources.single_pass.candidate_ref,'utf8'));

assert.equal(x.schema,'prometeo.worker-macro-batch-ab-comparison/v1');
assert.equal(x.generation,2);
assert.equal(x.independence.current_worker_is_producer,false);
assert.equal(x.independence.status,'PASS');
assert.ok(!x.independence.forbidden_worker_ids.includes(worker));

assert.equal(br.variant,'BLOCK_REVIEW');
assert.equal(br.result_bundle.decisions_count,12);
assert.equal(br.task_bundle.durable_subtask_rows_created,0);
assert.equal(br.local_checkpoints.length,4);
assert.equal(br.result_bundle.checkpoint_defects_intercepted,4);
assert.equal(br.result_bundle.final_audit_defects,2);
assert.equal(br.result_bundle.automatic_promotion,false);

assert.equal(sp.report_bundle.local_decisions_completed,20);
assert.equal(sp.report_bundle.measurements.durable_subtask_rows_created,0);
assert.equal(sp.report_bundle.measurements.github_connector_operations_exact,null);
assert.equal(sp.report_bundle.measurements.wall_clock_seconds,null);

const verdict=Object.fromEntries(x.matrix.map(r=>[r.dimension,r.verdict]));
assert.equal(verdict.workload_shape,'CONFOUNDED');
assert.equal(verdict.constraint_retention_and_repairs,'OBSERVED_NOT_CAUSAL');
assert.equal(verdict.external_io,'INCOMPARABLE');
assert.equal(verdict.timing,'INCOMPARABLE');
assert.equal(x.conclusion.overall,'INCONCLUSIVE_NO_WINNER');
assert.equal(x.conclusion.causal_superiority,null);
assert.equal(x.conclusion.speed_winner,null);
assert.equal(x.promotion.winner_declared,false);
assert.equal(x.promotion.current_modified,false);
assert.equal(x.next_experiment.new_duplicate_macro_batch_run_needed,false);

console.log(JSON.stringify({ok:true,overall:x.conclusion.overall,verdicts:verdict}));
