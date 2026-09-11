(()=>{'use strict';
if(window.__STUDY_TRANSCRIPTION_V14)return;window.__STUDY_TRANSCRIPTION_V14=true;

// V14 rule: audio capture is authoritative; browser live text is disposable;
// canonical ASR uses long multilingual windows and never depends on live captions.
const CFG14={
  windowMs:150000,
  stepMs:135000,
  overlapMs:15000,
  masterSliceMs:5000,
  version:'canonical-v2',
  language:'es',
  locale:'es-AR'
};
const old14={cleanupRoom,toggleBreak,finishRecording,renderChunks,renderFullTranscript,fullText,transcribeJob,startRecognition};
let canonTimer14=null,canonGeneration14=0,canonActive14=new Map(),partWindows14=new Map();
let masterRec14=null,masterSeq14=0,masterSession14='',masterMime14='',masterStarted14=0;

const clean14=(v,n=30000)=>String(v??'').replace(/\r/g,'').trim().slice(0,n);
const norm14=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ]+/g,' ').trim();
const toks14=s=>clean14(s).split(/\s+/).filter(Boolean);
const ntoks14=s=>toks14(s).map(norm14).filter(Boolean);
const now14=()=>new Date().toISOString();

function courseContext14(){
  const id=room?.course_id||(typeof course!=='undefined'?course:'')||'';
  let title=id;
  try{title=(typeof C!=='undefined'&&C?.[id]?.name)||title}catch{}
  const ready=[...(chunks||[])].filter(x=>x.status==='ready'&&x.transcript).sort((a,b)=>(a.start_ms||0)-(b.start_ms||0));
  const tail=ready.slice(-3).map(x=>clean14(x.transcript,1800)).join(' ').slice(-2200);
  return {courseId:id,courseTitle:title||'',contextTail:tail};
}

function masterManifestKey14(sid){return `study:audio-master:v14:${sid}`}
function writeMasterManifest14(extra={}){
  if(!masterSession14)return;
  try{localStorage.setItem(masterManifestKey14(masterSession14),JSON.stringify({
    schema:'prometeo.study.audio-master/v1',session_id:masterSession14,status:masterRec14?.state==='inactive'?'complete':'recording',
    mime_type:masterMime14,count:masterSeq14,started_at:masterStarted14||Date.now(),updated_at:Date.now(),...extra
  }))}catch{}
}
async function storeMasterPiece14(blob){
  if(!blob?.size||!masterSession14)return;
  const i=++masterSeq14,key=`master:${masterSession14}:${String(i).padStart(6,'0')}`;
  try{await putAudio(key,blob);if(i===1||i%6===0)writeMasterManifest14({status:'recording'})}catch(e){console.warn('master audio persist',e)}
}
function startMaster14(){
  if(!stream?.active||!room?.id)return;
  if(masterRec14&&masterRec14.state!=='inactive'){
    if(masterRec14.state==='paused')try{masterRec14.resume()}catch{}
    rec=masterRec14;return;
  }
  const mime=pickMime();masterSession14=room.id;masterSeq14=0;masterMime14=mime||'audio/webm';masterStarted14=Date.now();
  try{navigator.storage?.persist?.().catch(()=>{})}catch{}
  try{masterRec14=new MediaRecorder(stream,mime?{mimeType:mime}:undefined)}catch(e){console.warn('master MediaRecorder',e);return}
  masterMime14=masterRec14.mimeType||masterMime14;
  masterRec14.ondataavailable=e=>{if(e.data?.size)storeMasterPiece14(e.data)};
  masterRec14.onerror=e=>console.warn('master capture',e?.error||e);
  masterRec14.onstop=()=>writeMasterManifest14({status:'complete',ended_at:Date.now()});
  try{masterRec14.start(CFG14.masterSliceMs);rec=masterRec14;writeMasterManifest14({status:'recording'})}catch(e){console.warn('master start',e)}
}
function pauseMaster14(){if(masterRec14?.state==='recording')try{masterRec14.requestData();masterRec14.pause();writeMasterManifest14({status:'paused'})}catch{}}
function resumeMaster14(){if(masterRec14?.state==='paused')try{masterRec14.resume();writeMasterManifest14({status:'recording'})}catch{}else startMaster14()}
function finishMaster14(){
  if(masterRec14&&masterRec14.state!=='inactive')try{masterRec14.requestData();masterRec14.stop()}catch{}
  else writeMasterManifest14({status:'complete',ended_at:Date.now()});
}

