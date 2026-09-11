(()=>{'use strict';
if(window.__STUDY_LIBRARY_V13_CLASS)return;window.__STUDY_LIBRARY_V13_CLASS=true;

const SHARE13=U+'/functions/v1/study-transcript-share-v1';
const WIN13=20000,STEP13=15000,OVERLAP13=5000;
const THEMES13=[
 ['noche','#111326','#d8d1ff'],
 ['grafito','#151515','#f1ede6'],
 ['papel','#f1eee5','#20201e'],
 ['bosque','#102019','#bfe7cb'],
 ['vino','#241116','#f1c5ce'],
 ['azul','#0d1822','#bedcff']
];
const old13={renderSession,renderLibrary,renderCourse,wireSession,renderChunks,renderFullTranscript,fullText,handleAudioChunk,transcribeJob,cleanupRoom};
let cap13=new Map(),launchTimer13=null,capSeq13=0,share13=null,shareBusy13=false;
const clean13=(v,n=500)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const now13=()=>new Date().toISOString();
function themeKey13(){return localStorage.getItem('study_theme_v13')||'noche'}
function applyTheme13(key=themeKey13()){
 const t=THEMES13.find(x=>x[0]===key)||THEMES13[0];
 document.documentElement.style.setProperty('--bg',t[1]);document.documentElement.style.setProperty('--ink',t[2]);
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',t[1]);
 localStorage.setItem('study_theme_v13',t[0]);
}
function themeButton13(){
 const target=document.querySelector('.sessionHead>div:last-child')||document.querySelector('.top');if(!target||document.querySelector('#theme13'))return;
 const b=document.createElement('button');b.id='theme13';b.className='linkBtn theme13';b.title='Tema';b.textContent='◐';b.onclick=openThemes13;target.appendChild(b)
}
function openThemes13(){
 document.querySelector('#themeSheet13')?.remove();const cur=themeKey13();
 document.body.insertAdjacentHTML('beforeend',`<div class="themeSheet13" id="themeSheet13"><section><header><b>Tema</b><button id="themeClose13">×</button></header><div class="themeGrid13">${THEMES13.map(t=>`<button class="themeSwatch13 ${t[0]===cur?'on':''}" data-theme13="${t[0]}" style="--a:${t[1]};--b:${t[2]}"><i></i><span>${t[0]}</span></button>`).join('')}</div></section></div>`);
 $('#themeClose13').onclick=()=>$('#themeSheet13').remove();$('#themeSheet13').onclick=e=>{if(e.target.id==='themeSheet13')e.currentTarget.remove()};
 $$('[data-theme13]').forEach(b=>b.onclick=()=>{applyTheme13(b.dataset.theme13);$('#themeSheet13').remove()})
}
applyTheme13();

function normalizeWord13(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9áéíóúñü]+/gi,'')}
function mergeText13(a,b){
 a=String(a||'').trim();b=String(b||'').trim();if(!a)return b;if(!b)return a;
 const aw=a.split(/\s+/),bw=b.split(/\s+/),max=Math.min(22,aw.length,bw.length);let best=0;
 for(let n=max;n>=3;n--){let ok=true;for(let i=0;i<n;i++)if(normalizeWord13(aw[aw.length-n+i])!==normalizeWord13(bw[i])){ok=false;break}if(ok){best=n;break}}
 return best?`${a} ${bw.slice(best).join(' ')}`:`${a}\n${b}`
}
function readyChunks13(){return [...chunks].filter(x=>x.status==='ready'&&x.transcript).sort((a,b)=>(a.start_ms||0)-(b.start_ms||0)||Number(a.seq||0)-Number(b.seq||0))}
function fullText13(){
 const arr=readyChunks13();if(!arr.length)return '';
 const groups=[];for(const x of arr){let g=groups.find(y=>y.part===Number(x.segment_no||1));if(!g){g={part:Number(x.segment_no||1),start:x.start_ms||0,end:x.end_ms||0,text:'',who:x.participant_name||'Clase'};groups.push(g)}g.end=Math.max(g.end,x.end_ms||0);g.text=mergeText13(g.text,x.transcript)}
 return groups.sort((a,b)=>a.part-b.part).map(g=>`PARTE ${g.part} · ${ms(g.start)}–${ms(g.end)}\n${g.text}`).join('\n\n')
}
fullText=fullText13;
function renderFullTranscript13(){const e=$('#fullTranscript');if(e)e.textContent=fullText13()||'Todavía no hay fragmentos terminados.';updateTranscriptActions13()}
renderFullTranscript=renderFullTranscript13;
function renderChunks13(){
 const el=$('#chunks');if(!el)return;const arr=[...chunks].sort((a,b)=>(a.start_ms||0)-(b.start_ms||0)||Number(a.seq||0)-Number(b.seq||0));
 el.innerHTML=arr.map(x=>{const pend=['queued','transcribing'].includes(x.status),ov=Number(x.overlap_ms||0);return `<article class="chunk ${pend?'pending':''}"><div class="chunkMeta"><span>parte ${Number(x.segment_no||1)} · ${ms(x.start_ms)}–${ms(x.end_ms)}${ov?' · +'+Math.round(ov/1000)+'s':''}</span><span>${x.status==='ready'?'listo':x.status==='error'?'error':`transcribiendo <span class="loader"><i></i><i></i><i></i></span>`}</span></div><div class="chunkText">${esc(x.transcript||x.provisional_text||'procesando audio…')}</div></article>`}).join('')||'<div class="chunk tiny ghost">La transcripción aparece acá mientras grabás.</div>';
 el.scrollTop=el.scrollHeight;renderFullTranscript13();updateTranscriptActions13()
}
renderChunks=renderChunks13;

