#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  compileGuideDynamicChildProposal,
  decideGuideChildMode,
  evaluateRecursiveFanIn
} from '../../../scripts/guide-recursive-successor-lib.mjs';

const receipt = JSON.parse(fs.readFileSync(new URL('../../guide/receipts/portfolio-guide-planner-universal-cognitive-block-v1/RECEIPT-DISPATCH-COMPILER-DOGFOOD-V1.json', import.meta.url), 'utf8'));
const root = receipt.compiled_dispatch_contract;
assert.ok(root, 'dogfood compiled dispatch contract required');

const clone = value => JSON.parse(JSON.stringify(value));
const allForbidden = [...new Set(root.decomposition.blocks.flatMap(block => block.forbidden_scope || []))].sort();
const baseBlock = root.decomposition.blocks.find(block => block.dispatch_ready === true && (block.required_capabilities || []).length === 0);
const capabilityBlock = root.decomposition.blocks.find(block => (block.required_capabilities || []).length > 0);
assert.ok(baseBlock, 'capability-neutral ready block required');
assert.ok(capabilityBlock, 'capability-gated block required');

const context = {
  root_ref: 'objective://agentic-dynamic-child-subcompile-v1',
  parent_ref: 'receipt://agentic-parent-pass',
  parent_depth: 0,
  existing_children_for_parent: 0,
  open_descendants: 0,
  compiled_dispatch_contract: root,
  compiled_dispatch_contract_ref: 'coordination/guide/receipts/portfolio-guide-planner-universal-cognitive-block-v1/RECEIPT-DISPATCH-COMPILER-DOGFOOD-V1.json#compiled_dispatch_contract',
  created_at: '2026-10-02T09:59:00Z',
  now: '2026-10-02T09:59:00Z'
};

function proposalFrom(block, suffix = 'pass') {
  return {
    material: true,
    independent: true,
    verifiable: true,
    handoff_cost: 1,
    parallel_value: 4,
    root_ref: context.root_ref,
    parent_ref: context.parent_ref,
    project_id: 'prometeo-autonomous-growth',
    dedupe_key: `prometeo:agentic:dynamic-child:${suffix}:v1`,
    gate: 'P3_COMPILED_DYNAMIC_CHILD',
    priority: 71,
    value_class: 'EXECUTION',
    target: block.organism_refs.target_node_ref,
    problem: `Bounded dynamic child ${suffix}`,
    acceptance: block.done_when,
    evidence_refs: block.evidence_refs,
    blocking: true,
    work_block: block
  };
}

const validBlock = clone(baseBlock);
validBlock.block_id = 'dynamic-child-runtime-proof';
validBlock.semantic_key = 'prometeo:agentic:dynamic-child-runtime-proof:v1';
validBlock.output_contract = 'prometeo.dynamic-child-runtime-proof/v1: bounded proof emitted through the existing compiled dispatch and Guide successor gates.';
validBlock.done_when = ['The dynamic child passes the existing WorkBlock handoff validator and remains inside the root envelope.'];
validBlock.forbidden_scope = allForbidden;
validBlock.dependency_ids = [];
validBlock.dispatch_ready = true;

const valid = compileGuideDynamicChildProposal(proposalFrom(validBlock), context);
assert.equal(valid.materialize, true, JSON.stringify(valid, null, 2));
assert.equal(valid.compile_gate?.status, 'PASS');
assert.equal(valid.dynamic_subcompile?.mode, 'CHILD');
assert.equal(valid.dynamic_subcompile?.status, 'PASS');
assert.equal(valid.dynamic_subcompile?.claimable_after_materialization, true);
assert.equal(valid.child?.work_block_id, validBlock.block_id);
assert.equal(valid.child?.work_block?.semantic_key, validBlock.semantic_key);
assert.equal(valid.dynamic_subcompile?.root_current_owner_ref, root.reuse_authority.current_owner_ref);
assert.equal(root.decomposition.blocks.some(block => block.block_id === validBlock.block_id), false, 'shadow subcompile must not mutate the root contract');

