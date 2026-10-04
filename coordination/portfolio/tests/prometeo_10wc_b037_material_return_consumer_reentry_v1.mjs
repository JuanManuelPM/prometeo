import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  resolveMaterialReturnConsumerReentry,
  executeMaterialReturnConsumerReentry
} from '../../../scripts/material-return-consumer-reentry.mjs';

const terminal = resolveMaterialReturnConsumerReentry({ close: { status: 'CLOSED' } });
assert.equal(terminal.decision, 'NO_REENTRY_TERMINAL');

const allocator = resolveMaterialReturnConsumerReentry({
  close: { status: 'CONTINUE', continuity_request: ['lane-b'] },
  allocator_candidates: [{
    job_id: 'lane-b',
    claim_mode: 'PORTFOLIO_PIN_CREATE',
    claim_path: 'coordination/portfolio/pins/lane-b/G000001.json',
    source_path: 'coordination/portfolio/derived/p/lane-b.json',
    required_capabilities: ['repository_test_runtime']
  }]
});
assert.equal(allocator.decision, 'REENTER_EXISTING_ALLOCATOR');
assert.equal(allocator.allocator_matches[0].job_id, 'lane-b');
assert.equal(allocator.allocator_matches[0].claim_mode, 'PORTFOLIO_PIN_CREATE');
assert.equal(allocator.boundary, null);

const boundary = resolveMaterialReturnConsumerReentry({
  close: { status: 'CONTINUE', continuity_request: ['missing-lane'] },
  allocator_candidates: []
});
assert.equal(boundary.decision, 'DURABLE_BOUNDARY_REQUIRED');
assert.equal(boundary.boundary.code, 'CONTINUITY_REQUEST_UNRESOLVED');

const claimRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'prometeo-b037-'));
const current = {
  opportunity_id: 'old-work',
  project_id: 'p',
  continuation_context: 'p::campaign',
  authority_class: 'SCOPED_CANDIDATE_ONLY'
};
const successor = {
  opportunity_id: 'lane-c',
  project_id: 'p',
  continuation_context: 'p::campaign',
  authority_class: 'SCOPED_CANDIDATE_ONLY',
  status: 'READY',
  readiness_proof_refs: ['return:material'],
  write_scope: ['scripts/']
};
const claimed = await executeMaterialReturnConsumerReentry({
  close: { status: 'CONTINUE', continuity_request: ['lane-c'] },
  successor_opportunities: [successor],
  current,
  claims: [],
  worker: { worker_instance_id: 'wc-test', role: 'EXECUTE' },
  claim_root: claimRoot,
  now: '2026-10-04T16:38:00Z',
  source: { source_head_observed: 'abc123' }
});
assert.equal(claimed.decision, 'SUCCESSOR_CLAIMS_WON');
assert.equal(claimed.claim_receipts.length, 1);
assert.equal(claimed.claim_receipts[0].won, true);
assert.equal(claimed.claim_receipts[0].claim.authority, 'SCOPED_CANDIDATE_ONLY_NO_GLOBAL_PROMOTION');
assert.ok(fs.existsSync(path.join(claimRoot, 'lane-c.json')));

console.log('B037_MATERIAL_RETURN_CONSUMER_REENTRY_PASS');
