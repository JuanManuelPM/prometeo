const DEFAULT_FALLBACK_WINDOW_MS = 45 * 60 * 1000;
const DEFAULT_MIN_WINDOW_MS = 60 * 1000;

function asMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function deriveRunRelativeDomain(spans, options = {}) {
  const nowMs = asMs(options.nowMs) ?? Date.now();
  const fallbackWindowMs = Math.max(1, Number(options.fallbackWindowMs) || DEFAULT_FALLBACK_WINDOW_MS);
  const minWindowMs = Math.max(1, Number(options.minWindowMs) || DEFAULT_MIN_WINDOW_MS);
  const rows = Array.isArray(spans) ? spans : [];
  const starts = [];
  const ends = [];

  for (const span of rows) {
    const start = asMs(span?.start_at);
    if (start === null) continue;
    starts.push(start);
    const end = asMs(span?.end_at) ?? asMs(span?.last_activity_at) ?? nowMs;
    ends.push(Math.max(start, end));
  }

  if (!starts.length) {
    return {
      startMs: nowMs - fallbackWindowMs,
      endMs: nowMs,
      durationMs: fallbackWindowMs,
      source: 'FALLBACK_WINDOW',
      observedSpanCount: 0
    };
  }

  const startMs = Math.min(...starts);
  const observedEndMs = Math.max(nowMs, ...ends);
  const endMs = Math.max(observedEndMs, startMs + minWindowMs);
  return {
    startMs,
    endMs,
    durationMs: endMs - startMs,
    source: 'RUN_OBSERVED',
    observedSpanCount: starts.length
  };
}

export function projectRunRelativeTime(value, domain) {
  const pointMs = asMs(value);
  if (pointMs === null) return null;
  const startMs = asMs(domain?.startMs);
  const endMs = asMs(domain?.endMs);
  if (startMs === null || endMs === null || endMs <= startMs) return null;
  return clamp01((pointMs - startMs) / (endMs - startMs)) * 100;
}

export function projectRunRelativeSpan(span, domain) {
  const startMs = asMs(span?.start_at);
  if (startMs === null) return null;
  const rawEnd = asMs(span?.end_at) ?? asMs(span?.last_activity_at) ?? startMs;
  const endMs = Math.max(startMs, rawEnd);
  const leftPct = projectRunRelativeTime(startMs, domain);
  const rightPct = projectRunRelativeTime(endMs, domain);
  if (leftPct === null || rightPct === null) return null;
  return {
    leftPct,
    rightPct,
    widthPct: Math.max(0, rightPct - leftPct)
  };
}

export function buildRunRelativeTicks(domain, tickCount = 4) {
  const count = Math.max(2, Math.floor(Number(tickCount) || 4));
  const startMs = asMs(domain?.startMs);
  const endMs = asMs(domain?.endMs);
  if (startMs === null || endMs === null || endMs <= startMs) return [];
  const durationMs = endMs - startMs;
  return Array.from({ length: count }, (_, index) => {
    const ratio = index / (count - 1);
    const atMs = startMs + durationMs * ratio;
    const elapsedMinutes = (atMs - startMs) / 60000;
    return {
      atMs,
      leftPct: ratio * 100,
      elapsedMinutes,
      label: `${Math.round(elapsedMinutes)}m`
    };
  });
}
