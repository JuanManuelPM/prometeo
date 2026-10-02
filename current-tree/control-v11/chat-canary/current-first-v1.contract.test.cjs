const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync(process.argv[2], 'utf8');
const listeners = {};
const context = {
  console,
  setInterval: () => 0,
  clearInterval: () => {},
  window: {
    setInterval: () => 0
  },
  document: {
    readyState: 'loading',
    addEventListener: (name, fn) => { listeners[name] = fn; },
    querySelector: () => null,
    createElement: () => ({ style: {}, setAttribute() {}, append() {}, appendChild() {} }),
    head: { append() {}, appendChild() {} }
  }
};
context.window.document = context.document;
context.window.window = context.window;
context.globalThis = context.window;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'current-first-v1.js' });

const compile = context.window.PROMETEO_PRIMARY_CHAT_CURRENT_FIRST_V1.compile;
assert.equal(typeof compile, 'function');

const now = Date.parse('2026-10-02T21:30:00Z');
const candidate = i => ({ job_id: 'J' + i, lane: i === 0 ? 'RECOVERY' : 'READY', required_capabilities: [] });
const frontier = { generated_at: '2026-10-02T21:30:00Z', candidate_count: 6, candidates: Array.from({length:6}, (_,i)=>candidate(i)) };
const contract = { templates: { REFILL_N: 'MANDÁ {capacity_gap} /wc/', RETURNS_UNCONSUMED: 'RETURNS', RECOVERY_PRESSURE: 'RECOVERY', BUFFER_LOW: 'BUFFER', CAPACITY_OK: 'OK' } };
const thread = { messages: [{ actor_type: 'HUMAN', status: 'PUBLISHED', created_at: '2026-10-02T21:29:00Z' }] };
const worker = (id, at='2026-10-02T21:29:30Z') => ({ worker_id:id, state:'ACTIVE', last_event_at:at });
const base = { current_batch:'POOL-PROD-01', generated_at:'2026-10-02T21:30:00Z', batches:[{batch_id:'POOL-PROD-01', workers:[]}] };

function run(runtime) {
  return compile({ runtime, frontier, thread, contract, runtimeError:null, frontierError:null, now });
}

let view = run({ ...base, unconsumed_returns_count: 5, recovery_attention_count: 2 });
assert.equal(view.state, 'REFILL_N');
assert.equal(view.input.capacity_gap, 6);
assert.equal(view.action, 'MANDÁ 6 /wc/');

view = run({ ...base, unconsumed_returns_count: 5, batches:[{batch_id:'POOL-PROD-01', workers:[worker('w1')]}] });
assert.equal(view.state, 'RETURNS_UNCONSUMED');

view = run({ ...base, recovery_attention_count: 2, batches:[{batch_id:'POOL-PROD-01', workers:[worker('w1')]}] });
assert.equal(view.state, 'RECOVERY_PRESSURE');

const noRecoveryFrontier = { generated_at: '2026-10-02T21:30:00Z', candidate_count: 6, candidates: Array.from({length:6}, (_,i)=>({job_id:'R'+i,lane:'READY',required_capabilities:[]})) };
view = compile({ runtime:{ ...base, recovery_attention_count:0, batches:[{batch_id:'POOL-PROD-01', workers:Array.from({length:6},(_,i)=>worker('w'+i))}] }, frontier:noRecoveryFrontier, thread, contract, runtimeError:null, frontierError:null, now });
assert.equal(view.state, 'BUFFER_LOW');
assert.equal(view.buffer, 'BAJO');

view = compile({ runtime:{ ...base, recovery_attention_count:0, batches:[{batch_id:'POOL-PROD-01', workers:Array.from({length:10},(_,i)=>worker('w'+i))}] }, frontier:noRecoveryFrontier, thread, contract, runtimeError:null, frontierError:null, now });
assert.equal(view.state, 'CAPACITY_OK');
assert.equal(view.buffer, 'OK +4');

console.log(JSON.stringify({
  schema: 'prometeo.primary-chat-current-first-contract-test/v1',
  passed: 5,
  cases: [
    'REFILL_N wins without live consumer despite pending returns/recovery',
    'RETURNS_UNCONSUMED wins with live consumer',
    'RECOVERY_PRESSURE wins with live consumer',
    'BUFFER_LOW exposes covered core with low reserve',
    'CAPACITY_OK exposes healthy reserve'
  ]
}, null, 2));
