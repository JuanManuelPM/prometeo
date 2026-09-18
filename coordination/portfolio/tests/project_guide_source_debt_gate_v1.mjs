import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectPlannerSuppressedBySourceDebt } from '../../../scripts/build-fast-allocator.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const mesh = JSON.parse(fs.readFileSync(path.join(root, 'coordination/guide/PROJECT_GUIDE_MESH_V1.json'), 'utf8'));

const gated = {
  status: 'SOURCE_DEBT',
  frontier_refs: [],
  blockers: [
    'NEW_EVIDENCE_GATE: wait for genuinely new pre-existing bytes before reopening material recovery.'
  ]
};
assert.equal(projectPlannerSuppressedBySourceDebt(gated, mesh), true, 'explicit SOURCE_DEBT new-evidence boundary must suppress PROJECT_FRONTIER_THIN');

assert.equal(projectPlannerSuppressedBySourceDebt({
  ...gated,
  frontier_refs: ['coordination/portfolio/derived/example.json']
}, mesh), false, 'a grounded frontier item must reopen normal planner eligibility');

assert.equal(projectPlannerSuppressedBySourceDebt({
  status: 'SOURCE_DEBT',
  frontier_refs: [],
  blockers: ['ordinary blocker without new-evidence gate']
}, mesh), false, 'SOURCE_DEBT alone must not suppress planning');

assert.equal(projectPlannerSuppressedBySourceDebt({
  status: 'ACTIVE',
  frontier_refs: [],
  blockers: gated.blockers
}, mesh), false, 'non-SOURCE_DEBT state must not be suppressed');

assert.equal(projectPlannerSuppressedBySourceDebt(gated, {
  ...mesh,
  source_debt_planner_gate: {
    ...mesh.source_debt_planner_gate,
    enabled: false
  }
}), false, 'disabled gate must preserve legacy planner behavior');

console.log('PROJECT_GUIDE_SOURCE_DEBT_GATE_PASS');
