const idOf = block => String(block?.block_id || '').trim();

export function resolveSelectedBlockId(blocks, currentId = null, requestedId = null) {
  const list = Array.isArray(blocks) ? blocks : [];
  const ids = new Set(list.map(idOf).filter(Boolean));
  const requested = String(requestedId || '').trim();
  const current = String(currentId || '').trim();
  if (requested && ids.has(requested)) return requested;
  if (current && ids.has(current)) return current;
  return idOf(list[0]) || null;
}

export function buildSelectedBlockFocus(blocks, currentId = null, requestedId = null) {
  const list = Array.isArray(blocks) ? blocks : [];
  const selectedId = resolveSelectedBlockId(list, currentId, requestedId);
  if (!selectedId) {
    return { selected_id: null, dependencies: [], successors: [], local_ids: [], states: [] };
  }

  const byId = new Map(list.map(block => [idOf(block), block]).filter(([id]) => id));
  const selected = byId.get(selectedId);
  const dependencies = [...new Set((selected?.dependencies || []).map(String))].filter(id => byId.has(id));
  const successors = list
    .filter(block => (block?.dependencies || []).map(String).includes(selectedId))
    .map(idOf)
    .filter(Boolean);
  const localIds = [...new Set([selectedId, ...dependencies, ...successors])];
  const localSet = new Set(localIds);
  const depSet = new Set(dependencies);
  const successorSet = new Set(successors);

  const states = list.map(block => {
    const blockId = idOf(block);
    let relation = 'outside';
    if (blockId === selectedId) relation = 'selected';
    else if (depSet.has(blockId)) relation = 'dependency';
    else if (successorSet.has(blockId)) relation = 'successor';
    return {
      block_id: blockId,
      relation,
      selected: blockId === selectedId,
      local: localSet.has(blockId),
      dimmed: !localSet.has(blockId),
      aria_selected: blockId === selectedId ? 'true' : 'false',
      tab_index: blockId === selectedId ? 0 : -1
    };
  });

  return { selected_id: selectedId, dependencies, successors, local_ids: localIds, states };
}
