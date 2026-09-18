#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const { compileRoleFrontier } = await import(pathToFileURL(path.join(root, 'scripts/build-fast-allocator.mjs')).href);

const baseline = JSON.parse(fs.readFileSync(path.join(root, 'coordination/efficiency/RATCHET_BASELINE_V1.json'),'utf8'));
const ratchet = baseline.items.find(x => x.id === 'EFF016B');
assert.ok(ratchet, 'EFF016B must remain in the durable efficiency baseline');
assert.equal(ratchet.required.explicit_transport_blocked_excluded_from_rescue_trigger, true);
assert.equal(ratchet.required.explicit_transport_blocked_excluded_from_rescue_evidence, true);
assert.equal(ratchet.required.total_recent_no_allocation_telemetry_preserved, true);
assert.equal(ratchet.required.regression_test, 'coordination/portfolio/tests/guide_rescate_no_allocation_signal_v1.mjs');

const workflow = fs.readFileSync(path.join(root, '.github/workflows/eff016b-guide-rescate-transport-debt.yml'),'utf8');
assert.match(workflow, /guide_rescate_no_allocation_signal_v1\.mjs/);
assert.match(workflow, /pull_request:/);

const nowIso = new Date().toISOString();
const metabolism = {signals:{
  recent_launch_window_minutes:10,
  frontier_floor_absolute:8,
  frontier_per_recent_launch:1.5,
  frontier_ceiling:40,
  unconsumed_returns_trigger:3,
  replaceable_trigger:3,
  partial_loop_trigger:2,
  collision_pressure_trigger:3,
  young_active_pin_guard_minimum:4,
  young_active_pin_guard_fraction_of_recent_launches:0.5,
  young_active_pin_guard_age_minutes:3,
  collision_pressure_window_minutes:30
}};
const baseContext = {metabolism,guideReceipts:[],guidePins:[],heartbeats:[],beacons:[],noAlloc:[],projectGuideMesh:null,projectGuideStates:[],portfolio:null};
const blocked = n => Array.from({length:n}, (_,i) => ({
  path:`coordination/workers/no-allocation/blocked-${i+1}.json`,
  doc:{schema:'prometeo.worker-no-allocation/v1',observed_at:nowIso,reason:'CLAIM_TRANSPORT_BLOCKED',outcome:'CLAIM_TRANSPORT_BLOCKED'}
}));
const raced = n => Array.from({length:n}, (_,i) => ({
  path:`coordination/workers/no-allocation/race-${i+1}.json`,
  doc:{schema:'prometeo.worker-no-allocation/v1',observed_at:nowIso,reason:'CLAIM_RACE_EXHAUSTED'}
}));
const feed = {generated_at:nowIso, source_sha:'fixture', workers:[]};

let out = compileRoleFrontier(feed, {status:'HEALTHY'}, [], [], [], [], {...baseContext,noAlloc:blocked(3)});
assert.equal(out.role_ready.some(row => row.role === 'GUIDE_RESCATE'), false, 'explicit transport denials alone must not self-materialize GUIDE_RESCATE');
assert.equal(out.metabolism.recent_no_allocation, 3, 'transport denials stay observable in total telemetry');
assert.equal(out.metabolism.rescue_eligible_recent_no_allocation, 0);
assert.equal(out.metabolism.explicit_transport_blocked_recent_no_allocation, 3);

out = compileRoleFrontier(feed, {status:'HEALTHY'}, [], [], [], [], {...baseContext,noAlloc:raced(3)});
assert.ok(out.role_ready.some(row => row.role === 'GUIDE_RESCATE'), 'three actionable no-allocation races must still trigger GUIDE_RESCATE');
assert.equal(out.metabolism.rescue_eligible_recent_no_allocation, 3);
assert.equal(out.metabolism.explicit_transport_blocked_recent_no_allocation, 0);

const mixedNoAlloc = [...blocked(2), ...raced(1)];
const recovery = [
  {job_id:'recovery-a',predecessor_pin_ref:'coordination/portfolio/pins/recovery-a/G000001.json',required_capabilities:[]},
  {job_id:'recovery-b',predecessor_pin_ref:'coordination/portfolio/pins/recovery-b/G000001.json',required_capabilities:[]},
  {job_id:'recovery-c',predecessor_pin_ref:'coordination/portfolio/pins/recovery-c/G000001.json',required_capabilities:[]}
];
out = compileRoleFrontier(feed, {status:'HEALTHY'}, [], [], [], recovery, {...baseContext,noAlloc:mixedNoAlloc});
const rescue = out.role_ready.find(row => row.role === 'GUIDE_RESCATE');
assert.ok(rescue, 'independent generic recovery pressure must still trigger GUIDE_RESCATE');
const evidence = rescue.claim_payload_shape?.evidence || rescue.evidence || [];
assert.ok(evidence.includes('coordination/workers/no-allocation/race-1.json'), 'actionable no-allocation stays in rescue evidence');
assert.ok(!evidence.some(ref => ref.includes('/blocked-')), 'explicit transport denials must not enter rescue repair evidence');
assert.equal(out.metabolism.recent_no_allocation, 3);
assert.equal(out.metabolism.rescue_eligible_recent_no_allocation, 1);
assert.equal(out.metabolism.explicit_transport_blocked_recent_no_allocation, 2);

const efficiencyRegression = {
  status:'REGRESSION',
  no_allocation_causes:{
    recent_total:3,
    recent_receipts:[
      {reason:'CLAIM_TRANSPORT_BLOCKED',ref:'coordination/workers/no-allocation/blocked-efficiency.json'},
      {reason:'CLAIM_RACE_EXHAUSTED',ref:'coordination/workers/no-allocation/race-efficiency.json'},
      {outcome:'CLAIM_TRANSPORT_BLOCKED',ref:'coordination/workers/no-allocation/blocked-outcome-efficiency.json'}
    ]
  }
};
out = compileRoleFrontier(feed, efficiencyRegression, [], [], [], [], {...baseContext,noAlloc:mixedNoAlloc});
const efficiencyRescue = out.role_ready.find(row => row.role === 'GUIDE_RESCATE');
assert.ok(efficiencyRescue, 'efficiency regression must preserve GUIDE_RESCATE');
const efficiencyEvidence = efficiencyRescue.claim_payload_shape?.evidence || efficiencyRescue.evidence || [];
assert.ok(efficiencyEvidence.includes('gh-pages:live/efficiency.json#no_allocation_causes'), 'bounded cause summary stays in rescue evidence');
assert.ok(efficiencyEvidence.includes('coordination/workers/no-allocation/race-efficiency.json'), 'actionable efficiency no-allocation receipt stays in rescue evidence');
assert.ok(!efficiencyEvidence.includes('coordination/workers/no-allocation/blocked-efficiency.json'), 'transport-blocked efficiency receipt must not re-enter rescue evidence through efficiencyRegressionEvidence');
assert.ok(!efficiencyEvidence.includes('coordination/workers/no-allocation/blocked-outcome-efficiency.json'), 'transport-blocked outcome receipt must not re-enter rescue evidence through efficiencyRegressionEvidence');

console.log('GUIDE_RESCATE_NO_ALLOCATION_SIGNAL_PASS');
