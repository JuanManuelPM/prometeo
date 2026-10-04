#!/usr/bin/env node
import assert from 'node:assert/strict';
import { countFreshAvailableWorkers } from '../../../current-tree/control-v11/work-score/capacity-projection-semantics.mjs';
import { deriveFreshWcEvidenceCounter } from '../../../current-tree/control-v11/work-score/fresh-wc-evidence-counter.mjs';

const batchId = 'PROMETEO-10WC-PRE-RUN-V1';
const nowMs = Date.parse('2026-10-04T16:35:00Z');
const spans = [
  { actor_kind:'worker', actor_id:'wc-1', batch_id:batchId, status:'LAUNCHED', last_activity_at:'2026-10-04T16:34:00Z' },
  { actor_kind:'worker', actor_id:'wc-1', batch_id:batchId, status:'OBSERVED_WORKING', last_activity_at:'2026-10-04T16:34:30Z' },
  { actor_kind:'worker', actor_id:'wc-2', batch_id:batchId, status:'OBSERVED_WORKING', last_activity_at:'2026-10-04T16:21:00Z' },
  { actor_kind:'worker', actor_id:'wc-active', batch_id:batchId, status:'ACTIVE', last_activity_at:'2026-10-04T16:34:00Z' },
  { actor_kind:'worker', actor_id:'wc-parked', batch_id:batchId, status:'PARKED', last_activity_at:'2026-10-04T16:34:00Z' },
  { actor_kind:'worker', actor_id:'wc-stale', batch_id:batchId, status:'OBSERVED_WORKING', last_activity_at:'2026-10-04T16:00:00Z' },
  { actor_kind:'worker', actor_id:'wc-other', batch_id:'OTHER', status:'OBSERVED_WORKING', last_activity_at:'2026-10-04T16:34:00Z' },
  { actor_kind:'worker', actor_id:'wc-future', batch_id:batchId, status:'OBSERVED_WORKING', last_activity_at:'2026-10-04T16:40:00Z' },
  { actor_kind:'guide', actor_id:'guide-1', batch_id:batchId, status:'OBSERVED_WORKING', last_activity_at:'2026-10-04T16:34:00Z' },
  { actor_kind:'worker', actor_id:'', batch_id:batchId, status:'LAUNCHED', last_activity_at:'2026-10-04T16:34:00Z' }
];

const before = JSON.stringify(spans);
const got = deriveFreshWcEvidenceCounter(spans, { batchId, nowMs, freshnessMs: 15 * 60 * 1000 });
assert.equal(got.fresh_available_wc, 2);
assert.deepEqual(got.fresh_worker_ids, ['wc-1', 'wc-2']);
assert.equal(got.accepted_evidence_rows, 3);
assert.equal(got.duplicate_evidence_rows, 1);
assert.equal(got.authority, 'DERIVED_PROJECTION_ONLY');
assert.match(got.evidence_rule, /ACTIVE\/PARKED/);
assert.equal(
  got.fresh_available_wc,
  countFreshAvailableWorkers(spans, { batchId, nowMs, freshnessMs: 15 * 60 * 1000 })
);
assert.equal(JSON.stringify(spans), before, 'counter must not mutate durable evidence input');

console.log('B038_FRESH_WC_EVIDENCE_COUNTER_PASS');
