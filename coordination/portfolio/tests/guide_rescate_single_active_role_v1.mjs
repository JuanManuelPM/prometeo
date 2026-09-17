import assert from 'node:assert/strict';
import { suppressConcurrentGuideRescate } from '../../../scripts/suppress-concurrent-guide-rescate.mjs';

const now = Date.parse('2026-09-17T21:32:00Z');
const allocator = {
  schema: 'prometeo.fast-allocator/v3',
  counts: { ready: 0, queue_ready: 0, role_ready: 2, recovery: 4 },
  role_ready: [
    { role: 'GUIDE_RESCATE', guide_work_id: 'guide-rescate-new-fingerprint', fingerprint: 'newfingerprint', trigger: 'LOW_YIELD' },
    { role: 'GUIDE_CRITIC', guide_work_id: 'guide-critic-independent', fingerprint: 'critic', trigger: 'PARTIAL_LOOP' }
  ],
  diagnostics: { existing: true }
};

const activeState = {
  guidePins: [{
    path: 'coordination/guide/pins/guide-rescate-old-fingerprint/G000001.json',
    doc: {
      schema: 'prometeo.guide-role-pin/v1',
      guide_work_id: 'guide-rescate-old-fingerprint',
      role: 'GUIDE_RESCATE',
      generation: 1,
      worker_id: 'worker-a',
      claimed_at: '2026-09-17T21:27:30Z'
    }
  }],
  heartbeats: [{
    path: 'coordination/workers/heartbeats/worker-a/20260917T213100Z.json',
    doc: { worker_id: 'worker-a', heartbeat_at: '2026-09-17T21:31:00Z' }
  }],
  receipts: []
};

const suppressed = suppressConcurrentGuideRescate(allocator, activeState, now);
assert.equal(suppressed.role_ready.length, 1);
assert.equal(suppressed.role_ready[0].role, 'GUIDE_CRITIC');
assert.equal(suppressed.counts.role_ready, 1);
assert.equal(suppressed.diagnostics.existing, true);
assert.equal(suppressed.diagnostics.guide_rescate_active_suppression.active_pins.length, 1);
assert.equal(suppressed.diagnostics.guide_rescate_active_suppression.suppressed_candidates[0].guide_work_id, 'guide-rescate-new-fingerprint');

const terminalState = {
  ...activeState,
  receipts: [{
    path: 'coordination/guide/receipts/guide-rescate-old-fingerprint/receipt.json',
    doc: { guide_work_id: 'guide-rescate-old-fingerprint', role: 'GUIDE_RESCATE', created_at: '2026-09-17T21:31:30Z' }
  }]
};
const afterReceipt = suppressConcurrentGuideRescate(allocator, terminalState, now);
assert.equal(afterReceipt.role_ready.length, 2);
assert.equal(afterReceipt.counts.role_ready, 2);

const staleState = {
  guidePins: [{
    path: 'coordination/guide/pins/guide-rescate-stale/G000001.json',
    doc: { guide_work_id: 'guide-rescate-stale', role: 'GUIDE_RESCATE', generation: 1, worker_id: 'worker-old', claimed_at: '2026-09-17T21:00:00Z' }
  }],
  heartbeats: [],
  receipts: []
};
const afterStale = suppressConcurrentGuideRescate(allocator, staleState, now);
assert.equal(afterStale.role_ready.length, 2);

console.log('GUIDE_RESCATE_SINGLE_ACTIVE_ROLE_PASS');
