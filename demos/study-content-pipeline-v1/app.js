const API='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/modelos-room-audio-v2';
const VOICE={
  id:'julian',
  prompt:'Argentine male teacher. Warm medium-low voice, clear and patient. Natural Rioplatense Spanish. Explain as if to one student, with brief useful pauses. Same speaker throughout.'
};
const $=id=>document.getElementById(id);
const E={title:$('title'),subtitle:$('subtitle'),content:$('content'),play:$('play'),status:$('status'),progress:$('progress'),identity:$('identity')};
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
  const [readerRes,ttsRes]=await Promise.all([fetch('./demo.reader.json',{cache:'no-store'}),fetch('./demo.tts.json',{cache:'no-store'})]);
  if(!readerRes.ok||!ttsRes.ok)throw new Error('payload unavailable');
  const [reader,tts]=await Promise.all([readerRes.json(),ttsRes.json()]);
  if(reader.schema!=='prometeo.reader-payload/v1'||tts.schema!=='prometeo.tts-chunk-set/v1'||reader.document_id!==tts.document_id)throw new Error('contract mismatch');
  state.reader=reader;state.tts=tts;
  E.title.textContent=reader.title;E.subtitle.textContent=reader.subtitle||'';
  E.content.innerHTML=reader.segments.map(s=>s.kind==='heading'?`<h2 class="segment" data-kind="heading" data-segment-id="${esc(s.segment_id)}">${esc(s.text)}</h2>`:`<p class="segment" data-kind="${esc(s.kind)}" data-segment-id="${esc(s.segment_id)}">${esc(s.text)}</p>`).join('');
  E.identity.textContent=`${reader.document_id.slice(0,20)}… · ${tts.chunks.length} chunks`;
  E.play.disabled=false;setStatus(`${reader.segments.length} segmentos · ${tts.chunks.length} fragmentos de audio`);
}
E.play.addEventListener('click',toggle);
boot().catch(err=>{setStatus('error al cargar el Reader Payload');console.error(err)});
window.addEventListener('beforeunload',()=>{for(const url of state.urls.values())URL.revokeObjectURL(url)});
