import assert from 'node:assert/strict';
import { buildHistoryTabsModel } from '../../../current-tree/control-v11/work-score/history-tabs-model.mjs';

const now = '2026-10-04T16:00:00Z';
const spans = [
  { actor_id: 'w1', actor_kind: 'worker', batch_id: 'B', start_at: '2026-10-04T15:10:00Z', end_at: '2026-10-04T15:40:00Z' },
  { actor_id: 'w2', actor_kind: 'worker', batch_id: 'B', start_at: '2026-10-03T12:00:00Z', end_at: '2026-10-03T13:00:00Z' },
  { actor_id: 'other', actor_kind: 'worker', batch_id: 'OTHER', start_at: '2026-10-04T14:00:00Z', end_at: '2026-10-04T14:10:00Z' }
];

const day = buildHistoryTabsModel(spans, { now, batchId: 'B', actorKind: 'worker' });
assert.equal(day.schema, 'prometeo.work-score-history-tabs/v1');
assert.equal(day.selected, '24H');
assert.equal(day.tabs.length, 2);
assert.equal(day.active.id, '24H');
assert.equal(day.active.series.length, 24);
assert.ok(day.active.series.some(row => row.count > 0));
assert.ok(day.active.series.every(row => row.density >= 0 && row.density <= 1));

const week = buildHistoryTabsModel(spans, { now, selected: '7d', batchId: 'B', actorKind: 'worker' });
assert.equal(week.selected, '7D');
assert.equal(week.active.id, '7D');
assert.equal(week.active.series.length, 7);
assert.equal(week.active.total_count, 2);
assert.equal(week.tabs[0].selected, false);
assert.equal(week.tabs[1].selected, true);

const empty = buildHistoryTabsModel([], { now, selected: 'nonsense' });
assert.equal(empty.selected, '24H');
assert.equal(empty.tabs[1].series.every(row => row.density === 0), true);
console.log('B032_HISTORY_TABS_INTEGRATION_PASS');
