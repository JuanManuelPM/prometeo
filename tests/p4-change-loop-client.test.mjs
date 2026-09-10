import test from 'node:test';
import assert from 'node:assert/strict';
import {createChangeLoopClient} from '../shared/capture/v1/change-loop.js';

function storage(seed={}){const m=new Map(Object.entries(seed));return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v))}}
function response(data,status=200){return {ok:status>=200&&status<300,status,json:async()=>data}}

test('uses the existing P4 workspace secret and never places it in payload',async()=>{
  const secret='s'.repeat(43);let seen=null;
  const client=createChangeLoopClient({storage:storage({'prometeo.capture.workspace.secret.v1':secret}),fetchImpl:async(url,init)=>{seen={url,init};return response({ok:true,threads:[]})}});
  assert.equal(client.hasWorkspace(),true);await client.overview();
  assert.equal(seen.init.headers.authorization,`Bearer ${secret}`);
  assert.equal(JSON.parse(seen.init.body).action,'overview');
  assert.equal(seen.init.body.includes(secret),false);
});

test('new v2 secret wins over legacy v1 when both exist',async()=>{
  const v1='1'.repeat(43),v2='2'.repeat(43);let auth='';
  const client=createChangeLoopClient({storage:storage({'prometeo.capture.workspace.secret.v1':v1,'prometeo.capture.workspace.secret.v2':v2}),fetchImpl:async(_u,i)=>{auth=i.headers.authorization;return response({ok:true})}});
  await client.workspace();assert.equal(auth,`Bearer ${v2}`);
});

test('page operations preserve semantic identity and explicit one-click Work consent',async()=>{
  const calls=[];const client=createChangeLoopClient({storage:storage({'prometeo.capture.workspace.secret.v1':'x'.repeat(43)}),fetchImpl:async(_u,i)=>{calls.push(JSON.parse(i.body));return response({ok:true})}});
  const page={id:'calendar',title:'Calendar',href:'https://example.test/calendar'};
  await client.syncPage(page);await client.detail(page);await client.trabajar(page);
  assert.deepEqual(calls.map(x=>[x.action,x.page_id]),[['sync_page','calendar'],['detail','calendar'],['prepare_execution','calendar']]);
  assert.equal(calls.at(-1).intent,'WORK_PAGE');assert.equal(calls.at(-1).human_approved,true);
});

test('Think is a distinct explicit action and does not masquerade as execution',async()=>{
  let payload=null;const client=createChangeLoopClient({storage:storage({'prometeo.capture.workspace.secret.v1':'x'.repeat(43)}),fetchImpl:async(_u,i)=>{payload=JSON.parse(i.body);return response({ok:true})}});
  await client.pensar({id:'page-a',title:'A'});
  assert.equal(payload.action,'prepare_research');assert.equal(payload.intent,'THINK_PAGE');assert.equal(payload.human_approved,true);
});

test('unlinked browser fails locally before any network request',async()=>{
  let requests=0;const client=createChangeLoopClient({storage:storage(),fetchImpl:async()=>{requests++;return response({})}});
  await assert.rejects(()=>client.overview(),/vinculado/);assert.equal(requests,0);
});

test('file and audio uploads are private bearer multipart transport',async()=>{
  const secret='q'.repeat(43),seen=[];const fakeFile=new Blob(['abc'],{type:'text/plain'});Object.defineProperty(fakeFile,'name',{value:'nota.txt'});
  const audio=new Blob(['audio'],{type:'audio/webm'});Object.defineProperty(audio,'name',{value:'voz.webm'});
  const client=createChangeLoopClient({storage:storage({'prometeo.capture.workspace.secret.v1':secret}),fetchImpl:async(url,init)=>{seen.push({url,init});return response({ok:true})}});
  await client.uploadAttachment(fakeFile,{id:'page-a',title:'A'});
  await client.uploadAudio(audio,{id:'cap-a',created:1},{id:'page-a',title:'A'});
  assert.match(seen[0].url,/\/attachment\?page_id=page-a/);assert.match(seen[1].url,/\/audio$/);
  for(const x of seen){assert.equal(x.init.headers.authorization,`Bearer ${secret}`);assert.ok(x.init.body instanceof FormData);assert.equal(x.url.includes(secret),false)}
});
