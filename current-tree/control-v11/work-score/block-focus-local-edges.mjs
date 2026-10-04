import { buildSelectedBlockFocus } from './selected-block-focus.mjs';
import { buildDependencyHighlightModel, dependencyHighlightClass } from './dependency-highlight-model.mjs';

const edge = (from, to, relation) => ({
  edge_id: `${from}->${to}:${relation}`,
  from_block_id: from,
  to_block_id: to,
  relation,
  local: true
});

export function buildBlockFocusLocalEdges(blocks = [], currentId = null, requestedId = null) {
  const focus = buildSelectedBlockFocus(blocks, currentId, requestedId);
  const highlight = buildDependencyHighlightModel(blocks, focus.selected_id);

  if (!focus.selected_id) {
    return {
      schema: 'prometeo.block-focus-local-edges/v1',
      selected_block_id: null,
      dependency_block_ids: [],
      unlock_block_ids: [],
      local_block_ids: [],
      edges: [],
      block_states: []
    };
  }

  const edges = [
    ...focus.dependencies.map(id => edge(id, focus.selected_id, 'dependency')),
    ...focus.successors.map(id => edge(focus.selected_id, id, 'unlocks'))
  ];

  const blockStates = focus.states.map(state => ({
    ...state,
    highlight_relation: highlight.relation_by_block_id[state.block_id] || 'unrelated',
    highlight_class: dependencyHighlightClass(highlight, state.block_id)
  }));

  return {
    schema: 'prometeo.block-focus-local-edges/v1',
    selected_block_id: focus.selected_id,
    dependency_block_ids: [...highlight.upstream_block_ids],
    unlock_block_ids: [...highlight.downstream_block_ids],
    local_block_ids: [...focus.local_ids],
    edges,
    block_states: blockStates
  };
}
