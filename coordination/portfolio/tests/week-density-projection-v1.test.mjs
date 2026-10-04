import assert from 'node:assert/strict';
import { buildWeekDensityProjection } from '../../../current-tree/control-v11/work-score/week-density-model.mjs';

const now = '2026-10-04T12:00:00Z';
const spans = [
  {actor_kind:'worker',batch_id:'B',start_at:'2026-10-04T10:00:00Z',end_at:'2026-10-04T10:30:00Z'},
  {actor_kind:'worker',batch_id:'B',start_at:'2026-10-03T23:50:00Z',end_at:'2026-10-04T00:10:00Z'},
  {actor_kind:'worker',batch_id:'B',start_at:'2026-10-02T10:00:00Z',last_activity_at:'2026-10-02T10:05:00Z'},
  {actor_kind:'service',batch_id:'B',start_at:'2026-10-04T11:00:00Z',end_at:'2026-10-04T11:05:00Z'},
  {actor_kind:'worker',batch_id:'OTHER',start_at:'2026-10-04T11:00:00Z',end_at:'2026-10-04T11:05:00Z'},
  {actor_kind:'worker',batch_id:'B',start_at:'not-a-date',end_at:'2026-10-04T11:05:00Z'}
];

const model = buildWeekDensityProjection(spans, {now, days:3, actorKind:'worker', batchId:'B', locale:'es-AR'});
assert.equal(model.schema, 'prometeo.week-density-projection/v1');
assert.equal(model.days, 3);
assert.deepEqual(model.rows.map(row => row.count), [1,1,2]);
assert.equal(model.max_count, 2);
assert.deepEqual(model.rows.map(row => row.density), [0.5,0.5,1]);
assert.equal(model.rows.at(-1).day_start, '2026-10-04T00:00:00.000Z');

const empty = buildWeekDensityProjection([], {now, days:2});
assert.equal(empty.max_count, 0);
assert.deepEqual(empty.rows.map(row => row.density), [0,0]);

console.log('week-density-projection: PASS');
