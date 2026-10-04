#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  compileWorkBlockHandoff,
  deriveCapacityRequest,
  validateCompiledDispatchContract
} from '../../../scripts/compiled-dispatch-contract-lib.mjs';
import {
  compilePrimaryChatResponseFanout,
  PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT
} from '../../../scripts/primary-chat-response-fanout-v1.mjs';

const receiptPath = new URL('../../guide/receipts/portfolio-guide-planner-universal-cognitive-block-v1/RECEIPT-DISPATCH-COMPILER-DOGFOOD-V1.json', import.meta.url);
const root = JSON.parse(fs.readFileSync(receiptPath, 'utf8')).compiled_dispatch_contract;
assert.equal(validateCompiledDispatchContract(root).pass, true, 'root dogfood contract must remain valid');

const rootBytes = JSON.stringify(root);
const templateId = root.capacity_plan.ready_block_ids[0];
assert.ok(templateId, 'one existing ready WorkBlock is required as CURRENT envelope template');
const template = root.decomposition.blocks.find(block => block.block_id === templateId);
assert.equal(template?.new_worker_executable, true);
assert.equal(template?.dispatch_ready, true);
assert.deepEqual(template?.dependency_ids, []);

const requestProjection = {
  schema: 'prometeo.primary-chat-response-request-public-projection/v1',
  request_id: 'rr-c004-regression-001',
  created_at: '2026-10-04T16:30:00Z',
  request_class: 'ANSWER',
  priority: 'HIGH',
  priority_trigger: 'EXPLICIT_HUMAN_RESPONDER_ACTION',
  routing: 'CURRENT_WORK_GRAPH',
  requested_candidate_count: 4,
  requested_exam_count: 2,
  requested_synthesizer_count: 1,
  human_routing_actions_target: 0,
  counts_are_targets_not_claims: true,
  raw_text_public: false,
  authority: 'SANITIZED_DERIVED_REQUEST_ONLY'
};

const rootCapacity = deriveCapacityRequest(root);
assert.equal(rootCapacity.pass, true);

const compiled = compilePrimaryChatResponseFanout({
  root_contract: root,
  root_contract_ref: 'receipt://primary-chat-current#compiled_dispatch_contract',
  request_projection: requestProjection,
  request_projection_ref: 'projection://primary-chat/rr-c004-regression-001',
  template_work_block_id: templateId
});
assert.equal(compiled.pass, true, JSON.stringify(compiled.errors || [], null, 2));
assert.equal(compiled.status, 'PASS');
assert.equal(compiled.candidate_blocks.length, PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT);
assert.equal(compiled.response_fanout.candidates_prepared, 4);
assert.equal(compiled.response_fanout.workers_claimed, 0);
assert.equal(compiled.response_fanout.returns_received, 0);
assert.equal(compiled.response_fanout.counts_are_targets_not_claims, true);
assert.equal(compiled.response_fanout.actual_worker_returns_required_for_multi_worker_claim, true);
assert.equal(compiled.response_fanout.raw_text_public, false);
assert.equal(new Set(compiled.response_fanout.candidate_block_ids).size, 4);
assert.equal(new Set(compiled.candidate_blocks.map(block => block.semantic_key)).size, 4);

for (const block of compiled.candidate_blocks) {
  assert.equal(block.new_worker_executable, true);
  assert.equal(block.dispatch_ready, true);
  assert.deepEqual(block.dependency_ids, []);
  assert.equal(block.consumer, template.consumer);
  assert.equal(block.organism_refs.owner_ref, template.organism_refs.owner_ref);
  assert.equal(block.organism_refs.app_ref, template.organism_refs.app_ref);
  assert.equal(block.organism_refs.chat_ref, template.organism_refs.chat_ref);
  assert.equal(block.organism_refs.objective_ref, template.organism_refs.objective_ref);
  assert.equal(block.runtime_binding.raw_text_public, false);
  const handoff = compileWorkBlockHandoff(
    compiled.contract,
    block.block_id,
    'receipt://primary-chat-current#compiled_dispatch_contract'
  );
  assert.equal(handoff.pass, true, block.block_id);
}

const fanoutCapacity = deriveCapacityRequest(compiled.contract);
assert.equal(fanoutCapacity.pass, true);
assert.equal(
  fanoutCapacity.capacity_request,
  rootCapacity.capacity_request + 4,
  'four newly prepared response WorkBlocks must add exactly four units of capacity pressure'
);
assert.equal(
  compiled.contract.decomposition.useful_capacity,
  root.decomposition.useful_capacity + 4,
  'fanout must add exactly four useful prepared units'
);
assert.equal(JSON.stringify(root), rootBytes, 'materializer must not mutate the CURRENT root contract');

const rawLeakAttempt = compilePrimaryChatResponseFanout({
  root_contract: root,
  root_contract_ref: 'receipt://primary-chat-current#compiled_dispatch_contract',
  request_projection: {...requestProjection, text: 'THIS MUST NEVER ENTER PUBLIC WORK GRAPH'},
  request_projection_ref: 'projection://primary-chat/rr-c004-regression-001',
  template_work_block_id: templateId
});
assert.equal(rawLeakAttempt.pass, false);
assert(rawLeakAttempt.errors.some(error => error.startsWith('REQUEST_RAW_FIELD_FORBIDDEN:text')));

const wrongCount = compilePrimaryChatResponseFanout({
  root_contract: root,
  root_contract_ref: 'receipt://primary-chat-current#compiled_dispatch_contract',
  request_projection: {...requestProjection, requested_candidate_count: 3},
  request_projection_ref: 'projection://primary-chat/rr-c004-regression-001',
  template_work_block_id: templateId
});
assert.equal(wrongCount.pass, false);
assert(wrongCount.errors.includes('REQUEST_CANDIDATE_COUNT_MUST_BE_4'));

const serialized = JSON.stringify(compiled.contract);
assert.equal(serialized.includes('THIS MUST NEVER ENTER PUBLIC WORK GRAPH'), false);
assert.equal(serialized.includes('"workers_claimed":0'), true);
assert.equal(serialized.includes('"returns_received":0'), true);

console.log('PRIMARY_CHAT_RESPONSE_FANOUT_V1_PASS');
console.log(JSON.stringify({
  request_id: compiled.response_fanout.request_id,
  candidate_blocks: compiled.response_fanout.candidate_block_ids.length,
  root_capacity_request: rootCapacity.capacity_request,
  fanout_capacity_request: fanoutCapacity.capacity_request,
  human_routing_actions_target: compiled.response_fanout.human_routing_actions_target,
  raw_text_public: compiled.response_fanout.raw_text_public
}));
