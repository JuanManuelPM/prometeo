const $=s=>document.querySelector(s);
const feed=$('#feed'),empty=$('#empty'),works=$('#works'),workList=$('#workList'),bottom=$('#bottom'),prepareRow=$('#prepareRow'),count=$('#count'),add=$('#add'),composer=$('#composer'),scrim=$('#scrim'),close=$('#close'),draft=$('#draft'),recBtn=$('#rec'),st=$('#state'),send=$('#send'),diag=$('#diag'),composerTitle=$('.chead span');
let notes=normalizeNotes(JSON.parse(localStorage.getItem('captureLabNotes')||'[]'));
let active=null,lastRange=null,db=null,pending=0,lastAudioId=localStorage.getItem('captureLabLastAudio')||null,lastFailedJob=null,editingId=null,worker=null;
const jobs=new Map();
const logs=JSON.parse(localStorage.getItem('captureLabDiag')||'[]').slice(-80);

function normalizeNotes(items){
 return (Array.isArray(items)?items:[]).map(n=>{
  if(Array.isArray(n.parts))return n;
  return {...n,parts:n.text?[{type:'text',text:n.text}]:[]};
 });
}
function persistNotes(){localStorage.setItem('captureLabNotes',JSON.stringify(notes));}
function now(){return new Date().toISOString().slice(11,23)}
function esc(x=''){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function log(stage,msg='',extra={}){const row={t:now(),stage,msg,...extra};logs.push(row);if(logs.length>100)logs.splice(0,logs.length-100);localStorage.setItem('captureLabDiag',JSON.stringify(logs));$('#dstage').textContent=stage;renderLog()}
function renderLog(){$('#dlog').textContent=logs.slice(-30).map(x=>`${x.t}  ${x.stage}${x.msg?' · '+x.msg:''}${x.error?' · '+x.error:''}`).join('\n')||'Sin eventos todavía.'}
function status(title,detail='',kind=''){$('#diagStatus').innerHTML=`<strong class="${kind}">${esc(title)}</strong><span>${esc(detail)}</span>`}
function setDiag(job,stage){if(job){$('#djob').textContent=job.id.slice(0,8);$('#daudio').textContent=job.blob?`${(job.blob.size/1024).toFixed(0)} KB · ${job.blob.type||'sin tipo'}`:'—'}$('#dstage').textContent=stage||'—'}
function stageTitle(s){return({WORKER_QUEUED:'En cola',WAITING_ENGINE:'Esperando motor',MODEL_LOADING:'Cargando Whisper',MODEL_READY:'Motor listo',MODEL_ATTEMPT_FAILED:'Probando respaldo',INFERENCE:'Transcribiendo',QUEUED:'En cola',DECODING:'Decodificando'})[s]||s}

function openComposer(){composer.classList.remove('hidden');scrim.classList.remove('hidden')}
function closeComposer(){if(active)return;composer.classList.add('hidden');scrim.classList.add('hidden');draft.innerHTML='';lastRange=null;editingId=null;composerTitle.textContent='Nueva nota';st.textContent=pending?`Transcribiendo ${pending}`:'Audio'}
add.onclick=()=>{editingId=null;composerTitle.textContent='Nueva nota';draft.innerHTML='';lastRange=null;openComposer()};
close.onclick=scrim.onclick=closeComposer;
$('#diagBtn').onclick=()=>{diag.classList.remove('hidden');renderLog()};$('#dx').onclick=()=>diag.classList.add('hidden');$('#back').onclick=showNotes;
draft.onkeyup=draft.onmouseup=draft.onfocus=draft.oninput=saveRange;
document.addEventListener('selectionchange',()=>{if(!composer.classList.contains('hidden'))saveRange()});
recBtn.onclick=()=>active?stopRecording({commitAfterStop:false}):startRecording();
send.onclick=()=>{if(active)stopRecording({commitAfterStop:true});else commitDraft()};
$('#copyDiag').onclick=copyDiag;$('#retryLast').onclick=retryLast;$('#playLast').onclick=playLast;

function saveRange(){const s=getSelection();if(s&&s.rangeCount&&draft.contains(s.getRangeAt(0).commonAncestorContainer))lastRange=s.getRangeAt(0).cloneRange()}
function preferred(){for(const t of['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'])if(MediaRecorder.isTypeSupported?.(t))return t;return''}
function createToken(part){
 const t=document.createElement('span');t.className='token'+(part.status==='failed'?' failed':'');t.contentEditable='false';t.dataset.partId=part.id;t.dataset.audioId=part.audioId||'';t.dataset.status=part.status||'pending';
 t.textContent=part.status==='failed'?'audio sin transcribir · reintentar':'transcribiendo audio';
 if(part.status==='failed')t.onclick=e=>{e.stopPropagation();retryPart(part.id)};
 return t;
}
function insertAudioPart(part){
 const token=createToken(part);let r=lastRange;
 if(!r||!draft.contains(r.commonAncestorContainer)){r=document.createRange();r.selectNodeContents(draft);r.collapse(false)}
 const spacer=document.createTextNode('\u200b');r.deleteContents();r.insertNode(spacer);r.insertNode(token);r.setStartAfter(spacer);r.collapse(true);lastRange=r.cloneRange();return token;
}
function findPart(partId){for(const note of notes){const p=note.parts?.find(x=>x.type==='audio'&&x.id===partId);if(p)return{note,part:p}}return null}
function findToken(partId){return draft.querySelector(`.token[data-part-id="${CSS.escape(partId)}"]`)}
function partsFromDraft(){
 const out=[];let buf='';
 const flush=()=>{if(buf){out.push({type:'text',text:buf});buf=''}};
 const walk=node=>{
  if(node.nodeType===Node.TEXT_NODE){buf+=node.nodeValue||'';return}
  if(node.nodeType!==Node.ELEMENT_NODE)return;
  if(node.classList.contains('token')&&node.dataset.partId){flush();const old=findPart(node.dataset.partId)?.part;out.push(old?{...old}:{type:'audio',id:node.dataset.partId,audioId:node.dataset.audioId,status:node.dataset.status||'pending'});return}
  if(node.tagName==='BR'){buf+='\n';return}
  const block=node.tagName==='DIV'||node.tagName==='P';
  if(block&&buf&&!buf.endsWith('\n'))buf+='\n';
  [...node.childNodes].forEach(walk);
  if(block&&!buf.endsWith('\n'))buf+='\n';
 };
 [...draft.childNodes].forEach(walk);flush();
 if(out.length&&out[out.length-1].type==='text')out[out.length-1].text=out[out.length-1].text.replace(/\n+$/,'');
 return out.filter(p=>p.type!=='text'||p.text.length);
}
function renderPartsIntoDraft(parts){
 draft.innerHTML='';
 for(const p of parts||[]){
  if(p.type==='text')draft.append(document.createTextNode(p.text));
  else if(p.type==='audio'){
   if(p.status==='done'&&p.transcript)draft.append(document.createTextNode(p.transcript));
   else draft.append(createToken(p));
  }
 }
 lastRange=null;
}
function commitDraft(){
 const parts=partsFromDraft();
 const hasContent=parts.some(p=>p.type==='audio'||(p.type==='text'&&p.text.trim()));
 if(editingId){
  const i=notes.findIndex(n=>n.id===editingId);
  if(i>=0){if(!hasContent)notes.splice(i,1);else notes[i]={...notes[i],parts,updated:Date.now()}}
 }else{
  if(!hasContent)return;
  notes.unshift({id:crypto.randomUUID(),parts,ts:Date.now(),updated:Date.now()});
 }
 persistNotes();render();closeComposer();
}
function openEditor(id){
 const note=notes.find(n=>n.id===id);if(!note)return;editingId=id;composerTitle.textContent='Editar nota';renderPartsIntoDraft(note.parts);openComposer();
}

async function startRecording(){
 try{
  log('MIC_REQUEST','Solicitando micrófono');
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}),chunks=[],type=preferred(),mr=type?new MediaRecorder(stream,{mimeType:type}):new MediaRecorder(stream),id=crypto.randomUUID();
  const s={id,stream,mr,chunks,start:performance.now()};mr.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};mr.onerror=e=>log('RECORDER_ERROR',e.error?.message||e.error?.name||'MediaRecorder error',{error:e.error?.name});mr.start(500);active=s;recBtn.setAttribute('aria-pressed','true');st.textContent='Grabando';log('RECORDING',`job ${id.slice(0,8)} · ${mr.mimeType||type||'default'}`);status('Grabando','Podés tocar enviar directamente; la nota se guarda y la transcripción sigue atrás.')
 }catch(e){st.textContent='No pude abrir el micrófono';recordError('MIC_FAILED',e);diag.classList.remove('hidden')}
}
function stopRecording({commitAfterStop=false}={}){
 const s=active;if(!s)return;active=null;recBtn.setAttribute('aria-pressed','false');
 const part={type:'audio',id:crypto.randomUUID(),audioId:s.id,status:'pending',transcript:'',error:null};
 const token=insertAudioPart(part);const durationMs=performance.now()-s.start;const job={id:s.id,partId:part.id,audioId:s.id,token,durationMs,created:Date.now(),stage:'STOPPING',counted:false};jobs.set(job.id,job);setDiag(job,'STOPPING');st.textContent='Guardando audio';log('STOPPING',`job ${job.id.slice(0,8)} · ${(durationMs/1000).toFixed(1)} s`);
 if(commitAfterStop)commitDraft();
 let settled=false;
 const finish=async()=>{if(settled)return;settled=true;try{s.stream.getTracks().forEach(t=>t.stop())}catch{};try{const blob=new Blob(s.chunks,{type:s.mr.mimeType||preferred()||'audio/webm'});job.blob=blob;setDiag(job,'AUDIO_READY');log('AUDIO_READY',`${(blob.size/1024).toFixed(0)} KB · ${blob.type}`);if(blob.size<1200)throw new Error(`Audio demasiado pequeño (${blob.size} bytes)`);await saveAudio(job.audioId,blob);lastAudioId=job.audioId;localStorage.setItem('captureLabLastAudio',lastAudioId);log('AUDIO_STORED',`IndexedDB · ${job.audioId.slice(0,8)}`);enqueue(job)}catch(e){failJob(job,e,'SAVE_FAILED')}};
 s.mr.onstop=finish;try{s.mr.requestData?.()}catch{}try{s.mr.stop()}catch(e){recordError('STOP_FAILED',e);finish()}
}
function countJob(job){if(!job.counted){job.counted=true;pending++;updateCaptureState()}}
function settleJob(job){if(job.counted){job.counted=false;pending=Math.max(0,pending-1);updateCaptureState()}}
function ensureWorker(){
 if(worker)return worker;
 worker=new Worker('./transcriber-worker.js?v=6',{type:'module'});
 worker.onmessage=e=>handleWorkerMessage(e.data||{});
 worker.onerror=e=>{const err=new Error(e.message||'Worker crashed');recordError('WORKER_CRASH',err);for(const job of jobs.values())if(!['DONE','FAILED'].includes(job.stage))failJob(job,err,'WORKER_CRASH');diag.classList.remove('hidden')};
 return worker;
}
function enqueue(job){
 countJob(job);job.stage='DECODING';setDiag(job,'DECODING');log('DECODING',`job ${job.id.slice(0,8)}`);status('Preparando audio','El archivo ya quedó guardado; ahora se convierte a 16 kHz.');
 decode(job.blob).then(({pcm,duration,sampleRate})=>{job.pcmLength=pcm.length;job.decodedDuration=duration;job.sampleRate=sampleRate;job.stage='QUEUED';log('PCM_READY',`${duration.toFixed(1)} s · ${pcm.length} muestras`);setDiag(job,'QUEUED');status('En cola','Whisper corre fuera de la interfaz.');ensureWorker().postMessage({type:'transcribe',jobId:job.id,audio:pcm,meta:{deviceMemory:navigator.deviceMemory||null}},[pcm.buffer])}).catch(e=>failJob(job,e,'DECODE_FAILED'));
}
function handleWorkerMessage(m){
 if(m.type==='engine'){$('#de').textContent='Whisper local';$('#dm').textContent=m.device||'—';$('#dmodel').textContent=m.model||'—';log('ENGINE',`${m.device||''} · ${m.model||''}`);return}
 const job=jobs.get(m.jobId);if(!job)return;
 if(m.type==='stage'){job.stage=m.stage;setDiag(job,m.stage);log(m.stage,m.detail||'');const token=findToken(job.partId);if(token){if(m.stage==='MODEL_LOADING')token.textContent='preparando modelo';else if(m.stage==='INFERENCE')token.textContent='transcribiendo audio';else if(m.stage==='WAITING_ENGINE')token.textContent='esperando motor'}status(stageTitle(m.stage),m.detail||'');return}
 if(m.type==='result'){const text=(m.text||'').trim();if(!text){failJob(job,new Error('Whisper terminó sin texto'),'EMPTY_RESULT');return}completeJob(job,text);return}
 if(m.type==='error'){const err=new Error(m.message||'Error del worker');err.name=m.name||'WorkerError';err.stack=m.stack||'';failJob(job,err,m.stage||'WORKER_FAILED')}
}
function completeJob(job,text){
 job.stage='DONE';settleJob(job);const token=findToken(job.partId);if(token)token.replaceWith(document.createTextNode(text+' '));const found=findPart(job.partId);if(found){found.part.status='done';found.part.transcript=text;found.part.error=null;found.note.updated=Date.now();persistNotes();render()}setDiag(job,'DONE');$('#derr').textContent='—';log('DONE',`${text.length} caracteres`);status('Transcripción lista',`${job.decodedDuration?.toFixed(1)||'?'} s de audio.`,'ok')
}
function failJob(job,e,stage='FAILED'){
 job.stage='FAILED';job.error={name:e?.name||'Error',message:e?.message||String(e),stack:e?.stack||''};lastFailedJob=job;settleJob(job);const token=findToken(job.partId);if(token){token.textContent='audio sin transcribir · reintentar';token.classList.add('failed');token.dataset.status='failed';token.onclick=ev=>{ev.stopPropagation();retryJob(job)}}const found=findPart(job.partId);if(found){found.part.status='failed';found.part.error=job.error.message;persistNotes();render()}$('#derr').textContent=`${job.error.name}: ${job.error.message}`;setDiag(job,stage);log(stage,job.error.message,{error:job.error.name});status('Falló la transcripción',job.error.message,'err');diag.classList.remove('hidden')
}
function recordError(stage,e){$('#derr').textContent=`${e?.name||'Error'}: ${e?.message||e}`;log(stage,e?.message||String(e),{error:e?.name||'Error'});status('Error',e?.message||String(e),'err')}
function updateCaptureState(){if(active){st.textContent='Grabando';return}st.textContent=pending?`Transcribiendo ${pending}`:'Audio'}

