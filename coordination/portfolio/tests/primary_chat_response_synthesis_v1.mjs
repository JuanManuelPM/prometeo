#!/usr/bin/env node
import assert from 'node:assert/strict';
import {synthesizePrimaryChatResponse,validateIndependentExamReturns} from '../../../scripts/primary-chat-response-synthesis-v1.mjs';

const request='rr-c007-regression-001';
const candidates=Array.from({length:4},(_,i)=>({
  schema:'prometeo.primary-chat-response-candidate-return-public/v1',
  request_id:request,candidate_ordinal:i+1,worker_id:`wc-candidate-${i+1}`,
  return_ref:`coordination/portfolio/returns/fixture-candidate-${i+1}/RETURN.json`,
  durable_return:true,raw_text_public:false,outcome:'VERIFIED',
  rich_response:{
    schema:'prometeo.primary-chat-rich-response/v1',
    request_id:request,
    prose:[`respuesta ${i+1}`],
    links:[{label:'seguro',href:'https://juanmanuelpm.github.io/prometeo/wc/'},{label:'no',href:'javascript:alert(1)'}],
    widgets:[{type:'details',label:'detalle',body:'ok'},{type:'approval',label:'NO'}],
    evidence_refs:[`evidence://candidate-${i+1}`],
    unknown_private_field:'DROP'
  }
}));
const exams=[
  {schema:'prometeo.primary-chat-response-exam-return-public/v1',request_id:request,exam_ordinal:1,worker_id:'wc-exam-1',return_ref:'coordination/portfolio/returns/exam-1/RETURN.json',durable_return:true,raw_text_public:false,ranking:[3,2,1,4]},
  {schema:'prometeo.primary-chat-response-exam-return-public/v1',request_id:request,exam_ordinal:2,worker_id:'wc-exam-2',return_ref:'coordination/portfolio/returns/exam-2/RETURN.json',durable_return:true,raw_text_public:false,ranking:[2,3,4,1]}
];
assert.equal(validateIndependentExamReturns(exams,request).pass,true);
const out=synthesizePrimaryChatResponse({request_id:request,candidate_returns:candidates,exam_returns:exams});
assert.equal(out.pass,true,JSON.stringify(out.errors||[]));
assert.equal(out.final_response.selected_candidate_ordinal,2,'Borda tie must deterministically choose lower ordinal');
assert.equal(out.final_response.candidate_returns_received,4);
assert.equal(out.final_response.exam_returns_received,2);
assert.equal(out.final_response.independent_candidate_workers,4);
assert.equal(out.final_response.independent_exam_workers,2);
assert.equal(out.final_response.execution_depth_class,'REAL_BOT_RETURNS_SYNTHESIZED');
assert.equal(out.final_response.rich_response.prose[0],'respuesta 2');
assert.equal(out.final_response.rich_response.links.length,1);
assert.equal(out.final_response.rich_response.widgets.some(x=>x.type==='approval'),false);
assert.equal(Object.prototype.hasOwnProperty.call(out.final_response.rich_response,'unknown_private_field'),false);
assert.equal(out.final_response.evidence_refs.length>=6,true);
const dupExam=exams.map(x=>({...x})); dupExam[1].worker_id=dupExam[0].worker_id;
assert.equal(synthesizePrimaryChatResponse({request_id:request,candidate_returns:candidates,exam_returns:dupExam}).pass,false);
assert.equal(synthesizePrimaryChatResponse({request_id:request,candidate_returns:candidates,exam_returns:exams.slice(0,1)}).pass,false);
const rawExam=exams.map(x=>({...x})); rawExam[0].hidden_reasoning='PRIVATE';
assert.equal(synthesizePrimaryChatResponse({request_id:request,candidate_returns:candidates,exam_returns:rawExam}).pass,false);
const rawCandidate=candidates.map(x=>({...x})); rawCandidate[0].prompt='PRIVATE';
assert.equal(synthesizePrimaryChatResponse({request_id:request,candidate_returns:rawCandidate,exam_returns:exams}).pass,false);
console.log('PRIMARY_CHAT_RESPONSE_SYNTHESIS_V1_PASS');
console.log(JSON.stringify({candidate_returns:4,exam_returns:2,selected_candidate:out.final_response.selected_candidate_ordinal,visible_projection_ready:true,raw_text_public:false}));
