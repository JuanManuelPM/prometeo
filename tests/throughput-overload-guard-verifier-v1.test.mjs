import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGuard } from '../scripts/verify-throughput-overload-guard.mjs';

const guard={enabled:true,launch_burst_threshold:8,launch_burst_window_minutes:10,launch_burst_active_pin_threshold:4,launch_burst_active_pin_age_minutes:3,launch_burst_max_new_guide_jobs:2,preserve_work_classes:['EXECUTION','VERIFY','RECOVERY','INTEGRATOR','RESCATE','CRITIC'],fail_closed_on_missing_launch_evidence:true};
const evidence=(workers,pins)=>({distinct_recent_workers:workers,young_active_pin_count:pins,worker_window_minutes:10,active_pin_age_minutes:3});

test('overload caps only new self-materializing Guide budget',()=>{
  const r=evaluateGuard({baseLimit:6,guard,launchEvidence:evidence(8,4),workClass:'GUIDE_SELF_MATERIALIZE'});
  assert.equal(r.promotion_safe,true); assert.equal(r.overload,true); assert.equal(r.effective_new_guide_limit,2); assert.equal(r.throttle_applies,true);
});

test('below either threshold preserves base budget',()=>{
  for(const [w,p] of [[7,4],[8,3]]){ const r=evaluateGuard({baseLimit:6,guard,launchEvidence:evidence(w,p)}); assert.equal(r.overload,false); assert.equal(r.effective_new_guide_limit,6); }
});

test('preserved work classes remain runnable under overload',()=>{
  for(const workClass of guard.preserve_work_classes){ const r=evaluateGuard({baseLimit:6,guard,launchEvidence:evidence(9,5),workClass}); assert.equal(r.promotion_safe,true); assert.equal(r.work_class_allowed,true); assert.equal(r.throttle_applies,false); }
});

test('missing or malformed launch evidence fails closed',()=>{
  const r=evaluateGuard({baseLimit:6,guard,launchEvidence:{distinct_recent_workers:9}}); assert.equal(r.promotion_safe,false); assert.equal(r.overload,null); assert.equal(r.effective_new_guide_limit,null);
});

test('wrong evidence windows fail closed',()=>{
  const r=evaluateGuard({baseLimit:6,guard,launchEvidence:{...evidence(9,5),worker_window_minutes:11}}); assert.equal(r.promotion_safe,false); assert.equal(r.reason,'window_mismatch');
});
