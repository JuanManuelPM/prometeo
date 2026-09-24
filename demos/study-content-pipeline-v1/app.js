const API='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/modelos-room-audio-v2';
const VOICE={
  id:'julian',
  prompt:'Argentine male teacher. Warm medium-low voice, clear and patient. Natural Rioplatense Spanish. Explain as if to one student, with brief useful pauses. Same speaker throughout.'
};
const $=id=>document.getElementById(id);
const E={
  title:$('title'),subtitle:$('subtitle'),content:$('content'),play:$('play'),status:$('status'),progress:$('progress'),identity:$('identity'),
  sourceBadge:$('sourceBadge'),truthBanner:$('truthBanner'),
  stageCanonical:$('stageCanonical'),stageReader:$('stageReader'),stageTts:$('stageTts'),
  canonicalState:$('canonicalState'),readerState:$('readerState'),ttsState:$('ttsState'),
  sourceReceipt:$('sourceReceipt'),extractionReceipt:$('extractionReceipt'),readerReceipt:$('readerReceipt'),
  ttsReceipt:$('ttsReceipt'),provenanceReceipt:$('provenanceReceipt'),linkReceipt:$('linkReceipt'),
  payloadPreview:$('payloadPreview'),copyEvidence:$('copyEvidence'),copyEvidenceState:$('copyEvidenceState')
};
const state={reader:null,tts:null,index:0,playing:false,intent:false,audio:null,urls:new Map(),clips:new Map()};

function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function messageId(chunk){return `study-pipeline-v1-${VOICE.id}-${chunk.chunk_id.slice(-24)}`}
function setStatus(text){E.status.textContent=text}
function setPlaying(on){state.playing=on;E.play.dataset.playing=on?'1':'0';E.play.setAttribute('aria-label',on?'Pausar':'Reproducir')}
function markChunk(index){
  E.content.querySelectorAll('.segment').forEach(n=>n.dataset.active='0');
  const chunk=state.tts.chunks[index];
  if(!chunk)return;
  for(const id of new Set(chunk.links.map(x=>x.segment_id))){const n=E.content.querySelector(`[data-segment-id="${CSS.escape(id)}"]`);if(n)n.dataset.active='1'}
  const active=E.content.querySelector('.segment[data-active="1"]');
  if(active&&state.playing)active.scrollIntoView({behavior:'smooth',block:'center'});
}
function overallProgress(){
  const total=state.tts?.chunks.length||1;
  const local=state.audio&&Number.isFinite(state.audio.duration)&&state.audio.duration>0?state.audio.currentTime/state.audio.duration:0;
  return Math.max(0,Math.min(1,(state.index+local)/total));
}
function tick(){E.progress.style.width=`${overallProgress()*100}%`}

