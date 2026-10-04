const DEFAULT_FRESHNESS_MS = 15 * 60 * 1000;
const FRESH_WORKER_STATUSES = new Set(['LAUNCHED', 'OBSERVED_WORKING']);

const nonNegativeInt = value => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

const asMs = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
};

export function requiredNow({ target = 0, readyCount = 0, workingCount = 0 } = {}) {
  const targetWc = nonNegativeInt(target);
  const demand = nonNegativeInt(readyCount) + nonNegativeInt(workingCount);
  return Math.min(targetWc, demand);
}

export function isFreshDurableWorkerEvidence(span, options = {}) {
  if (!span || span.actor_kind !== 'worker') return false;
  if (options.batchId && span.batch_id !== options.batchId) return false;
  if (!FRESH_WORKER_STATUSES.has(String(span.status || '').toUpperCase())) return false;
  const nowMs = asMs(options.nowMs) ?? Date.now();
  const freshnessMs = Math.max(1, Number(options.freshnessMs) || DEFAULT_FRESHNESS_MS);
  const signalMs = asMs(span.last_activity_at) ?? asMs(span.end_at) ?? asMs(span.start_at);
  return signalMs !== null && signalMs <= nowMs && nowMs - signalMs <= freshnessMs;
}

export function countFreshAvailableWorkers(spans, options = {}) {
  const ids = new Set();
  for (const span of Array.isArray(spans) ? spans : []) {
    if (!isFreshDurableWorkerEvidence(span, options)) continue;
    const id = String(span.actor_id || span.worker_id || '').trim();
    if (id) ids.add(id);
  }
  return ids.size;
}

export function deriveCapacityProjectionBase(input = {}) {
  const targetWc = nonNegativeInt(input.target);
  const required = requiredNow({
    target: targetWc,
    readyCount: input.readyCount,
    workingCount: input.workingCount
  });
  const freshAvailable = input.freshAvailableWc == null
    ? countFreshAvailableWorkers(input.workerSpans, {
        nowMs: input.nowMs,
        freshnessMs: input.freshnessMs,
        batchId: input.batchId
      })
    : nonNegativeInt(input.freshAvailableWc);

  return {
    authority: 'DERIVED_PROJECTION_ONLY',
    target_wc: targetWc,
    required_now: required,
    fresh_available_wc: freshAvailable,
    fresh_available_wc_rule: 'fresh durable worker evidence only; old ACTIVE/PARKED labels are not liveness',
    downstream_formula_owner: 'B024_RESERVE_MISSING_REFILL'
  };
}
