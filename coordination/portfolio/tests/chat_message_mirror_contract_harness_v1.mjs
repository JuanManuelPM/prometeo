import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const argv=process.argv.slice(2);
const flag=(name)=>argv.includes(name);
const value=(name,fallback=null)=>{
  const i=argv.indexOf(name);
  return i>=0 && i+1<argv.length ? argv[i+1] : fallback;
};

const repoRoot=path.resolve(value('--repo-root',process.cwd()));
const pagesRootRaw=value('--pages-root',process.env.CHAT_MIRROR_PAGES_ROOT||null);
const pagesRoot=pagesRootRaw ? path.resolve(pagesRootRaw) : null;
const fixtureOnly=flag('--fixture-only');
const jsonOutput=flag('--json');

const CONTRACT_REL='coordination/portfolio/derived/prometeo-autonomous-growth/CHAT_MESSAGE_MIRROR_CANARY_V1.json';
const FIXTURE_REL='coordination/portfolio/fixtures/chat_message_mirror_contract_harness_v1.json';
const PAGE_REL='current-tree/control-v11/chat-canary/index.html';

const result={
  schema:'prometeo.chat-message-mirror-contract-harness-result/v1',
  observed_at:new Date().toISOString(),
  fixture:'NOT_RUN',
  real_thread:'NOT_RUN',
  thread_parity:'NOT_RUN',
  page_static:'NOT_RUN',
  overall:'RUNNING',
  details:{}
};

