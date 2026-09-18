import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
assert.equal(r.batches[0].summary.extra_observed,0);
assert.equal(r.batches[0].summary.collisions,2);

const aliases=compileRuntime([
  c(6,'2026-09-17T22:02:10Z',{...base,worker_id:'w3',event:'ROUTED',lane:'recovery',candidate_id:'job-c'}),
  c(7,'2026-09-17T22:02:12Z',{...base,worker_id:'w3',event:'CLAIM_RESULT',outcome:'WIN',authority_attempts:3,outcomes:['CREATE_EXISTS','CREATE_EXISTS','CLAIM_WON'],started:true})
],null,'2026-09-17T22:02:20Z');
assert.equal(aliases.batches[0].workers[0].claim.outcome,'WON');
assert.equal(aliases.batches[0].workers[0].claim.attempts,3);
assert.equal(aliases.batches[0].workers[0].claim.collisions,2);
assert.equal(r.batches[0].summary.started,1);
assert.equal(r.batches[0].summary.closed,1);
assert.equal(r.batches[0].workers.find(x=>x.worker_id==='w1').state,'CLOSED');

const synth=compileRuntime([
  c(9,'2026-09-17T22:03:00Z',{schema:'prometeo.worker-event/v1',batch_id:'SYNTH-X',expected_workers:1,worker_id:'sx',event:'ROUTED',lane:'ready',candidate_id:'x'})
],null,'2026-09-17T22:03:01Z');
assert.equal(synth.current_batch,null);

const root=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-runtime-'));
const beaconDir=path.join(root,'coordination','workers','beacons');
fs.mkdirSync(beaconDir,{recursive:true});
fs.writeFileSync(path.join(beaconDir,'wb.json'),JSON.stringify({
  schema:'prometeo.worker-beacon/v1',
  worker_id:'wb',
  launched_at:'2026-09-17T22:04:00Z',
  batch_id:'WAVE-BEACON-ONLY',
  expected_workers:2
}));
const beaconOnly=compileRuntime([],root,'2026-09-17T22:04:10Z');
assert.equal(beaconOnly.current_batch,'WAVE-BEACON-ONLY');
assert.equal(beaconOnly.batches[0].summary.observed,1);
assert.equal(beaconOnly.batches[0].summary.beaconed,1);
assert.equal(beaconOnly.batches[0].summary.telemetry_observed,0);
assert.equal(beaconOnly.batches[0].summary.missing_expected,1);
assert.equal(beaconOnly.batches[0].workers[0].state,'BEACONED');
fs.rmSync(root,{recursive:true,force:true});

// Pool CLOSE is only terminal when the required productivity exam exists.
const poolRoot=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-runtime-pool-'));
const poolBeaconDir=path.join(poolRoot,'coordination','workers','beacons');
fs.mkdirSync(poolBeaconDir,{recursive:true});
fs.writeFileSync(path.join(poolBeaconDir,'pool-w1.json'),JSON.stringify({
  schema:'prometeo.worker-beacon/v1',
  worker_id:'pool-w1',
  launched_at:'2026-09-17T22:05:00Z',
  batch_id:'POOL-PROD-01',
  expected_workers:null
}));
const poolBase={schema:'prometeo.worker-event/v1',batch_id:'POOL-PROD-01',expected_workers:null,worker_id:'pool-w1'};
const poolComments=[
  c(20,'2026-09-17T22:05:01Z',{...poolBase,event:'ROUTED',lane:'ready',candidate_id:'job-p'}),
  c(21,'2026-09-17T22:05:02Z',{...poolBase,event:'CLAIM_RESULT',outcome:'WON',attempts:1,candidate_id:'job-p',started:true}),
  c(22,'2026-09-17T22:05:03Z',{...poolBase,event:'CLOSE',outcome:'RETURNED',job_id_or_null:'job-p'})
];
const poolPreExam=compileRuntime(poolComments,poolRoot,'2026-09-17T22:05:04Z');
assert.equal(poolPreExam.batches[0].workers[0].state,'ACTIVE');
assert.equal(poolPreExam.batches[0].workers[0].close.terminal,false);
assert.equal(poolPreExam.batches[0].summary.closed,0);
assert.equal(poolPreExam.batches[0].summary.active,1);
assert.ok(poolPreExam.batches[0].workers[0].anomalies.includes('POOL_CLOSE_WITHOUT_TERMINAL_EXAM'));

const examDir=path.join(poolRoot,'coordination','workers','exams');
fs.mkdirSync(examDir,{recursive:true});
fs.writeFileSync(path.join(examDir,'pool-w1.json'),JSON.stringify({
  schema:'prometeo.worker-productivity-exam-card/v1',
  worker_id:'pool-w1',
  batch_id:'POOL-PROD-01',
  closed_at:'2026-09-17T22:05:03Z',
  slots:[]
}));
const poolWithExam=compileRuntime(poolComments,poolRoot,'2026-09-17T22:05:05Z');
assert.equal(poolWithExam.batches[0].workers[0].state,'CLOSED');
assert.equal(poolWithExam.batches[0].workers[0].close.terminal,true);
assert.equal(poolWithExam.batches[0].summary.closed,1);
assert.equal(poolWithExam.batches[0].workers[0].repo.exam_ref,'coordination/workers/exams/pool-w1.json');
fs.rmSync(poolRoot,{recursive:true,force:true});

console.log('WORKER_RUNTIME_EVENTS_PASS');
