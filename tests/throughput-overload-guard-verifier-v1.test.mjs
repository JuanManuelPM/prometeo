import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCandidate } from '../scripts/verify-throughput-overload-guard.mjs';

const config={minimum:4,fraction:0.5,ageMinutes:3,launchThreshold:8,overloadGuard:{}};
const evidence=(launches,pins)=>({distinct_recent_launches:launches,young_active_pin_count:pins,worker_window_minutes:10,active_pin_age_minutes:3});

test('10 launches and 6 young pins suppress only planner self-materialization',()=>{
  const r=evaluateCandidate(config,evidence(10,6),{kind:'SELF_MATERIALIZE',guide_role:'GUIDE_PLANNER'});
  assert.equal(r.verification_safe,true); assert.equal(r.active,true); assert.equal(r.required_young_pins,5); assert.equal(r.planner_self_materialization_allowed,false); assert.equal(r.selectable,false); assert.equal(r.suppressed,true);
});

test('10 launches and 3 young pins leave planner self-materialization enabled',()=>{
  const r=evaluateCandidate(config,evidence(10,3)); assert.equal(r.active,false); assert.equal(r.planner_self_materialization_allowed,true); assert.equal(r.selectable,true);
});

test('below launch threshold leaves guard inactive',()=>{
  const r=evaluateCandidate(config,evidence(7,6)); assert.equal(r.active,false); assert.equal(r.planner_self_materialization_allowed,true);
});

test('existing critical work remains selectable while guard is active',()=>{
  for(const workClass of ['EXECUTION','VERIFY','RECOVERY','GUIDE_INTEGRATOR','GUIDE_RESCATE','GUIDE_CRITIC','GUIDE_PLANNER']){
    const r=evaluateCandidate(config,evidence(10,6),{kind:'SELECT_EXISTING',guide_role:workClass}); assert.equal(r.active,true); assert.equal(r.selectable,true); assert.equal(r.suppressed,false);
  }
});

test('missing or malformed durable evidence fails closed',()=>{
  const r=evaluateCandidate(config,{distinct_recent_launches:10}); assert.equal(r.verification_safe,false); assert.equal(r.active,null); assert.equal(r.selectable,null);
});

test('wrong active-pin age window fails closed',()=>{
  const r=evaluateCandidate(config,{...evidence(10,6),active_pin_age_minutes:4}); assert.equal(r.verification_safe,false); assert.equal(r.reason,'active_pin_age_window_mismatch');
});
