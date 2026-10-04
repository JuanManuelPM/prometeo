import { buildClockTimeTicks, formatClockTime, projectClockTime } from './clock-time-projection-geometry.mjs';
import { buildWorkLifecycleMap } from './lifecycle-event-mapping.mjs';

const DEFAULT_WINDOW_MS = 45 * 60 * 1000;
const MIN_WINDOW_MS = 60 * 1000;
const idOf = block => String(block?.block_id || '').trim();
const defaultWorkId = blockId => `portfolio-10wc-pre-run-${String(blockId).toLowerCase()}`;

function asMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
}

function iso(value) {
  const ms = asMs(value);
  return ms === null ? null : new Date(ms).toISOString();
}

function deriveClockDomain(workIds, spans, lifecycle, options = {}) {
  const nowMs = asMs(options.nowMs) ?? Date.now();
  const fallbackWindowMs = Math.max(1, Number(options.fallbackWindowMs) || DEFAULT_WINDOW_MS);
  const minWindowMs = Math.max(1, Number(options.minWindowMs) || MIN_WINDOW_MS);
  const starts = [];
  const ends = [];

  for (const span of spans) {
    if (!workIds.has(String(span?.work_id || ''))) continue;
    const start = asMs(span?.start_at);
    if (start === null) continue;
    starts.push(start);
    const end = asMs(span?.end_at) ?? asMs(span?.last_activity_at) ?? start;
    ends.push(Math.max(start, end));
  }

  for (const [workId, life] of lifecycle) {
    if (!workIds.has(workId)) continue;
    for (const event of life.history || []) {
      const at = asMs(event?.at);
      if (at === null) continue;
      starts.push(at);
      ends.push(at);
    }
  }

  if (!starts.length) {
    return {
      startMs: nowMs - fallbackWindowMs,
      endMs: nowMs,
      durationMs: fallbackWindowMs,
      source: 'FALLBACK_WINDOW',
      observedPointCount: 0
    };
  }

  const startMs = Math.min(...starts);
  const observedEndMs = Math.max(...ends);
  const endMs = Math.max(nowMs, observedEndMs, startMs + minWindowMs);
  return {
    startMs,
    endMs,
    durationMs: endMs - startMs,
    source: 'REAL_OBSERVED_CLOCK',
    observedPointCount: starts.length
  };
}

function projectSpan(span, domain) {
  const startAt = iso(span?.start_at);
  if (!startAt) return null;
  const endAt = iso(span?.end_at) || iso(span?.last_activity_at) || startAt;
  const leftPct = projectClockTime(startAt, domain);
  const rightPct = projectClockTime(endAt, domain);
  if (leftPct === null || rightPct === null) return null;
  return {
    start_at: startAt,
    end_at: endAt,
    left_pct: leftPct,
    right_pct: rightPct,
    width_pct: Math.max(0, rightPct - leftPct),
    status: span?.status == null ? null : String(span.status),
    actor_id: span?.actor_id == null ? null : String(span.actor_id)
  };
}

export function buildRealTiempoProjection(input = {}) {
  const blocks = Array.isArray(input.blocks) ? input.blocks : [];
  const events = Array.isArray(input.events) ? input.events : [];
  const spans = Array.isArray(input.spans) ? input.spans : [];
  const workIdForBlock = typeof input.workIdForBlock === 'function' ? input.workIdForBlock : defaultWorkId;
  const lifecycle = buildWorkLifecycleMap(events);
  const workIds = new Set(blocks.map(block => workIdForBlock(idOf(block))).filter(Boolean));
  const domain = input.domain || deriveClockDomain(workIds, spans, lifecycle, input);
  const clockOptions = {
    locale: input.locale || 'es-AR',
    timeZone: input.timeZone || 'America/Argentina/Buenos_Aires'
  };

  const rows = blocks.map(block => {
    const blockId = idOf(block);
    const workId = workIdForBlock(blockId);
    const life = lifecycle.get(workId) || null;
    const rowSpans = spans
      .filter(span => String(span?.work_id || '') === workId)
      .map(span => projectSpan(span, domain))
      .filter(Boolean)
      .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at));
    const markers = (life?.history || []).map(event => ({
      state: event.state,
      at: event.at,
      label: formatClockTime(event.at, clockOptions),
      left_pct: projectClockTime(event.at, domain),
      event_id: event.event_id,
      evidence_level: event.evidence_level,
      refs: event.refs
    }));
    const firstObservedAt = rowSpans[0]?.start_at || markers[0]?.at || null;
    const lastObservedAt = markers.at(-1)?.at || rowSpans.at(-1)?.end_at || firstObservedAt;
    return {
      block_id: blockId,
      work_id: workId,
      lane: block?.lane ?? null,
      title: block?.title == null ? '' : String(block.title),
      lifecycle_state: life?.state ?? null,
      lifecycle_at: life?.at ?? null,
      evidence_refs: life?.refs ?? [],
      first_observed_at: firstObservedAt,
      last_observed_at: lastObservedAt,
      first_clock_label: firstObservedAt ? formatClockTime(firstObservedAt, clockOptions) : null,
      last_clock_label: lastObservedAt ? formatClockTime(lastObservedAt, clockOptions) : null,
      spans: rowSpans,
      lifecycle_markers: markers
    };
  });

  const nowMs = asMs(input.nowMs) ?? Date.now();
  return {
    schema: 'prometeo.work-score-real-tiempo-projection/v1',
    time_zone: clockOptions.timeZone,
    locale: clockOptions.locale,
    domain,
    ticks: buildClockTimeTicks(domain, input.tickCount ?? 4, clockOptions),
    now: {
      at: new Date(nowMs).toISOString(),
      label: formatClockTime(nowMs, clockOptions),
      left_pct: projectClockTime(nowMs, domain)
    },
    rows,
    summary: {
      blocks: rows.length,
      lifecycle_observed: rows.filter(row => row.lifecycle_state).length,
      span_observed: rows.filter(row => row.spans.length).length,
      marker_count: rows.reduce((sum, row) => sum + row.lifecycle_markers.length, 0),
      span_count: rows.reduce((sum, row) => sum + row.spans.length, 0)
    }
  };
}
