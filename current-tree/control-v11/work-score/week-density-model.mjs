const arr = value => Array.isArray(value) ? value : [];
const time = value => {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
};

function localDayStart(timestamp) {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function buildWeekDensityProjection(spans = [], options = {}) {
  const now = time(options.now) ?? Number(options.now) ?? Date.now();
  if (!Number.isFinite(now)) throw new Error('INVALID_NOW');
  const days = Math.max(1, Math.min(31, Math.trunc(Number(options.days ?? 7)) || 7));
  const actorKind = options.actorKind == null ? null : String(options.actorKind);
  const batchId = options.batchId == null ? null : String(options.batchId);
  const day0 = localDayStart(now);
  const validSpans = arr(spans).flatMap(span => {
    if (actorKind && String(span?.actor_kind || '') !== actorKind) return [];
    if (batchId && String(span?.batch_id || '') !== batchId) return [];
    const start = time(span?.start_at);
    const end = time(span?.end_at || span?.last_activity_at || span?.start_at);
    if (start == null || end == null) return [];
    return [{start: Math.min(start, end), end: Math.max(start, end)}];
  });

  const rows = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const start = new Date(day0);
    start.setDate(start.getDate() - offset);
    const dayStart = start.getTime();
    const next = new Date(dayStart);
    next.setDate(next.getDate() + 1);
    const dayEnd = next.getTime();
    const count = validSpans.reduce((sum, span) => sum + (span.end >= dayStart && span.start < dayEnd ? 1 : 0), 0);
    rows.push({
      day_start: new Date(dayStart).toISOString(),
      weekday: new Date(dayStart).toLocaleDateString(options.locale || 'es-AR', {weekday: 'short'}),
      count
    });
  }
  const maxCount = Math.max(1, ...rows.map(row => row.count));
  return {
    schema: 'prometeo.week-density-projection/v1',
    generated_for: new Date(now).toISOString(),
    days,
    max_count: Math.max(0, ...rows.map(row => row.count)),
    rows: rows.map(row => ({...row, density: row.count / maxCount}))
  };
}
