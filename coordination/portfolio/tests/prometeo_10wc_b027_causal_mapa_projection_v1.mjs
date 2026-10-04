import assert from 'node:assert/strict';
import { buildCausalMapaProjection } from '../../../current-tree/control-v11/work-score/causal-mapa-projection.mjs';

const blocks = [
  { block_id: 'B005', lane: 'TIMELINE', depth: 0, title: 'geometry', dependencies: [] },
  { block_id: 'B007', lane: 'TIMELINE', depth: 0, title: 'lifecycle', dependencies: [] },
  { block_id: 'B027', lane: 'TIMELINE', depth: 1, title: 'mapa', dependencies: ['B005', 'B007'] }
];
const events = [
  { id: 'e1', work_id: 'portfolio-10wc-pre-run-b005', type: 'RESULT', at: '2026-10-04T16:10:00Z', refs: ['r5'] },
  { id: 'e2', work_id: 'portfolio-10wc-pre-run-b005', type: 'VERIFIED', at: '2026-10-04T16:11:00Z', refs: ['v5'] },
  { id: 'e3', work_id: 'portfolio-10wc-pre-run-b007', type: 'OBSERVED_WORKING', at: '2026-10-04T16:12:00Z', refs: ['w7'] },
  { id: 'e4', work_id: 'portfolio-10wc-pre-run-b007', type: 'LAUNCHED', at: '2026-10-04T16:13:00Z', refs: ['stale-low-rank'] }
];
const spans = [
  { work_id: 'portfolio-10wc-pre-run-b005', start_at: '2026-10-04T16:05:00Z', end_at: '2026-10-04T16:11:00Z' },
  { work_id: 'portfolio-10wc-pre-run-b007', start_at: '2026-10-04T16:06:00Z', last_activity_at: '2026-10-04T16:12:00Z' },
  { work_id: 'unrelated', start_at: '2020-01-01T00:00:00Z', end_at: '2020-01-01T00:01:00Z' }
];

const out = buildCausalMapaProjection({ blocks, events, spans, nowMs: '2026-10-04T16:15:00Z', tickCount: 3 });
assert.equal(out.schema, 'prometeo.work-score-causal-mapa-projection/v1');
assert.equal(out.domain.source, 'RUN_OBSERVED');
assert.equal(out.domain.observedSpanCount, 2);
assert.equal(out.edges.length, 2);
assert.deepEqual(out.edges.map(edge => `${edge.from}>${edge.to}`).sort(), ['B005>B027', 'B007>B027']);

const byId = Object.fromEntries(out.nodes.map(node => [node.block_id, node]));
assert.equal(byId.B005.lifecycle_state, 'VERIFIED');
assert.deepEqual(byId.B005.evidence_refs, ['v5']);
assert.equal(byId.B007.lifecycle_state, 'OBSERVED_WORKING');
assert.deepEqual(byId.B005.successors, ['B027']);
assert.deepEqual(byId.B027.dependencies, ['B005', 'B007']);
assert.equal(byId.B027.lifecycle_state, null);
assert.ok(byId.B005.run_left_pct >= 0 && byId.B005.run_left_pct <= 100);
assert.equal(byId.B027.run_left_pct, null);
assert.equal(out.ticks.length, 3);
assert.equal(out.summary.blocks, 3);
assert.equal(out.summary.lifecycle_observed, 2);
assert.equal(out.summary.time_observed, 2);
console.log('B027_CAUSAL_MAPA_PROJECTION_PASS');
