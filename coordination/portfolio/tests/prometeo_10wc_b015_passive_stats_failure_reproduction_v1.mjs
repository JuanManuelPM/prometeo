import assert from 'node:assert/strict';
import { compilePassiveOperationalStats } from '../../../scripts/build-passive-operational-stats.mjs';

const projection = compilePassiveOperationalStats({
  campaign: {
    campaign_id: 'PROMETEO-10WC-PRE-RUN-V1',
    root_objective: 'reproduce passive stats liveness ordering failure',
    source_ref: 'fixture:campaign'
  },
  records: [
    {
      type: 'STARTED',
      job_id: 'portfolio-10wc-pre-run-b015-fixture',
      worker_id: 'wc-fixture',
      started_at: '2026-10-04T16:00:00Z',
      source_ref: 'fixture:started'
    },
    {
      type: 'HEARTBEAT',
      job_id: 'portfolio-10wc-pre-run-b015-fixture',
      worker_id: 'wc-fixture',
      at: '2026-10-04T16:01:00Z',
      source_ref: 'fixture:heartbeat'
    },
    {
      type: 'RETURN',
      job_id: 'portfolio-10wc-pre-run-b015-fixture',
      worker_id: 'wc-fixture',
      returned_at: '2026-10-04T16:02:00Z',
      source_ref: 'fixture:return'
    }
  ]
});

const unit = projection.units[0];
assert.equal(unit.facts.returned_at.value, '2026-10-04T16:02:00.000Z');
assert.equal(unit.facts.liveness.value, 'STARTED');
assert.deepEqual(unit.facts.liveness.source_refs, ['fixture:started']);
assert.notEqual(unit.facts.liveness.value, 'RETURN');

console.log('REPRODUCED B015: passive liveness selects earliest STARTED instead of latest RETURN');