function stopCanonical14(){
  canonGeneration14++;
  if(canonTimer14){clearInterval(canonTimer14);canonTimer14=null}
  clearTimeout(sliceTimer);sliceTimer=null;
  for(const slot of [...canonActive14.values()]){
    clearTimeout(slot.stopTimer);
    try{if(slot.rec.state!=='inactive')slot.rec.stop()}catch{}
  }
}
function launchCanonical14(gen){
  if(gen!==canonGeneration14||!recLive||recPaused||!stream?.active||!room?.id||!room?.token)return;
  const mime=pickMime(),pieces=[],started=Date.now(),sessionId=room.id,roomToken=room.token,segment=part;
  const ordinal=(partWindows14.get(segment)||0)+1;partWindows14.set(segment,ordinal);const chunkSeq=++seq;
  let r;try{r=new MediaRecorder(stream,mime?{mimeType:mime}:undefined)}catch(e){console.warn('canonical MediaRecorder',e);return}
  const slot={rec:r,pieces,started,sessionId,roomToken,segment,chunkSeq,overlap:ordinal>1?CFG14.overlapMs:0,stopTimer:null,gen};
  canonActive14.set(chunkSeq,slot);
  r.ondataavailable=e=>{if(e.data?.size)pieces.push(e.data)};
  r.onerror=e=>console.warn('canonical capture',e?.error||e);
  r.onstop=()=>finalizeCanonical14(slot);
  try{r.start();slot.stopTimer=setTimeout(()=>{try{if(r.state==='recording')r.stop()}catch{}},CFG14.windowMs)}catch(e){canonActive14.delete(chunkSeq);console.warn('canonical start',e)}
}
function startCanonical14(){
  stopCanonical14();
  if(seq===0&&part===1)partWindows14.clear();
  const gen=canonGeneration14;launchCanonical14(gen);canonTimer14=setInterval(()=>launchCanonical14(gen),CFG14.stepMs);sliceTimer=canonTimer14;
}
async function finalizeCanonical14(slot){
  if(!canonActive14.has(slot.chunkSeq))return;canonActive14.delete(slot.chunkSeq);clearTimeout(slot.stopTimer);
  const ended=Date.now(),blob=new Blob(slot.pieces,{type:slot.rec.mimeType||slot.pieces[0]?.type||'audio/webm'});
  const start=Math.max(0,slot.started-recStarted),finish=Math.max(start,ended-recStarted);
  if(blob.size<=500||finish-start<2500)return;
  const id=crypto.randomUUID(),localKey=`${slot.sessionId}:${slot.segment}:${slot.chunkSeq}:${id}`;
  const x={id,session_id:slot.sessionId,participant_id:st.profile.id,participant_name:st.profile.name,segment_no:slot.segment,seq:slot.chunkSeq,
    start_ms:start,end_ms:finish,overlap_ms:slot.overlap,capture_window_ms:Math.max(0,finish-start),capture_version:CFG14.version,
    transcript:'',source:'whisper-large-v3',status:'queued',audio_chunk_id:localKey,mime_type:blob.type,byte_size:blob.size,provisional_text:'',created_at:now14()};
  if(room?.id===slot.sessionId){chunks.push(x);renderChunks();broadcast?.('transcript',{chunk:x})}
  putAudio(localKey,blob).catch(()=>{});
  const ctx=courseContext14();transQueue.push({x,blob,sessionId:slot.sessionId,roomToken:slot.roomToken,attempt:0,...ctx});pumpTranscription();
}

function quality14(text){
  const w=ntoks14(text);if(w.length<4)return {bad:false,score:0,reasons:[]};
  let score=0;const reasons=[];
  let run=1,maxRun=1;for(let i=1;i<w.length;i++){run=w[i]===w[i-1]?run+1:1;if(run>maxRun)maxRun=run}
  if(maxRun>=6){score+=8;reasons.push('token-loop')}
  const uniq=new Set(w).size/w.length;if(w.length>40&&uniq<.22){score+=5;reasons.push('low-diversity')}
  for(const n of [2,3,4,5]){
    if(w.length<n*4)continue;const m=new Map();let max=0;
    for(let i=0;i<=w.length-n;i++){const k=w.slice(i,i+n).join(' '),v=(m.get(k)||0)+1;m.set(k,v);if(v>max)max=v}
    if(max>=8){score+=6;reasons.push(`${n}gram-loop`);break}
  }
  return {bad:score>=6,score,reasons};
}

