import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCapture,attachDurableAudio,transitionProcessing,appendTranscriptRevision,markSync,archiveCapture,revisionRef,validateCapture} from '../shared/capture/v1/capture-core.js';
import {resolveStandalonePage,assertWritableTarget,createContextSnapshot} from '../shared/capture/v1/identity.js';
import {rawCaptureRecord,transcriptNoteAtom,recentExactWindow,proposeMemoryMetabolism,commitMemoryProposal} from '../shared/capture/v1/context-memory.js';
import {createPatentV2,validatePatentV2,digest} from '../shared/capture/v1/patent-v2.js';

const context=(page='calendar',n=0)=>({page_id:page,source_path:`/prometeo/pages/${page}/`,source_href:`https://juanmanuelpm.github.io/prometeo/pages/${page}/`,source_title:page,viewport:{width:360,height:780,orientation:'portrait'},navigator:{currentNode:page,path:['prometeo','herramientas',page]},captured_at:new Date(1700000000000+n*1000).toISOString()});
async function ready(id,n=0,page='calendar'){
  let c=createCapture({id,created_at:new Date(1700000000000+n*1000).toISOString(),context:context(page,n)});
  c=attachDurableAudio(c,{digest:`audio-${id}`,mime:'audio/webm',size:1000+n,local_ref:`idb:${id}:audio`});
  c=transitionProcessing(c,'QUEUED');
  c=appendTranscriptRevision(c,{text:`observación ${n}`,state:'MACHINE',source:'whisper',model:'test-whisper',digest:`text-${id}`});
  return c;
}

test('Capture state/revision lifecycle is explicit and contiguous',async()=>{
  let c=createCapture({id:'C-1',context:context()});
  assert.equal(c.privacy,'LOCAL');assert.equal(c.processing_state,'RECORDING');
  c=attachDurableAudio(c,{digest:'a1',mime:'audio/webm',size:1400,local_ref:'idb:C-1:audio'});
  c=transitionProcessing(c,'QUEUED');c=transitionProcessing(c,'MODEL_LOADING');c=transitionProcessing(c,'TRANSCRIBING');
  c=appendTranscriptRevision(c,{text:'botón demasiado grande',state:'MACHINE',source:'whisper',model:'Xenova/whisper-small',digest:'t1'});
  c=appendTranscriptRevision(c,{text:'el botón está demasiado grande',state:'EDITED',source:'human-edit',digest:'t2'});
  c=appendTranscriptRevision(c,{text:'el botón está demasiado grande',state:'CONFIRMED',source:'human-confirm',digest:'t3'});
  c=markSync(c,'SYNCED',{remote_revision:3});
  assert.equal(c.transcript_revision,3);assert.equal(c.transcript_state,'CONFIRMED');assert.equal(c.sync_state,'SYNCED');
  assert.equal(revisionRef(c).ref,'capture:C-1:rev:3');assert.equal(validateCapture(c).ok,true);
  const archived=archiveCapture(c,{reason:'done'});assert.equal(archived.archive_state,'ARCHIVED');
});

test('Context projection never upgrades a transcript to Human Accepted',async()=>{
  const c=await ready('C-2',2);
  const raw=rawCaptureRecord(c);const atom=transcriptNoteAtom(c);
  assert.equal(raw.authority,'RAW_UNCURATED');assert.equal(raw.privacy,'LOCAL');
  assert.equal(atom.authority,'DERIVED_EVIDENCE');assert.equal(atom.transcript_state,'MACHINE');assert.equal(atom.human_accepted,false);assert.equal(atom.lineage_ids[0],`raw:capture:${c.id}`);
});

test('Recent window is exactly ten while older literals stay reopenable',async()=>{
  const captures=[];for(let i=1;i<=12;i++)captures.push(await ready(`C-${i}`,i));
  const recent=recentExactWindow(captures,{page_id:'calendar'});assert.equal(recent.length,10);assert.equal(recent[0].capture_id,'C-3');assert.equal(recent.at(-1).capture_id,'C-12');
  const proposal=proposeMemoryMetabolism({page_id:'calendar',captures,summaryText:'C-1 y C-2 establecieron observaciones históricas previas.',now:'2026-09-05T20:00:00Z'});
  assert.equal(proposal.recent_exact.length,10);assert.deepEqual(proposal.new_compacted_revision_refs,['capture:C-1:rev:1','capture:C-2:rev:1']);assert.equal(proposal.summary_authority,'DERIVED_EVIDENCE');assert.equal(proposal.reopen_handles.length,2);
  let persisted=false;const committed=await commitMemoryProposal(proposal,{persist:async()=>{persisted=true;return true}});assert.equal(persisted,true);assert.equal(committed.watermark.last_summarized_ref,'capture:C-2:rev:1');
  await assert.rejects(()=>commitMemoryProposal(proposal,{persist:async()=>false}),e=>e.code==='PROMETEO_MEMORY_WRITE_REJECTED');
});

