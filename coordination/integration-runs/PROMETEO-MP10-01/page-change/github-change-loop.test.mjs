import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const sourceUrl=new URL('../../../../shared/capture/v1/github-change-loop.js',import.meta.url);
const source=await readFile(sourceUrl,'utf8');
const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

const packet={
  schema:'prometeo.execution-packet/v2',
  work_item_id:'WI-TEST-001',
  thread_id:'PRIVATE-THREAD-123',
  created_at:'2026-09-29T03:10:00Z',
  expires_at:'2026-10-06T03:10:00Z',
  packet_hash:'a'.repeat(64),
  target:{
    page_id:'prometeo-control-room',
    page_title:'PRIVATE TITLE',
    href:'https://private.example.invalid/?token=DO_NOT_LEAK'
  },
  intent:{
    selected_capture_revisions:[{
      transcript:'TOP SECRET HUMAN TEXT',
      asset_url:'https://private.example.invalid/signed?token=LEAK'
    }],
    attachments:[{file_name:'private.pdf'}]
  },
  context:{
    page_memory:{rolling_summary:'SECRET MEMORY'},
    previous_ai_sessions:[{saved_payload:'SECRET SESSION'}]
  },
  execution:{
    protocol_id:'prometeo.agent-execution-protocol:v1',
    result_submission:{
      github_return_path:'coordination/executions/WI-TEST-001/RETURN.json',
      optional_http_post:'https://private.example.invalid/result?token=RETURN_SECRET'
    }
  },
  authorization:{
    delivery_mode:'WORKER_POOL',
    approved_at:'2026-09-29T03:10:00Z',
    secret:'AUTH_SECRET'
  }
};

const envelope=mod.sanitizeExecutionPacketForGitHub(packet,{privateContextRef:'bridge:WI-TEST-001'});
assert.equal(envelope.schema,'prometeo.page-change-github-envelope/v1');
assert.equal(envelope.page_id,'prometeo-control-room');
assert.equal(envelope.private_context.published,false);
assert.equal(envelope.private_context.ref,'bridge:WI-TEST-001');
assert.equal(envelope.authority.grants_authority,false);
assert.equal(envelope.authority.claim_path,'coordination/opportunities/claims/page-change-WI-TEST-001.json');

const serialized=JSON.stringify(envelope);
for(const forbidden of [
  'TOP SECRET HUMAN TEXT',
  'SECRET MEMORY',
  'SECRET SESSION',
  'PRIVATE TITLE',
  'DO_NOT_LEAK',
  'RETURN_SECRET',
  'AUTH_SECRET',
  'private.pdf',
  'PRIVATE-THREAD-123'
]) assert.equal(serialized.includes(forbidden),false,'leaked '+forbidden);

const submission=mod.toIngressSubmission(packet,{privateContextRef:'bridge:WI-TEST-001'});
assert.deepEqual(Object.keys(submission).sort(),['kind','page','text']);
assert.equal(submission.kind,'PAGE_CHANGE_METADATA_V1');
assert.equal(submission.text.includes('TOP SECRET HUMAN TEXT'),false);

const unavailable=mod.createGitHubChangeLoopTransport({ingress:null});
assert.deepEqual(
  await unavailable.submit(packet,{privateContextRef:'bridge:WI-TEST-001'}),
  {status:'BOUNDARY',queued:false,ref:null,error:'GITHUB_INGRESS_UNAVAILABLE'}
);

const calls=[];
const ingress={
  async submit(payload){
    calls.push(payload);
    return {status:'QUEUED',queued:true,ref:'github:page-change:WI-TEST-001'};
  }
};
const transport=mod.createGitHubChangeLoopTransport({ingress});
const result=await transport.submit(packet,{privateContextRef:'bridge:WI-TEST-001'});
assert.equal(result.queued,true);
assert.equal(result.ref,'github:page-change:WI-TEST-001');
assert.equal(calls.length,1);
assert.equal(calls[0].text.includes('TOP SECRET HUMAN TEXT'),false);

const manual={...packet,authorization:{delivery_mode:'MANUAL_CHAT'}};
assert.throws(
  ()=>mod.sanitizeExecutionPacketForGitHub(manual),
  error=>error?.code==='WORKER_POOL_PACKET_REQUIRED'
);

const unsafeRef=()=>mod.sanitizeExecutionPacketForGitHub(packet,{privateContextRef:'https://example.invalid/?token=secret'});
assert.throws(unsafeRef,error=>error?.code==='PRIVATE_CONTEXT_REF_UNSAFE');

console.log(JSON.stringify({
  schema:'prometeo.multipyramid-s004-test/v1',
  result:'PASS',
  assertions:23,
  privacy:'PASS_FAIL_CLOSED',
  ingress_bridge:'PASS_INJECTED_NO_CREDENTIAL'
}));
