#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  DEFAULT_RECURSION_BUDGET,
  HARD_RECURSION_CAPS,
  compileGuideSuccessor,
  evaluateRecursiveFanIn,
  recursiveMetrics,
  resolveRecursionBudget
} from '../../../scripts/guide-recursive-successor-lib.mjs';

const rootRef = 'coordination/portfolio/derived/prometeo-autonomous-growth/fixture-root.json';
const parentRef = 'coordination/portfolio/returns/fixture-root/return.json';
const common = {
  root_ref: rootRef,
  parent_ref: parentRef,
  project_id: 'prometeo-autonomous-growth',
  dependency_ids: [],
  gate: {kind:'PARENT_RETURN', outcome:'PASS_OR_FAIL'},
  consumer: 'fixture-fan-in-judge',
  value_class: 'SYSTEM_MULTIPLIER',
  priority: 80,
  required_capabilities: [],
  evidence_refs: [parentRef]
};

const passChild = compileGuideSuccessor({
  ...common,
  dedupe_key: 'fixture:parallel-pass:v1',
  target: 'fixture/pass-branch',
  problem: 'verify producer output',
  acceptance: ['producer fixture verified'],
  definition_of_done: ['producer fixture verified']
}, {
  root_ref: rootRef,
  parent_ref: parentRef,
  parent_depth: 0,
  existing_children_for_parent: 0,
  open_descendants: 0,
  created_at: '2026-10-01T20:40:00Z'
});
assert.equal(passChild.materialize, true);
assert.equal(passChild.child.recursive_lineage.depth, 1);

const failChild = compileGuideSuccessor({
  ...common,
  dedupe_key: 'fixture:parallel-fail:v1',
  target: 'fixture/fail-branch',
  problem: 'attack producer output',
  acceptance: ['failure reproduced or disproved'],
  definition_of_done: ['failure reproduced or disproved']
}, {
  root_ref: rootRef,
  parent_ref: parentRef,
  parent_depth: 0,
  existing_children_for_parent: 1,
  open_descendants: 1,
  created_at: '2026-10-01T20:40:00Z'
});
assert.equal(failChild.materialize, true);
assert.equal(failChild.child.recursive_lineage.depth, 1);
assert.notEqual(passChild.child.semantic_fingerprint, failChild.child.semantic_fingerprint);

const samePassDifferentWording = compileGuideSuccessor({
  ...common,
  dedupe_key: 'fixture:parallel-pass-renamed:v1',
  target: 'fixture/pass-branch',
  problem: 'VERIFY producer output!!!',
  acceptance: ['Producer fixture verified'],
  definition_of_done: ['Producer fixture verified']
}, {
  root_ref: rootRef,
  parent_ref: parentRef,
  parent_depth: 0,
  existing_children_for_parent: 1,
  open_descendants: 1,
  created_at: '2026-10-01T20:41:00Z'
});
assert.equal(samePassDifferentWording.materialize, true);
assert.equal(samePassDifferentWording.child.semantic_fingerprint, passChild.child.semantic_fingerprint, 'semantic dedupe must ignore wording/id variance');

const passSuccessor = compileGuideSuccessor({
  ...common,
  parent_ref: 'coordination/portfolio/returns/fixture-pass/return.json',
  dedupe_key: 'fixture:pass-successor:v1',
  target: 'fixture/pass-successor',
  problem: 'consume verified producer output',
  acceptance: ['verified output consumed'],
  definition_of_done: ['verified output consumed'],
  evidence_refs: ['coordination/portfolio/returns/fixture-pass/return.json']
}, {
  root_ref: rootRef,
  parent_ref: 'coordination/portfolio/returns/fixture-pass/return.json',
  parent_depth: 1,
  existing_children_for_parent: 0,
  open_descendants: 2,
  created_at: '2026-10-01T20:42:00Z'
});
assert.equal(passSuccessor.materialize, true);
assert.equal(passSuccessor.child.recursive_lineage.depth, 2);

const failRepair = compileGuideSuccessor({
  ...common,
  parent_ref: 'coordination/portfolio/returns/fixture-fail/return.json',
  dedupe_key: 'fixture:fail-repair:v1',
  target: 'fixture/fail-branch',
  problem: 'repair reproduced producer defect',
  acceptance: ['reproduced defect repaired and regression checked'],
  definition_of_done: ['reproduced defect repaired and regression checked'],
  evidence_refs: ['coordination/portfolio/returns/fixture-fail/return.json']
}, {
  root_ref: rootRef,
  parent_ref: 'coordination/portfolio/returns/fixture-fail/return.json',
  parent_depth: 1,
  existing_children_for_parent: 0,
  open_descendants: 3,
  created_at: '2026-10-01T20:42:00Z'
});
assert.equal(failRepair.materialize, true);
assert.equal(failRepair.child.recursive_lineage.depth, 2);

