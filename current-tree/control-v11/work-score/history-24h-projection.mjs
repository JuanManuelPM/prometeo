const HOUR_MS = 60 * 60 * 1000;

function timeMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
}

function spanWindow(span) {
  const start = timeMs(span?.start_at);
  if (start === null) return null;
  const end = timeMs(span?.end_at ?? span?.last_activity_at ?? span?.start_at);
  if (end === null) return null;
  return end >= start ? { start, end } : { start: end, end: start };
}

export function projectHistory24h(spans, options = {}) {
  const endMs = timeMs(options.now ?? Date.now());
  if (endMs === null) throw new Error('options.now must be a valid timestamp');
  const hours = Number.isInteger(options.hours) && options.hours > 0 ? options.hours : 24;
  const bucketMs = HOUR_MS;
  const startMs = endMs - hours * bucketMs;
  const rows = Array.from({ length: hours }, (_, index) => ({
    index,
    start_ms: startMs + index * bucketMs,
    end_ms: startMs + (index + 1) * bucketMs,
    span_count: 0,
    overlap_ms_sum: 0,
    worker_ids: new Set()
  }));

  for (const span of Array.isArray(spans) ? spans : []) {
    const window = spanWindow(span);
    if (!window || window.end < startMs || window.start > endMs) continue;
    const actor = String(span?.actor_id || span?.worker_id || '').trim();
    for (const row of rows) {
      const overlapStart = Math.max(window.start, row.start_ms);
      const overlapEnd = Math.min(window.end, row.end_ms);
      if (overlapEnd < overlapStart) continue;
      if (overlapEnd === overlapStart && window.start !== window.end) continue;
      row.span_count += 1;
      row.overlap_ms_sum += Math.max(0, overlapEnd - overlapStart);
      if (actor) row.worker_ids.add(actor);
    }
  }

  return {
    schema: 'prometeo.history-24h-projection/v1',
    window_start_ms: startMs,
    window_end_ms: endMs,
    bucket_ms: bucketMs,
    buckets: rows.map(row => ({
      index: row.index,
      start_ms: row.start_ms,
      end_ms: row.end_ms,
      span_count: row.span_count,
      overlap_ms_sum: row.overlap_ms_sum,
      worker_count: row.worker_ids.size
    }))
  };
}
