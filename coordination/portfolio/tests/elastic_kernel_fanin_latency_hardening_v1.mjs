import assert from 'node:assert/strict';
import { applyUsefulReserveOrdering, fanInBurstCritical } from '../../../scripts/useful-reserve-allocator-v1.mjs';

const policy = { status: 'CANARY', schema: 'prometeo.useful-reserve-policy/test' };
const returns = n => Array.from({ length: n }, (_, i) => `return-${i + 1}`);
const recovery = { lane: 'recovery', job_id: 'recovery-a', kind: 'recovery' };
const burst8 = { lane: 'role_ready', role: 'GUIDE_INTEGRATOR', trigger: 'RETURNS_UNCONSUMED', evidence: returns(8) };
const burst7 = { lane: 'role_ready', role: 'GUIDE_INTEGRATOR', trigger: 'RETURNS_UNCONSUMED', evidence: returns(7) };

assert.equal(fanInBurstCritical(burst8), true);
assert.equal(fanInBurstCritical(burst7), false);

let result = applyUsefulReserveOrdering([recovery, burst8], { policy });
assert.equal(result.ordered[0], burst8, '8-return burst should preempt ordinary recovery inside integration class');
assert.equal(result.report.fanin_burst_critical_admitted, 1);

result = applyUsefulReserveOrdering([recovery, burst7], { policy });
assert.equal(result.ordered[0], recovery, '7-return backlog should preserve stable order');

const product = { lane: 'ready', job_id: 'product', kind: 'implementation' };
result = applyUsefulReserveOrdering([burst8, product, recovery], { policy });
assert.equal(result.ordered[0], product, 'product work must remain ahead of fan-in burst');
assert.equal(result.ordered[1], burst8, 'critical fan-in should lead integration/recovery class');

console.log(JSON.stringify({ ok: true, cases: 4, fanin_burst_critical_min: 8 }));