function transcriptPanelHTML13(){return `<div class="recordBox record13"><div class="recLine"><div class="recState" id="recState"><i class="recDot"></i><span id="recLabel">listo</span></div><div class="timer" id="timer">00:00</div></div><div class="recControls"><button class="recBtn hot" id="recStart">GRABAR</button><button class="recBtn" id="recBreak" disabled>RECREO</button><button class="recBtn" id="recFinish" disabled>FINALIZAR</button></div><div class="preview" id="preview">20 s · solape 5 s · no corta la clase</div></div><div class="transTools13"><nav class="tabs transTabs13"><button class="tab on" data-trans="live">partes</button><button class="tab" data-trans="full">total</button></nav><div class="transActions13"><button id="copyTranscript13" disabled>copiar</button><button id="shareTranscript13" disabled>compartir</button><button id="aiTranscript13" disabled>ChatGPT</button></div></div><div class="chunks" id="chunks"></div><div class="fullTranscript hide" id="fullTranscript"></div>`}
transcriptPanelHTML=transcriptPanelHTML13;

function stopCap13(){clearInterval(launchTimer13);launchTimer13=null;for(const x of cap13.values()){clearTimeout(x.stop);try{if(x.rec.state==='recording')x.rec.stop()}catch{}}}
function launchWindow13(){
 if(!recLive||recPaused||!stream)return;const mime=pickMime(),pieces=[],started=Date.now(),start=Math.max(0,started-recStarted),captureSeq=++capSeq13;let mr;
 try{mr=new MediaRecorder(stream,mime?{mimeType:mime}:undefined)}catch{return}
 const row={rec:mr,stop:null,seq:captureSeq,start};cap13.set(captureSeq,row);
 mr.ondataavailable=e=>{if(e.data?.size)pieces.push(e.data)};
 mr.onstop=()=>{clearTimeout(row.stop);cap13.delete(captureSeq);const ended=Date.now(),finish=Math.max(start,ended-recStarted),blob=new Blob(pieces,{type:mr.mimeType||pieces[0]?.type||'audio/webm'});if(blob.size>500)handleAudioChunk(blob,start,finish,{seq:captureSeq,overlap_ms:captureSeq>1?OVERLAP13:0,capture_window_ms:Math.max(0,finish-start),capture_version:'overlap-v1'})};
 try{mr.start();row.stop=setTimeout(()=>{try{if(mr.state==='recording')mr.stop()}catch{}},WIN13)}catch{cap13.delete(captureSeq)}
}
function startCycle13(){clearInterval(launchTimer13);launchWindow13();launchTimer13=setInterval(launchWindow13,STEP13)}
startRecording=async function(){
 if(recLive&&recPaused){recPaused=false;part++;startCycle13();startRecognition();updateRecUI();renderParts();setActivity('grabando');return}if(recLive)return;
 try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}catch{toast('Necesito permiso de micrófono');return}
 recLive=true;recPaused=false;recStarted=Date.now();part=1;seq=0;capSeq13=0;startCycle13();startRecognition();timerLoop();updateRecUI();renderParts();setActivity('grabando');
};
toggleBreak=function(){if(!recLive)return;if(!recPaused){recPaused=true;stopCap13();stopRecognition();updateRecUI();setActivity('recreo')}else{recPaused=false;part++;startCycle13();startRecognition();updateRecUI();renderParts();setActivity('grabando')}};
finishRecording=function(){if(!recLive)return;recLive=false;recPaused=false;stopCap13();setTimeout(()=>{stream?.getTracks().forEach(t=>t.stop());stream=null},450);stopRecognition();room.status='complete';st.sessions[room.id]=room;save();roomClient.from('study_class_sessions').update({status:'complete',updated_at:now13()}).eq('id',room.id);updateRecUI();setActivity('online');toast('Clase cerrada · la transcripción termina en segundo plano')};
cleanupRoom=function(){stopCap13();old13.cleanupRoom()};

