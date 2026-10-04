import assert from 'node:assert/strict';
import {
  buildFastAllocator,
  hasDurableTerminalReturn
} from '../../../scripts/build-fast-allocator-core-v3.mjs';

const returned = {
  job_id:'returned-consumed',
  state:'replaceable',
  priority:300,
  pin_generation:1,
  recent_return_evidence:[{
    path:'coordination/portfolio/returns/returned-consumed/RETURN.json',
    outcome:'DONE',
    returned_at:'2026-10-04T17:00:00Z'
  }]
};
const unfinished = {
  job_id:'stale-unfinished',
  state:'replaceable',
  priority:200,
  pin_generation:1
};
const exhausted = {
  job_id:'fixed-exhausted',
  state:'replaceable',
  priority:100,
  pin_generation:2
};
const boundary = {
  job_id:'boundary-nonterminal',
  state:'replaceable',
  priority:90,
  pin_generation:1,
  recent_return_evidence:[{
    path:'coordination/portfolio/returns/boundary-nonterminal/RETURN.json',
    outcome:'BOUNDARY',
    returned_at:'2026-10-04T17:00:00Z'
  }]
};

assert.equal(hasDurableTerminalReturn(returned), true);
assert.equal(hasDurableTerminalReturn(unfinished), false);
assert.equal(hasDurableTerminalReturn(boundary), false, 'BOUNDARY remains nonterminal under the worker contract');

const feed = {
  generated_at:'2026-10-04T17:15:00Z',
  source_sha:'0123456789abcdef0123456789abcdef01234567',
  projects:[{ id:'fixture', label:'fixture', jobs:[returned, unfinished, exhausted, boundary] }],
  plans:[],
  workers:[],
  summary:{ workers:{} }
};
const efficiency = { status:'PASS', metrics:{}, reasons:[], no_allocation_causes:null };
const recoveryPolicies = [{
  job_id:'fixed-exhausted',
  mode:'fixed_generation',
  fixed_generation:2,
  reason:'FIXTURE_EXHAUSTED'
}];

const allocator = buildFastAllocator(feed, efficiency, { recoveryPolicies, roleContext:null });
const ids = allocator.recovery.map(x => x.job_id);
assert.equal(ids.includes('returned-consumed'), false, 'terminal return must be consumed before ordinary replacement reuse');
assert.equal(ids.includes('stale-unfinished'), true, 'unfinished stale claim remains recoverable');
assert.equal(ids.includes('boundary-nonterminal'), true, 'nonterminal boundary remains eligible for ordinary continuity');
assert.equal(ids.includes('fixed-exhausted'), false, 'fixed-generation ceiling must not mint G(n+1)');

const stale = allocator.recovery.find(x => x.job_id === 'stale-unfinished');
assert.equal(stale.next_generation, 2);
const boundaryRow = allocator.recovery.find(x => x.job_id === 'boundary-nonterminal');
assert.equal(boundaryRow.next_generation, 2);
assert.ok(allocator.fixed_generation_attention.some(x => x.job_id === 'fixed-exhausted'));

console.log('ALLOCATOR_TERMINAL_RETURN_CONSUMPTION_GATE_PASS');
