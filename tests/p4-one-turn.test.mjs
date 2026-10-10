import test from 'node:test';
import assert from 'node:assert/strict';
import {createOneTurnSubmitter, textDigest, verifyCaptureReceipt} from '../shared/capture/v1/one-turn.js';
import {createOneTurnCaptureService} from '../supabase/functions/prometeo-change-loop-v1/one-turn.ts';
import {createChangeLoopClient} from '../shared/capture/v1/change-loop.js';

const page={id:'test-page',title:'Test'}, input={text:'Mensaje de prueba inocuo',page,request_id:'request-001'};
function harness() {
  const rows=new Map(), calls=[];
  const store={getNote:async id=>structuredClone(rows.get(id)),putNote:async note=>{rows.set(note.id,structuredClone(note));calls.push('local');return note},listNotes:async()=>[...rows.values()]};
  let receipt;
  const client={hasWorkspace:()=>true,workspace:async()=>({workspace_id:'workspace-test'}),
    submitText:async ({request_id,text,execute=true})=>{calls.push('save');receipt={schema:'prometeo.capture-ack/v1',durable:true,execute,workspace_id:'workspace-test',page_id:page.id,request_id,capture_id:'capture-test',revision:1,revision_ref:'capture:capture-test:rev:1',digest:await textDigest(text)};return{receipt}},
    captureReceipt:async()=>{calls.push('read');return{receipt}},
    submitOneTurn:async ({request_id})=>{calls.push('dispatch');return{ok:true,request_id,work_item_id:'WI-TEST',return_path:'coordination/executions/WI-TEST/RETURN.json',queued_to_worker_pool:true,delivery_mode:'WORKER_POOL'}}};
  return {rows,calls,store,client,submitter:()=>createOneTurnSubmitter({store,client})};
}
test('one submit: local commit, remote ACK, independent read, then dispatch',async()=>{
  const h=harness(),s=h.submitter();const r=await s.submit(input);
  assert.equal(r.state,'QUEUED');assert(h.calls.indexOf('local')<h.calls.indexOf('save'));
  assert(h.calls.indexOf('read')<h.calls.indexOf('dispatch'));assert.equal(h.rows.size,1);
  await s.submit(input);assert.equal(h.calls.filter(x=>x==='dispatch').length,1);
});
test('double tap shares one request, changed text with same identity rejects',async()=>{
  const h=harness(),s=h.submitter();await Promise.all([s.submit(input),s.submit(input)]);
  assert.equal(h.calls.filter(x=>x==='save').length,1);assert.equal(h.calls.filter(x=>x==='dispatch').length,1);
  await assert.rejects(s.submit({...input,text:'otro texto'}),{code:'REQUEST_CONFLICT'});
});
test('in-flight conflicting duplicate cannot silently discard new text',async()=>{
  const h=harness(),s=h.submitter();const p=s.submit(input);
  await assert.rejects(s.submit({...input,text:'otro texto'}),{code:'REQUEST_CONFLICT'});await p;
});
test('no workspace persists local and never dispatches',async()=>{
  const h=harness();h.client.hasWorkspace=()=>false;
  await assert.rejects(h.submitter().submit(input),{code:'WORKSPACE_NOT_LINKED'});
  assert.equal([...h.rows.values()][0].one_turn.state,'LOCAL_ONLY');assert(!h.calls.includes('save'));
});
test('save network failure retains raw input and identity',async()=>{
  const h=harness();h.client.submitText=async()=>{throw new Error('offline')};
  await assert.rejects(h.submitter().submit(input));const note=[...h.rows.values()][0];
  assert.equal(note.text,input.text);assert.equal(note.one_turn.request_id,input.request_id);assert(!h.calls.includes('dispatch'));
});
test('missing durable flag, wrong scope, digest or revision never dispatch',async()=>{
  for(const delta of [{durable:false},{workspace_id:'other'},{page_id:'other'},{digest:'a'.repeat(64)},{revision:2},{revision_ref:'bad'}]){
    const h=harness(),original=h.client.submitText;h.client.submitText=async arg=>{const r=await original(arg);return {receipt:{...r.receipt,...delta}}};
    await assert.rejects(h.submitter().submit(input),{code:'CAPTURE_ACK_INVALID'});assert(!h.calls.includes('dispatch'));
  }
});
test('read-after-write failure never claims private persistence',async()=>{
  const h=harness();h.client.captureReceipt=async()=>{throw new Error('read unavailable')};
  await assert.rejects(h.submitter().submit(input));assert(!h.calls.includes('dispatch'));
  assert.equal([...h.rows.values()][0].one_turn.state,'LOCAL_ONLY');
});
test('dispatch failure is recoverable by a new submitter without transcript',async()=>{
  const h=harness(),dispatch=h.client.submitOneTurn;h.client.submitOneTurn=async()=>{throw new Error('lost response')};
  await assert.rejects(h.submitter().submit(input));assert.equal([...h.rows.values()][0].one_turn.state,'DISPATCH_PENDING');
  h.client.submitOneTurn=dispatch;const recovered=await h.submitter().recover(page);
  assert.equal(recovered[0].state,'QUEUED');assert.equal(recovered[0].request_id,input.request_id);assert.equal(h.rows.size,1);
});
test('explicit security denial is durable and not retried, including fresh submitter',async()=>{
  const h=harness();let calls=0;h.client.submitText=async()=>{calls++;throw Object.assign(new Error('denied'),{status:403,code:'DENIED'})};
  await assert.rejects(h.submitter().submit(input));await h.submitter().recover(page);
  await assert.rejects(h.submitter().submit(input),{code:'DENIED'});assert.equal(calls,1);
});
test('workspace relink never sends previous private note to another workspace',async()=>{
  const h=harness();h.client.submitText=async()=>{throw new Error('offline')};await assert.rejects(h.submitter().submit(input));
  h.client.workspace=async()=>({workspace_id:'another-workspace'});
  await assert.rejects(h.submitter().submit(input),{code:'WORKSPACE_CHANGED'});
});
test('local disk failure prevents external write',async()=>{
  const h=harness();h.store.putNote=async()=>{throw new Error('quota exceeded')};
  await assert.rejects(h.submitter().submit(input));assert(!h.calls.includes('save'));
});
test('other page recovery cannot dispatch this page',async()=>{
  const h=harness();h.client.hasWorkspace=()=>false;await assert.rejects(h.submitter().submit(input));
  h.client.hasWorkspace=()=>true;assert.deepEqual(await h.submitter().recover({id:'other-page'}),[]);
});
test('malformed dispatch ACK keeps input pending',async()=>{
  const h=harness();h.client.submitOneTurn=async()=>({ok:true,queued_to_worker_pool:true});
  await assert.rejects(h.submitter().submit(input),{code:'DISPATCH_ACK_INVALID'});
  assert.equal([...h.rows.values()][0].one_turn.state,'DISPATCH_PENDING');
});
test('HTTP transport keeps secret and message out of URL; no retry on denial',async()=>{
  const calls=[],client=createChangeLoopClient({endpoint:'https://example.test/private',storage:{getItem:()=> 'fixture-workspace-capability-'.repeat(2)},fetchImpl:async (url,options)=>{calls.push({url,options});return new Response(JSON.stringify({error:'DENIED'}),{status:403})}});
  await assert.rejects(client.submitText({...input}),{status:403});assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://example.test/private');assert.equal(JSON.parse(calls[0].options.body).text,input.text);
  assert.equal(calls[0].options.cache,'no-store');assert(calls[0].options.headers.authorization.startsWith('Bearer '));
});

