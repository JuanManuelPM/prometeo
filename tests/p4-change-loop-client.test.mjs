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

test('page operations preserve semantic page identity',async()=>{
  const calls=[];const client=createChangeLoopClient({storage:storage({'prometeo.capture.workspace.secret.v1':'x'.repeat(43)}),fetchImpl:async(_u,i)=>{calls.push(JSON.parse(i.body));return response({ok:true})}});
  const page={id:'calendar',title:'Calendar',href:'https://example.test/calendar'};
  await client.syncPage(page);await client.detail(page);await client.hacer(page);
  assert.deepEqual(calls.map(x=>[x.action,x.page_id]),[['sync_page','calendar'],['detail','calendar'],['prepare_execution','calendar']]);
});

test('persistent project grant is an explicit human-approved action',async()=>{
  let payload=null;const client=createChangeLoopClient({storage:storage({'prometeo.capture.workspace.secret.v1':'x'.repeat(43)}),fetchImpl:async(_u,i)=>{payload=JSON.parse(i.body);return response({ok:true,grant:{enabled:true}})}});
  await client.setProjectGrant(true);assert.deepEqual(payload,{action:'set_project_grant',enabled:true,human_approved:true});
});

test('unlinked browser fails locally before any network request',async()=>{
  let requests=0;const client=createChangeLoopClient({storage:storage(),fetchImpl:async()=>{requests++;return response({})}});
  await assert.rejects(()=>client.overview(),/WORKSPACE_NOT_LINKED/);assert.equal(requests,0);
});

test('upload is private bearer multipart transport, not a public URL payload',async()=>{
  const secret='q'.repeat(43);let seen=null;const fakeFile=new Blob(['abc'],{type:'text/plain'});Object.defineProperty(fakeFile,'name',{value:'nota.txt'});
  const client=createChangeLoopClient({storage:storage({'prometeo.capture.workspace.secret.v1':secret}),fetchImpl:async(url,init)=>{seen={url,init};return response({ok:true,attachment:{id:'a'}})}});
  await client.uploadAttachment(fakeFile,{id:'page-a',title:'A'});
  assert.match(seen.url,/\/attachment\?page_id=page-a/);assert.equal(seen.init.headers.authorization,`Bearer ${secret}`);assert.ok(seen.init.body instanceof FormData);assert.equal(seen.url.includes(secret),false);
});
