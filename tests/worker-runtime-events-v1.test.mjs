import assert from 'node:assert/strict';
import { compileRuntime, parseEventComment } from '../scripts/build-worker-runtime.mjs';

const c=(id,created_at,payload)=>({id,created_at,html_url:`https://example/${id}`,body:`PROMETEO_EVENT ${JSON.stringify(payload)}`});
const base={schema:'prometeo.worker-event/v1',batch_id:'WAVE-T1',expected_workers:2};

const comments=[
  c(1,'2026-09-17T22:00:00Z',{...base,worker_id:'w1',event:'ROUTED',lane:'ready',candidate_id:'job-a',candidate_title:'A'}),
  c(2,'2026-09-17T22:00:02Z',{...base,worker_id:'w2',event:'ROUTED',lane:'role_ready',candidate_id:'role-b',candidate_title:'B'}),
  c(3,'2026-09-17T22:00:04Z',{...base,worker_id:'w1',event:'CLAIM_RESULT',outcome:'WON',attempts:1,candidate_id:'job-a',authority_ref_or_null:'pin/a',started:true}),
  c(4,'2026-09-17T22:00:05Z',{...base,worker_id:'w2',event:'CLAIM_RESULT',outcome:'COLLISION_EXHAUSTED',attempts:2,candidate_id:'role-b',authority_ref_or_null:null,started:false}),
  c(5,'2026-09-17T22:01:00Z',{...base,worker_id:'w1',event:'CLOSE',outcome:'RETURNED',job_id_or_null:'job-a',result_ref_or_null:'return/a'})
];

assert.equal(parseEventComment(comments[0]).event,'ROUTED');
assert.equal(parseEventComment({body:'noise'}),null);

const r=compileRuntime(comments,null,'2026-09-17T22:02:00Z');
assert.equal(r.schema,'prometeo.worker-runtime/v1');
assert.equal(r.current_batch,'WAVE-T1');
assert.equal(r.batches[0].summary.expected,2);
assert.equal(r.batches[0].summary.observed,2);
assert.equal(r.batches[0].summary.routed,2);
assert.equal(r.batches[0].summary.claim_attempts,3);
assert.equal(r.batches[0].summary.pin_won,1);
assert.equal(r.batches[0].summary.collisions,1);
assert.equal(r.batches[0].summary.started,1);
assert.equal(r.batches[0].summary.closed,1);
assert.equal(r.batches[0].workers.find(x=>x.worker_id==='w1').state,'CLOSED');

console.log('WORKER_RUNTIME_EVENTS_PASS');