function shortId(v){
  const s=String(v||'—');
  if(s.length<=28)return s;
  const parts=s.split(':');
  const head=parts.slice(0,2).join(':');
  return head+':…'+s.slice(-10);
}
function setStage(node,label,state='ok'){
  if(node)node.dataset.state=state;
  if(label)label.textContent=state==='ok'?label.textContent:label.textContent;
}
function validateContracts(reader,tts){
  const failures=[];
  const segments=Array.isArray(reader.segments)?reader.segments:[];
  const chunks=Array.isArray(tts.chunks)?tts.chunks:[];
  if(reader.schema!=='prometeo.reader-payload/v1')failures.push('reader schema');
  if(tts.schema!=='prometeo.tts-chunk-set/v1')failures.push('tts schema');
  if(!reader.document_id||reader.document_id!==tts.document_id)failures.push('document identity');
  if(!reader.reader_projection_version_id||reader.reader_projection_version_id!==tts.reader_projection_version_id)failures.push('reader projection identity');
  if(reader.language!==tts.language)failures.push('language');
  if(Number(reader.readable_text_length)!==String(reader.readable_text||'').length)failures.push('readable length');
  const ids=segments.map(s=>s.segment_id);
  const idSet=new Set(ids);
  if(idSet.size!==ids.length||ids.some(x=>!x))failures.push('segment ids');
  const linked=new Set();
  segments.forEach((segment,i)=>{const span=segment.span||{};if(!Number.isInteger(span.start)||!Number.isInteger(span.end)||span.start<0||span.end<span.start||span.end>Number(reader.readable_text_length))failures.push('segment span bounds '+i)});
  const maxChars=Number(tts.chunker?.max_chars||0);
  chunks.forEach((chunk,i)=>{
    if(Number(chunk.order)!==i)failures.push('chunk order '+i);
    if(maxChars>0&&String(chunk.text||'').length>maxChars)failures.push('chunk size '+i);
    if(!Array.isArray(chunk.links)||!chunk.links.length)failures.push('chunk links '+i);
    for(const link of chunk.links||[]){
      if(!idSet.has(link.segment_id))failures.push('unknown segment '+link.segment_id);
      else linked.add(link.segment_id);
      if(link.chunk_span&&(link.chunk_span.start<0||link.chunk_span.end<link.chunk_span.start||link.chunk_span.end>String(chunk.text||'').length))failures.push('chunk link bounds '+i);
    }
  });
  if(ids.some(id=>!linked.has(id)))failures.push('unlinked reader segment');
  if(!reader.source_version_id||!reader.canonical_extraction_version_id||!reader.provenance_ref)failures.push('canonical receipts');
  if(!tts.tts_projection_version_id)failures.push('tts receipt');
  if(failures.length)throw new Error('contract mismatch: '+[...new Set(failures)].join(', '));
  return {segmentCount:segments.length,chunkCount:chunks.length,linkCount:chunks.reduce((n,c)=>n+(c.links?.length||0),0)};
}
function renderEvidence(reader,tts,report){
  E.sourceBadge.textContent='DEMO FIXTURE · NO LIVE SOURCE';
  E.canonicalState.textContent='RECEIPT OK';
  E.readerState.textContent=report.segmentCount+' SEGMENTOS · OK';
  E.ttsState.textContent=report.chunkCount+' CHUNKS · OK';
  E.stageCanonical.dataset.state='ok';E.stageReader.dataset.state='ok';E.stageTts.dataset.state='ok';
  E.sourceReceipt.textContent=shortId(reader.source_version_id);
  E.extractionReceipt.textContent=shortId(reader.canonical_extraction_version_id);
  E.readerReceipt.textContent=shortId(reader.reader_projection_version_id);
  E.ttsReceipt.textContent=shortId(tts.tts_projection_version_id);
  E.provenanceReceipt.textContent=shortId(reader.provenance_ref?.provenance_ids?.[0]);
  E.linkReceipt.textContent=report.linkCount+' LINKS · '+report.segmentCount+'/'+report.segmentCount+' SEGMENTOS CUBIERTOS';
}
function markPipelineError(){
  for(const node of [E.stageCanonical,E.stageReader,E.stageTts])if(node&&node.dataset.state==='checking')node.dataset.state='error';
}
function inspectorPayload(kind){
  const reader=state.reader,tts=state.tts;
  if(!reader||!tts)return {state:'NOT_READY'};
  if(kind==='reader')return {
    source_mode:'DEMO_FIXTURE_NO_LIVE_SOURCE',
    schema:reader.schema,
    document_id:reader.document_id,
    reader_projection_version_id:reader.reader_projection_version_id,
    language:reader.language,
    readable_text_length:reader.readable_text_length,
    sections:reader.sections,
    segments:reader.segments
  };
  if(kind==='tts')return {
    source_mode:'DEMO_FIXTURE_NO_LIVE_SOURCE',
    schema:tts.schema,
    document_id:tts.document_id,
    reader_projection_version_id:tts.reader_projection_version_id,
    tts_projection_version_id:tts.tts_projection_version_id,
    language:tts.language,
    chunker:tts.chunker,
    chunks:tts.chunks
  };
  return {
    view:'CANONICAL_EVIDENCE_FROM_FIXTURE',
    note:'Receipts y metadatos normalizados solamente. La fuente original no está presente en este demo.',
    document_id:reader.document_id,
    source_version_id:reader.source_version_id,
    canonical_extraction_version_id:reader.canonical_extraction_version_id,
    provenance_ref:reader.provenance_ref,
    readable_text_length:reader.readable_text_length
  };
}
function renderInspector(kind='canonical'){
  if(!E.payloadPreview)return;
  document.querySelectorAll('.inspect-tab').forEach(btn=>btn.setAttribute('aria-selected',btn.dataset.view===kind?'true':'false'));
  E.payloadPreview.textContent=JSON.stringify(inspectorPayload(kind),null,2);
}
async function copyEvidence(){
  const reader=state.reader,tts=state.tts;
  if(!reader||!tts){E.copyEvidenceState.textContent='evidencia todavía no disponible';return}
  const payload={
    source_mode:'DEMO_FIXTURE_NO_LIVE_SOURCE',
    document_id:reader.document_id,
    source_version_id:reader.source_version_id,
    canonical_extraction_version_id:reader.canonical_extraction_version_id,
    reader_projection_version_id:reader.reader_projection_version_id,
    tts_projection_version_id:tts.tts_projection_version_id,
    provenance_ref:reader.provenance_ref,
    segment_count:reader.segments?.length||0,
    chunk_count:tts.chunks?.length||0,
    link_count:tts.chunks?.reduce((n,c)=>n+(c.links?.length||0),0)||0
  };
  try{await navigator.clipboard.writeText(JSON.stringify(payload,null,2));E.copyEvidenceState.textContent='receipts copiados'}catch{E.copyEvidenceState.textContent='clipboard no disponible'}
}

