import assert from 'node:assert/strict';
import {
  fanInReturns,
  judgeCampaign,
  closeCampaign,
  reduceLateReturn
} from '../../../scripts/return-fanin-judge-closer-lib.mjs';

const campaign = 'C-1';
const base = {
  campaign_id: campaign,
  project_id: 'prometeo-autonomous-growth',
  worker_id: 'w1',
  returned_at: '2026-10-02T19:00:00Z'
};
const a = {...base, return_id:'R-A', job_id:'lane-a', lane:'lane-a', generation:1, outcome:'DONE'};
const b = {...base, return_id:'R-B', job_id:'lane-b', lane:'lane-b', generation:1, outcome:'DONE'};

const fanin = fanInReturns([a, a, b]);
assert.equal(fanin.unique_return_count, 2, 'duplicate/replay must be idempotent');

const incomplete = judgeCampaign({campaign_id:campaign, required_lanes:['lane-a','lane-b'], returns:[a]});
assert.equal(incomplete.status, 'INCOMPLETE');
assert.deepEqual(incomplete.missing_lanes, ['lane-b']);
const continueClose = closeCampaign({verdict:incomplete});
assert.equal(continueClose.status, 'CONTINUE');
assert.deepEqual(continueClose.continuity_request, ['lane-b']);

const validVerdict = judgeCampaign({campaign_id:campaign, required_lanes:['lane-a','lane-b'], returns:[a,b]});
assert.equal(validVerdict.status, 'PASS');
const validClose = closeCampaign({verdict:validVerdict});
assert.equal(validClose.status, 'CLOSED');
assert.equal(validClose.basis, 'VERDICT_PASS');

const boundaryClose = closeCampaign({verdict:incomplete, durable_boundary:{code:'REAL_BOUNDARY',ref:'coordination/boundaries/C-1.json'}});
assert.equal(boundaryClose.status, 'CLOSED');
assert.equal(boundaryClose.basis, 'DURABLE_BOUNDARY');

const stale = {...a, return_id:'R-LATE', generation:0, returned_at:'2026-10-02T18:00:00Z', outcome:'FAIL'};
const late = reduceLateReturn({prior_close:validClose, incoming_return:stale});
assert.equal(late.ignored, true);
assert.equal(late.close.status, 'CLOSED');

const partial = {...b, return_id:'R-B2', outcome:'SAFE_PARTIAL_WITH_EVIDENCE', returned_at:'2026-10-02T19:01:00Z'};
const partialVerdict = judgeCampaign({campaign_id:campaign, required_lanes:['lane-a','lane-b'], returns:[a,partial]});
assert.equal(partialVerdict.status, 'INCOMPLETE');
assert.deepEqual(partialVerdict.failed_or_partial_lanes, ['lane-b']);

console.log('RETURN_FANIN_JUDGE_CLOSER_V1_PASS');
