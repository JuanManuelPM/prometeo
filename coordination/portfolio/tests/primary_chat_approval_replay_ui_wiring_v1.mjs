import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ingress = fs.readFileSync('current-tree/control-v11/ingress-v1.js', 'utf8');
const server = fs.readFileSync('supabase/functions/prometeo-change-loop-v1/index.ts', 'utf8');
const chat = fs.readFileSync('current-tree/control-v11/chat-canary/index.html', 'utf8');

function runtime(mode='new') {
  const calls=[];
  const store=new Map([['prometeo.capture.workspace.secret.v2','x'.repeat(40)]]);
  const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
  const response=(data,ok=true,status=200)=>({ok,status,async json(){return data;}});
  async function fetch(url,opts={}) {
    const body=JSON.parse(opts.body||'{}');
    calls.push({url:String(url),body});
    if(String(url).includes('prometeo-change-loop-v1')) {
      if(body.action==='approval_replay_status') {
        if(mode==='replay') return response({ok:true,status:'QUEUED_REPLAY',replayed:true,return_path:'coordination/executions/WI-OLD/RETURN.json',work_item_id:'WI-OLD'});
        if(mode==='conflict') return response({error:'APPROVAL_REPLAY_CONFLICT'},false,409);
        return response({ok:true,status:'NEW_APPROVAL',replayed:false});
      }
      if(body.action==='prepare_execution') return response({ok:true,queued_to_worker_pool:true,work_item_id:'WI-NEW',return_path:'coordination/executions/WI-NEW/RETURN.json'});
    }
    if(String(url).includes('prometeo-capture')) return response({ok:true});
    if(String(url).includes('worker-lab.vercel.app')) return response({schema:'prometeo.ingress-transport-result/v1',status:'QUEUED',ref:'coordination/executions/WI-NEW/RETURN.json',queued:true,error:null});
    throw new Error('unexpected url '+url);
  }
  const context={console,fetch,localStorage,AbortController,setTimeout,clearTimeout,Date,Math,JSON,RegExp,Object,String,Number,Promise,Error,Event:class Event{},location:{href:'https://juanmanuelpm.github.io/prometeo/current-tree/control-v11/chat-canary/'},crypto:{randomUUID:()=> 'rnd'}};
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(ingress,context);
  return {api:context.PROMETEO_INGRESS_V1,calls};
}

const page={page_id:'control-v11-chat-canary',title:'Prometeo',project_id:'prometeo-autonomous-growth',target_path:'current-tree/control-v11/chat-canary/'};
const approval={schema:'prometeo.primary-chat-approval/v1',decision:'APPROVED',approval_id:'APR-CROSS-1',proposal_id:'PLAN-1',proposal_digest:'a'.repeat(64),approved_at:'2026-10-01T23:00:00Z'};

{
  const {api,calls}=runtime('replay');
  const out=await api.submitApprovedPlan({text:'APPROVED PLAN · PLAN-1 · '+approval.proposal_digest,page,approval});
  assert.equal(out.status,'QUEUED_REPLAY');
  assert.equal(out.queued,true);
  assert.equal(calls.length,1,'server replay must stop before Capture and wake');
  assert.equal(calls[0].body.action,'approval_replay_status');
}

{
  const {api,calls}=runtime('conflict');
  const out=await api.submitApprovedPlan({text:'APPROVED PLAN · PLAN-1 · '+approval.proposal_digest,page,approval});
  assert.equal(out.status,'BOUNDARY_APPROVAL_REPLAY_CONFLICT');
  assert.equal(out.queued,false);
  assert.equal(calls.length,1,'digest conflict must fail before Capture and wake');
}

{
  const {api,calls}=runtime('new');
  const out=await api.submitApprovedPlan({text:'APPROVED PLAN · PLAN-1 · '+approval.proposal_digest,page,approval});
  assert.equal(out.queued,true);
  assert.deepEqual(calls.map(x=>x.body.action||x.body.schema),[
    'approval_replay_status',
    'sync_capture',
    'prepare_execution',
    'prometeo.primary-chat-page-change-wake/v1'
  ]);
  assert.equal(JSON.stringify(calls.at(-1).body).includes('APPROVED PLAN'),false,'wake must stay sanitized');
}

assert.match(server,/async function approvalReplayStatus\(/);
assert.match(server,/APPROVAL_REPLAY_CONFLICT/);
assert.match(server,/existingApprovalExecution\(ws\.id,pageId,approval\)/);
assert.match(server,/case'approval_replay_status'/);
assert.ok(server.indexOf("const approval=executionApproval(body.approval)") < server.indexOf('const thread=await syncPage'), 'server replay check must happen before materialization');

assert.match(chat,/block\.type === 'approval'/);
assert.match(chat,/submitApprovedPlan/);
assert.match(chat,/decision: 'APPROVED'/);
assert.match(chat,/no aprobado · no se envió nada/);
assert.equal(chat.includes('block.raw_plan_text'),false,'raw plan text must not be wired from public projection');
assert.match(chat,/const marker = 'APPROVED PLAN · ' \+ proposalId \+ ' · ' \+ proposalDigest/);

console.log('PASS primary_chat_approval_replay_ui_wiring_v1');
