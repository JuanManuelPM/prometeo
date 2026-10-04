import assert from 'node:assert/strict';
import { buildSelectedBlockFocus, resolveSelectedBlockId } from '../../../current-tree/control-v11/work-score/selected-block-focus.mjs';

const blocks = [
  { block_id: 'B001', dependencies: [] },
  { block_id: 'B002', dependencies: ['B001'] },
  { block_id: 'B003', dependencies: ['B001'] },
  { block_id: 'B004', dependencies: ['B002', 'B003'] },
  { block_id: 'B005', dependencies: [] }
];

assert.equal(resolveSelectedBlockId(blocks), 'B001');
assert.equal(resolveSelectedBlockId(blocks, 'B003', 'missing'), 'B003');
assert.equal(resolveSelectedBlockId(blocks, 'B003', 'B002'), 'B002');
assert.equal(resolveSelectedBlockId([], 'B003', 'B002'), null);

const focus = buildSelectedBlockFocus(blocks, null, 'B003');
assert.equal(focus.selected_id, 'B003');
assert.deepEqual(focus.dependencies, ['B001']);
assert.deepEqual(focus.successors, ['B004']);
assert.deepEqual(focus.local_ids, ['B003', 'B001', 'B004']);

const state = Object.fromEntries(focus.states.map(row => [row.block_id, row]));
assert.equal(state.B003.relation, 'selected');
assert.equal(state.B003.aria_selected, 'true');
assert.equal(state.B003.tab_index, 0);
assert.equal(state.B001.relation, 'dependency');
assert.equal(state.B004.relation, 'successor');
assert.equal(state.B005.relation, 'outside');
assert.equal(state.B005.dimmed, true);
assert.equal(state.B002.local, false);

const same = buildSelectedBlockFocus(blocks, 'B003', 'B003');
assert.equal(same.selected_id, 'B003');
assert.equal(blocks[2].dependencies[0], 'B001');
console.log('B003_SELECTED_BLOCK_FOCUS_PASS');