async function fetchAudio(index){
  if(state.clips.has(index))return state.clips.get(index);
  const promise=(async()=>{
    const chunk=state.tts.chunks[index];
    const id=messageId(chunk);
    let r;
    try{r=await fetch(`${API}?id=${encodeURIComponent(id)}`,{cache:'no-store'})}catch{}
    if(!r?.ok){
      setStatus('generando audio…');
      r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({voicePrompt:VOICE.prompt,text:chunk.text,messageId:id})});
    }
    if(!r.ok)throw new Error(`TTS ${r.status}`);
    const blob=await r.blob();
    const url=URL.createObjectURL(blob);state.urls.set(index,url);
    const audio=new Audio(url);audio.preload='auto';
    return audio;
  })();
  state.clips.set(index,promise);
  try{return await promise}catch(e){state.clips.delete(index);throw e}
}
async function startCurrent(){
  if(!state.intent)return;
  try{
    setStatus('preparando audio…');
    const audio=await fetchAudio(state.index);
    if(!state.intent)return;
    state.audio=audio;markChunk(state.index);
    audio.ontimeupdate=tick;
    audio.onended=()=>{if(state.index<state.tts.chunks.length-1){state.index++;state.audio=null;startCurrent()}else{state.intent=false;setPlaying(false);E.progress.style.width='100%';setStatus('lectura completa')}};
    audio.onplay=()=>{setPlaying(true);setStatus(`reproduciendo fragmento ${state.index+1} de ${state.tts.chunks.length}`);markChunk(state.index)};
    audio.onpause=()=>{if(!audio.ended)setPlaying(false)};
    await audio.play();
    if(state.index+1<state.tts.chunks.length)fetchAudio(state.index+1).catch(()=>{});
  }catch(err){state.intent=false;setPlaying(false);setStatus('no se pudo preparar el audio');console.error(err)}
}
function toggle(){
  if(state.playing){state.intent=false;state.audio?.pause();setStatus('pausado');return}
  state.intent=true;
  if(state.audio&&!state.audio.ended){state.audio.play().catch(()=>startCurrent());return}
  startCurrent();
}

async function boot(){
  E.sourceBadge.textContent='DEMO FIXTURE · NO LIVE SOURCE';
  setStatus('validando contratos del fixture…');
  const [readerRes,ttsRes]=await Promise.all([
    fetch('./demo.reader.json',{cache:'no-store'}),
    fetch('./demo.tts.json',{cache:'no-store'})
  ]);
  if(!readerRes.ok||!ttsRes.ok)throw new Error('payload unavailable');
  const [reader,tts]=await Promise.all([readerRes.json(),ttsRes.json()]);
  const report=validateContracts(reader,tts);
  state.reader=reader;state.tts=tts;
  E.title.textContent=reader.title;E.subtitle.textContent=reader.subtitle||'';
  E.content.innerHTML=reader.segments.map(s=>
    s.kind==='heading'
      ?`<h2 class="segment" data-kind="heading" data-segment-id="${esc(s.segment_id)}">${esc(s.text)}</h2>`
      :`<p class="segment" data-kind="${esc(s.kind)}" data-segment-id="${esc(s.segment_id)}">${esc(s.text)}</p>`
  ).join('');
  renderEvidence(reader,tts,report);
  renderInspector('canonical');
  E.identity.textContent=`${shortId(reader.document_id)} · ${tts.chunks.length} chunks`;
  E.play.disabled=false;
  setStatus(`CONTRATO OK · ${reader.segments.length} segmentos · ${tts.chunks.length} fragmentos · audio on demand`);
}

E.play.addEventListener('click',toggle);
document.querySelectorAll('.inspect-tab').forEach(btn=>btn.addEventListener('click',()=>renderInspector(btn.dataset.view)));
E.copyEvidence?.addEventListener('click',copyEvidence);
boot().catch(err=>{markPipelineError();setStatus('contrato inválido o payload no disponible');console.error(err)});
window.addEventListener('beforeunload',()=>{for(const url of state.urls.values())URL.revokeObjectURL(url)});
