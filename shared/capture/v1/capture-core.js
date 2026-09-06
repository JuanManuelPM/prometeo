export const CAPTURE_SCHEMA='prometeo.capture/v1';
export const REVISION_SCHEMA='prometeo.capture-revision/v1';
export const PRIVACY=Object.freeze(['PUBLIC','PROJECT','LOCAL']);
export const PROCESSING=Object.freeze(['RECORDING','SAVED_LOCAL','QUEUED','MODEL_LOADING','TRANSCRIBING','TRANSCRIPT_READY','ERROR']);
export const TRANSCRIPT=Object.freeze(['ABSENT','MACHINE','EDITED','CONFIRMED']);
export const SYNC=Object.freeze(['LOCAL_ONLY','PENDING','SYNCED','CONFLICT','ERROR']);
export const ARCHIVE=Object.freeze(['ACTIVE','ARCHIVED','TOMBSTONED']);

const processingTransitions=Object.freeze({
  RECORDING:['SAVED_LOCAL','ERROR'],
  SAVED_LOCAL:['QUEUED','ERROR'],
  QUEUED:['MODEL_LOADING','ERROR'],
  MODEL_LOADING:['TRANSCRIBING','ERROR','QUEUED'],
  TRANSCRIBING:['TRANSCRIPT_READY','ERROR','QUEUED'],
  TRANSCRIPT_READY:['QUEUED','ERROR'],
  ERROR:['QUEUED']
});
const transcriptTransitions=Object.freeze({
  ABSENT:['MACHINE','EDITED'],
  MACHINE:['EDITED','CONFIRMED','MACHINE'],
  EDITED:['EDITED','CONFIRMED'],
  CONFIRMED:['EDITED','CONFIRMED']
});

const clone=v=>structuredClone(v);
const freeze=v=>{if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v)}return v};
const imm=v=>freeze(clone(v));
const fail=(code,message,detail={})=>{const e=new Error(message);e.code=code;e.detail=detail;throw e};
const iso=v=>{const d=v?new Date(v):new Date();if(Number.isNaN(d.getTime()))fail('PROMETEO_CAPTURE_TIME','Invalid timestamp',{value:v});return d.toISOString()};

export function stableCaptureId(){
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
  const a=new Uint8Array(16);globalThis.crypto?.getRandomValues?.(a);
  if(!a.some(Boolean)){for(let i=0;i<a.length;i++)a[i]=Math.floor(Math.random()*256)}
  return `cap-${[...a].map(x=>x.toString(16).padStart(2,'0')).join('')}`;
}

export function normalizeSemanticContext(input={}){
  const viewport=input.viewport&&typeof input.viewport==='object'?{
    width:Number(input.viewport.width)||0,
    height:Number(input.viewport.height)||0,
    orientation:String(input.viewport.orientation||'unknown')
  }:null;
  const context={
    page_id:input.page_id?String(input.page_id):null,
    source_path:input.source_path?String(input.source_path):null,
    source_href:input.source_href?String(input.source_href):null,
    source_title:input.source_title?String(input.source_title):null,
    navigator:input.navigator?clone(input.navigator):null,
    route:input.route?clone(input.route):null,
    viewport,
    captured_at:iso(input.captured_at)
  };
  if(!context.page_id&&!context.source_path&&!context.source_href)fail('PROMETEO_CAPTURE_CONTEXT_TARGET','Capture context requires page identity or source location');
  return imm(context);
}

export function createCapture({id=stableCaptureId(),created_at=null,privacy='LOCAL',context,metadata={}}={}){
  if(!PRIVACY.includes(privacy))fail('PROMETEO_CAPTURE_PRIVACY','Invalid Capture privacy',{privacy});
  if(!id)fail('PROMETEO_CAPTURE_ID','Capture id required');
  const created=iso(created_at);
  return imm({
    schema:CAPTURE_SCHEMA,
    id:String(id),
    created_at:created,
    updated_at:created,
    privacy,
    immutable_creation:{id:String(id),created_at:created,context:normalizeSemanticContext(context||{})},
    processing_state:'RECORDING',
    transcript_state:'ABSENT',
    sync_state:'LOCAL_ONLY',
    archive_state:'ACTIVE',
    transcript_revision:0,
    active_transcript:'',
    audio:{present:false,digest:null,mime:null,size:0,local_ref:null},
    revisions:[],
    superseded_by:null,
    metadata:clone(metadata)
  });
}

export function transitionProcessing(capture,to,{error=null,at=null}={}){
  validateCapture(capture);
  if(!PROCESSING.includes(to))fail('PROMETEO_CAPTURE_PROCESSING','Invalid processing state',{to});
  const from=capture.processing_state;
  if(from===to)return capture;
  if(!(processingTransitions[from]||[]).includes(to))fail('PROMETEO_CAPTURE_PROCESSING_TRANSITION',`Illegal processing transition ${from} -> ${to}`);
  const next=clone(capture);next.processing_state=to;next.updated_at=iso(at);if(error)next.metadata.last_error=String(error);return imm(next);
}