function lev14(a,b){
  const m=b.length,prev=Array.from({length:m+1},(_,i)=>i),cur=new Array(m+1);
  for(let i=1;i<=a.length;i++){cur[0]=i;for(let j=1;j<=m;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<=m;j++)prev[j]=cur[j]}
  return prev[m];
}
function fuzzyTrim14(prevText,nextText,overlapMs,windowMs){
  const A=toks14(prevText),B=toks14(nextText);if(!A.length||!B.length||!overlapMs)return clean14(nextText);
  const an=A.map(norm14),bn=B.map(norm14),maxB=Math.min(70,B.length),expected=Math.max(4,Math.round(B.length*Math.min(.35,overlapMs/Math.max(windowMs||CFG14.windowMs,1))));
  let best={score:0,kb:0};
  for(let kb=4;kb<=maxB;kb++){
    const lo=Math.max(4,Math.round(kb*.75)),hi=Math.min(70,A.length,Math.round(kb*1.25));
    for(let ka=lo;ka<=hi;ka++){
      const aa=an.slice(-ka),bb=bn.slice(0,kb),sim=1-lev14(aa,bb)/Math.max(ka,kb),prior=Math.min(.08,Math.abs(kb-expected)/Math.max(expected,1)*.02),s=sim-prior;
      if(s>best.score)best={score:s,kb};
    }
  }
  return best.score>=.70?B.slice(best.kb).join(' '):clean14(nextText);
}
function groups14(list){
  const ready=[...(list||[])].filter(x=>x.status==='ready'&&clean14(x.transcript)).sort((a,b)=>(a.start_ms||0)-(b.start_ms||0)||(a.seq||0)-(b.seq||0));
  const map=new Map();for(const x of ready){const k=`${x.participant_id||x.participant_name}|${x.segment_no||1}`;if(!map.has(k))map.set(k,{participant:x.participant_name||'Participante',segment:x.segment_no||1,start:x.start_ms||0,items:[]});map.get(k).items.push(x)}
  return [...map.values()].sort((a,b)=>a.start-b.start).map(g=>{let text='';for(const x of g.items){const t=clean14(x.transcript);if(!text)text=t;else text=`${text} ${fuzzyTrim14(text,t,Number(x.overlap_ms||0),Number(x.capture_window_ms||CFG14.windowMs))}`}return{...g,text:text.replace(/\s+([,.;:!?])/g,'$1').replace(/\s{2,}/g,' ').trim()}})
}
function fullText14(list){return groups14(list).map(g=>`PARTE ${g.segment} · ${g.participant} · ${ms(g.start)}\n${g.text}`).join('\n\n')}
fullText=function(){return fullText14(chunks)};
renderFullTranscript=function(){const e=document.querySelector('#fullTranscript');if(e)e.textContent=fullText14(chunks)||'Todavía no hay bloques canónicos terminados.'};
renderChunks=function(){
  old14.renderChunks();
  document.querySelectorAll('.chunk13').forEach((el,i)=>{const x=[...chunks].sort((a,b)=>(a.start_ms||0)-(b.start_ms||0)||(a.seq||0)-(b.seq||0))[i];if(!x)return;const tag=el.querySelector('.chunkCapture13')||document.createElement('div');tag.className='chunkCapture13';tag.textContent=x.capture_version===CFG14.version?'transcripción canónica · bloque largo':'transcripción';if(!tag.parentNode)el.appendChild(tag)});
  renderFullTranscript();
};

startRecognition=function(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){const p=document.querySelector('#preview');if(p)p.textContent='live no disponible · el audio maestro sigue grabando';return}
  try{recognizer=new SR();recognizer.lang=CFG14.locale;recognizer.continuous=true;recognizer.interimResults=true;recognizer.maxAlternatives=1;
    recognizer.onresult=e=>{let t='';for(let i=e.resultIndex;i<e.results.length;i++)t+=e.results[i][0].transcript+' ';previewText=t.trim();const p=document.querySelector('#preview');if(p)p.textContent=previewText?`live provisional · ${previewText}`:'live provisional · escuchando…'};
    recognizer.onend=()=>{if(recLive&&!recPaused)try{recognizer.start()}catch{}};recognizer.onerror=()=>{};recognizer.start();
  }catch{}
};