handleAudioChunk=async function(blob,start,end,meta={}){const id=crypto.randomUUID(),n=Number(meta.seq||++seq),localKey=`${room.id}:${part}:${n}:${id}`,x={id,session_id:room.id,participant_id:st.profile.id,participant_name:st.profile.name,segment_no:part,seq:n,start_ms:start,end_ms:end,overlap_ms:Number(meta.overlap_ms||0),capture_window_ms:Number(meta.capture_window_ms||Math.max(0,end-start)),capture_version:meta.capture_version||'legacy',transcript:'',source:'whisper-large-v3-turbo',status:'queued',audio_chunk_id:localKey,mime_type:blob.type,byte_size:blob.size,provisional_text:previewText||'',created_at:now13()};chunks.push(x);renderChunks13();broadcast('transcript',{chunk:x});putAudio(localKey,blob).catch(()=>{});transQueue.push({x,blob});pumpTranscription()};
transcribeJob=async function({x,blob}){x.status='transcribing';renderChunks13();broadcast('transcript',{chunk:x});const f=new FormData();f.append('audio',blob,`chunk-${x.seq}.webm`);for(const [k,v] of Object.entries({session_id:room.id,room_token:room.token,chunk_id:x.id,participant_id:x.participant_id,participant_name:x.participant_name,segment_no:x.segment_no,seq:x.seq,start_ms:x.start_ms,end_ms:x.end_ms,overlap_ms:x.overlap_ms||0,capture_window_ms:x.capture_window_ms||0,capture_version:x.capture_version||'overlap-v1',audio_chunk_id:x.audio_chunk_id,provisional_text:x.provisional_text||''}))f.append(k,String(v));try{const r=await fetch(TRANSCRIBE,{method:'POST',body:f}),data=await r.json();if(!r.ok||!data.ok)throw new Error(data.detail||data.error||'transcripción');x.status='ready';x.transcript=data.transcript||'';x.finished_processing_at=now13();broadcast('transcript',{chunk:x});renderChunks13();await updateFullDoc()}catch(e){x.status='error';x.error=String(e.message||e);broadcast('transcript',{chunk:x});renderChunks13()}};

