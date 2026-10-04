const DEFAULT_COMPLETED_STATES = new Set(['RESULT', 'VERIFIED', 'CONSUMED', 'PASS', 'DONE']);

function stateFor(states, id) {
  if (!states) return null;
  if (states instanceof Map) return states.get(id) ?? null;
  if (typeof states === 'function') return states(id) ?? null;
  return states[id] ?? null;
}

function normalizeBlocks(blocks) {
  if (!Array.isArray(blocks)) throw new TypeError('blocks must be an array');
  const byId = new Map();
  blocks.forEach((raw, index) => {
    const id = String(raw?.block_id || '');
    if (!id) throw new Error(`block at index ${index} is missing block_id`);
    if (byId.has(id)) throw new Error(`duplicate block_id: ${id}`);
    const duration = Number(raw?.expected_minutes ?? 0);
    if (!Number.isFinite(duration) || duration < 0) throw new Error(`invalid expected_minutes for ${id}`);
    byId.set(id, {
      ...raw,
      block_id: id,
      dependencies: Array.isArray(raw?.dependencies) ? raw.dependencies.map(String) : [],
      expected_minutes: duration,
      _index: index,
    });
  });
  for (const block of byId.values()) {
    for (const dep of block.dependencies) {
      if (!byId.has(dep)) throw new Error(`unknown dependency ${dep} referenced by ${block.block_id}`);
    }
  }
  return byId;
}

function topoSort(byId) {
  const indegree = new Map([...byId.keys()].map(id => [id, 0]));
  const successors = new Map([...byId.keys()].map(id => [id, []]));
  for (const block of byId.values()) {
    indegree.set(block.block_id, block.dependencies.length);
    for (const dep of block.dependencies) successors.get(dep).push(block.block_id);
  }
  for (const list of successors.values()) list.sort((a, b) => byId.get(a)._index - byId.get(b)._index || a.localeCompare(b));
  const queue = [...byId.values()].filter(b => indegree.get(b.block_id) === 0).sort((a, b) => a._index - b._index).map(b => b.block_id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const next of successors.get(id)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) {
        queue.push(next);
        queue.sort((a, b) => byId.get(a)._index - byId.get(b)._index || a.localeCompare(b));
      }
    }
  }
  if (order.length !== byId.size) throw new Error('work graph contains a dependency cycle');
  return { order, successors };
}

function cpm(byId, order, successors, weightFor) {
  const earliestStart = new Map();
  const earliestFinish = new Map();
  for (const id of order) {
    const block = byId.get(id);
    const start = block.dependencies.length ? Math.max(...block.dependencies.map(dep => earliestFinish.get(dep))) : 0;
    earliestStart.set(id, start);
    earliestFinish.set(id, start + weightFor(block));
  }
  const projectDuration = order.length ? Math.max(...order.map(id => earliestFinish.get(id))) : 0;
  const latestFinish = new Map();
  const latestStart = new Map();
  [...order].reverse().forEach(id => {
    const next = successors.get(id);
    const finish = next.length ? Math.min(...next.map(s => latestStart.get(s))) : projectDuration;
    latestFinish.set(id, finish);
    latestStart.set(id, finish - weightFor(byId.get(id)));
  });
  const EPS = 1e-9;
  const criticalIds = order.filter(id => Math.abs(latestStart.get(id) - earliestStart.get(id)) <= EPS);
  const criticalSet = new Set(criticalIds);
  const criticalEdges = [];
  for (const to of order) {
    const block = byId.get(to);
    for (const from of block.dependencies) {
      if (criticalSet.has(from) && criticalSet.has(to) && Math.abs(earliestFinish.get(from) - earliestStart.get(to)) <= EPS) {
        criticalEdges.push([from, to]);
      }
    }
  }
  return { projectDuration, earliestStart, earliestFinish, latestStart, latestFinish, criticalIds, criticalEdges };
}

function deterministicPrimaryPath(byId, cpmResult, weightFor) {
  if (!cpmResult.criticalIds.length) return [];
  const edgeNext = new Map(cpmResult.criticalIds.map(id => [id, []]));
  const incoming = new Set();
  for (const [from, to] of cpmResult.criticalEdges) {
    edgeNext.get(from)?.push(to);
    incoming.add(to);
  }
  const starts = cpmResult.criticalIds.filter(id => !incoming.has(id)).sort((a, b) => byId.get(a)._index - byId.get(b)._index || a.localeCompare(b));
  let current = starts[0];
  const path = [];
  while (current) {
    path.push(current);
    const next = (edgeNext.get(current) || []).sort((a, b) => {
      const finishDelta = cpmResult.earliestFinish.get(b) - cpmResult.earliestFinish.get(a);
      return finishDelta || byId.get(a)._index - byId.get(b)._index || a.localeCompare(b);
    });
    current = next[0] || null;
  }
  return path.filter(id => weightFor(byId.get(id)) > 0 || path.length === 1);
}

export function buildCriticalPathOverlay(blocks, states = null, options = {}) {
  const byId = normalizeBlocks(blocks);
  const { order, successors } = topoSort(byId);
  const completedStates = new Set(options.completedStates || DEFAULT_COMPLETED_STATES);
  const isCompleted = id => completedStates.has(String(stateFor(states, id) || '').toUpperCase());
  const baselineWeight = block => block.expected_minutes;
  const remainingWeight = block => isCompleted(block.block_id) ? 0 : block.expected_minutes;
  const baseline = cpm(byId, order, successors, baselineWeight);
  const remaining = cpm(byId, order, successors, remainingWeight);
  const remainingCriticalIds = remaining.criticalIds.filter(id => !isCompleted(id));
  const remainingCriticalSet = new Set(remainingCriticalIds);
  const remainingCriticalEdges = remaining.criticalEdges.filter(([from, to]) => remainingCriticalSet.has(from) && remainingCriticalSet.has(to));
  const nodes = {};
  for (const id of order) {
    nodes[id] = {
      block_id: id,
      state: stateFor(states, id),
      completed: isCompleted(id),
      expected_minutes: byId.get(id).expected_minutes,
      baseline: {
        earliest_start: baseline.earliestStart.get(id),
        earliest_finish: baseline.earliestFinish.get(id),
        latest_start: baseline.latestStart.get(id),
        latest_finish: baseline.latestFinish.get(id),
        slack_minutes: baseline.latestStart.get(id) - baseline.earliestStart.get(id),
        critical: baseline.criticalIds.includes(id),
      },
      remaining: {
        earliest_start: remaining.earliestStart.get(id),
        earliest_finish: remaining.earliestFinish.get(id),
        latest_start: remaining.latestStart.get(id),
        latest_finish: remaining.latestFinish.get(id),
        slack_minutes: remaining.latestStart.get(id) - remaining.earliestStart.get(id),
        critical: remainingCriticalSet.has(id),
      },
    };
  }
  return {
    schema: 'prometeo.critical-path-overlay-model/v1',
    baseline: {
      duration_minutes: baseline.projectDuration,
      critical_block_ids: baseline.criticalIds,
      critical_edges: baseline.criticalEdges,
      primary_path: deterministicPrimaryPath(byId, baseline, baselineWeight),
    },
    remaining: {
      duration_minutes: remaining.projectDuration,
      critical_block_ids: remainingCriticalIds,
      critical_edges: remainingCriticalEdges,
      primary_path: deterministicPrimaryPath(byId, { ...remaining, criticalIds: remainingCriticalIds, criticalEdges: remainingCriticalEdges }, remainingWeight),
    },
    nodes,
  };
}
