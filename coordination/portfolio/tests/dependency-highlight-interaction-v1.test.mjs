import assert from 'node:assert/strict';
import { buildDependencyHighlightModel, dependencyHighlightClass } from '../../../current-tree/control-v11/work-score/dependency-highlight-model.mjs';

const blocks = [
  {block_id:'A', dependencies:[]},
  {block_id:'B', dependencies:['A']},
  {block_id:'C', dependencies:['A']},
  {block_id:'D', dependencies:['B','C']},
  {block_id:'E', dependencies:[]}
];

const model = buildDependencyHighlightModel(blocks, 'B');
assert.equal(model.selected_block_id, 'B');
assert.deepEqual(model.upstream_block_ids, ['A']);
assert.deepEqual(model.downstream_block_ids, ['D']);
assert.deepEqual(model.related_block_ids, ['A','B','D']);
assert.equal(dependencyHighlightClass(model, 'A'), 'dep-dependency');
assert.equal(dependencyHighlightClass(model, 'B'), 'dep-selected');
assert.equal(dependencyHighlightClass(model, 'D'), 'dep-unlocks');
assert.equal(dependencyHighlightClass(model, 'E'), 'dep-unrelated');

const empty = buildDependencyHighlightModel(blocks, null);
assert.equal(empty.selected_block_id, null);
assert.deepEqual(empty.related_block_ids, []);

assert.throws(() => buildDependencyHighlightModel(blocks, 'NOPE'), /UNKNOWN_SELECTED_BLOCK/);
assert.throws(() => buildDependencyHighlightModel([{block_id:'A',dependencies:['NOPE']}], 'A'), /UNKNOWN_DEPENDENCY/);
assert.throws(() => buildDependencyHighlightModel([{block_id:'A'},{block_id:'A'}], 'A'), /DUPLICATE_BLOCK_ID/);

console.log('dependency-highlight-interaction: PASS');
