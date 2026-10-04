import { projectHistory24h } from './history-24h-projection.mjs';
import { buildWeekDensityProjection } from './week-density-model.mjs';

const VALID_TABS = new Set(['24H', '7D']);

function normalize24h(projection) {
  const maxCount = Math.max(1, ...projection.buckets.map(row => row.span_count));
  return projection.buckets.map(row => ({
    key: new Date(row.start_ms).toISOString(),
    label: new Date(row.start_ms).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    count: row.span_count,
    worker_count: row.worker_count,
    overlap_ms_sum: row.overlap_ms_sum,
    density: row.span_count / maxCount
  }));
}

export function buildHistoryTabsModel(spans = [], options = {}) {
  const selected = VALID_TABS.has(String(options.selected || '').toUpperCase())
    ? String(options.selected).toUpperCase()
    : '24H';
  const now = options.now ?? Date.now();
  const day = projectHistory24h(spans, { now, hours: 24 });
  const week = buildWeekDensityProjection(spans, {
    now,
    days: 7,
    actorKind: options.actorKind,
    batchId: options.batchId,
    locale: options.locale || 'es-AR'
  });
  const tabs = [
    {
      id: '24H',
      label: '24 h',
      selected: selected === '24H',
      series: normalize24h(day),
      total_count: day.buckets.reduce((sum, row) => sum + row.span_count, 0)
    },
    {
      id: '7D',
      label: '7 días',
      selected: selected === '7D',
      series: week.rows.map(row => ({ key: row.day_start, label: row.weekday, count: row.count, density: row.density })),
      total_count: week.rows.reduce((sum, row) => sum + row.count, 0)
    }
  ];
  return {
    schema: 'prometeo.work-score-history-tabs/v1',
    selected,
    tabs,
    active: tabs.find(tab => tab.id === selected),
    sources: { day: day.schema, week: week.schema }
  };
}
