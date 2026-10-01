import fs from 'node:fs';
import assert from 'node:assert/strict';

const policy = JSON.parse(fs.readFileSync(process.argv[2] || new URL('../USEFUL_RESERVE_POLICY_V1.json', import.meta.url), 'utf8'));

function validReserve(item = {}) {
  return Boolean(item.evidence && item.owner_current && item.consumer && item.done_when && item.observable_change);
}

function decide(state = {}) {
  if ((state.human || []).length) return { lane: 'HUMAN_DURABLE_INTENT', id: state.human[0].id };
  if ((state.product || []).length) return { lane: 'CURRENT_PRODUCT_WORK', id: state.product[0].id };
  if ((state.system || []).length) return { lane: 'INTEGRATION_VERIFICATION_RECOVERY', id: state.system[0].id };
  const reserve = (state.reserve || []).filter(validReserve);
  if (!reserve.length) return { lane: 'NONE', id: null };
  return { lane: 'USEFUL_RESERVE', id: reserve[0].id };
}

assert.equal(policy.reserve_target.floor, 0);
assert.equal(policy.reserve_target.hardcoded_occupancy_forbidden, true);
assert.equal(policy.reactive_human_priority.special_chat_pool_forbidden, true);
assert.deepEqual(decide({ reserve: [{ id:'r1', evidence:'exit-audit:1', owner_current:'guide', consumer:'integrator', done_when:'harness pass', observable_change:'lower collision cost' }] }), { lane:'USEFUL_RESERVE', id:'r1' });
assert.deepEqual(decide({ reserve: [{ id:'r2', owner_current:'guide', done_when:'words written', observable_change:'' }] }), { lane:'NONE', id:null });
assert.deepEqual(decide({ system:[{id:'integrate-return'}], reserve:[{ id:'r3', evidence:'debt:1', owner_current:'guide', consumer:'planner', done_when:'pass', observable_change:'decision' }] }), { lane:'INTEGRATION_VERIFICATION_RECOVERY', id:'integrate-return' });
assert.deepEqual(decide({ human:[{id:'human-question'}], reserve:[{ id:'r4', evidence:'audit:2', owner_current:'guide', consumer:'qa', done_when:'pass', observable_change:'latency' }] }), { lane:'HUMAN_DURABLE_INTENT', id:'human-question' });
assert.deepEqual(decide({ product:[{id:'product-job'}], reserve:[{ id:'r5', evidence:'stale:1', owner_current:'guide', consumer:'projection', done_when:'fresh', observable_change:'served state' }] }), { lane:'CURRENT_PRODUCT_WORK', id:'product-job' });
assert.ok(policy.reserve_admission.allowed_evidence_classes.includes('REPEATED_EXIT_AUDIT_FRICTION'));
assert.equal(validReserve({ evidence:'exit-audit:repeated', owner_current:'guide', consumer:'allocator', done_when:'collision drops', observable_change:'allocator choice' }), true);
assert.match(policy.reactive_human_priority.started_exclusive_work, /never cancel or steal authority/i);

console.log('PASS useful_reserve_policy_v1');
