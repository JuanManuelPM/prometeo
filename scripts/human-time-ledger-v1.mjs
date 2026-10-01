const REQUIRED = 'HUMAN_ACTION_REQUIRED';
const OBSERVED = 'HUMAN_ACTION_OBSERVED';
const CLEARED = 'boundary_cleared';
const EXTERNAL = 'EXTERNAL_UNOBSERVED';
const WORKER = 'WORKER_SIGNAL';

const CLASSIFICATIONS = new Set(['NECESSARY_HUMAN_GATE', 'AVOIDABLE_HUMAN_HANDOFF']);

function toMs(value, field) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new TypeError(`${field} must be an ISO timestamp`);
  return ms;
}

function sortedEvents(events) {
  return [...events].map((event, index) => ({ ...event, __index: index })).sort((a, b) => {
    const ams = toMs(a.at, `events[${a.__index}].at`);
    const bms = toMs(b.at, `events[${b.__index}].at`);
    return ams - bms || a.__index - b.__index;
  });
}

export function deriveHumanTimeLedger(events, { asOf = null } = {}) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array');
  const ordered = sortedEvents(events);
  const asOfMs = asOf == null ? null : toMs(asOf, 'asOf');
  const open = new Map();
  const completed = [];
  const external = [];
  let lastHumanActionAt = null;
  let lastWorkerSignalAt = null;
  let humanRoundTrips = 0;
  let avoidableHumanHandoffs = 0;
  let unavoidableHumanGates = 0;

  for (const event of ordered) {
    const atMs = toMs(event.at, 'event.at');
    if (event.type === OBSERVED) {
      lastHumanActionAt = event.at;
      if (!event.boundary_id) continue;
      const prior = open.get(event.boundary_id);
      if (!prior) continue;
      open.delete(event.boundary_id);
      const waitMs = Math.max(0, atMs - prior.opened_at_ms);
      completed.push({
        boundary_id: event.boundary_id,
        classification: prior.classification,
        required_action: prior.required_action,
        opened_at: prior.opened_at,
        closed_at: event.at,
        closed_by: OBSERVED,
        wait_ms: waitMs,
        source_ref: prior.source_ref ?? null
      });
      humanRoundTrips += 1;
      continue;
    }

    if (event.type === REQUIRED) {
      if (!event.boundary_id) throw new TypeError('HUMAN_ACTION_REQUIRED requires boundary_id');
      if (!CLASSIFICATIONS.has(event.classification)) {
        throw new TypeError('HUMAN_ACTION_REQUIRED classification must be NECESSARY_HUMAN_GATE or AVOIDABLE_HUMAN_HANDOFF');
      }
      if (open.has(event.boundary_id)) throw new Error(`duplicate open boundary ${event.boundary_id}`);
      open.set(event.boundary_id, {
        opened_at: event.at,
        opened_at_ms: atMs,
        classification: event.classification,
        required_action: event.required_action ?? null,
        source_ref: event.source_ref ?? null
      });
      if (event.classification === 'NECESSARY_HUMAN_GATE') unavoidableHumanGates += 1;
      if (event.classification === 'AVOIDABLE_HUMAN_HANDOFF') avoidableHumanHandoffs += 1;
      continue;
    }

    if (event.type === CLEARED) {
      if (!event.boundary_id) throw new TypeError('boundary_cleared requires boundary_id');
      const prior = open.get(event.boundary_id);
      if (!prior) continue;
      open.delete(event.boundary_id);
      completed.push({
        boundary_id: event.boundary_id,
        classification: prior.classification,
        required_action: prior.required_action,
        opened_at: prior.opened_at,
        closed_at: event.at,
        closed_by: CLEARED,
        wait_ms: Math.max(0, atMs - prior.opened_at_ms),
        source_ref: prior.source_ref ?? null
      });
      continue;
    }

    if (event.type === EXTERNAL) {
      external.push({
        at: event.at,
        source_ref: event.source_ref ?? null,
        reason: event.reason ?? 'missing durable human-action interval endpoints',
        duration_ms: null
      });
      continue;
    }

    if (event.type === WORKER) lastWorkerSignalAt = event.at;
  }

  const completedWaitMs = completed.reduce((sum, item) => sum + item.wait_ms, 0);
  const observedActionWaitMs = completed
    .filter(item => item.closed_by === OBSERVED)
    .reduce((sum, item) => sum + item.wait_ms, 0);
  const openBoundaries = [...open.entries()].map(([boundary_id, item]) => ({
    boundary_id,
    classification: item.classification,
    required_action: item.required_action,
    opened_at: item.opened_at,
    source_ref: item.source_ref,
    age_ms: asOfMs == null ? null : Math.max(0, asOfMs - item.opened_at_ms)
  }));
  const oldestOpenAgeMs = openBoundaries.reduce((max, item) => item.age_ms == null ? max : Math.max(max, item.age_ms), 0);
  const humanIdleMs = lastHumanActionAt && asOfMs != null
    ? Math.max(0, asOfMs - toMs(lastHumanActionAt, 'lastHumanActionAt'))
    : null;

  const humanBottleneck = {
    human_round_trips: humanRoundTrips,
    avoidable_human_handoffs: avoidableHumanHandoffs,
    unavoidable_human_gates: unavoidableHumanGates,
    human_boundary_wait_ms: completedWaitMs,
    human_action_wait_ms: observedActionWaitMs,
    human_boundary_wait_samples: completed.length,
    open_human_boundaries: openBoundaries.length,
    oldest_open_human_boundary_age_ms: openBoundaries.length && asOfMs != null ? oldestOpenAgeMs : null,
    external_unobserved_count: external.length,
    external_unobserved_duration_ms: null,
    human_silence_is_bottleneck: false
  };

  return {
    schema: 'prometeo.human-time-ledger-result/v1',
    as_of: asOf,
    event_contract: [REQUIRED, OBSERVED, CLEARED, EXTERNAL],
    last_human_action_at: lastHumanActionAt,
    last_worker_signal_at: lastWorkerSignalAt,
    human_idle_ms: humanIdleMs,
    completed_boundaries: completed,
    open_boundaries: openBoundaries,
    external_unobserved: external,
    human_touch_budget: {
      observed_required_actions: avoidableHumanHandoffs + unavoidableHumanGates,
      unavoidable: unavoidableHumanGates,
      avoidable: avoidableHumanHandoffs
    },
    scale_readiness: { human_bottleneck: humanBottleneck },
    primary_chat: {
      human_decision_required: openBoundaries.length > 0,
      pending_human_actions: openBoundaries.map(item => ({
        boundary_id: item.boundary_id,
        required_action: item.required_action,
        classification: item.classification,
        opened_at: item.opened_at,
        age_ms: item.age_ms
      })),
      last_human_action_at: lastHumanActionAt,
      last_worker_signal_at: lastWorkerSignalAt,
      human_idle_ms: humanIdleMs,
      human_boundary_wait_ms: completedWaitMs,
      external_unobserved: external.length > 0
    }
  };
}

export const HUMAN_TIME_EVENT_TYPES = Object.freeze({
  HUMAN_ACTION_REQUIRED: REQUIRED,
  HUMAN_ACTION_OBSERVED: OBSERVED,
  BOUNDARY_CLEARED: CLEARED,
  EXTERNAL_UNOBSERVED: EXTERNAL,
  WORKER_SIGNAL: WORKER
});