test('Patent v2 binds exact Capture revisions, export scope and durable context',async()=>{
  const c1=await ready('PX-1',1,'calendar'),c2=await ready('PX-2',2,'jose-study');
  const selected=[c1,c2];
  const exportReceipt={schema:'prometeo.capture-export-receipt/v1',id:'EXP-1',hash:'hash-exp-1',human_approved:true,from_privacy:'LOCAL',to_privacy:'PROJECT',source_revision_refs:selected.map(c=>revisionRef(c).ref).sort(),source_digests:Object.fromEntries(selected.map(c=>[revisionRef(c).ref,revisionRef(c).digest]))};
  const memory1=proposeMemoryMetabolism({page_id:'calendar',captures:[c1],previous:null});
  const memory2=proposeMemoryMetabolism({page_id:'jose-study',captures:[c2],previous:null});
  const envelope=await createPatentV2({
    patent_code:'PAT-TEST-1',captures:selected,
    seed:{id:'SEED-1',request:'Actualizar Calendar y José',privacy:'PROJECT',source_refs:selected.map(c=>revisionRef(c).ref)},
    work_item:{id:'WORK-1',state:'WORK_ITEM',target:{page_ids:['calendar','jose-study']},dependencies:['calendar','jose-study']},
    export_receipt:exportReceipt,
    current_binding:{revision:18,digest:'current-digest',last_durable_receipt:'R-P4-01-WORKSTREAM-0019'},
    catalog_binding:{identity:'catalog-test',digest:'catalog-digest'},
    page_bindings:[{page_id:'calendar',source_identity:'source-calendar',writable_target:{kind:'repo_path',repository:'JuanManuelPM/prometeo',path:'pages/calendar/index.html'},href:'/prometeo/pages/calendar/'},{page_id:'jose-study',source_identity:'source-jose',writable_target:{kind:'repo_path',repository:'JuanManuelPM/jose-study',path:'index.html'},href:'https://juanmanuelpm.github.io/jose-study/'}],
    memories:[memory1,memory2],protocol:{id:'PROMETEO_EXHAUSTIVE_100/v2',digest:'protocol-digest'},created_at:'2026-09-05T20:00:00Z',expires_at:'2026-09-12T20:00:00Z'
  });
  assert.equal(envelope.snapshot.selected_captures.length,2);assert.equal(envelope.snapshot.selected_captures[0].privacy_transport,'PROJECT');
  assert.equal(envelope.snapshot.affected_pages.length,2);assert.equal((await validatePatentV2(envelope,{now:new Date('2026-09-06').getTime()})).ok,true);
  const tampered=structuredClone(envelope);tampered.snapshot.selected_captures[0].transcript='tampered';await assert.rejects(()=>validatePatentV2(tampered),e=>e.code==='PROMETEO_PATENT_HASH');
});

test('Page identity is Catalog based and writable target fails closed',()=>{
  const catalog={pages:[{id:'calendar',title:'Calendar',href:'https://juanmanuelpm.github.io/prometeo/pages/calendar/',writable_target:{kind:'repo_path',repository:'JuanManuelPM/prometeo',path:'pages/calendar/index.html'}}]};
  const page=resolveStandalonePage({locationHref:'https://juanmanuelpm.github.io/prometeo/pages/calendar/index.html',catalog});assert.equal(page.id,'calendar');assert.equal(assertWritableTarget(page).path,'pages/calendar/index.html');
  const ctx=createContextSnapshot({page,locationHref:page.href,documentTitle:'Calendar',viewport:{width:360,height:780,orientation:'portrait'}});assert.equal(ctx.page_id,'calendar');
});

test('Candidate has one Capture publication owner and no global HTML injector',()=>{
  const legacy=fs.readFileSync(new URL('../.github/workflows/inject-prometeo-shell.yml',import.meta.url),'utf8');
  assert.ok(legacy.includes('Publish Legacy Prometeo Capture Donors'));assert.ok(!legacy.includes('data-prometeo-shell'));
  assert.equal(fs.existsSync(new URL('../.github/workflows/inject-prometeo-shell-v3.yml',import.meta.url)),false);
});