async function retryPart(partId){const found=findPart(partId);if(!found)return;let blob=await getAudio(found.part.audioId);if(!blob){status('No encontré el audio','El audio original no está disponible.','err');return}const token=findToken(partId);if(token){token.classList.remove('failed');token.textContent='transcribiendo audio';token.dataset.status='pending';token.onclick=null}found.part.status='pending';found.part.error=null;persistNotes();render();const job={id:crypto.randomUUID(),partId,audioId:found.part.audioId,blob,created:Date.now(),stage:'RETRY',counted:false};jobs.set(job.id,job);enqueue(job)}
async function retryJob(job){try{const blob=job.blob||await getAudio(job.audioId);if(!blob)throw new Error('No encontré el audio guardado');job.blob=blob;job.error=null;const found=findPart(job.partId);if(found){found.part.status='pending';found.part.error=null;persistNotes();render()}const token=findToken(job.partId);if(token){token.classList.remove('failed');token.textContent='transcribiendo audio';token.dataset.status='pending';token.onclick=null}job.id=crypto.randomUUID();jobs.set(job.id,job);enqueue(job)}catch(e){failJob(job,e,'RETRY_FAILED')}}
async function retryLast(){if(lastFailedJob)return retryJob(lastFailedJob);if(!lastAudioId){status('No hay audio','Todavía no hay una grabación guardada.');return}const blob=await getAudio(lastAudioId);if(!blob)return status('No hay audio','No encontré el archivo guardado.');const part={type:'audio',id:crypto.randomUUID(),audioId:lastAudioId,status:'pending'};openComposer();insertAudioPart(part);const job={id:crypto.randomUUID(),partId:part.id,audioId:lastAudioId,blob,created:Date.now(),counted:false};jobs.set(job.id,job);enqueue(job)}
async function playLast(){if(!lastAudioId){status('No hay audio','Todavía no hay una grabación guardada.');return}try{const b=await getAudio(lastAudioId);if(!b)throw new Error('No encontré el audio');const u=URL.createObjectURL(b),a=new Audio(u);a.onended=()=>URL.revokeObjectURL(u);await a.play();log('PLAYBACK','Reproduciendo último audio');status('Reproduciendo audio','Si acá se escucha completo, la captura está bien.')}catch(e){recordError('PLAYBACK_FAILED',e)}}
async function copyDiag(){const payload={time:new Date().toISOString(),userAgent:navigator.userAgent,webgpu:!!navigator.gpu,deviceMemory:navigator.deviceMemory||null,lastAudioId,engine:{backend:$('#dm').textContent,model:$('#dmodel').textContent},error:$('#derr').textContent,logs:logs.slice(-40)};try{await navigator.clipboard.writeText(JSON.stringify(payload,null,2));status('Diagnóstico copiado','Pegalo en el chat y puedo ver exactamente dónde falló.','ok')}catch(e){recordError('COPY_FAILED',e)}}