const duplicateBlock = clone(validBlock);
duplicateBlock.block_id = 'dynamic-child-duplicate';
duplicateBlock.semantic_key = baseBlock.semantic_key;
const duplicate = compileGuideDynamicChildProposal(proposalFrom(duplicateBlock, 'duplicate'), context);
assert.equal(duplicate.materialize, false);
assert.equal(duplicate.stop_reason, 'SEMANTIC_DUPLICATE_OR_SUPERSEDED');
assert.equal(duplicate.dynamic_subcompile?.duplicate, true);

const scopeDriftBlock = clone(validBlock);
scopeDriftBlock.block_id = 'dynamic-child-scope-drift';
scopeDriftBlock.semantic_key = 'prometeo:agentic:dynamic-child-scope-drift:v1';
scopeDriftBlock.allowed_scope = [...scopeDriftBlock.allowed_scope, 'outside-root-envelope/**'];
const scopeDrift = compileGuideDynamicChildProposal(proposalFrom(scopeDriftBlock, 'scope-drift'), context);
assert.equal(scopeDrift.materialize, false);
assert.equal(scopeDrift.stop_reason, 'DYNAMIC_CHILD_ENVELOPE_DRIFT');
assert.ok(scopeDrift.compile_gate.errors.includes('allowed_scope_outside_root_envelope'));

const authorityDriftBlock = clone(validBlock);
authorityDriftBlock.block_id = 'dynamic-child-authority-drift';
authorityDriftBlock.semantic_key = 'prometeo:agentic:dynamic-child-authority-drift:v1';
authorityDriftBlock.mutation_authority = 'invented-authority';
const authorityDrift = compileGuideDynamicChildProposal(proposalFrom(authorityDriftBlock, 'authority-drift'), context);
assert.equal(authorityDrift.materialize, false);
assert.equal(authorityDrift.stop_reason, 'DYNAMIC_CHILD_AUTHORITY_DRIFT');
assert.ok(authorityDrift.compile_gate.errors.some(error => error.includes('mutation_authority')));

const unavailableBlock = clone(capabilityBlock);
unavailableBlock.block_id = 'dynamic-child-unavailable-capability';
unavailableBlock.semantic_key = 'prometeo:agentic:dynamic-child-unavailable-capability:v1';
unavailableBlock.forbidden_scope = allForbidden;
const unavailableCaps = [...unavailableBlock.required_capabilities];
const unavailable = compileGuideDynamicChildProposal(proposalFrom(unavailableBlock, 'unavailable-capability'), {
  ...context,
  definitively_unavailable_capabilities: unavailableCaps
});
assert.equal(unavailable.materialize, false);
assert.equal(unavailable.stop_reason, 'CAPABILITY_WITHOUT_OBSERVABLE_OFFER');
assert.notEqual(unavailable.dynamic_subcompile?.status, 'PASS');

assert.deepEqual(
  decideGuideChildMode({...proposalFrom(validBlock, 'local-shared'), shared_state_intimate: true}),
  {mode: 'LOCAL', reason: 'INTIMATE_SHARED_STATE'}
);
assert.deepEqual(
  decideGuideChildMode({...proposalFrom(validBlock, 'local-cost'), handoff_cost: 9, parallel_value: 2}),
  {mode: 'LOCAL', reason: 'HANDOFF_COST_EXCEEDS_PARALLEL_VALUE'}
);

const fanIn = evaluateRecursiveFanIn([
  {ref: 'dynamic-failed-child', blocking: true, outcome: 'FAIL', repair_ref: 'repair://dynamic-failed-child'},
  {ref: 'independent-sibling', blocking: false, outcome: 'PENDING'}
]);
assert.equal(fanIn.status, 'NEXT_FRONTIER');
assert.deepEqual(fanIn.repair_refs, ['repair://dynamic-failed-child']);
assert.deepEqual(fanIn.unresolved_refs, ['dynamic-failed-child']);

console.log('GUIDE_DYNAMIC_CHILD_SUBCOMPILE_PASS');
