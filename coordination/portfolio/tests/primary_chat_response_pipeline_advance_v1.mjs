#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { advancePrimaryChatResponsePipeline } from '../../../scripts/advance-primary-chat-response-pipeline-v1.mjs';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'primary-chat-response-pipeline-'));
const threadRel='coordination/portfolio/evidence/prometeo-autonomous-growth/CHAT_THREAD_MIRROR_CANARY_V1.json';
fs.mkdirSync(path.join(root,path.dirname(threadRel)),{recursive:true});
fs.writeFileSync(path.join(root,threadRel),JSON.stringify({schema:'prometeo.chat-thread-projection/v1',projection_status:'NON_AUTHORITATIVE',chat_object_id:'chat-object-prometeo-chat-control-main',messages:[]},null,2)+'\n');
const requestId='rr-20261005T150000Z-test';
function put(job,file,value){
  const rel=`coordination/portfolio/returns/${job}/${file}`;
  fs.mkdirSync(path.join(root,path.dirname(rel)),{recursive:true});
  value.return_ref=rel;
  fs.writeFileSync(path.join(root,rel),JSON.stringify(value,null,2)+'\n');
  return rel;
}
for(let i=1;i<=4;i++){
  put(`portfolio-primary-chat-response-${requestId}-c0${i}`,`RETURN-c0${i}.json`,{
    schema:'prometeo.primary-chat-response-candidate-return-public/v1',request_id:requestId,candidate_ordinal:i,worker_id:`wc-candidate-${i}`,
    outcome:'VERIFIED',durable_return:true,raw_text_public:false,returned_at:`2026-10-05T15:0${i}:00Z`,evidence_refs:[`evidence://candidate-${i}`],
    rich_response:{schema:'prometeo.primary-chat-rich-response/v1',request_id:requestId,prose:[`candidate ${i}`],links:[],widgets:[],evidence_refs:[`evidence://candidate-${i}`],public_safe_projection:true,raw_private_prompt:false}
  });
}
let first=advancePrimaryChatResponsePipeline({repo_root:root});
assert.equal(first.exam_jobs_created,2);
assert.equal(first.final_responses_created,0);
for(let i=1;i<=2;i++) assert.ok(fs.existsSync(path.join(root,`coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-primary-chat-response-${requestId}-exam-0${i}.json`)));
put(`portfolio-primary-chat-response-${requestId}-exam-01`,'RETURN-exam-01.json',{schema:'prometeo.primary-chat-response-exam-return-public/v1',request_id:requestId,exam_ordinal:1,worker_id:'wc-exam-1',durable_return:true,raw_text_public:false,returned_at:'2026-10-05T15:06:00Z',ranking:[2,1,3,4],evidence_refs:['evidence://exam-1']});
put(`portfolio-primary-chat-response-${requestId}-exam-02`,'RETURN-exam-02.json',{schema:'prometeo.primary-chat-response-exam-return-public/v1',request_id:requestId,exam_ordinal:2,worker_id:'wc-exam-2',durable_return:true,raw_text_public:false,returned_at:'2026-10-05T15:07:00Z',ranking:[2,3,1,4],evidence_refs:['evidence://exam-2']});
let second=advancePrimaryChatResponsePipeline({repo_root:root});
assert.equal(second.exam_jobs_created,0);
assert.equal(second.final_responses_created,1);
assert.equal(second.thread_messages_added,1);
const thread=JSON.parse(fs.readFileSync(path.join(root,threadRel),'utf8'));
assert.equal(thread.messages.length,1);
assert.equal(thread.messages[0].actor_type,'ASSISTANT');
assert.equal(thread.messages[0].body_text,'candidate 2');
assert.equal(thread.messages[0].rich_response.request_id,requestId);
const finalRel=`coordination/portfolio/evidence/prometeo-autonomous-growth/primary-chat/response-state/${requestId}/FINAL_RESPONSE.json`;
const final=JSON.parse(fs.readFileSync(path.join(root,finalRel),'utf8'));
assert.equal(final.schema,'prometeo.primary-chat-final-response/v1');
assert.equal(final.selected_candidate_ordinal,2);
assert.equal(final.durable_return,true);
let third=advancePrimaryChatResponsePipeline({repo_root:root});
assert.equal(third.exam_jobs_created,0);
assert.equal(third.final_responses_created,0);
assert.equal(third.thread_messages_added,0);
console.log('PRIMARY_CHAT_RESPONSE_PIPELINE_ADVANCE_V1_PASS');
console.log(JSON.stringify({exam_jobs:2,final_responses:1,thread_messages:1,idempotent:true,raw_text_public:false}));
