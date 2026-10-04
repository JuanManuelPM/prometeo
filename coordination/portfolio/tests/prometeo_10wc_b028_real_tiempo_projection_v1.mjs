import assert from 'node:assert/strict';
import { buildRealTiempoProjection } from '../../../current-tree/control-v11/work-score/real-tiempo-projection.mjs';

const blocks = [
  { block_id: 'B006', lane: 'TIMELINE', title: 'clock geometry' },
  { block_id: 'B007', lane: 'TIMELINE', title: 'lifecycle mapping' },
  { block_id: 'B028', lane: 'TIMELINE', title: 'real TIEMPO projection' }
];
const events = [
  { id: 'e1', work_id: 'portfolio-10wc-pre-run-b006', type: 'LAUNCHED', at: '2026-10-04T16:00:00Z', refs: ['launch-6'] },
  { id: 'e2', work_id: 'portfolio-10wc-pre-run-b006', type: 'RESULT', at: '2026-10-04T16:10:00Z', refs: ['return-6'] },
  { id: 'e3', work_id: 'portfolio-10wc-pre-run-b006', type: 'VERIFIED', at: '2026-10-04T16:11:00Z', refs: ['verify-6'] },
  { id: 'e4', work_id: 'portfolio-10wc-pre-run-b006', type: 'LAUNCHED', at: '2026-10-04T16:12:00Z', refs: ['stale-low-rank'] },
  { id: 'e5', work_id: 'portfolio-10wc-pre-run-b007', type: 'OBSERVED_WORKING', at: '2026-10-04T16:05:00Z', refs: ['work-7'] }
];
const spans = [
  { work_id: 'portfolio-10wc-pre-run-b006', actor_id: 'wc-6', status: 'RESULT', start_at: '2026-10-04T16:00:00Z', end_at: '2026-10-04T16:10:00Z' },
  { work_id: 'portfolio-10wc-pre-run-b007', actor_id: 'wc-7', status: 'OBSERVED_WORKING', start_at: '2026-10-04T16:02:00Z', last_activity_at: '2026-10-04T16:08:00Z' },
  { work_id: 'unrelated', actor_id: 'other', start_at: '2020-01-01T00:00:00Z', end_at: '2020-01-01T00:01:00Z' }
];

const out = buildRealTiempoProjection({
  blocks,
  events,
  spans,
  nowMs: '2026-10-04T16:15:00Z',
  timeZone: 'America/Argentina/Buenos_Aires',
  tickCount: 4
});

assert.equal(out.schema, 'prometeo.work-score-real-tiempo-projection/v1');
assert.equal(out.domain.source, 'REAL_OBSERVED_CLOCK');
assert.equal(out.time_zone, 'America/Argentina/Buenos_Aires');
assert.equal(out.ticks[0].label, '13:00');
assert.equal(out.now.label, '13:15');
assert.equal(out.now.left_pct, 100);

const byId = Object.fromEntries(out.rows.map(row => [row.block_id, row]));
assert.equal(byId.B006.lifecycle_state, 'VERIFIED');
assert.deepEqual(byId.B006.evidence_refs, ['verify-6']);
assert.equal(byId.B006.spans.length, 1);
assert.equal(byId.B006.first_clock_label, '13:00');
assert.equal(byId.B006.last_clock_label, '13:12');
assert.deepEqual(byId.B006.lifecycle_markers.map(x => x.state), ['LAUNCHED', 'RESULT', 'VERIFIED', 'LAUNCHED']);
assert.ok(byId.B006.spans[0].width_pct > 0);
assert.equal(byId.B007.lifecycle_state, 'OBSERVED_WORKING');
assert.equal(byId.B028.lifecycle_state, null);
assert.equal(out.summary.lifecycle_observed, 2);
assert.equal(out.summary.span_observed, 2);
assert.equal(out.summary.marker_count, 5);
assert.equal(out.summary.span_count, 2);

console.log('B028_REAL_TIEMPO_PROJECTION_PASS');