// DB doubles exercise the service's actual code; these are NOT production receipts.
function dbHarness() {
  const tables=new Map(), faults=new Map();
  const db={from(name){
    const filters=[];let inserted=null;
    const query={select(){return query},eq(k,v){filters.push([k,v]);return query},insert(row){inserted=structuredClone(row);return query},
      async maybeSingle(){return run()},then(resolve,reject){return run().then(resolve,reject)}};
    async function run(){
      if(faults.has(name)){const error=faults.get(name);faults.delete(name);return{error}}
      const rows=tables.get(name)||[];tables.set(name,rows);
      if(inserted){const keys=name==='prometeo_captures'?['workspace_id','id']:['workspace_id','capture_id','revision'];
        if(rows.some(x=>keys.every(k=>x[k]===inserted[k])))return{error:{code:'23505'}};rows.push(inserted);return{data:null,error:null}}
      return{data:rows.find(x=>filters.every(([k,v])=>x[k]===v))||null,error:null};
    }
    return query;
  }};
  const sha=value=>textDigest(typeof value==='string'?value:JSON.stringify(value));
  const fail=(code,status)=>{throw Object.assign(new Error(code),{code,status})};
  return{tables,faults,service:createOneTurnCaptureService({db,sha,fail,nowISO:()=>new Date().toISOString()})};
}
const ws={id:'workspace-test'},body={page_id:page.id,request_id:input.request_id,text:input.text};
test('capture service produces same verified immutable revision on retry',async()=>{
  const h=dbHarness(),a=await h.service.save(ws,body),b=await h.service.save(ws,body);
  assert.deepEqual(a,b);assert.equal(h.tables.get('prometeo_captures').length,1);assert.equal(h.tables.get('prometeo_capture_revisions').length,1);
  verifyCaptureReceipt(a,{workspace_id:ws.id,page_id:page.id,request_id:input.request_id,digest:await textDigest(input.text)});
});
test('service duplicate conflict cannot overwrite human text',async()=>{
  const h=dbHarness();await h.service.save(ws,body);await assert.rejects(h.service.save(ws,{...body,text:'otra entrada'}),{code:'REQUEST_CONFLICT'});
  assert.equal(h.tables.get('prometeo_captures')[0].transcript,body.text);
});
test('partial capture write: retry repairs missing revision, never ACKs early',async()=>{
  const h=dbHarness();h.faults.set('prometeo_capture_revisions',{code:'NETWORK_FAILURE'});
  await assert.rejects(h.service.save(ws,body));assert.equal(h.tables.get('prometeo_captures').length,1);
  await assert.rejects(h.service.receipt(ws,body),{code:'CAPTURE_NOT_DURABLE'});
  const ack=await h.service.save(ws,body);assert(ack.durable);assert.equal(h.tables.get('prometeo_captures').length,1);
});
test('service refuses cross-workspace and cross-page reads',async()=>{
  const h=dbHarness();await h.service.save(ws,body);
  await assert.rejects(h.service.receipt({id:'other'},body),{code:'CAPTURE_NOT_FOUND'});
  await assert.rejects(h.service.receipt(ws,{...body,page_id:'other'}),{code:'CAPTURE_NOT_FOUND'});
});
test('full request IDs survive old 120-character collision and page separation',async()=>{
  const h=dbHarness(),prefix='x'.repeat(125);
  const a=await h.service.save(ws,{...body,request_id:prefix+'a'}),b=await h.service.save(ws,{...body,request_id:prefix+'b'}),c=await h.service.save(ws,{...body,page_id:'other'});
  assert.notEqual(a.capture_id,b.capture_id);assert.notEqual(a.capture_id,c.capture_id);
});
test('service cannot ACK archived, changed or corrupted revision data',async()=>{
  for(const mutate of [h=>h.tables.get('prometeo_captures')[0].archive_state='ARCHIVED',h=>h.tables.get('prometeo_capture_revisions')[0].transcript='corrupt',h=>h.tables.get('prometeo_captures')[0].privacy='PUBLIC']){
    const h=dbHarness();await h.service.save(ws,body);mutate(h);await assert.rejects(h.service.receipt(ws,body));
  }
});