const depthCut = compileGuideSuccessor({
  ...common,
  parent_ref: 'coordination/portfolio/returns/fixture-pass-successor/return.json',
  dedupe_key: 'fixture:too-deep:v1',
  target: 'fixture/too-deep',
  problem: 'unbounded followup',
  acceptance: ['should never materialize'],
  definition_of_done: ['should never materialize'],
  evidence_refs: ['coordination/portfolio/returns/fixture-pass-successor/return.json']
}, {
  root_ref: rootRef,
  parent_ref: 'coordination/portfolio/returns/fixture-pass-successor/return.json',
  parent_depth: 2,
  existing_children_for_parent: 0,
  open_descendants: 4
});
assert.equal(depthCut.materialize, false);
assert.equal(depthCut.stop_reason, 'MAX_DEPTH_REACHED');

const childBudgetCut = compileGuideSuccessor({
  ...common,
  dedupe_key: 'fixture:fourth-child:v1',
  target: 'fixture/fourth-child',
  problem: 'excess sibling',
  acceptance: ['should never materialize'],
  definition_of_done: ['should never materialize']
}, {
  root_ref: rootRef,
  parent_ref: parentRef,
  parent_depth: 0,
  existing_children_for_parent: DEFAULT_RECURSION_BUDGET.max_children_per_parent,
  open_descendants: 2
});
assert.equal(childBudgetCut.stop_reason, 'MAX_CHILDREN_PER_PARENT_REACHED');

const openBudgetCut = compileGuideSuccessor({
  ...common,
  dedupe_key: 'fixture:open-overflow:v1',
  target: 'fixture/open-overflow',
  problem: 'too many open descendants',
  acceptance: ['should never materialize'],
  definition_of_done: ['should never materialize']
}, {
  root_ref: rootRef,
  parent_ref: parentRef,
  parent_depth: 0,
  existing_children_for_parent: 0,
  open_descendants: DEFAULT_RECURSION_BUDGET.max_open_descendants
});
assert.equal(openBudgetCut.stop_reason, 'MAX_OPEN_DESCENDANTS_REACHED');

assert.throws(() => resolveRecursionBudget({max_depth:4}), /owner_override_required/);
const overridden = resolveRecursionBudget({
  authority: 'CURRENT_OWNER_RECURSION_BUDGET_OVERRIDE',
  source_ref: 'packet://authorized-root',
  max_depth: 99,
  max_children_per_parent: 99,
  max_open_descendants: 99,
  proposal_ttl_hours: 999
});
assert.deepEqual(overridden, HARD_RECURSION_CAPS, 'authorized override is still clamped to hard caps');

assert.throws(() => compileGuideSuccessor({
  ...common,
  dedupe_key: 'fixture:authority-leak:v1',
  target: 'fixture/authority-leak',
  problem: 'authority inheritance',
  acceptance: ['must reject'],
  definition_of_done: ['must reject'],
  mutation_authority: 'INHERITED_FROM_PARENT'
}, {root_ref: rootRef, parent_ref: parentRef}), /forbidden_inherited_field/);

const fanInBeforeRepair = evaluateRecursiveFanIn([
  {ref:'child-pass', blocking:true, outcome:'PASS'},
  {ref:'child-fail', blocking:true, outcome:'FAIL', repair_ref:'repair-fail'}
]);
assert.equal(fanInBeforeRepair.status, 'NEXT_FRONTIER');
assert.deepEqual(fanInBeforeRepair.repair_refs, ['repair-fail']);

const fanInAfterRepair = evaluateRecursiveFanIn([
  {ref:'child-pass', blocking:true, outcome:'PASS'},
  {ref:'child-fail', blocking:true, outcome:'CONSUMED'},
  {ref:'repair-fail', blocking:true, outcome:'PASS'},
  {ref:'slow-advisory', blocking:false, outcome:'PENDING'}
]);
assert.equal(fanInAfterRepair.status, 'CLOSED', 'advisory work must not block closure');

const metrics = recursiveMetrics([
  {type:'PROPOSED',depth:1}, {type:'PROPOSED',depth:1}, {type:'PROPOSED',depth:2},
  {type:'MATERIALIZED',depth:1}, {type:'MATERIALIZED',depth:1}, {type:'MATERIALIZED',depth:2},
  {type:'DUPLICATE_SUPPRESSED',depth:1},
  {type:'CLAIMED',depth:1}, {type:'CLAIMED',depth:2},
  {type:'CONSUMED',depth:1}, {type:'CONSUMED',depth:2}
]);
assert.deepEqual(metrics, {
  children_proposed: 3,
  children_materialized: 3,
  duplicates_suppressed: 1,
  descendants_claimed: 2,
  descendants_consumed: 2,
  orphan_ratio: 0,
  max_depth_observed: 2
});

console.log('GUIDE_BOUNDED_RECURSIVE_WORK_GENERATION_PASS');
console.log(JSON.stringify({
  parallel_children: 2,
  pass_successor_depth: passSuccessor.child.recursive_lineage.depth,
  fail_repair_depth: failRepair.child.recursive_lineage.depth,
  depth_cut: depthCut.stop_reason,
  child_budget_cut: childBudgetCut.stop_reason,
  open_budget_cut: openBudgetCut.stop_reason,
  fan_in_before_repair: fanInBeforeRepair.status,
  fan_in_after_repair: fanInAfterRepair.status,
  metrics
}));
