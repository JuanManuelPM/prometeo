import assert from 'node:assert/strict';
import { buildBlockFocusLocalEdges } from '../../../current-tree/control-v11/work-score/block-focus-local-edges.mjs';

const blocks = [
  { block_id: 'B003', dependencies: [] },
  { block_id: 'B004', dependencies: [] },
  { block_id: 'B026', dependencies: ['B003', 'B004'] },
  { block_id: 'B041', dependencies: ['B026'] },
  { block_id: 'B042', dependencies: ['B026'] },
  { block_id: 'B099', dependencies: [] }
];

const model = buildBlockFocusLocalEdges(blocks, null, 'B026');
assert.equal(model.schema, 'prometeo.block-focus-local-edges/v1');
assert.equal(model.selected_block_id, 'B026');
assert.deepEqual(model.dependency_block_ids, ['B003', 'B004']);
assert.deepEqual(model.unlock_block_ids, ['B041', 'B042']);
assert.deepEqual(model.local_block_ids, ['B026', 'B003', 'B004', 'B041', 'B042']);
assert.deepEqual(model.edges, [
  { edge_id: 'B003->B026:dependency', from_block_id: 'B003', to_block_id: 'B026', relation: 'dependency', local: true },
  { edge_id: 'B004->B026:dependency', from_block_id: 'B004', to_block_id: 'B026', relation: 'dependency', local: true },
  { edge_id: 'B026->B041:unlocks', from_block_id: 'B026', to_block_id: 'B041', relation: 'unlocks', local: true },
  { edge_id: 'B026->B042:unlocks', from_block_id: 'B026', to_block_id: 'B042', relation: 'unlocks', local: true }
]);

const states = Object.fromEntries(model.block_states.map(state => [state.block_id, state]));
assert.equal(states.B026.highlight_class, 'dep-selected');
assert.equal(states.B003.highlight_class, 'dep-dependency');
assert.equal(states.B041.highlight_class, 'dep-unlocks');
assert.equal(states.B099.highlight_class, 'dep-unrelated');
assert.equal(states.B099.dimmed, true);
assert.equal(states.B026.aria_selected, 'true');
assert.equal(states.B026.tab_index, 0);

const fallback = buildBlockFocusLocalEdges(blocks, 'B004', 'DOES_NOT_EXIST');
assert.equal(fallback.selected_block_id, 'B004');

assert.deepEqual(buildBlockFocusLocalEdges([], null, null), {
  schema: 'prometeo.block-focus-local-edges/v1',
  selected_block_id: null,
  dependency_block_ids: [],
  unlock_block_ids: [],
  local_block_ids: [],
  edges: [],
  block_states: []
});

assert.throws(
  () => buildBlockFocusLocalEdges([{ block_id: 'X', dependencies: ['MISSING'] }], null, 'X'),
  /UNKNOWN_DEPENDENCY:MISSING->X/
);
assert.throws(
  () => buildBlockFocusLocalEdges([{ block_id: 'X', dependencies: [] }, { block_id: 'X', dependencies: [] }], null, 'X'),
  /DUPLICATE_BLOCK_ID:X/
);

console.log('B026_BLOCK_FOCUS_LOCAL_EDGES_PASS');
