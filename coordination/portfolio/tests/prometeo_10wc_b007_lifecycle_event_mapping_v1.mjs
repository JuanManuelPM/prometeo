import assert from 'node:assert/strict';
import {
  WORK_LIFECYCLE_STAGES,
  classifyLifecycleEvent,
  buildWorkLifecycleMap,
  lifecycleStateFor
} from '../../../current-tree/control-v11/work-score/lifecycle-event-mapping.mjs';

assert.deepEqual(WORK_LIFECYCLE_STAGES, [
  'PLANNED', 'LAUNCHED', 'OBSERVED_WORKING', 'RESULT', 'VERIFIED', 'CONSUMED'
]);
assert.equal(classifyLifecycleEvent({ type: 'ACTIVE', at: '2026-10-04T16:00:00Z' }), null);
assert.equal(classifyLifecycleEvent({ type: 'RESULT', at: 'not-a-date' }), null);

const events = [
  { id: 'b007-plan', type: 'PLANNED', work_id: 'portfolio-10wc-pre-run-b007', at: '2026-10-04T16:00:00Z', evidence_level: 'PLAN' },
  { id: 'b007-launch', type: 'LAUNCHED', work_id: 'portfolio-10wc-pre-run-b007', at: '2026-10-04T16:01:00Z' },
  { id: 'b007-work', type: 'OBSERVED_WORKING', work_id: 'portfolio-10wc-pre-run-b007', at: '2026-10-04T16:02:00Z' },
  { id: 'b007-result', type: 'RESULT', work_id: 'portfolio-10wc-pre-run-b007', at: '2026-10-04T16:03:00Z', evidence_level: 'DURABLE_RESULT_REF', refs: ['return.json'] },
  { id: 'b007-late-launch', type: 'LAUNCHED', work_id: 'portfolio-10wc-pre-run-b007', at: '2026-10-04T16:04:00Z' },
  { id: 'b007-verified', type: 'VERIFIED', work_id: 'portfolio-10wc-pre-run-b007', at: '2026-10-04T16:05:00Z', refs: ['verify.json'] },
  { id: 'b007-consumed', type: 'CONSUMED', work_id: 'portfolio-10wc-pre-run-b007', at: '2026-10-04T16:06:00Z', refs: ['consumer.json'] },
  { id: 'other', type: 'RESULT', work_id: 'outside-batch', at: '2026-10-04T16:07:00Z' },
  { id: 'noise', type: 'GUIDE_RECEIPT', work_id: 'portfolio-10wc-pre-run-b007', at: '2026-10-04T16:08:00Z' },
  { id: 'worker-only', type: 'OBSERVED_WORKING', at: '2026-10-04T16:09:00Z' }
];

const map = buildWorkLifecycleMap(events, { workIdPrefix: 'portfolio-10wc-pre-run-' });
assert.equal(map.size, 1);
const b007 = map.get('portfolio-10wc-pre-run-b007');
assert.equal(b007.state, 'CONSUMED');
assert.equal(b007.terminal_material, true);
assert.equal(b007.verified, true);
assert.equal(b007.consumed, true);
assert.equal(b007.history.length, 7);
assert.equal(b007.history[0].state, 'PLANNED');
assert.equal(b007.history.at(-1).state, 'CONSUMED');
assert.equal(lifecycleStateFor(events, 'portfolio-10wc-pre-run-b007'), 'CONSUMED');

const noRegression = buildWorkLifecycleMap([
  { type: 'RESULT', work_id: 'B', at: '2026-10-04T16:10:00Z' },
  { type: 'OBSERVED_WORKING', work_id: 'B', at: '2026-10-04T16:11:00Z' }
]).get('B');
assert.equal(noRegression.state, 'RESULT');
assert.equal(noRegression.at, '2026-10-04T16:10:00.000Z');

console.log('PASS B007 lifecycle event mapping');
