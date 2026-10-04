import assert from 'node:assert/strict';
import {
  aggregateRequiredSourceFreshness,
  classifyWorkerEvidence,
  validateScoreboardGenerationBinding
} from '../../../current-tree/control-v11/work-score/freshness-model.mjs';

const now = '2026-10-04T16:30:00Z';

let aggregate = aggregateRequiredSourceFreshness({
  timeline:{generated_at:'2026-10-04T16:29:55Z'},
  frontier:{generated_at:'2026-10-04T16:28:30Z'},
  allocator:{generated_at:'2026-10-04T16:29:56Z'}
}, {now, staleAfterMs:30000, required:['timeline','frontier','allocator']});
assert.equal(aggregate.status, 'STALE', 'one fresh source must not mask a stale required source');
assert.equal(aggregate.per_source.timeline.status, 'FRESH');
assert.equal(aggregate.per_source.frontier.status, 'STALE');
assert.equal(aggregate.stalest_age_ms, 90000);

aggregate = aggregateRequiredSourceFreshness({
  timeline:{generated_at:'2026-10-04T16:29:58Z'},
  frontier:{generated_at:'2026-10-04T16:29:59Z',fetch_error:'HTTP_503'},
  allocator:{generated_at:'2026-10-04T16:29:57Z'}
}, {now, staleAfterMs:30000, required:['timeline','frontier','allocator']});
assert.equal(aggregate.status, 'LAST_GOOD_ERROR', 'failed refresh must retain age but never look fresh');
assert.equal(aggregate.per_source.frontier.status, 'LAST_GOOD_ERROR');
assert.equal(aggregate.per_source.frontier.fetch_error, 'HTTP_503');

aggregate = aggregateRequiredSourceFreshness({timeline:{generated_at:'2026-10-04T16:29:58Z'}}, {
  now, staleAfterMs:30000, required:['timeline','frontier']
});
assert.equal(aggregate.status, 'MISSING');
assert.equal(aggregate.per_source.frontier.status, 'MISSING');

const scoreboard = {schema:'prometeo.worker-scoreboard/v1',generated_at:'2026-10-04T16:29:50Z'};
const sidecar = {
  schema:'prometeo.worker-scoreboard-generation-freshness/v1',
  status:'SOURCE_BOUND',
  scoreboard_generated_at:'2026-10-04T16:29:50Z',
  source_sha:'68caeee1d4d786ca7b86e6c4f64d16fb2f2394ff'
};
assert.equal(validateScoreboardGenerationBinding(scoreboard, sidecar).status, 'SOURCE_BOUND');
assert.equal(validateScoreboardGenerationBinding(scoreboard, {...sidecar,scoreboard_generated_at:'2026-10-04T16:29:49Z'}).status, 'UNBOUND');

assert.equal(classifyWorkerEvidence('2026-10-04T16:24:01Z',{now}).status, 'FRESH_ACTIVE');
assert.equal(classifyWorkerEvidence('2026-10-04T16:24:00Z',{now}).status, 'STALE_SUSPECT');
assert.equal(classifyWorkerEvidence('2026-10-04T16:20:00Z',{now}).status, 'REPLACEABLE');
assert.equal(classifyWorkerEvidence('2026-10-04T16:24:00Z',{now}).contributes_live_capacity, false);

console.log('freshness-regression: PASS');
