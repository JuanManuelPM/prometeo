export const WORK_LIFECYCLE_STAGES = Object.freeze([
  'PLANNED',
  'LAUNCHED',
  'OBSERVED_WORKING',
  'RESULT',
  'VERIFIED',
  'CONSUMED'
]);

const STAGE_RANK = new Map(WORK_LIFECYCLE_STAGES.map((stage, rank) => [stage, rank]));

function iso(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function refs(value) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}

export function classifyLifecycleEvent(event) {
  const state = String(event?.type || '').toUpperCase();
  if (!STAGE_RANK.has(state)) return null;
  const at = iso(event?.at);
  if (!at) return null;
  return {
    state,
    rank: STAGE_RANK.get(state),
    at,
    event_id: event?.id ? String(event.id) : null,
    evidence_level: event?.evidence_level ? String(event.evidence_level) : null,
    refs: refs(event?.refs)
  };
}

export function buildWorkLifecycleMap(events, options = {}) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array');
  const prefix = options.workIdPrefix == null ? null : String(options.workIdPrefix);
  const grouped = new Map();

  events.forEach((event, index) => {
    const workId = event?.work_id == null ? '' : String(event.work_id);
    if (!workId || (prefix && !workId.startsWith(prefix))) return;
    const lifecycle = classifyLifecycleEvent(event);
    if (!lifecycle) return;
    const item = { ...lifecycle, _index: index };
    if (!grouped.has(workId)) grouped.set(workId, []);
    grouped.get(workId).push(item);
  });

  const out = new Map();
  for (const [workId, history] of grouped) {
    history.sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.rank - b.rank || a._index - b._index);
    let current = null;
    for (const item of history) {
      if (!current || item.rank > current.rank || (item.rank === current.rank && Date.parse(item.at) >= Date.parse(current.at))) {
        current = item;
      }
    }
    out.set(workId, {
      work_id: workId,
      state: current.state,
      rank: current.rank,
      at: current.at,
      event_id: current.event_id,
      evidence_level: current.evidence_level,
      refs: current.refs,
      terminal_material: current.rank >= STAGE_RANK.get('RESULT'),
      verified: current.rank >= STAGE_RANK.get('VERIFIED'),
      consumed: current.rank >= STAGE_RANK.get('CONSUMED'),
      history: history.map(({ _index, ...item }) => item)
    });
  }
  return out;
}

export function lifecycleStateFor(events, workId) {
  return buildWorkLifecycleMap(events).get(String(workId))?.state ?? null;
}
