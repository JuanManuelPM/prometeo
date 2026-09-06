import {revisionRef,validateCapture} from './capture-core.js';

const clone=v=>structuredClone(v);
const freeze=v=>{if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v)}return v};
const imm=v=>freeze(clone(v));
const fail=(code,message,detail={})=>{const e=new Error(message);e.code=code;e.detail=detail;throw e};

export function rawCaptureRecord(capture){
  validateCapture(capture);
  const ctx=capture.immutable_creation.context;
  return imm({
    schema:'prometeo.raw-record/v1',
    id:`raw:capture:${capture.id}`,
    authority:'RAW_UNCURATED',
    privacy:capture.privacy,
    captured_at:capture.created_at,
    source_ref:capture.audio?.present?`capture:${capture.id}:audio:${capture.audio.digest}`:`capture:${capture.id}:pending-audio`,
    source_refs:[ctx.source_href,ctx.source_path].filter(Boolean),
    page_id:ctx.page_id,
    context:ctx,
    reopen_handle:{kind:'capture',capture_id:capture.id}
  });
}

export function transcriptNoteAtom(capture,revision=capture.transcript_revision){
  validateCapture(capture);const ref=revisionRef(capture,revision);
  const authority=ref.state==='MACHINE'?'DERIVED_EVIDENCE':'SOURCE_REFERENCE';
  return imm({
    schema:'prometeo.note-atom/v2',
    id:`atom:capture:${capture.id}:rev:${ref.revision}`,
    claim_key:`capture.intent.${capture.id}`,
    claim:ref.text,
    value:ref.text,
    text:ref.text,
    authority,
    privacy:ref.privacy,
    currentness:revision===capture.transcript_revision?'CURRENT':'HISTORICAL',
    tags:['capture',capture.immutable_creation.context.page_id||'unknown-page'],
    roles:['implementer'],
    source_refs:[ref.ref,capture.immutable_creation.context.source_href].filter(Boolean),
    lineage_ids:[`raw:capture:${capture.id}`],
    reopen_handle:{kind:'capture-revision',capture_id:capture.id,revision:ref.revision},
    transcript_state:ref.state,
    human_accepted:false
  });
}

export function recentExactWindow(captures,{limit=10,page_id=null,eligibleStates=['CONFIRMED','EDITED','MACHINE']}={}){
  const refs=[];
  for(const c of captures||[]){
    validateCapture(c);
    if(c.archive_state!=='ACTIVE'||!c.transcript_revision)continue;
    if(page_id&&c.immutable_creation.context.page_id!==page_id)continue;
    const r=revisionRef(c);
    if(!eligibleStates.includes(r.state))continue;
    refs.push({...r,page_id:c.immutable_creation.context.page_id,created_at:c.created_at,source_href:c.immutable_creation.context.source_href});
  }
  refs.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||a.capture_id.localeCompare(b.capture_id));
  return imm(refs.slice(-Math.max(1,limit)));
}

export function proposeMemoryMetabolism({page_id,captures,previous=null,summaryText=null,now=null}={}){
  if(!page_id)fail('PROMETEO_MEMORY_PAGE','page_id required');
  const all=[];
  for(const c of captures||[]){
    validateCapture(c);if(c.archive_state==='TOMBSTONED'||!c.transcript_revision)continue;
    if(c.immutable_creation.context.page_id!==page_id)continue;
    const r=revisionRef(c);if(!['MACHINE','EDITED','CONFIRMED'].includes(r.state))continue;
    all.push({...r,page_id,created_at:c.created_at});
  }
  all.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||a.capture_id.localeCompare(b.capture_id));
  const recent=all.slice(-10);
  const historical=all.slice(0,Math.max(0,all.length-10));
  const prevCovered=new Set(previous?.covered_revision_refs||[]);
  const newHistorical=historical.filter(r=>!prevCovered.has(r.ref));
  const covered=[...prevCovered,...newHistorical.map(r=>r.ref)];
  const strongest=all.some(x=>x.privacy==='LOCAL')?'LOCAL':all.some(x=>x.privacy==='PROJECT')?'PROJECT':'PUBLIC';
  const previousSummary=String(previous?.rolling_summary||'').trim();
  let rolling=previousSummary;
  if(newHistorical.length){
    if(summaryText==null)fail('PROMETEO_MEMORY_SUMMARY_REQUIRED','New historical material requires an explicit derived summary proposal',{new_refs:newHistorical.map(x=>x.ref)});
    rolling=String(summaryText).trim();if(!rolling)fail('PROMETEO_MEMORY_SUMMARY_EMPTY','Derived summary may not be empty when compacting');
  }
  const latestCovered=historical.at(-1)?.ref||previous?.watermark?.last_summarized_ref||null;
  return imm({
    schema:'prometeo.capture-page-memory/v1',
    page_id,
    revision:Number(previous?.revision||0)+(newHistorical.length?1:0),
    recent_exact:recent,
    rolling_summary:rolling,
    summary_authority:'DERIVED_EVIDENCE',
    privacy:strongest,
    covered_revision_refs:covered,
    new_compacted_revision_refs:newHistorical.map(x=>x.ref),
    source_digests:historical.map(x=>x.digest).filter(Boolean),
    watermark:{last_summarized_ref:latestCovered,last_summarized_at:newHistorical.length?new Date(now||Date.now()).toISOString():(previous?.watermark?.last_summarized_at||null)},
    reopen_handles:historical.map(x=>({ref:x.ref,capture_id:x.capture_id,revision:x.revision})),
    contradictions:clone(previous?.contradictions||[]),
    negative_knowledge:clone(previous?.negative_knowledge||[]),
    updated_at:new Date(now||Date.now()).toISOString()
  });
}

export async function commitMemoryProposal(proposal,{persist}={}){
  if(proposal?.schema!=='prometeo.capture-page-memory/v1')fail('PROMETEO_MEMORY_SCHEMA','Invalid memory proposal');
  if(typeof persist!=='function')fail('PROMETEO_MEMORY_PERSIST','Durable persist callback required');
  // Critical order: durable write must succeed before caller is allowed to advance any external watermark.
  const written=await persist(clone(proposal));
  if(written===false)fail('PROMETEO_MEMORY_WRITE_REJECTED','Memory durable write rejected');
  return imm({ok:true,page_id:proposal.page_id,revision:proposal.revision,watermark:proposal.watermark,covered_revision_refs:proposal.covered_revision_refs});
}

export function memoryContextForPatent(memory,{recentLimit=10}={}){
  if(!memory)return null;
  return imm({
    page_id:memory.page_id,
    recent_exact:(memory.recent_exact||[]).slice(-recentLimit).map(r=>({capture_id:r.capture_id,revision:r.revision,ref:r.ref,digest:r.digest||null,text:r.text,state:r.state,created_at:r.created_at})),
    rolling_summary:memory.rolling_summary||'',
    summary_authority:'DERIVED_EVIDENCE',
    memory_revision:memory.revision||0,
    covered_revision_refs:[...(memory.covered_revision_refs||[])],
    watermark:clone(memory.watermark||{}),
    privacy:memory.privacy||'LOCAL'
  });
}
