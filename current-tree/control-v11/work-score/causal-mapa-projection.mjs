import { deriveRunRelativeDomain, projectRunRelativeTime, buildRunRelativeTicks } from './run-relative-time-geometry.mjs';
import { buildWorkLifecycleMap } from './lifecycle-event-mapping.mjs';

const idOf = block => String(block?.block_id || '').trim();
const defaultWorkId = blockId => `portfolio-10wc-pre-run-${String(blockId).toLowerCase()}`;

export function buildCausalMapaProjection(input = {}) {
  const blocks = Array.isArray(input.blocks) ? input.blocks : [];
  const events = Array.isArray(input.events) ? input.events : [];
  const spans = Array.isArray(input.spans) ? input.spans : [];
  const workIdForBlock = typeof input.workIdForBlock === 'function' ? input.workIdForBlock : defaultWorkId;
  const nowMs = input.nowMs ?? Date.now();
  const ids = new Set(blocks.map(idOf).filter(Boolean));
  const relevantSpans = spans.filter(span => {
    const workId = String(span?.work_id || '');
    return blocks.some(block => workIdForBlock(idOf(block)) === workId);
  });
  const domain = deriveRunRelativeDomain(relevantSpans, { nowMs });
  const lifecycle = buildWorkLifecycleMap(events);
  const successorMap = new Map([...ids].map(id => [id, []]));
  const edges = [];

  for (const block of blocks) {
    const to = idOf(block);
    if (!to) continue;
    for (const rawDep of block?.dependencies || []) {
      const from = String(rawDep);
      if (!ids.has(from)) continue;
      successorMap.get(from).push(to);
      edges.push({ from, to, relation: 'dependency' });
    }
  }

  const nodes = blocks.map(block => {
    const blockId = idOf(block);
    const workId = workIdForBlock(blockId);
    const life = lifecycle.get(workId) || null;
    const matchingSpans = relevantSpans.filter(span => String(span?.work_id || '') === workId);
    const firstStart = matchingSpans
      .map(span => Date.parse(span?.start_at || ''))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)[0] ?? null;
    const timeAt = life?.at || (firstStart === null ? null : new Date(firstStart).toISOString());
    return {
      block_id: blockId,
      work_id: workId,
      lane: block?.lane ?? null,
      depth: Number.isFinite(Number(block?.depth)) ? Number(block.depth) : null,
      title: block?.title == null ? '' : String(block.title),
      dependencies: (block?.dependencies || []).map(String).filter(id => ids.has(id)),
      successors: successorMap.get(blockId) || [],
      lifecycle_state: life?.state ?? null,
      lifecycle_rank: life?.rank ?? null,
      lifecycle_at: life?.at ?? null,
      evidence_refs: life?.refs ?? [],
      run_left_pct: timeAt ? projectRunRelativeTime(timeAt, domain) : null,
      observed_span_count: matchingSpans.length
    };
  });

  return {
    schema: 'prometeo.work-score-causal-mapa-projection/v1',
    domain,
    ticks: buildRunRelativeTicks(domain, input.tickCount ?? 4),
    nodes,
    edges,
    summary: {
      blocks: nodes.length,
      edges: edges.length,
      lifecycle_observed: nodes.filter(node => node.lifecycle_state).length,
      time_observed: nodes.filter(node => node.run_left_pct !== null).length
    }
  };
}
