import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectPlannerSuppressedByHumanDecision } from '../../../scripts/build-fast-allocator.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const mesh = JSON.parse(fs.readFileSync(path.join(root, 'coordination/guide/PROJECT_GUIDE_MESH_V1.json'), 'utf8'));

const gated = {
  status: 'VERIFIED_CANDIDATE_AWAITING_REVIEW',
  frontier_refs: [],
  blockers: [
    'HUMAN_DECISION_GATE: technical verification does not grant Human Acceptance or authorize Current/Served/Catalog promotion.',
    'REOPEN_ONLY_ON_NEW_BYTES_OR_CONTRADICTION: rerun only if candidate bytes change or durable contradictory evidence appears.'
  ]
};

assert.equal(
  projectPlannerSuppressedByHumanDecision(gated, mesh),
  true,
  'explicit Human decision boundary with empty frontier must suppress PROJECT_FRONTIER_THIN'
);

assert.equal(
  projectPlannerSuppressedByHumanDecision({
    ...gated,
    status: 'HUMAN_DECISION_GATE'
  }, mesh),
  true,
  'explicit HUMAN_DECISION_GATE status with matching blocker and empty frontier must suppress PROJECT_FRONTIER_THIN'
);

assert.equal(
  projectPlannerSuppressedByHumanDecision({
    ...gated,
    frontier_refs: ['coordination/portfolio/derived/example/new-evidence-review-v1.json']
  }, mesh),
  false,
  'a grounded frontier item must reopen normal planner eligibility'
);

assert.equal(
  projectPlannerSuppressedByHumanDecision({
    ...gated,
    blockers: ['ordinary blocker without explicit Human decision gate']
  }, mesh),
  false,
  'review status alone must not suppress planning'
);

assert.equal(
  projectPlannerSuppressedByHumanDecision({
    ...gated,
    status: 'ACTIVE'
  }, mesh),
  false,
  'ACTIVE project state must remain planner-eligible'
);

assert.equal(
  projectPlannerSuppressedByHumanDecision(gated, {
    ...mesh,
    human_decision_planner_gate: {
      ...mesh.human_decision_planner_gate,
      enabled: false
    }
  }),
  false,
  'disabled gate must preserve ordinary planner behavior'
);

console.log('PROJECT_GUIDE_HUMAN_DECISION_GATE_PASS');