const readText=(root,rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=(root,rel)=>fs.existsSync(path.join(root,rel));
const fail=(name,error)=>{
  result[name]='FAIL';
  result.details[name]={error:String(error?.message||error)};
};
const pass=(name,details={})=>{
  result[name]='PASS';
  result.details[name]=details;
};
const notReady=(name,reason)=>{
  result[name]='NOT_READY';
  result.details[name]={reason};
};

function terminalSentenceCount(text){
  return (String(text).trim().match(/[.!?]+(?=\s|$)/g)||[]).length;
}

function assertRequiredMessageFields(contract,message,label){
  for(const field of contract.message_projection_contract.required){
    assert.ok(Object.prototype.hasOwnProperty.call(message,field),`${label}: missing required field ${field}`);
    assert.notEqual(message[field],null,`${label}: required field ${field} is null`);
    assert.notEqual(message[field],'',`${label}: required field ${field} is empty`);
  }
}

function validateThread(contract,thread,label){
  assert.equal(thread.schema,'prometeo.chat-thread-projection/v1',`${label}: wrong schema`);
  assert.equal(thread.projection_status,'NON_AUTHORITATIVE',`${label}: projection must stay NON_AUTHORITATIVE`);
  assert.equal(thread.chat_object_id,contract.chat_object_id,`${label}: chat_object_id mismatch`);
  assert.ok(Array.isArray(thread.messages),`${label}: messages must be an array`);
  assert.ok(thread.updated_at,`${label}: updated_at required`);

  const byId=new Map();
  thread.messages.forEach((message,index)=>{
    assertRequiredMessageFields(contract,message,`${label}.messages[${index}]`);
    assert.equal(message.chat_object_id,contract.chat_object_id,`${label}.messages[${index}]: chat_object_id mismatch`);
    assert.equal(message.privacy,'PUBLIC_SANITIZED_CANARY',`${label}.messages[${index}]: privacy boundary mismatch`);
    assert.ok(!byId.has(message.message_id),`${label}: duplicate message_id ${message.message_id}`);
    byId.set(message.message_id,message);
  });

  const expectedHuman=contract.human_test_message;
  const humans=thread.messages.filter(m=>m.actor_type==='HUMAN' && m.message_id===expectedHuman.message_id);
  assert.equal(humans.length,1,`${label}: expected exactly one canonical human test message`);
  const human=humans[0];
  for(const field of ['message_id','actor_type','body_kind','body_text','privacy']){
    assert.equal(human[field],expectedHuman[field],`${label}: human field ${field} diverged from contract`);
  }

  const workers=thread.messages.filter(m=>m.actor_type==='WORKER');
  assert.ok(workers.length>=1,`${label}: expected at least one WORKER reply`);
  for(const [index,workerMessage] of workers.entries()){
    assert.ok(workerMessage.reply_to_message_id,`${label}.workers[${index}]: reply lineage required`);
    const parent=byId.get(workerMessage.reply_to_message_id);
    assert.ok(parent,`${label}.workers[${index}]: reply parent missing`);
    assert.equal(parent.actor_type,'HUMAN',`${label}.workers[${index}]: reply parent must be HUMAN`);
    assert.equal(workerMessage.body_kind,'TEXT',`${label}.workers[${index}]: body_kind must be TEXT`);
    assert.ok(String(workerMessage.body_text||'').trim(),`${label}.workers[${index}]: body_text must be useful/non-empty`);
    assert.ok(workerMessage.actor_ref || workerMessage.result_ref,`${label}.workers[${index}]: actor_ref and/or result_ref traceability required`);
    assert.equal(workerMessage.status,'PUBLISHED',`${label}.workers[${index}]: message must be PUBLISHED`);
  }

  // The original contract canary stays strict even as the real thread grows.
  const canonicalWorkers=workers.filter(m=>m.reply_to_message_id===expectedHuman.message_id);
  assert.equal(canonicalWorkers.length,1,`${label}: expected exactly one canonical WORKER reply to the canonical human test message`);
  const worker=canonicalWorkers[0];
  assert.equal(worker.body_kind,'TEXT',`${label}: canonical WORKER body_kind must be TEXT`);
  assert.ok(String(worker.body_text||'').trim(),`${label}: canonical WORKER body_text must be useful/non-empty`);
  assert.equal(terminalSentenceCount(worker.body_text),1,`${label}: canonical WORKER reply must be exactly one sentence`);
  assert.ok(worker.actor_ref || worker.result_ref,`${label}: canonical WORKER must expose actor_ref and/or result_ref traceability`);
  assert.equal(worker.status,'PUBLISHED',`${label}: canonical WORKER message must be PUBLISHED`);

  return {
    message_count:thread.messages.length,
    worker_count:workers.length,
    human_message_id:human.message_id,
    worker_message_id:worker.message_id,
    worker_reply_to:worker.reply_to_message_id,
    trace_ref:worker.result_ref||worker.actor_ref
  };
}

function validatePage(contract,html,label){
  const expectedThread=contract.thread_path_pages;
  assert.ok(html.includes(expectedThread),`${label}: expected public thread path not referenced`);
  assert.match(html,/\bfetch\s*\(/,`${label}: page must read the durable thread`);
  assert.match(html,/WAITING/,`${label}: WAITING state must be explicit`);
  assert.doesNotMatch(html,/<(?:form|input|textarea)\b/i,`${label}: approved composer must stay modular; index may not inline raw form/input/textarea markup`);
  assert.match(html,/id=["']chatComposer["']/,`${label}: approved chat composer host is required`);
  assert.match(html,/src=["']\.\.\/ingress-v1\.js["']/,`${label}: existing ingress facade must load before composer`);
  assert.match(html,/src=["']\.\/input-module-v1\.js["']/,`${label}: approved fail-closed input module is required`);
  assert.match(html,/src=["']\.\/progress-v1\.js["']/,`${label}: durable progress module is required`);
  assert.match(html,/PROMETEO_CHAT_CANARY_INPUT_V1/,`${label}: reviewed composer global must be referenced`);
  assert.match(html,/composerApi\.mount/,`${label}: composer must mount through the reviewed module API`);
  assert.match(html,/id=["']chat-canary-progress["']/,`${label}: durable Work Unit progress host is required`);
  assert.doesNotMatch(html,/\b(?:EventSource|WebSocket|ReadableStream)\b/,`${label}: streaming surface is forbidden`);
  const intervalCount=(html.match(/\bsetInterval\s*\(/g)||[]).length;
  assert.equal(intervalCount,2,`${label}: only the bounded thread + RUN-progress pollers are allowed`);
  assert.match(html,/setInterval\(\(\) => load\(\), 10000\)/,`${label}: thread polling must stay at 10s`);
  assert.match(html,/Math\.max\(10000, Number\(block\.poll_ms \|\| 10000\)\)/,`${label}: RUN-progress polling must enforce a >=10s floor`);
  assert.doesNotMatch(html,/method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i,`${label}: index may not bypass the ingress facade with direct mutation requests`);
  assert.doesNotMatch(html,/supabase\.co|\/functions\/v1\/|\/api\//i,`${label}: index may not embed backend endpoint references`);
  return {
    thread_path:expectedThread,
    waiting_state:true,
    bidirectional_input:'APPROVED_FAIL_CLOSED_MODULE',
    direct_input_markup:false,
    ingress_facade:true,
    progress_module:true,
    streaming:false,
    auto_polling:'BOUNDED_READ_ONLY_10S',
    direct_mutation_requests:false,
    embedded_backend_endpoint:false
  };
}

function compareBytes(a,b,label){
  const left=Buffer.from(a,'utf8');
  const right=Buffer.from(b,'utf8');
  assert.equal(left.equals(right),true,`${label}: main/gh-pages bytes diverge`);
  return {bytes:left.length,identical:true};
}

let contract;
try{
  contract=JSON.parse(readText(repoRoot,CONTRACT_REL));
  const fixture=JSON.parse(readText(repoRoot,FIXTURE_REL));
  assert.equal(fixture.schema,'prometeo.chat-message-mirror-harness-fixture/v1','fixture schema mismatch');
  assert.equal(fixture.contract_ref,CONTRACT_REL,'fixture contract_ref mismatch');
  pass('fixture',validateThread(contract,fixture.thread,'fixture.thread'));
}catch(error){
  fail('fixture',error);
}

if(!fixtureOnly && result.fixture==='PASS'){
  const threadRel=contract.thread_path_main;

  if(!exists(repoRoot,threadRel)){
    notReady('real_thread',`main thread missing: ${threadRel}`);
  }else{
    try{
      const thread=JSON.parse(readText(repoRoot,threadRel));
      pass('real_thread',validateThread(contract,thread,'main.thread'));
    }catch(error){
      fail('real_thread',error);
    }
  }

  if(!exists(repoRoot,PAGE_REL)){
    notReady('page_static',`main page missing: ${PAGE_REL}`);
  }else{
    try{
      pass('page_static',validatePage(contract,readText(repoRoot,PAGE_REL),'main.page'));
    }catch(error){
      fail('page_static',error);
    }
  }

  if(!pagesRoot){
    notReady('thread_parity','--pages-root / CHAT_MIRROR_PAGES_ROOT not supplied; parity is not claimed');
  }else{
    const pagesThreadRel=contract.thread_path_pages;
    if(!exists(repoRoot,threadRel) || !exists(pagesRoot,pagesThreadRel)){
      notReady('thread_parity','thread missing on main or gh-pages checkout');
    }else{
      try{
        pass('thread_parity',compareBytes(
          readText(repoRoot,threadRel),
          readText(pagesRoot,pagesThreadRel),
          'thread parity'
        ));
      }catch(error){
        fail('thread_parity',error);
      }
    }
  }
}

const checked=['fixture',...(fixtureOnly?[]:['real_thread','thread_parity','page_static'])];
if(checked.some(name=>result[name]==='FAIL')) result.overall='FAIL';
else if(checked.some(name=>result[name]==='NOT_READY')) result.overall='NOT_READY';
else result.overall='PASS';

if(jsonOutput) console.log(JSON.stringify(result,null,2));
else{
  for(const name of checked) console.log(`${name}: ${result[name]}`);
  console.log(`overall: ${result.overall}`);
}
if(result.overall==='FAIL') process.exitCode=1;
