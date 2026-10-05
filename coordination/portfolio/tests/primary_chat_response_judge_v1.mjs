#!/usr/bin/env node
import assert from 'node:assert/strict';
import {compilePrimaryChatResponseJudgeFanout,validateIndependentCandidateReturns} from '../../../scripts/primary-chat-response-judge-v1.mjs';

const requestId='rr-c006-regression-001';
const candidateReturns=Array.from({length:4},(_,i)=>({
  schema:'prometeo.primary-chat-response-candidate-return-public/v1',request_id:requestId,candidate_ordinal:i+1,worker_id:`wc-fixture-${i+1}`,
  return_ref:`coordination/portfolio/returns/fixture-candidate-${i+1}/RETURN-${i+1}.json`,outcome:'VERIFIED',durable_return:true,raw_text_public:false,
  evidence_refs:[`evidence://candidate-${i+1}`]
}));
const template={
  block_id:'template',semantic_key:'template',new_worker_executable:true,dispatch_ready:true,input_refs:[],output_contract:'template',
  allowed_scope:['coordination/portfolio/'],forbidden_scope:[],done_when:['template'],evidence_refs:[],required_capabilities:['repository_test_runtime'],
  consumer:'coordination/guide/GUIDE_SWARM_PROTOCOL_V1.md#GUIDE_INTEGRATOR',dependency_ids:[],
  organism_refs:{target_node_ref:'organism://primary-chat',owner_ref:'owner://current',app_ref:'app://primary-chat',chat_ref:'chat://primary',objective_ref:'objective://response'}
};
assert.equal(validateIndependentCandidateReturns(candidateReturns,requestId).pass,true);
const compiled=compilePrimaryChatResponseJudgeFanout({request_id:requestId,candidate_returns:candidateReturns,exam_template:template,judge_contract_ref:'coordination/guide/PRIMARY_CHAT_RESPONSE_JUDGE_CONTRACT_V1.json'});
assert.equal(compiled.pass,true,JSON.stringify(compiled.errors||[]));
assert.equal(compiled.exam_blocks.length,2);
assert.equal(compiled.response_judge_fanout.candidate_returns_received,4);
assert.equal(compiled.response_judge_fanout.independent_candidate_workers,4);
assert.equal(compiled.response_judge_fanout.exam_blocks_prepared,2);
assert.equal(compiled.response_judge_fanout.exam_workers_claimed,0);
assert.equal(compiled.response_judge_fanout.exam_returns_received,0);
assert.equal(compiled.response_judge_fanout.counts_are_targets_not_claims,true);
assert.equal(new Set(compiled.exam_blocks.map(x=>x.semantic_key)).size,2);
for(const block of compiled.exam_blocks){
  assert.equal(block.new_worker_executable,true); assert.equal(block.dispatch_ready,true); assert.deepEqual(block.dependency_ids,[]);
  assert.equal(block.runtime_binding.raw_text_public,false); assert.equal(block.runtime_binding.candidate_return_refs.length,4); assert.equal(block.actual_exam_return_required,true);
}
const dupWorker=candidateReturns.map(x=>({...x})); dupWorker[3].worker_id=dupWorker[0].worker_id; assert.equal(validateIndependentCandidateReturns(dupWorker,requestId).pass,false);
assert.equal(validateIndependentCandidateReturns(candidateReturns.slice(0,3),requestId).pass,false);
const rawLeak=candidateReturns.map(x=>({...x})); rawLeak[0].prompt='PRIVATE'; assert.equal(validateIndependentCandidateReturns(rawLeak,requestId).pass,false);
const wrongRequest=candidateReturns.map(x=>({...x})); wrongRequest[0].request_id='other'; assert.equal(validateIndependentCandidateReturns(wrongRequest,requestId).pass,false);
assert.equal(JSON.stringify(compiled).includes('PRIVATE'),false);
console.log('PRIMARY_CHAT_RESPONSE_JUDGE_V1_PASS');
console.log(JSON.stringify({candidate_returns:4,independent_workers:4,exam_blocks:2,exam_claims:0,exam_returns:0,raw_text_public:false}));