async function decode(blob){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Este navegador no ofrece AudioContext');const ctx=new AC();const ab=await blob.arrayBuffer();let b;try{b=await ctx.decodeAudioData(ab.slice(0))}finally{ctx.close().catch(()=>{})}if(!b||!b.length)throw new Error('El navegador no pudo decodificar el audio');const target=16000,len=Math.max(1,Math.ceil(b.duration*target)),off=new OfflineAudioContext(1,len,target),src=off.createBufferSource(),mono=off.createBuffer(1,b.length,b.sampleRate),out=mono.getChannelData(0);if(b.numberOfChannels===1)out.set(b.getChannelData(0));else{const cs=Array.from({length:b.numberOfChannels},(_,i)=>b.getChannelData(i));for(let i=0;i<b.length;i++){let sum=0;for(const c of cs)sum+=c[i];out[i]=sum/cs.length}}src.buffer=mono;src.connect(off.destination);src.start();const rendered=await off.startRendering();return{pcm:rendered.getChannelData(0).slice(),duration:b.duration,sampleRate:b.sampleRate}}

function renderNoteParts(el,parts){
 el.innerHTML='';for(const p of parts||[]){if(p.type==='text')el.append(document.createTextNode(p.text));else if(p.type==='audio'){if(p.status==='done'&&p.transcript)el.append(document.createTextNode(p.transcript));else{const t=createToken(p);t.onclick=e=>{e.stopPropagation();if(p.status==='failed')retryPart(p.id)};el.append(t)}}}
}
function render(){
 works.classList.add('hidden');feed.classList.remove('hidden');bottom.classList.remove('hidden');feed.querySelectorAll('.note').forEach(n=>n.remove());empty.classList.toggle('hidden',!!notes.length);
 for(const n of notes){const a=document.createElement('article');a.className='note';a.dataset.noteId=n.id;const p=document.createElement('p');renderNoteParts(p,n.parts);const m=document.createElement('div');m.className='meta';m.textContent='tocar para editar';a.append(p,m);a.onclick=()=>openEditor(n.id);feed.appendChild(a)}
 count.textContent=`${notes.length} ${notes.length===1?'nota':'notas'}`;prepareRow.classList.toggle('hidden',!notes.length);add.classList.remove('hidden');bindSprings(document)
}
function showNotes(){render()}
function prepare(){feed.classList.add('hidden');works.classList.remove('hidden');add.classList.add('hidden');prepareRow.classList.add('hidden');const plain=notes.map(n=>n.parts?.map(p=>p.type==='text'?p.text:(p.transcript||'')).join(' ')).join(' ').toLowerCase(),items=[];if(/calend|evento|día|dia/.test(plain))items.push(['Calendario',1]);if(/jose|josé|alumno|teor|práct|pract/.test(plain))items.push(['Student World',1]);if(/naveg|bot[oó]n|slider|resorte|volver/.test(plain))items.push(['Interacción',1]);if(!items.length)items.push(['Notas nuevas',notes.length]);workList.innerHTML='';for(const[title,c]of items){const e=document.createElement('article');e.className='work';e.innerHTML=`<h3>${title}</h3><small>${c} ${c===1?'grupo':'grupos'} · prompt listo</small><div class="spring" data-action="execute"><div class="reveal">Trabajar</div><div class="springKnob"><svg viewBox="0 0 24 24"><path d="M5 12h12M13 7l5 5-5 5"/></svg></div></div>`;workList.appendChild(e)}bindSprings(workList)}
function bindSprings(root){root.querySelectorAll('.spring').forEach(s=>{if(s.dataset.b)return;s.dataset.b=1;const k=s.querySelector('.springKnob');let on=false,start=0,x=0;const max=()=>s.clientWidth-k.clientWidth-8,draw=()=>k.style.transform=`translateX(${x}px)`;k.onpointerdown=e=>{on=true;start=e.clientX-x;k.setPointerCapture(e.pointerId)};k.onpointermove=e=>{if(on){x=Math.min(max(),Math.max(0,e.clientX-start));draw()}};k.onpointerup=()=>{if(!on)return;on=false;const fire=x>max()*.82;if(fire){x=max();draw();setTimeout(()=>s.dataset.action==='prepare'?prepare():alert('Acá se abriría ChatGPT con el prompt listo.'),120)}setTimeout(()=>{x=0;k.style.transition='transform .28s';draw();setTimeout(()=>k.style.transition='',300)},fire?220:0)}})}

function openDB(){return new Promise((res,rej)=>{const q=indexedDB.open('capture-lab',2);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('audio'))q.result.createObjectStore('audio')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function saveAudio(id,blob){db??=await openDB();await new Promise((res,rej)=>{const tx=db.transaction('audio','readwrite');tx.objectStore('audio').put(blob,id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function getAudio(id){db??=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('audio','readonly'),q=tx.objectStore('audio').get(id);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}
async function recoverPending(){for(const note of notes){for(const part of note.parts||[]){if(part.type!=='audio'||part.status!=='pending'||!part.audioId)continue;try{const blob=await getAudio(part.audioId);if(!blob)continue;const job={id:crypto.randomUUID(),partId:part.id,audioId:part.audioId,blob,created:Date.now(),counted:false,recovered:true};jobs.set(job.id,job);log('RECOVER_PENDING',part.id.slice(0,8));enqueue(job)}catch(e){recordError('RECOVER_FAILED',e)}}}}

window.addEventListener('error',e=>recordError('PAGE_ERROR',e.error||new Error(e.message)));window.addEventListener('unhandledrejection',e=>recordError('PROMISE_ERROR',e.reason instanceof Error?e.reason:new Error(String(e.reason))));
$('#dg').textContent=navigator.gpu?'sí':'no';$('#dmem').textContent=navigator.deviceMemory?`${navigator.deviceMemory} GB aprox.`:'no informada';$('#dm').textContent='worker';$('#dmodel').textContent='whisper-base';
render();renderLog();recoverPending();
