import assert from 'node:assert/strict';
import { buildCriticalPathOverlay } from '../../../current-tree/control-v11/work-score/critical-path-model.mjs';

const diamond = [
  {block_id:'A', dependencies:[], expected_minutes:2},
  {block_id:'B', dependencies:['A'], expected_minutes:5},
  {block_id:'C', dependencies:['A'], expected_minutes:3},
  {block_id:'D', dependencies:['B','C'], expected_minutes:2},
];
let model = buildCriticalPathOverlay(diamond);
assert.equal(model.baseline.duration_minutes, 9);
assert.deepEqual(model.baseline.primary_path, ['A','B','D']);
assert.deepEqual(model.baseline.critical_block_ids, ['A','B','D']);
assert.deepEqual(model.baseline.critical_edges, [['A','B'],['B','D']]);
assert.equal(model.nodes.C.baseline.slack_minutes, 2);

const equal = [
  {block_id:'A', dependencies:[], expected_minutes:1},
  {block_id:'B', dependencies:['A'], expected_minutes:2},
  {block_id:'C', dependencies:['A'], expected_minutes:2},
  {block_id:'D', dependencies:['B','C'], expected_minutes:1},
];
model = buildCriticalPathOverlay(equal);
assert.deepEqual(model.baseline.critical_block_ids, ['A','B','C','D']);
assert.deepEqual(model.baseline.critical_edges, [['A','B'],['A','C'],['B','D'],['C','D']]);

model = buildCriticalPathOverlay(diamond, {A:'CONSUMED',B:'VERIFIED'});
assert.equal(model.remaining.duration_minutes, 5);
assert.deepEqual(model.remaining.primary_path, ['C','D']);
assert.equal(model.nodes.A.completed, true);
assert.equal(model.nodes.C.remaining.critical, true);

assert.throws(() => buildCriticalPathOverlay([
  {block_id:'A', dependencies:['B'], expected_minutes:1},
  {block_id:'B', dependencies:['A'], expected_minutes:1},
]), /cycle/);
assert.throws(() => buildCriticalPathOverlay([{block_id:'A', dependencies:['NOPE'], expected_minutes:1}]), /unknown dependency/);

console.log('critical-path-overlay-model: PASS');
