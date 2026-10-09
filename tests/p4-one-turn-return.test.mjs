import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createChangeLoopClient} from '../shared/capture/v1/change-loop.js';

// Exercise the existing handler itself. DB doubles never constitute a private ACK.
const source=await readFile(new URL('../supabase/functions/prometeo-change-loop-v1/index.ts',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('async function ingestResult('),source.indexOf('async function publicResult('));
function harness(){
  const tables=new Map(),faults=new Map();
  const db={from(name){let op='read',row,filters=[];
    const q={select(){return q},eq(k,v){filters.push([k,v]);return q},in(k,v){filters.push([k,v]);return q},insert(v){op='insert';row=structuredClone(v);return q},update(v){op='update';row=structuredClone(v);return q},upsert(v){op='upsert';row=structuredClone(v);return q},single(){return run()},maybeSingle(){return run()},then(a,b){return run().then(a,b)}};
    async function run(){
      if(faults.has(name)){const error=faults.get(name);faults.delete(name);return{error}}
      const rows=tables.get(name)||[];tables.set(name,rows);
      const matches=x=>filters.every(([k,v])=>Array.isArray(v)?v.includes(x[k]):x[k]===v);
      if(op==='read')return{data:structuredClone(rows.find(matches)||null),error:null};
      if(op==='insert'){
        if(rows.some(x=>x.work_item_id===row.work_item_id))return{error:{code:'23505'}};
        row.id='result-fixture';rows.push(row);return{data:structuredClone(row),error:null};
      }
      if(op==='update'){for(const x of rows.filter(matches))Object.assign(x,row);return{data:null,error:null}}
      throw new Error('unexpected operation');
    }return q;
  }};
  const ctx=vm.createContext({db,TERMINAL:new Set(['CANDIDATE_READY','VERIFIED','SERVED','BLOCKED','FAILED']),SUCCESS:new Set(['CANDIDATE_READY','VERIFIED','SERVED']),nowISO:()=>new Date().toISOString(),sha:async x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),fail:(code,status)=>{throw Object.assign(new Error(code),{code,status})}});
  vm.runInContext(stripTypeScriptTypes(handler),ctx);
  const packet={id:'packet',workspace_id:'ws',thread_id:'thread',page_id:'page',work_item_id:'WI-FIXTURE',selected_revision_refs:['capture:c:rev:1'],selected_attachment_ids:[],return_path:'coordination/executions/WI-FIXTURE/RETURN.json',snapshot:{intent:{input_receipt:{durable:true}},authorization:{delivery_mode:'WORKER_POOL'}}};
  tables.set('prometeo_execution_packets',[structuredClone(packet)]);
  tables.set('prometeo_change_threads',[{id:'thread'}]);
  tables.set('prometeo_change_thread_captures',[{workspace_id:'ws',thread_id:'thread',revision_ref:'capture:c:rev:1',state:'SUBMITTED'}]);
  return{tables,faults,packet,submit:payload=>ctx.ingestResult(packet,payload,'HTTP_RETURN')};
}
const result={work_item_id:'WI-FIXTURE',status:'CANDIDATE_READY',summary:'Resultado fixture',candidate_url:'https://example.test/candidate',finished_at:'2026-10-09T00:00:00Z'};
test('same RETURN replay preserves row identity, seen state and original timestamp',async()=>{
  const h=harness(),a=await h.submit(result),stored=h.tables.get('prometeo_execution_results')[0];stored.seen_at='2026-10-09T01:00:00Z';
  const b=await h.submit(result);assert.equal(a.id,b.id);assert.equal(b.seen_at,stored.seen_at);assert.equal(b.created_at,result.finished_at);assert.equal(h.tables.get('prometeo_execution_results').length,1);
});
test('conflicting RETURN cannot overwrite previously accepted response',async()=>{
  const h=harness();await h.submit(result);await assert.rejects(h.submit({...result,summary:'Changed'}),{code:'RESULT_REPLAY_CONFLICT'});
  assert.equal(h.tables.get('prometeo_execution_results')[0].summary.text,result.summary);
});
test('replay repairs interrupted metadata updates; first failed update cannot ACK',async()=>{
  const h=harness();h.faults.set('prometeo_execution_packets',{code:'OFFLINE'});await assert.rejects(h.submit(result));
  assert.equal(h.tables.get('prometeo_change_thread_captures')[0].state,'SUBMITTED');
  const ack=await h.submit(result);assert(ack.detail.submission_digest);assert.equal(h.tables.get('prometeo_change_thread_captures')[0].state,'METABOLIZED');
});
test('concurrent identical RETURNs converge to one durable response',async()=>{
  const h=harness(),responses=await Promise.all([h.submit(result),h.submit(result)]);
  assert.equal(responses[0].id,responses[1].id);assert.equal(h.tables.get('prometeo_execution_results').length,1);
});
test('builder cannot certify its own worker-pool publication',async()=>{
  const h=harness(),r=await h.submit({...result,status:'SERVED'});
  assert.equal(r.status,'CANDIDATE_READY');assert.equal(r.detail.independent_verification_required,true);
});
test('old producer replay preserves independent verification and served identity',async()=>{
  const h=harness();await h.submit(result);Object.assign(h.tables.get('prometeo_execution_results')[0],{status:'SERVED',served_url:'https://example.test/verified'});
  const r=await h.submit(result);assert.equal(r.status,'SERVED');assert.equal(h.tables.get('prometeo_execution_packets')[0].served_url,r.served_url);
});
test('denied JSON transport cannot switch to attachment upload',async()=>{
  let calls=0;const client=createChangeLoopClient({storage:{getItem:()=> 'test-capability-'.repeat(4)},fetchImpl:async()=>{calls++;return new Response('{"error":"DENIED"}',{status:403})}});
  await assert.rejects(client.workspace(),{status:403});await assert.rejects(client.uploadAttachment(new File(['x'],'x.txt'),{id:'page'}),{code:'TRANSPORT_DENIED'});assert.equal(calls,1);
});
test('denied upload cannot switch to JSON transport and exposes status',async()=>{
  let calls=0;const client=createChangeLoopClient({storage:{getItem:()=> 'test-capability-'.repeat(4)},fetchImpl:async()=>{calls++;return new Response('{"error":"DENIED"}',{status:401})}});
  await assert.rejects(client.uploadAttachment(new File(['x'],'x.txt'),{id:'page'}),{status:401});await assert.rejects(client.workspace(),{code:'TRANSPORT_DENIED'});assert.equal(calls,1);
});
