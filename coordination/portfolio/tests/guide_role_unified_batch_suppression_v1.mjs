#!/usr/bin/env node
import assert from 'node:assert/strict';
import { suppressConcurrentGuideRescate } from '../../../scripts/suppress-concurrent-guide-rescate.mjs';

const claimedPath = 'coordination/guide/pins/guide-rescate-claimed/G000001.json';
const freshPath = 'coordination/guide/pins/guide-integrator-fresh/G000001.json';
const allocator = {
  schema: 'prometeo.fast-allocator/v3',
  counts: { ready: 0, queue_ready: 0, role_ready: 2, recovery: 0 },
  role_ready: [
    { role:'GUIDE_RESCATE', guide_work_id:'guide-rescate-claimed', trigger:'LOW_YIELD', claim_path:claimedPath },
    { role:'GUIDE_INTEGRATOR', guide_work_id:'guide-integrator-fresh', trigger:'RETURNS_UNCONSUMED', claim_path:freshPath }
  ],
  batch_candidates: [
    { lane:'role_ready', role:'GUIDE_RESCATE', guide_work_id:'guide-rescate-claimed', trigger:'LOW_YIELD', claim_path:claimedPath },
    { lane:'role_ready', role:'GUIDE_INTEGRATOR', guide_work_id:'guide-integrator-fresh', trigger:'RETURNS_UNCONSUMED', claim_path:freshPath }
  ]
};
const state = {
  guidePins:[{path:claimedPath,doc:{schema:'prometeo.guide-role-pin/v1',guide_work_id:'guide-rescate-claimed',role:'GUIDE_RESCATE',generation:1,claimed_at:'2026-10-01T23:36:12Z'}}],
  heartbeats:[],
  receipts:[]
};
const next = suppressConcurrentGuideRescate(allocator,state,Date.parse('2026-10-01T23:36:30Z'));
assert.deepEqual(next.role_ready.map(row=>row.claim_path),[freshPath]);
assert.deepEqual(next.batch_candidates.map(row=>row.claim_path),[freshPath]);
assert.equal(next.diagnostics.guide_claim_path_suppression.suppressed_candidates.length,1);
assert.equal(next.diagnostics.guide_claim_path_suppression.batch_suppressed_candidates.length,1);
assert.equal(next.counts.role_ready,1);
console.log('GUIDE_ROLE_UNIFIED_BATCH_SUPPRESSION_PASS');