transcribeJob=async function(job){
  const {x,blob}=job,sessionId=job.sessionId||x.session_id,roomToken=job.roomToken||st.sessions?.[sessionId]?.token||'',inRoom=()=>room?.id===sessionId;
  x.status='transcribing';if(inRoom()){renderChunks();broadcast?.('transcript',{chunk:x})}
  const ctx=courseContext14(),f=new FormData();f.append('audio',blob,`canonical-${x.seq}.webm`);
  const vals={session_id:sessionId,room_token:roomToken,chunk_id:x.id,participant_id:x.participant_id,participant_name:x.participant_name,segment_no:x.segment_no,seq:x.seq,start_ms:x.start_ms,end_ms:x.end_ms,
    overlap_ms:x.overlap_ms||0,capture_window_ms:x.capture_window_ms||Math.max(0,x.end_ms-x.start_ms),capture_version:x.capture_version||CFG14.version,audio_chunk_id:x.audio_chunk_id,
    provisional_text:'',language:CFG14.language,locale:CFG14.locale,course_id:job.courseId||ctx.courseId||'',course_title:job.courseTitle||ctx.courseTitle||'',context_hint:job.contextTail||ctx.contextTail||'',mode:'canonical'};
  for(const [k,v] of Object.entries(vals))f.append(k,String(v));
  try{
    const r=await fetch(TRANSCRIBE,{method:'POST',body:f}),data=await r.json().catch(()=>({}));if(!r.ok||!data.ok){const err=new Error(data.detail||data.error||`transcripción ${r.status}`);err.status=r.status;throw err}
    const q=quality14(data.transcript||'');if(q.bad){const err=new Error(`QUALITY_GATE_CLIENT ${q.reasons.join(',')}`);err.status=422;throw err}
    x.status='ready';x.transcript=data.transcript||'';x.source=data.source||x.source;x.quality=data.quality||q;x.finished_processing_at=now14();if(inRoom()){broadcast?.('transcript',{chunk:x});renderChunks()}await updateFullDoc();
  }catch(e){
    const attempt=Number(job.attempt||0),status=Number(e.status||0),transient=!status||status===429||status>=500;
    if(transient&&attempt<2){x.status='queued';if(inRoom())renderChunks();setTimeout(()=>{transQueue.push({...job,attempt:attempt+1});pumpTranscription()},1800*Math.pow(2,attempt));return}
    x.status='error';x.error=String(e.message||e);if(inRoom()){broadcast?.('transcript',{chunk:x});renderChunks()}
  }
};

startSlice=function(){
  if(!recLive||recPaused||!stream?.active)return;
  startMaster14();startCanonical14();
  const p=document.querySelector('#preview');if(p)p.textContent='live provisional · escuchando…';
};
toggleBreak=function(){
  if(!recLive)return;
  if(!recPaused){recPaused=true;stopCanonical14();pauseMaster14();stopRecognition();updateRecUI();renderParts();setActivity?.('recreo');updateFullDoc?.().catch?.(()=>{})}
  else{recPaused=false;part++;partWindows14.set(part,0);resumeMaster14();startCanonical14();startRecognition();updateRecUI();renderParts();setActivity?.('grabando')}
};
finishRecording=function(){
  if(!recLive)return;const sid=room?.id,client=roomClient,title=room?.title;
  recLive=false;recPaused=false;stopCanonical14();finishMaster14();stopRecognition();setTimeout(()=>{try{stream?.getTracks().forEach(t=>t.stop())}catch{}stream=null},900);
  if(room){room.status='complete';st.sessions[room.id]=room;save()}if(client&&sid)client.from('study_class_sessions').update({status:'complete',updated_at:now14()}).eq('id',sid);
  updateRecUI();renderParts();setActivity?.('online');updateFullDoc?.().catch?.(()=>{});toast(`${title||'Clase'} cerrada · audio maestro guardado · transcripción canónica sigue procesando`)
};
cleanupRoom=function(){stopCanonical14();finishMaster14();old14.cleanupRoom()};

const style=document.createElement('style');style.textContent=`#preview{font-style:normal}.chunkCapture13{opacity:.6}.chunk13.error .chunkCapture13:after{content:' · revisar audio'}`;document.head.appendChild(style);
window.PrometeoTranscriptionV14={config:CFG14,quality:quality14,masterManifest:sid=>{try{return JSON.parse(localStorage.getItem(masterManifestKey14(sid))||'null')}catch{return null}}};
})();