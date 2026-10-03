'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const helperCode = fs.readFileSync('current-tree/control-v11/chat-canary/private-correlation-v1.js','utf8');
const ingressCode = fs.readFileSync('current-tree/control-v11/ingress-v1.js','utf8');
const inputCode = fs.readFileSync('current-tree/control-v11/chat-canary/input-module-v1.js','utf8');
class Storage {
  constructor(seed={}) { this.map = new Map(Object.entries(seed)); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k,v) { this.map.set(k,String(v)); }
  removeItem(k) { this.map.delete(k); }
}
const workItemId = 'page-change:pc-1234';
const returnPath = 'coordination/portfolio/returns/page-change/RETURN-pc-1234.json';
function context(sessionStorage = new Storage()) {
  const localStorage = new Storage({'prometeo.capture.workspace.secret.v2':'x'.repeat(40)});
  const ctx = {console,Date,Math,JSON,Object,Array,String,RegExp,Promise,Error,URL,TextEncoder,TextDecoder,setTimeout,clearTimeout,setInterval,clearInterval,localStorage,sessionStorage,location:{href:'https://example.invalid/chat'},crypto:{randomUUID:()=> 'req-1'}};
  ctx.globalThis = ctx; ctx.window = ctx; return vm.createContext(ctx);
}
function load(ctx, code, name) { vm.runInContext(code, ctx, {filename:name}); }
function queued(id=workItemId, path=returnPath) {
  return {schema:'prometeo.ingress-transport-result/v1',status:'QUEUED',ref:path,queued:true,error:null,work_item_id:id,return_path:path};
}
(async()=>{
  const shared = new Storage();
  const ctx = context(shared);
  load(ctx, helperCode, 'private-correlation-v1.js');
  ctx.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 = {submit:async()=>queued()};
  load(ctx, ingressCode, 'ingress-v1.js');
  load(ctx, inputCode, 'input-module-v1.js');

  const ingress = await ctx.PROMETEO_INGRESS_V1.submit({text:'private payload never retained',page:{page_id:'control-v11-chat-canary'}});
  assert.equal(ingress.queued,true);
  assert.equal(ingress.work_item_id,workItemId);
  assert.equal(ingress.return_path,returnPath);
  assert.equal(ingress.ref,returnPath);

  const first = await ctx.PROMETEO_CHAT_CANARY_INPUT_V1.submitText({text:'human private text',ingress:ctx.PROMETEO_INGRESS_V1});
  assert.equal(first.queued,true);
  assert.equal(first.correlation.work_item_id,workItemId);
  assert.equal(first.correlation.return_path,returnPath);
  const helper = ctx.PROMETEO_PRIMARY_CHAT_PRIVATE_CORRELATION_V1;
  const rawStored = shared.getItem(helper.storage_key);
  assert.ok(rawStored);
  assert.equal(rawStored.includes('human private text'),false);
  assert.equal(rawStored.includes('private payload never retained'),false);

  const replay = await ctx.PROMETEO_CHAT_CANARY_INPUT_V1.submitText({text:'same pair replay',ingress:ctx.PROMETEO_INGRESS_V1});
  assert.equal(replay.queued,true);
  assert.equal(replay.correlation.return_path,returnPath);
  assert.equal(shared.getItem(helper.storage_key),rawStored);

  const reload = context(shared);
  load(reload, helperCode, 'private-correlation-v1.js#reload');
  reload.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 = {submit:async()=>queued()};
  load(reload, inputCode, 'input-module-v1.js#reload');
  const restored = reload.PROMETEO_CHAT_CANARY_INPUT_V1.getRetainedCorrelation();
  assert.equal(restored.work_item_id,workItemId);
  assert.equal(restored.return_path,returnPath);

  ctx.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 = {submit:async()=>queued('page-change:other', returnPath)};
  const mismatch = await ctx.PROMETEO_CHAT_CANARY_INPUT_V1.submitText({text:'mismatch',ingress:ctx.PROMETEO_INGRESS_V1});
  assert.equal(mismatch.queued,false);
  assert.equal(mismatch.error,'CORRELATION_CONFLICT');
  assert.equal(shared.getItem(helper.storage_key),rawStored);

  ctx.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 = {submit:async()=>queued(workItemId,'coordination/executions/page-change:pc-1234/RETURN.json')};
  const wrongAuthority = await ctx.PROMETEO_INGRESS_V1.submit({text:'wrong authority',page:{page_id:'control-v11-chat-canary'}});
  assert.equal(wrongAuthority.queued,false);
  assert.ok(String(wrongAuthority.error||'').includes('PRIVATE_CORRELATION'));
  assert.equal(shared.getItem(helper.storage_key),rawStored);

  assert.equal(ctx.PROMETEO_CHAT_CANARY_INPUT_V1.correlation_schema,'prometeo.primary-chat-private-correlation/v1');
  console.log('PRIMARY_CHAT_PRIVATE_CORRELATION_WIRING_V1 PASS');
})().catch(err=>{console.error(err);process.exit(1);});
