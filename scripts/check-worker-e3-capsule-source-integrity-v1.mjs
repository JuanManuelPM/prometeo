#!/usr/bin/env node
import assert from 'node:assert/strict';
import {buildClaimFrontier, compilePostclaimContext} from './build-claim-frontier.mjs';

const sourcePath = 'coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-primary-chat-work-unit-ingress-reconcile-v1.json';
const historicalWorker = 'wc-20261001T181315Z-53dd5e6ea080';
const sourceHead = 'fixture-source-head';
const row = {
  lane:'ready',
  job_id:'portfolio-primary-chat-work-unit-ingress-reconcile-v1',
  project_id:'prometeo-autonomous-growth',
  source_path:sourcePath,
  required_capabilities:[],
  forbidden_worker_ids:[],
  claim_mode:'PORTFOLIO_PIN_CREATE',
  claim_path:'coordination/portfolio/pins/portfolio-primary-chat-work-unit-ingress-reconcile-v1/G000002.json',
  claim_payload_shape:{
    schema:'prometeo.portfolio-pin/v1',
    generation:2,
    worker_id:'<worker_id>',
    source_head:sourceHead
  },
  // Legacy/contaminated overlay fixture. None of these may become executable E3 context.
  task_ref:'wc/wc-headless/tasks/PROMETEO-PRIMARY-CHAT-WORK-UNIT-INGRESS-RECONCILE.json',
  matrix_source_ref:'coordination/test_matrix/role_core_smoke.json',
  program_ref:'coordination/research/AUTONOMOUS_GROWTH_PROGRAM_V1.json',
  must_read:['wc/wc-headless'],
  execution_scope:['wc/wc-headless'],
  return_path:`coordination/portfolio/returns/portfolio-primary-chat-work-unit-ingress-reconcile-v1/${historicalWorker}/return.json`
};

const allocator = {
  schema:'prometeo.fast-allocator/v3',
  generated_at:'2026-10-01T18:00:00Z',
  source_sha:sourceHead,
  preferred_order:['ready','queue_ready','role_ready','recovery'],
  batch_candidates:[row],
  ready:[row],
  queue_ready:[],
  role_ready:[],
  recovery:[]
};

const frontier = buildClaimFrontier(allocator);
assert.equal(frontier.candidate_count, 1);
const candidate = frontier.candidates[0];
assert.equal(candidate.postclaim_context.source_ref, sourcePath);
assert.equal(candidate.postclaim_context.compile, 'EXACT_SOURCE_ONLY_AFTER_OWNERSHIP');
assert.equal(candidate.postclaim_context.field_policy, 'DECLARED_SOURCE_FIELDS_PLUS_RUNTIME_BINDINGS');
assert.deepEqual(candidate.postclaim_context.runtime_bindings, ['worker_id','generation','claim_id','source_head']);
for (const key of ['task_ref','matrix_source_ref','program_ref','must_read','execution_scope','return_path']) {
  assert.equal(Object.hasOwn(candidate, key), false, `ghost field survived compact adapter: ${key}`);
}
assert.equal(JSON.stringify(candidate).includes(historicalWorker), false, 'historical worker leaked into reusable candidate');
assert.equal(candidate.claim_path, row.claim_path);
assert.deepEqual(candidate.claim_payload_shape, row.claim_payload_shape);

const contract = compilePostclaimContext(row);
assert.ok(contract.forbidden_inherited_fields.includes('return_path'));
assert.ok(contract.forbidden_inherited_fields.includes('execution.scope'));
assert.ok(contract.forbidden_inherited_fields.includes('task_ref'));

console.log(JSON.stringify({
  ok:true,
  check:'worker-e3-capsule-source-integrity-v1',
  source_ref:candidate.postclaim_context.source_ref,
  runtime_bindings:candidate.postclaim_context.runtime_bindings,
  historical_worker_leaked:false,
  ghost_fields_removed:true,
  authority_fields_preserved:true
}));