async function copyTranscript13(){const t=fullText13();if(!t)return;try{await navigator.clipboard.writeText(t);toast('Transcripción copiada')}catch{prompt('Copiá la transcripción',t)}}
function publicPage13(token){return new URL(`./transcript.html?s=${encodeURIComponent(token)}`,location.href).toString()}
function publicApi13(token){return `${SHARE13}?s=${encodeURIComponent(token)}`}
async function ensureShare13(force=false){
 if(shareBusy13)return null;if(share13&&!force)return share13;const t=fullText13();if(!t){toast('Todavía no hay transcripción completa');return null}shareBusy13=true;updateTranscriptActions13();
 try{await updateFullDoc();const r=await fetch(SHARE13,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'create',session_id:room.id,room_token:room.token,created_by:st.profile.id})}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'share');share13=d.share;return share13}catch(e){toast('No pude publicar la transcripción');return null}finally{shareBusy13=false;updateTranscriptActions13()}
}
async function shareTranscript13(){const s=await ensureShare13(true);if(!s)return;const u=publicPage13(s.share_token);try{await navigator.clipboard.writeText(u);toast('Link público copiado')}catch{prompt('Copiá este link público',u)}}
function prompt13(kind,api){const base=`Usá como fuente principal esta transcripción de una clase: ${api}\nNo inventes contenido que no esté respaldado por la transcripción. Si algo es dudoso o quedó cortado, marcá la incertidumbre.`;if(kind==='clean')return `${base}\nPasala en limpio como apuntes claros y completos. Conservá conceptos, ejemplos, relaciones, nombres y preguntas importantes. Organizá por temas, no por cortes técnicos de audio.`;if(kind==='study')return `${base}\nConvertí la clase en material de estudio: resumen conectado, conceptos clave, relaciones, ejemplos, preguntas de recuperación activa y dudas pendientes. Separá explícitamente lo dicho en clase de cualquier inferencia.`;return `${base}\nHacé un resumen fiel y compacto de la clase: ideas principales, argumentos, ejemplos, definiciones y pendientes. Al final agregá 5 puntos que conviene recordar.`}
async function openAI13(kind='summary'){const s=await ensureShare13();if(!s)return;const q=prompt13(kind,publicApi13(s.share_token));window.open('https://chatgpt.com/?q='+encodeURIComponent(q),'_blank','noopener')}
function openAIMenu13(){document.querySelector('#aiMenu13')?.remove();document.body.insertAdjacentHTML('beforeend',`<div class="aiMenu13" id="aiMenu13"><section><header><b>ChatGPT</b><button id="aiClose13">×</button></header><button data-ai13="summary"><b>resumir</b><span>ideas, ejemplos y pendientes</span></button><button data-ai13="clean"><b>pasar en limpio</b><span>apuntes fieles y ordenados</span></button><button data-ai13="study"><b>estudiar</b><span>recall, relaciones y dudas</span></button></section></div>`);$('#aiClose13').onclick=()=>$('#aiMenu13').remove();$('#aiMenu13').onclick=e=>{if(e.target.id==='aiMenu13')e.currentTarget.remove()};$$('[data-ai13]').forEach(b=>b.onclick=()=>{const k=b.dataset.ai13;$('#aiMenu13').remove();openAI13(k)})}
function updateTranscriptActions13(){const ok=!!fullText13(),busy=shareBusy13;for(const id of ['copyTranscript13','shareTranscript13','aiTranscript13']){const b=$('#'+id);if(b)b.disabled=!ok||busy}const s=$('#shareTranscript13');if(s)s.textContent=busy?'…':'compartir'}
function wireTranscript13(){
 $('#recStart')&&($('#recStart').onclick=startRecording);$('#recBreak')&&($('#recBreak').onclick=toggleBreak);$('#recFinish')&&($('#recFinish').onclick=finishRecording);
 $$('[data-trans]').forEach(b=>b.onclick=()=>{const full=b.dataset.trans==='full';$$('[data-trans]').forEach(x=>x.classList.toggle('on',x===b));$('#chunks')?.classList.toggle('hide',full);$('#fullTranscript')?.classList.toggle('hide',!full);renderFullTranscript13()});
 $('#copyTranscript13')&&($('#copyTranscript13').onclick=copyTranscript13);$('#shareTranscript13')&&($('#shareTranscript13').onclick=shareTranscript13);$('#aiTranscript13')&&($('#aiTranscript13').onclick=openAIMenu13);updateTranscriptActions13()
}
function patchSession13(){if(view!=='session'||!room)return;const p=$('#transcriptPanel');if(p&&!p.querySelector('.record13')){p.innerHTML=transcriptPanelHTML13();renderChunks13();wireTranscript13();updateRecUI()}else wireTranscript13();themeButton13()}
const renderSession13=renderSession;renderSession=function(){renderSession13();setTimeout(patchSession13,30)};
const renderLibrary13=renderLibrary;renderLibrary=function(){renderLibrary13();setTimeout(themeButton13,20)};
const renderCourse13=renderCourse;renderCourse=function(){renderCourse13();setTimeout(themeButton13,20)};
const onBroadcast13=onBroadcast;onBroadcast=function(p){onBroadcast13(p);if(p?.type==='transcript')setTimeout(()=>{renderChunks13();updateTranscriptActions13()},0)};

setTimeout(()=>{if(view==='session')patchSession13();else themeButton13()},120);
})();
