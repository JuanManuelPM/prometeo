const arr = value => Array.isArray(value) ? value : [];
const idOf = block => String(block?.block_id || '').trim();

export function buildDependencyHighlightModel(blocks = [], selectedId = null) {
  const ordered = arr(blocks).map((block, index) => ({...block, block_id: idOf(block), _index: index}));
  const byId = new Map();
  for (const block of ordered) {
    if (!block.block_id) throw new Error('BLOCK_ID_REQUIRED');
    if (byId.has(block.block_id)) throw new Error(`DUPLICATE_BLOCK_ID:${block.block_id}`);
    byId.set(block.block_id, block);
  }
  for (const block of ordered) {
    for (const dependencyId of arr(block.dependencies).map(String)) {
      if (!byId.has(dependencyId)) throw new Error(`UNKNOWN_DEPENDENCY:${dependencyId}->${block.block_id}`);
    }
  }

  const selected = String(selectedId || '').trim();
  if (!selected) {
    return {
      schema: 'prometeo.dependency-highlight/v1',
      selected_block_id: null,
      upstream_block_ids: [],
      downstream_block_ids: [],
      related_block_ids: [],
      relation_by_block_id: {}
    };
  }
  if (!byId.has(selected)) throw new Error(`UNKNOWN_SELECTED_BLOCK:${selected}`);

  const upstream = arr(byId.get(selected).dependencies).map(String);
  const downstream = ordered
    .filter(block => arr(block.dependencies).map(String).includes(selected))
    .map(block => block.block_id);
  const relation = {};
  for (const block of ordered) relation[block.block_id] = 'unrelated';
  for (const id of upstream) relation[id] = 'dependency';
  for (const id of downstream) relation[id] = 'unlocks';
  relation[selected] = 'selected';

  return {
    schema: 'prometeo.dependency-highlight/v1',
    selected_block_id: selected,
    upstream_block_ids: upstream,
    downstream_block_ids: downstream,
    related_block_ids: ordered.filter(block => relation[block.block_id] !== 'unrelated').map(block => block.block_id),
    relation_by_block_id: relation
  };
}

export function dependencyHighlightClass(model, blockId) {
  const relation = model?.relation_by_block_id?.[String(blockId)] || 'unrelated';
  return `dep-${relation}`;
}
