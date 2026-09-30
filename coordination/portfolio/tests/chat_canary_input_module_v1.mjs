#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.argv[2]||'.');
const source=fs.readFileSync(path.join(root,'current-tree/control-v11/chat-canary/input-module-v1.js'),'utf8');
const sandbox={};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'input-module-v1.js'});
const api=sandbox.PROMETEO_CHAT_CANARY_INPUT_V1;
assert(api,'module must install PROMETEO_CHAT_CANARY_INPUT_V1');
assert.equal(api.schema,'prometeo.chat-canary-input/v1');

const secret='texto privado que debe preservarse';

const success=await api.submitText({
  text:secret,
  ingress:{submit:async()=>({status:'QUEUED',queued:true,ref:'coordination/ingress/requests/REQ-CHAT-001.json'})}
});
assert.equal(success.queued,true);
assert.equal(success.clear_input,true);
assert.equal(success.ref,'coordination/ingress/requests/REQ-CHAT-001.json');
assert.equal(Object.prototype.hasOwnProperty.call(success,'text'),false);

const auth=await api.submitText({text:secret,ingress:null});
assert.equal(auth.status,'BOUNDARY_AUTH_REQUIRED');
assert.equal(auth.queued,false);
assert.equal(auth.clear_input,false);

const failure=await api.submitText({
  text:secret,
  ingress:{submit:async()=>{const error=new Error('network');error.code='NETWORK_DOWN';throw error;}}
});
assert.equal(failure.status,'BOUNDARY_TRANSPORT_FAILED');
assert.equal(failure.queued,false);
assert.equal(failure.clear_input,false);
assert.equal(failure.error,'NETWORK_DOWN');

const invalid=await api.submitText({
  text:secret,
  ingress:{submit:async()=>({status:'QUEUED',queued:true,ref:'memory://not-durable'})}
});
assert.equal(invalid.status,'BOUNDARY_TRANSPORT_INVALID');
assert.equal(invalid.queued,false);
assert.equal(invalid.clear_input,false);
assert.equal(invalid.ref,null);

const notQueuedWithRef=await api.submitText({
  text:secret,
  ingress:{submit:async()=>({status:'BOUNDARY_AUTH_REQUIRED',queued:false,ref:'coordination/ingress/requests/REQ-NOT-QUEUED.json',error:'AUTH_BRIDGE_REQUIRED'})}
});
assert.equal(notQueuedWithRef.queued,false);
assert.equal(notQueuedWithRef.clear_input,false);
assert.equal(notQueuedWithRef.ref,'coordination/ingress/requests/REQ-NOT-QUEUED.json');

for(const key of ['root','form','input','submit','status']) assert.ok(api.dom_contract[key]);
console.log('CHAT_CANARY_INPUT_MODULE_V1_PASS');