export function attachDurableAudio(capture,{digest,mime,size,local_ref,at=null}={}){
  validateCapture(capture);
  if(capture.processing_state!=='RECORDING')fail('PROMETEO_CAPTURE_AUDIO_STATE','Audio may be attached only from RECORDING');
  if(!digest||!local_ref||!Number.isFinite(Number(size))||Number(size)<=0)fail('PROMETEO_CAPTURE_AUDIO_FIELDS','Durable audio requires digest, positive size and local_ref');
  const next=clone(capture);
  next.audio={present:true,digest:String(digest),mime:String(mime||'application/octet-stream'),size:Number(size),local_ref:String(local_ref)};
  next.processing_state='SAVED_LOCAL';next.updated_at=iso(at);return imm(next);
}

export function appendTranscriptRevision(capture,{text,state='MACHINE',source='whisper',model=null,digest=null,at=null}={}){
  validateCapture(capture);
  if(!TRANSCRIPT.includes(state)||state==='ABSENT')fail('PROMETEO_CAPTURE_TRANSCRIPT_STATE','Invalid transcript revision state',{state});
  const from=capture.transcript_state;
  if(!(transcriptTransitions[from]||[]).includes(state))fail('PROMETEO_CAPTURE_TRANSCRIPT_TRANSITION',`Illegal transcript transition ${from} -> ${state}`);
  const clean=String(text??'').replace(/\s+/g,' ').trim();
  if(!clean)fail('PROMETEO_CAPTURE_TRANSCRIPT_EMPTY','Transcript revision cannot be empty');
  const revision=Number(capture.transcript_revision||0)+1;
  const now=iso(at);
  const rev={schema:REVISION_SCHEMA,capture_id:capture.id,revision,text:clean,state,source:String(source||'unknown'),model:model?String(model):null,digest:digest?String(digest):null,created_at:now,privacy:capture.privacy};
  const next=clone(capture);next.transcript_revision=revision;next.transcript_state=state;next.active_transcript=clean;next.revisions=[...(capture.revisions||[]),rev];next.processing_state='TRANSCRIPT_READY';next.updated_at=now;next.sync_state='PENDING';return imm(next);
}

export function markSync(capture,state,{at=null,remote_revision=null,detail=null}={}){
  validateCapture(capture);if(!SYNC.includes(state))fail('PROMETEO_CAPTURE_SYNC','Invalid sync state',{state});
  const next=clone(capture);next.sync_state=state;next.updated_at=iso(at);if(remote_revision!=null)next.metadata.remote_revision=Number(remote_revision);if(detail)next.metadata.sync_detail=clone(detail);return imm(next);
}

export function archiveCapture(capture,{tombstone=false,at=null,reason=null}={}){
  validateCapture(capture);const next=clone(capture);next.archive_state=tombstone?'TOMBSTONED':'ARCHIVED';next.updated_at=iso(at);if(reason)next.metadata.archive_reason=String(reason);return imm(next);
}

export function supersedeCapture(capture,newCaptureId,{at=null}={}){
  validateCapture(capture);if(!newCaptureId||newCaptureId===capture.id)fail('PROMETEO_CAPTURE_SUPERSEDE','A distinct superseding Capture id is required');
  const next=clone(capture);next.superseded_by=String(newCaptureId);next.archive_state='ARCHIVED';next.updated_at=iso(at);return imm(next);
}

export function revisionRef(capture,revision=capture.transcript_revision){
  validateCapture(capture);const r=(capture.revisions||[]).find(x=>x.revision===Number(revision));if(!r)fail('PROMETEO_CAPTURE_REVISION_UNKNOWN','Capture revision not found',{capture_id:capture.id,revision});
  return imm({capture_id:capture.id,revision:r.revision,ref:`capture:${capture.id}:rev:${r.revision}`,digest:r.digest||null,text:r.text,state:r.state,privacy:r.privacy,created_at:r.created_at});
}

export function validateCapture(capture){
  if(capture?.schema!==CAPTURE_SCHEMA||!capture.id)fail('PROMETEO_CAPTURE_SCHEMA','Invalid Capture');
  if(!PRIVACY.includes(capture.privacy)||!PROCESSING.includes(capture.processing_state)||!TRANSCRIPT.includes(capture.transcript_state)||!SYNC.includes(capture.sync_state)||!ARCHIVE.includes(capture.archive_state))fail('PROMETEO_CAPTURE_ENUM','Capture contains invalid state');
  if(capture.transcript_revision!==(capture.revisions||[]).length)fail('PROMETEO_CAPTURE_REVISION_GAP','Transcript revision count mismatch');
  for(let i=0;i<(capture.revisions||[]).length;i++){const r=capture.revisions[i];if(r.capture_id!==capture.id||r.revision!==i+1)fail('PROMETEO_CAPTURE_REVISION_ORDER','Capture revisions must be contiguous and owned',{capture_id:capture.id,index:i});}
  if(capture.audio?.present&&(!capture.audio.digest||!capture.audio.local_ref||capture.audio.size<=0))fail('PROMETEO_CAPTURE_AUDIO_INVALID','Audio presence requires durable identity');
  return {ok:true,id:capture.id,revision:capture.transcript_revision};
}

export const CaptureContract=Object.freeze({
  schema:CAPTURE_SCHEMA,
  processingTransitions,
  transcriptTransitions,
  PROCESSING,TRANSCRIPT,SYNC,ARCHIVE,PRIVACY
});
