import assert from 'node:assert/strict';
import { projectHistory24h } from '../../../current-tree/control-v11/work-score/history-24h-projection.mjs';

const H = 60 * 60 * 1000;
const now = Date.parse('2026-10-04T16:00:00Z');
const iso = ms => new Date(ms).toISOString();

const spans = [
  { actor_id: 'wc-a', start_at: iso(now - 90 * 60 * 1000), end_at: iso(now - 30 * 60 * 1000) },
  { actor_id: 'wc-b', start_at: iso(now - 20 * 60 * 1000), last_activity_at: iso(now - 5 * 60 * 1000) },
  { actor_id: 'wc-old', start_at: iso(now - 30 * H), end_at: iso(now - 29 * H) },
  { actor_id: 'wc-bad', start_at: 'not-a-date', end_at: iso(now) }
];

const out = projectHistory24h(spans, { now });
assert.equal(out.schema, 'prometeo.history-24h-projection/v1');
assert.equal(out.buckets.length, 24);
assert.equal(out.window_end_ms - out.window_start_ms, 24 * H);
assert.equal(out.buckets.at(-1).span_count, 2);
assert.equal(out.buckets.at(-1).worker_count, 2);
assert.equal(out.buckets.at(-2).span_count, 1);
assert.equal(out.buckets.reduce((n, b) => n + b.span_count, 0), 3);
assert.equal(out.buckets.reduce((n, b) => n + b.overlap_ms_sum, 0), 75 * 60 * 1000);
assert.equal(projectHistory24h([], { now }).buckets.every(b => b.span_count === 0), true);
assert.throws(() => projectHistory24h([], { now: 'bad-time' }), /valid timestamp/);

console.log('PASS B013 24h history projection');
