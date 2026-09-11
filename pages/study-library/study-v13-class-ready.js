(()=>{'use strict';
if(window.__STUDY_CLASS_V13)return;window.__STUDY_CLASS_V13=true;

const CAP13={windowMs:20000,stepMs:15000,overlapMs:5000,version:'overlap-v1'};
const SHARE13=U+'/functions/v1/study-transcript-share-v1';
const THEMES13=[
 ['noche','#111326','#D8D1FF'],['crema','#F5DABF','#6C151E'],['tinta','#111827','#D9E4FF'],['bosque','#10231C','#D8EED0'],
 ['petroleo','#0C2630','#CDECF2'],['borgona','#2A1017','#F1D0C7'],['ciruela','#201427','#E9C8FF'],['papel','#F1E7D8','#241F1A']
];
const old13={renderSession,cleanupRoom,toggleBreak,finishRecording,renderChunks,renderFullTranscript,fullText,transcribeJob,updateFullDoc};
let capInterval13=null,capGeneration13=0,activeCaps13=new Map(),partWindows13=new Map(),themeObserver13=null;

const clean13=(v,n=20000)=>String(v??'').replace(/\r/g,'').trim().slice(0,n);
const normToken13=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const now13=()=>new Date().toISOString();
const currentTheme13=()=>localStorage.getItem('study:v13:theme')||'noche';
function theme13(id){return THEMES13.find(t=>t[0]===id)||THEMES13[0]}
function applyTheme13(id=currentTheme13()){
 const t=theme13(id);localStorage.setItem('study:v13:theme',t[0]);
 document.documentElement.style.setProperty('--bg',t[1]);document.documentElement.style.setProperty('--ink',t[2]);
 document.documentElement.style.setProperty('--study-bg',t[1]);document.documentElement.style.setProperty('--study-ink',t[2]);
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',t[1]);
 document.querySelectorAll('.themeSwatch13').forEach(x=>{x.style.setProperty('--tbg',t[1]);x.style.setProperty('--tink',t[2])});
}
function openThemes13(){
 document.querySelector('#themeSheet13')?.remove();
 const cur=currentTheme13();document.body.insertAdjacentHTML('beforeend',`<div class="sheetBack13" id="themeSheet13"><section class="themeSheet13"><header><b>Color</b><button data-close13>×</button></header><div class="themeGrid13">${THEMES13.map(t=>`<button class="themeChoice13 ${t[0]===cur?'on':''}" data-theme13="${t[0]}" style="--tbg:${t[1]};--tink:${t[2]}"><i></i><span>${t[0]}</span></button>`).join('')}</div></section></div>`);
 const sh=document.querySelector('#themeSheet13');sh.querySelector('[data-close13]').onclick=()=>sh.remove();sh.onclick=e=>{if(e.target===sh)sh.remove()};
 sh.querySelectorAll('[data-theme13]').forEach(b=>b.onclick=()=>{applyTheme13(b.dataset.theme13);openThemes13()});
}
function ensureThemeButton13(){
 if(document.querySelector('#themeBtn13'))return;
 const target=document.querySelector('.sessionHead>div:last-child,.courseTop11,.libraryHead12,.top');if(!target)return;
 const b=document.createElement('button');b.id='themeBtn13';b.className='themeBtn13';b.type='button';b.title='Color';b.innerHTML='<span class="themeSwatch13" aria-hidden="true"></span>';b.onclick=openThemes13;target.appendChild(b);applyTheme13();
}

function stopCap13(){
 capGeneration13++;if(capInterval13){clearInterval(capInterval13);capInterval13=null}clearTimeout(sliceTimer);sliceTimer=null;
 for(const slot of [...activeCaps13.values()]){clearTimeout(slot.stopTimer);try{if(slot.rec.state!=='inactive')slot.rec.stop()}catch{}}
}
function launchCap13(gen){
 if(gen!==capGeneration13||!recLive||recPaused||!stream?.active)return;
 const mime=pickMime(),pieces=[],started=Date.now(),sessionId=room?.id,roomToken=room?.token,segment=part;
 if(!sessionId||!roomToken)return;
 const ordinal=(partWindows13.get(segment)||0)+1;partWindows13.set(segment,ordinal);const chunkSeq=++seq;
 let r;try{r=new MediaRecorder(stream,mime?{mimeType:mime}:undefined)}catch(e){console.warn('MediaRecorder',e);return}
 const slot={rec:r,pieces,started,sessionId,roomToken,segment,chunkSeq,overlap:ordinal>1?CAP13.overlapMs:0,stopTimer:null,gen};activeCaps13.set(chunkSeq,slot);rec=r;recPieces=pieces;sliceStarted=started;
 r.ondataavailable=e=>{if(e.data?.size)pieces.push(e.data)};
 r.onstop=()=>finalizeCap13(slot);
 r.onerror=e=>console.warn('capture',e?.error||e);
 try{r.start();slot.stopTimer=setTimeout(()=>{try{if(r.state==='recording')r.stop()}catch{}},CAP13.windowMs)}catch(e){activeCaps13.delete(chunkSeq);console.warn('capture start',e)}
}
function startSlice13(){
 stopCap13();if(seq===0&&part===1)partWindows13.clear();const gen=capGeneration13;launchCap13(gen);capInterval13=setInterval(()=>launchCap13(gen),CAP13.stepMs);sliceTimer=capInterval13;
 const p=document.querySelector('#preview');if(p&&!previewText)p.textContent='20 s · cada 15 s · solape 5 s';
}
async function finalizeCap13(slot){
 if(!activeCaps13.has(slot.chunkSeq))return;activeCaps13.delete(slot.chunkSeq);clearTimeout(slot.stopTimer);
 const ended=Date.now(),blob=new Blob(slot.pieces,{type:slot.rec.mimeType||slot.pieces[0]?.type||'audio/webm'}),start=Math.max(0,slot.started-recStarted),finish=Math.max(start,ended-recStarted);
 if(blob.size<=500||finish-start<350)return;
 const id=crypto.randomUUID(),localKey=`${slot.sessionId}:${slot.segment}:${slot.chunkSeq}:${id}`;
 const x={id,session_id:slot.sessionId,participant_id:st.profile.id,participant_name:st.profile.name,segment_no:slot.segment,seq:slot.chunkSeq,start_ms:start,end_ms:finish,overlap_ms:slot.overlap,capture_window_ms:Math.max(0,finish-start),capture_version:CAP13.version,transcript:'',source:'whisper-large-v3-turbo',status:'queued',audio_chunk_id:localKey,mime_type:blob.type,byte_size:blob.size,provisional_text:previewText||'',created_at:now13()};
 const inRoom=room?.id===slot.sessionId;if(inRoom){chunks.push(x);renderChunks();broadcast?.('transcript',{chunk:x})}
 putAudio(localKey,blob).catch(()=>{});transQueue.push({x,blob,sessionId:slot.sessionId,roomToken:slot.roomToken,attempt:0});pumpTranscription();
}
startSlice=startSlice13;rotateSlice=()=>{};

toggleBreak=function(){
 if(!recLive)return;
 if(!recPaused){recPaused=true;stopCap13();stopRecognition();updateRecUI();renderParts();setActivity?.('recreo');persistCurrentDoc13().catch(()=>{})}
 else{recPaused=false;part++;partWindows13.set(part,0);startSlice13();startRecognition();updateRecUI();renderParts();setActivity?.('grabando')}
};
finishRecording=function(){
 if(!recLive)return;const sid=room?.id,token=room?.token,client=roomClient,title=room?.title;
 recLive=false;recPaused=false;stopCap13();stopRecognition();setTimeout(()=>{try{stream?.getTracks().forEach(t=>t.stop())}catch{}stream=null},500);
 if(room){room.status='complete';st.sessions[room.id]=room;save()}if(client&&sid)client.from('study_class_sessions').update({status:'complete',updated_at:now13()}).eq('id',sid);
 updateRecUI();renderParts();setActivity?.('online');if(sid&&token)persistFullFor13(sid,token).catch(()=>{});toast(`${title||'Clase'} cerrada · el audio pendiente sigue procesando`)
};
cleanupRoom=function(){stopCap13();old13.cleanupRoom()};

function exactTrim13(prev,next){
 const A=clean13(prev).split(/\s+/).filter(Boolean),B=clean13(next).split(/\s+/).filter(Boolean);if(!A.length||!B.length)return clean13(next);
 const an=A.map(normToken13),bn=B.map(normToken13),max=Math.min(32,A.length,B.length);
 for(let k=max;k>=2;k--){let ok=true;for(let i=0;i<k;i++)if(an[A.length-k+i]!==bn[i]){ok=false;break}if(ok)return B.slice(k).join(' ')}
 return clean13(next);
}
function groups13(list){
 const ready=[...(list||[])].filter(x=>x.status==='ready'&&clean13(x.transcript)).sort((a,b)=>(a.start_ms||0)-(b.start_ms||0)||(a.seq||0)-(b.seq||0));
 const map=new Map();for(const x of ready){const k=`${x.participant_id||x.participant_name}|${x.segment_no||1}`;if(!map.has(k))map.set(k,{participant:x.participant_name||'Participante',segment:x.segment_no||1,start:x.start_ms||0,items:[]});map.get(k).items.push(x)}
 return [...map.values()].sort((a,b)=>a.start-b.start).map(g=>{let text='';for(const x of g.items){const t=clean13(x.transcript);text=text?`${text} ${x.overlap_ms>0?exactTrim13(text,t):t}`:t}return{...g,text:text.replace(/\s+([,.;:!?])/g,'$1').replace(/\s{2,}/g,' ').trim()}})
}
function fullTextFrom13(list){const gs=groups13(list);return gs.map(g=>`PARTE ${g.segment} · ${g.participant} · ${ms(g.start)}\n${g.text}`).join('\n\n')}
function rawText13(list){return [...(list||[])].filter(x=>x.status==='ready'&&x.transcript).sort((a,b)=>(a.start_ms||0)-(b.start_ms||0)||(a.seq||0)-(b.seq||0)).map(x=>`[P${x.segment_no||1} · ${x.participant_name||'Participante'} · ${ms(x.start_ms)}–${ms(x.end_ms)}]\n${clean13(x.transcript)}`).join('\n\n')}
fullText=function(){return fullTextFrom13(chunks)};
renderFullTranscript=function(){const e=document.querySelector('#fullTranscript');if(e)e.textContent=fullTextFrom13(chunks)||'Todavía no hay fragmentos terminados.'};
renderChunks=function(){
 const el=document.querySelector('#chunks');if(!el)return;const arr=[...chunks].sort((a,b)=>(a.start_ms||0)-(b.start_ms||0)||(a.seq||0)-(b.seq||0));
 el.innerHTML=arr.map(x=>{const pend=['queued','transcribing'].includes(x.status),ov=Number(x.overlap_ms||0),cap=x.capture_version==='overlap-v1';return `<article class="chunk chunk13 ${pend?'pending':''} ${x.status==='error'?'error':''}"><div class="chunkMeta"><span>P${x.segment_no||1} · ${esc(x.participant_name)} · ${ms(x.start_ms)}–${ms(x.end_ms)}${ov?` · +${Math.round(ov/1000)} s`:''}</span><span>${x.status==='ready'?'listo':x.status==='error'?`<button class="retry13" data-retry13="${x.id}">reintentar</button>`:`transcribiendo <span class="loader"><i></i><i></i><i></i></span>`}</span></div><div class="chunkText">${esc(x.transcript||x.provisional_text||'procesando audio…')}</div>${cap?'<div class="chunkCapture13">solape seguro</div>':''}</article>`}).join('')||'<div class="chunk tiny ghost">Grabá y los fragmentos aparecen acá.</div>';
 el.querySelectorAll('[data-retry13]').forEach(b=>b.onclick=()=>retryChunk13(b.dataset.retry13));el.scrollTop=el.scrollHeight;renderFullTranscript()
};

async function getAudio13(k){const d=await openDB();return new Promise((res,rej)=>{const t=d.transaction('chunks','readonly'),r=t.objectStore('chunks').get(k);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
async function retryChunk13(id){const x=chunks.find(c=>c.id===id);if(!x)return;let blob;try{blob=await getAudio13(x.audio_chunk_id)}catch{}if(!blob)return toast('Ese audio local ya no está en este dispositivo');const token=room?.id===x.session_id?room.token:st.sessions?.[x.session_id]?.token;if(!token)return toast('Falta la llave de esa clase');x.status='queued';x.error=null;renderChunks();transQueue.push({x,blob,sessionId:x.session_id,roomToken:token,attempt:0});pumpTranscription()}
async function transcribeJob13(job){
 const {x,blob}=job,sessionId=job.sessionId||x.session_id,roomToken=job.roomToken||st.sessions?.[sessionId]?.token||'',inRoom=()=>room?.id===sessionId;
 x.status='transcribing';if(inRoom()){renderChunks();broadcast?.('transcript',{chunk:x})}
 const f=new FormData();f.append('audio',blob,`chunk-${x.seq}.webm`);const vals={session_id:sessionId,room_token:roomToken,chunk_id:x.id,participant_id:x.participant_id,participant_name:x.participant_name,segment_no:x.segment_no,seq:x.seq,start_ms:x.start_ms,end_ms:x.end_ms,overlap_ms:x.overlap_ms||0,capture_window_ms:x.capture_window_ms||Math.max(0,x.end_ms-x.start_ms),capture_version:x.capture_version||CAP13.version,audio_chunk_id:x.audio_chunk_id,provisional_text:x.provisional_text||''};for(const [k,v] of Object.entries(vals))f.append(k,String(v));
 try{const r=await fetch(TRANSCRIBE,{method:'POST',body:f}),data=await r.json().catch(()=>({}));if(!r.ok||!data.ok){const err=new Error(data.detail||data.error||`transcripción ${r.status}`);err.status=r.status;throw err}x.status='ready';x.transcript=data.transcript||'';x.source=data.source||x.source;x.finished_processing_at=now13();if(inRoom()){broadcast?.('transcript',{chunk:x});renderChunks()}await persistFullFor13(sessionId,roomToken)}
 catch(e){const attempt=Number(job.attempt||0),status=Number(e.status||0),transient=!status||status===429||status>=500;if(transient&&attempt<2){x.status='queued';if(inRoom())renderChunks();setTimeout(()=>{transQueue.push({...job,attempt:attempt+1});pumpTranscription()},1500*Math.pow(2,attempt));return}x.status='error';x.error=String(e.message||e);if(inRoom()){broadcast?.('transcript',{chunk:x});renderChunks()}}
}
transcribeJob=transcribeJob13;

async function persistFullFor13(sessionId,roomToken){
 if(!sessionId||!roomToken)return;let arr,client,by=st.profile.name||'Participante';
 if(room?.id===sessionId&&roomClient){arr=chunks;client=roomClient}else{client=clientFor(roomToken);const q=await client.from('study_transcript_chunks').select('*').eq('session_id',sessionId).order('start_ms');if(q.error)return;arr=q.data||[]}
 const txt=fullTextFrom13(arr);if(!txt)return;await client.from('study_session_docs').upsert({session_id:sessionId,full_transcript:txt,updated_by:by,updated_at:now13(),version:Date.now()},{onConflict:'session_id'})
}
async function persistCurrentDoc13(){
 if(!roomClient||!room)return;const shared=[...notes].filter(n=>!n.deleted_at).sort((a,b)=>a.position-b.position).map(n=>n.content).filter(Boolean).join('\n\n'),txt=fullTextFrom13(chunks);
 await roomClient.from('study_session_docs').upsert({session_id:room.id,shared_notes:shared,full_transcript:txt,updated_by:st.profile.name,updated_at:now13(),version:Date.now()},{onConflict:'session_id'})
}
updateFullDoc=async function(){if(room?.id&&room?.token)await persistFullFor13(room.id,room.token)};

function prompt13(url,mode='clean',partial=false){
 const head=partial?'La transcripción puede seguir creciendo; trabajá sólo con lo que está publicado ahora. ':'';
 const tasks={clean:'Pasala en limpio como apuntes fieles y ordenados.',summary:'Hacé un resumen estructurado y breve sin perder conceptos importantes.',study:'Convertíla en un apunte de estudio completo: explicación conectada, conceptos/definiciones, ejemplos del docente, relaciones, dudas y pendientes.'};
 return `${head}Abrí esta transcripción pública de una clase: ${url}\n\n${tasks[mode]||tasks.clean}\nReglas: usá la transcripción y las notas de esa página como fuente principal; no inventes contenido que no aparezca; si algo es dudoso o inaudible marcá [dudoso/inaudible] en vez de completarlo; conservá fechas, nombres, ejemplos y consignas. Al final agregá una sección “Listo para pegar en notas” con texto limpio.`
}
async function shareSnapshot13(){
 if(!room||!roomClient)throw new Error('room');await persistCurrentDoc13();const r=await fetch(SHARE13,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'create',session_id:room.id,room_token:room.token,created_by:st.profile.id})}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'share');const publicUrl=new URL(`./transcript-share.html?s=${encodeURIComponent(d.share.share_token)}`,location.href).toString();localStorage.setItem(`study:v13:share:${room.id}`,JSON.stringify({token:d.share.share_token,url:publicUrl,expires_at:d.share.expires_at}));return{...d.share,url:publicUrl}
}
async function copyShare13(){
 const ready=chunks.some(x=>x.status==='ready'&&x.transcript);if(!ready)return toast('Todavía no hay transcripción lista');try{const s=await shareSnapshot13();await navigator.clipboard.writeText(s.url);toast('Link público copiado · vence en 30 días')}catch(e){toast('No pude crear el link público');console.warn(e)}
}
async function createShare13(mode){
 if(!room||!roomClient)return;const ready=chunks.filter(x=>x.status==='ready'&&x.transcript).length,pending=chunks.filter(x=>['queued','transcribing'].includes(x.status)).length;if(!ready)return toast('Todavía no hay transcripción lista');
 const pop=window.open('about:blank','_blank');try{const s=await shareSnapshot13(),p=prompt13(s.url,mode,pending>0),chat=`https://chatgpt.com/?prompt=${encodeURIComponent(p)}`;try{await navigator.clipboard.writeText(p)}catch{};if(pop)pop.location.replace(chat);else window.open(chat,'_blank');toast('ChatGPT abierto · prompt copiado');closeAISheet13()}catch(e){try{pop?.close()}catch{}toast('No pude preparar el link público');console.warn(e)}
}
function closeAISheet13(){document.querySelector('#aiSheet13')?.remove()}
function openAISheet13(){
 closeAISheet13();const ready=chunks.filter(x=>x.status==='ready'&&x.transcript).length,pending=chunks.filter(x=>['queued','transcribing'].includes(x.status)).length;
 document.body.insertAdjacentHTML('beforeend',`<div class="sheetBack13" id="aiSheet13"><section class="aiSheet13"><header><div><b>ChatGPT</b><span>${ready} fragmentos listos${pending?` · ${pending} procesando`:''}</span></div><button data-close13>×</button></header><button data-ai13="clean"><b>pasar en limpio</b><span>apunte fiel · sin completar huecos</span></button><button data-ai13="summary"><b>resumir</b><span>ideas principales + conceptos</span></button><button data-ai13="study"><b>apunte de estudio</b><span>explicación + ejemplos + pendientes</span></button><div class="aiFoot13">Se crea una copia pública no indexada por 30 días. El link no da acceso a la clase.</div></section></div>`);
 const sh=document.querySelector('#aiSheet13');sh.querySelector('[data-close13]').onclick=closeAISheet13;sh.onclick=e=>{if(e.target===sh)closeAISheet13()};sh.querySelectorAll('[data-ai13]').forEach(b=>b.onclick=()=>createShare13(b.dataset.ai13))
}
async function copyTotal13(){const t=fullTextFrom13(chunks);if(!t)return toast('Todavía no hay transcripción lista');try{await navigator.clipboard.writeText(t);toast('Transcripción total copiada')}catch{toast('No pude copiar')};}
function downloadTotal13(){const t=fullTextFrom13(chunks);if(!t)return toast('Todavía no hay transcripción lista');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/plain;charset=utf-8'}));a.download=`${(room?.title||'clase').replace(/[^a-z0-9áéíóúñ]+/gi,'-')}-transcripcion.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
async function insertAIText13(text){
 text=clean13(text,60000);if(!text||!roomClient||!room)return;const sorted=[...notes].filter(n=>!n.deleted_at).sort((a,b)=>a.position-b.position),n={id:crypto.randomUUID(),session_id:room.id,block_key:crypto.randomUUID(),position:(sorted.at(-1)?.position||0)+1,content:text,author_id:st.profile.id,author_name:st.profile.name,last_editor_id:st.profile.id,last_editor_name:st.profile.name,revision:1,block_type:'text',payload:{author_color:st.profile.color||'#d8d1ff',source:'chatgpt-import',imported_at:now13()},created_at:now13(),updated_at:now13()};const q=await roomClient.from('study_note_blocks').insert(n).select('*').single();if(q.error)return toast('No pude agregar las notas');notes.push(q.data);renderNotes();broadcast?.('note',{block:q.data});await persistCurrentDoc13();toast('Pegado en notas compartidas')
}
async function openPasteAI13(){
 let clip='';try{clip=await navigator.clipboard.readText()}catch{};document.querySelector('#pasteSheet13')?.remove();document.body.insertAdjacentHTML('beforeend',`<div class="sheetBack13" id="pasteSheet13"><section class="pasteSheet13"><header><b>Pegar resultado</b><button data-close13>×</button></header><textarea id="pasteAIText13" placeholder="Pegá acá la respuesta de ChatGPT…">${esc(clip)}</textarea><button class="primary" id="pasteAISave13">agregar a notas</button></section></div>`);const sh=document.querySelector('#pasteSheet13');sh.querySelector('[data-close13]').onclick=()=>sh.remove();sh.onclick=e=>{if(e.target===sh)sh.remove()};sh.querySelector('#pasteAISave13').onclick=async()=>{const t=sh.querySelector('#pasteAIText13').value;if(!t.trim())return;await insertAIText13(t);sh.remove()}
}

function patchTranscript13(){
 if(view!=='session')return;const tabs=document.querySelectorAll('[data-trans]');tabs.forEach(b=>{if(b.dataset.trans==='live')b.textContent='partes';if(b.dataset.trans==='full')b.textContent='total'});
 const host=document.querySelector('#transcriptPanel');if(!host)return;let bar=host.querySelector('#transcriptTools13');if(!bar){bar=document.createElement('div');bar.id='transcriptTools13';bar.className='transcriptTools13';bar.innerHTML='<span>20 s · +5 s</span><button id="copyTranscript13">copiar</button><button id="downloadTranscript13">txt</button><button id="shareTranscript13">link</button><button id="pasteAI13">pegar IA</button><button class="primary" id="openAI13">ChatGPT</button>';const t=host.querySelector('.tabs');(t||host.querySelector('.recordBox'))?.insertAdjacentElement('afterend',bar);bar.querySelector('#copyTranscript13').onclick=copyTotal13;bar.querySelector('#downloadTranscript13').onclick=downloadTotal13;bar.querySelector('#shareTranscript13').onclick=copyShare13;bar.querySelector('#pasteAI13').onclick=openPasteAI13;bar.querySelector('#openAI13').onclick=openAISheet13}
 const p=host.querySelector('#preview');if(p&&!recLive&&!previewText)p.textContent='20 s · cada 15 s · solape 5 s';renderChunks();
}
function patchHeader13(){if(view!=='session')return;ensureThemeButton13();const share=document.querySelector('#shareRoom');if(share)share.textContent='invitar'}
function patchSession13(){if(view!=='session'||!room)return;patchHeader13();patchTranscript13();document.querySelector('.session')?.classList.add('session13')}
const renderSessionBefore13=renderSession;renderSession=function(){renderSessionBefore13();setTimeout(patchSession13,80)};

applyTheme13();themeObserver13=new MutationObserver(()=>{ensureThemeButton13();if(view==='session')patchSession13()});themeObserver13.observe(document.querySelector('#app')||document.body,{subtree:true,childList:true});
setTimeout(()=>{ensureThemeButton13();if(view==='session')patchSession13()},180);
window.__studyClassV13={capture:CAP13,fullTextFromChunks:fullTextFrom13,rawTextFromChunks:rawText13,trimOverlap:exactTrim13,prompt:prompt13,applyTheme:applyTheme13,shareSnapshot:shareSnapshot13};
})();