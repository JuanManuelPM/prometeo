const $=s=>document.querySelector(s),feed=$('#feed'),empty=$('#empty'),works=$('#works'),workList=$('#workList'),bottom=$('#bottom'),prepareRow=$('#prepareRow'),count=$('#count'),add=$('#add'),composer=$('#composer'),scrim=$('#scrim'),close=$('#close'),draft=$('#draft'),recBtn=$('#rec'),st=$('#state'),send=$('#send'),diag=$('#diag');
let notes=JSON.parse(localStorage.getItem('captureLabNotes')||'[]'),active=null,lastRange=null,db=null,pending=0,lastAudioId=localStorage.getItem('captureLabLastAudio')||null,lastFailedJob=null;
const jobs=new Map();
const logs=JSON.parse(localStorage.getItem('captureLabDiag')||'[]').slice(-80);
let worker=null;

$('#diagBtn').onclick=()=>{diag.classList.remove('hidden');renderLog()};$('#dx').onclick=()=>diag.classList.add('hidden');$('#back').onclick=showNotes;
add.onclick=()=>{composer.classList.remove('hidden');scrim.classList.remove('hidden')};
close.onclick=scrim.onclick=()=>{if(!active){composer.classList.add('hidden');scrim.classList.add('hidden')}};
draft.onkeyup=draft.onmouseup=draft.onfocus=()=>saveRange();draft.oninput=()=>saveRange();recBtn.onclick=()=>active?stopRecording():startRecording();send.onclick=saveNote;
$('#copyDiag').onclick=copyDiag;$('#retryLast').onclick=retryLast;$('#playLast').onclick=playLast;

function now(){return new Date().toISOString().slice(11,23)}
function log(stage,msg='',extra={}){const row={t:now(),stage,msg,...extra};logs.push(row);if(logs.length>100)logs.splice(0,logs.length-100);localStorage.setItem('captureLabDiag',JSON.stringify(logs));$('#dstage').textContent=stage;renderLog();}
function renderLog(){const out=logs.slice(-30).map(x=>`${x.t}  ${x.stage}${x.msg?' · '+x.msg:''}${x.error?' · '+x.error:''}`).join('\n');$('#dlog').textContent=out||'Sin eventos todavía.'}
function status(title,detail='',kind=''){$('#diagStatus').innerHTML=`<strong class="${kind}">${esc(title)}</strong><span>${esc(detail)}</span>`}
function esc(x=''){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function setDiag(job,stage){if(job){$('#djob').textContent=job.id.slice(0,8);$('#daudio').textContent=job.blob?`${(job.blob.size/1024).toFixed(0)} KB · ${job.blob.type||'sin tipo'}`:'—'}$('#dstage').textContent=stage||'—'}
function saveRange(){let s=getSelection();if(s&&s.rangeCount&&draft.contains(s.getRangeAt(0).commonAncestorContainer))lastRange=s.getRangeAt(0).cloneRange()}
function insertToken(text='transcribiendo audio'){let t=document.createElement('span');t.className='token';t.contentEditable='false';t.textContent=text;let r=lastRange;if(!r||!draft.contains(r.commonAncestorContainer)){r=document.createRange();r.selectNodeContents(draft);r.collapse(false)}let z=document.createTextNode('\u200b');r.deleteContents();r.insertNode(z);r.insertNode(t);r.setStartAfter(z);r.collapse(true);lastRange=r.cloneRange();return t}
function preferred(){for(let t of['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'])if(MediaRecorder.isTypeSupported?.(t))return t;return''}

async function startRecording(){
 try{
  log('MIC_REQUEST','Solicitando micrófono');
  let stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}),chunks=[],type=preferred(),mr=type?new MediaRecorder(stream,{mimeType:type}):new MediaRecorder(stream),id=crypto.randomUUID();
  let s={id,stream,mr,chunks,start:performance.now()};
  mr.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  mr.onerror=e=>{log('RECORDER_ERROR',e.error?.message||e.error?.name||'MediaRecorder error',{error:e.error?.name});};
  mr.start(500);
  active=s;recBtn.setAttribute('aria-pressed','true');st.textContent='Grabando';
  log('RECORDING',`job ${id.slice(0,8)} · ${mr.mimeType||type||'default'}`);status('Grabando','El audio todavía no se está transcribiendo.');
 }catch(e){st.textContent='No pude abrir el micrófono';recordError('MIC_FAILED',e);diag.classList.remove('hidden')}
}

function stopRecording(){
 const s=active;if(!s)return;active=null;recBtn.setAttribute('aria-pressed','false');
 const token=insertToken('guardando audio');const durationMs=performance.now()-s.start;
 const job={id:s.id,token,durationMs,created:Date.now(),audioId:s.id,stage:'STOPPING'};jobs.set(job.id,job);setDiag(job,'STOPPING');st.textContent='Guardando audio';log('STOPPING',`job ${job.id.slice(0,8)} · ${(durationMs/1000).toFixed(1)} s`);
 let settled=false;
 const finish=async()=>{if(settled)return;settled=true;try{try{s.stream.getTracks().forEach(t=>t.stop())}catch{}const blob=new Blob(s.chunks,{type:s.mr.mimeType||preferred()||'audio/webm'});job.blob=blob;setDiag(job,'AUDIO_READY');log('AUDIO_READY',`${(blob.size/1024).toFixed(0)} KB · ${blob.type}`);if(blob.size<1200)throw new Error(`Audio demasiado pequeño (${blob.size} bytes)`);await saveAudio(job.audioId,blob);lastAudioId=job.audioId;localStorage.setItem('captureLabLastAudio',lastAudioId);token.textContent='transcribiendo audio';log('AUDIO_STORED',`IndexedDB · ${job.audioId.slice(0,8)}`);enqueue(job)}catch(e){failJob(job,e,'SAVE_FAILED')}};
 s.mr.onstop=finish;
 try{s.mr.requestData?.()}catch{}
 try{s.mr.stop()}catch(e){recordError('STOP_FAILED',e);finish()}
}

function enqueue(job){pending++;updateCaptureState();job.stage='DECODING';setDiag(job,'DECODING');log('DECODING',`job ${job.id.slice(0,8)}`);status('Preparando audio','El archivo ya quedó guardado; ahora se convierte a 16 kHz.');
 decode(job.blob).then(({pcm,duration,sampleRate})=>{
  job.pcmLength=pcm.length;job.decodedDuration=duration;job.sampleRate=sampleRate;job.stage='QUEUED';
  log('PCM_READY',`${duration.toFixed(1)} s · ${pcm.length} muestras`);setDiag(job,'QUEUED');status('En cola','Whisper corre fuera de la interfaz para no bloquear otra grabación.');
  const w=ensureWorker();if(!w){failJob(job,new Error('No se pudo iniciar el worker de transcripción'),'WORKER_INIT_FAILED');return}w.postMessage({type:'transcribe',jobId:job.id,audio:pcm,meta:{deviceMemory:navigator.deviceMemory||null}},[pcm.buffer]);
 }).catch(e=>failJob(job,e,'DECODE_FAILED'));
}

function ensureWorker(){
 if(worker)return worker;
 try{
  worker=new Worker('./transcriber-worker.js?v=5',{type:'module'});
  worker.onmessage=handleWorkerMessage;
  worker.onerror=handleWorkerError;
  log('WORKER_INIT','Transcriber worker creado');
  return worker;
 }catch(e){recordError('WORKER_INIT_FAILED',e);return null}
}
function handleWorkerMessage(e){
 const m=e.data||{};
 if(m.type==='engine'){$('#de').textContent='Whisper local';$('#dm').textContent=m.device||'—';$('#dmodel').textContent=m.model||'—';log('ENGINE',`${m.device||''} · ${m.model||''}`);return}
 const job=jobs.get(m.jobId);if(!job)return;
 if(m.type==='stage'){job.stage=m.stage;setDiag(job,m.stage);log(m.stage,m.detail||'');if(job.token?.isConnected){if(m.stage==='MODEL_LOADING')job.token.textContent='preparando modelo';else if(m.stage==='INFERENCE')job.token.textContent='transcribiendo audio';else if(m.stage==='WAITING_ENGINE')job.token.textContent='esperando motor'}status(stageTitle(m.stage),m.detail||'');return}
 if(m.type==='result'){const text=(m.text||'').trim();if(!text){failJob(job,new Error('Whisper terminó sin texto'),'EMPTY_RESULT');return}if(job.token?.isConnected)job.token.replaceWith(document.createTextNode(text+' '));job.stage='DONE';pending=Math.max(0,pending-1);updateCaptureState();setDiag(job,'DONE');$('#derr').textContent='—';log('DONE',`${text.length} caracteres`);status('Transcripción lista',`${job.decodedDuration?.toFixed(1)||'?'} s de audio.`, 'ok');return}
 if(m.type==='error'){const err=new Error(m.message||'Error del worker');err.name=m.name||'WorkerError';err.stack=m.stack||'';failJob(job,err,m.stage||'WORKER_FAILED')}
}
function handleWorkerError(e){const err=new Error(e.message||'Worker crashed');recordError('WORKER_CRASH',err);for(const job of jobs.values())if(!['DONE','FAILED'].includes(job.stage))failJob(job,err,'WORKER_CRASH');diag.classList.remove('hidden')}

function stageTitle(s){return ({WAITING_ENGINE:'Esperando motor',MODEL_LOADING:'Cargando Whisper',MODEL_READY:'Motor listo',INFERENCE:'Transcribiendo',QUEUED:'En cola',DECODING:'Decodificando'})[s]||s}
function failJob(job,e,stage='FAILED'){job.stage='FAILED';job.error={name:e?.name||'Error',message:e?.message||String(e),stack:e?.stack||''};lastFailedJob=job;pending=Math.max(0,pending-1);updateCaptureState();if(job.token?.isConnected){job.token.textContent='audio sin transcribir · reintentar';job.token.classList.add('failed');job.token.onclick=()=>retryJob(job)}$('#derr').textContent=`${job.error.name}: ${job.error.message}`;setDiag(job,stage);log(stage,job.error.message,{error:job.error.name});status('Falló la transcripción',job.error.message,'err');diag.classList.remove('hidden')}
function recordError(stage,e){$('#derr').textContent=`${e?.name||'Error'}: ${e?.message||e}`;log(stage,e?.message||String(e),{error:e?.name||'Error'});status('Error',e?.message||String(e),'err')}
function updateCaptureState(){if(active){st.textContent='Grabando';return}st.textContent=pending?`Transcribiendo ${pending}`:'Audio'}

async function retryJob(job){try{let blob=job.blob||await getAudio(job.audioId);if(!blob)throw new Error('No encontré el audio guardado');job.blob=blob;if(job.token?.isConnected){job.token.classList.remove('failed');job.token.onclick=null;job.token.textContent='transcribiendo audio'}job.error=null;pending++;updateCaptureState();log('RETRY',`job ${job.id.slice(0,8)}`);const {pcm,duration,sampleRate}=await decode(blob);job.decodedDuration=duration;job.sampleRate=sampleRate;const w=ensureWorker();if(!w)throw new Error('No se pudo iniciar el worker de transcripción');w.postMessage({type:'transcribe',jobId:job.id,audio:pcm,meta:{deviceMemory:navigator.deviceMemory||null}},[pcm.buffer])}catch(e){failJob(job,e,'RETRY_FAILED')}}
async function retryLast(){if(lastFailedJob)return retryJob(lastFailedJob);if(!lastAudioId){status('No hay audio','Todavía no hay una grabación guardada.');return}composer.classList.remove('hidden');scrim.classList.remove('hidden');let token=insertToken('reintentando audio'),blob=await getAudio(lastAudioId),job={id:crypto.randomUUID(),audioId:lastAudioId,blob,token,created:Date.now()};jobs.set(job.id,job);return retryJob(job)}
async function playLast(){if(!lastAudioId){status('No hay audio','Todavía no hay una grabación guardada.');return}try{const b=await getAudio(lastAudioId);if(!b)throw new Error('No encontré el audio');const u=URL.createObjectURL(b),a=new Audio(u);a.onended=()=>URL.revokeObjectURL(u);await a.play();log('PLAYBACK','Reproduciendo último audio');status('Reproduciendo audio','Si acá se escucha completo, la grabación está bien y el problema está en el motor.')}catch(e){recordError('PLAYBACK_FAILED',e)}}
async function copyDiag(){const payload={time:new Date().toISOString(),userAgent:navigator.userAgent,webgpu:!!navigator.gpu,deviceMemory:navigator.deviceMemory||null,lastAudioId,engine:{backend:$('#dm').textContent,model:$('#dmodel').textContent},error:$('#derr').textContent,logs:logs.slice(-40)};try{await navigator.clipboard.writeText(JSON.stringify(payload,null,2));status('Diagnóstico copiado','Pegalo en el chat y puedo ver exactamente dónde falló.','ok')}catch(e){recordError('COPY_FAILED',e)}}

async function decode(blob){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Este navegador no ofrece AudioContext');const ctx=new AC();const ab=await blob.arrayBuffer();let b;try{b=await ctx.decodeAudioData(ab.slice(0))}finally{ctx.close().catch(()=>{})}if(!b||!b.length)throw new Error('El navegador no pudo decodificar el audio');const target=16000,len=Math.max(1,Math.ceil(b.duration*target)),off=new OfflineAudioContext(1,len,target),src=off.createBufferSource(),mono=off.createBuffer(1,b.length,b.sampleRate),out=mono.getChannelData(0);if(b.numberOfChannels===1)out.set(b.getChannelData(0));else{const cs=Array.from({length:b.numberOfChannels},(_,i)=>b.getChannelData(i));for(let i=0;i<b.length;i++){let sum=0;for(const c of cs)sum+=c[i];out[i]=sum/cs.length}}src.buffer=mono;src.connect(off.destination);src.start();const rendered=await off.startRendering();return{pcm:rendered.getChannelData(0).slice(),duration:b.duration,sampleRate:b.sampleRate}}

function saveNote(){if(active||draft.querySelector('.token:not(.failed)')){st.textContent='Esperá la transcripción';return}let text=draft.innerText.replace(/\u200b/g,'').replace(/audio sin transcribir · reintentar/g,'').trim();if(!text)return;notes.unshift({id:crypto.randomUUID(),text,ts:Date.now()});localStorage.setItem('captureLabNotes',JSON.stringify(notes));draft.innerHTML='';lastRange=null;composer.classList.add('hidden');scrim.classList.add('hidden');render()}
function render(){works.classList.add('hidden');feed.classList.remove('hidden');bottom.classList.remove('hidden');feed.querySelectorAll('.note').forEach(n=>n.remove());empty.classList.toggle('hidden',!!notes.length);for(let n of notes){let a=document.createElement('article');a.className='note';a.innerHTML=`<p></p><div class="meta">ahora</div>`;a.querySelector('p').textContent=n.text;feed.appendChild(a)}count.textContent=`${notes.length} ${notes.length===1?'nota':'notas'}`;prepareRow.classList.toggle('hidden',!notes.length);add.classList.remove('hidden');bindSprings(document)}function showNotes(){render()}
function prepare(){feed.classList.add('hidden');works.classList.remove('hidden');add.classList.add('hidden');prepareRow.classList.add('hidden');let all=notes.map(n=>n.text.toLowerCase()).join(' '),items=[];if(/calend|evento|día|dia/.test(all))items.push(['Calendario',notes.filter(n=>/calend|evento|día|dia/i.test(n.text)).length||1]);if(/jose|josé|alumno|teor|práct|pract/.test(all))items.push(['Student World',notes.filter(n=>/jose|josé|alumno|teor|práct|pract/i.test(n.text)).length||1]);if(/naveg|bot[oó]n|slider|resorte|volver/.test(all))items.push(['Interacción',notes.filter(n=>/naveg|bot[oó]n|slider|resorte|volver/i.test(n.text)).length||1]);if(!items.length)items.push(['Notas nuevas',notes.length]);workList.innerHTML='';for(let [title,c] of items){let e=document.createElement('article');e.className='work';e.innerHTML=`<h3>${title}</h3><small>${c} ${c===1?'nota':'notas'} · prompt listo</small><div class="spring" data-action="execute"><div class="reveal">Trabajar</div><div class="springKnob"><svg viewBox="0 0 24 24"><path d="M5 12h12M13 7l5 5-5 5"/></svg></div></div>`;workList.appendChild(e)}bindSprings(workList)}
function bindSprings(root){root.querySelectorAll('.spring').forEach(s=>{if(s.dataset.b)return;s.dataset.b=1;let k=s.querySelector('.springKnob'),on=false,start=0,x=0,max=()=>s.clientWidth-k.clientWidth-8,draw=()=>k.style.transform=`translateX(${x}px)`;k.onpointerdown=e=>{on=true;start=e.clientX-x;k.setPointerCapture(e.pointerId)};k.onpointermove=e=>{if(on){x=Math.min(max(),Math.max(0,e.clientX-start));draw()}};k.onpointerup=()=>{if(!on)return;on=false;let fire=x>max()*.82;if(fire){x=max();draw();setTimeout(()=>s.dataset.action==='prepare'?prepare():alert('Acá se abriría ChatGPT con el prompt listo.'),120)}setTimeout(()=>{x=0;k.style.transition='transform .28s';draw();setTimeout(()=>k.style.transition='',300)},fire?220:0)}})}
function openDB(){return new Promise((res,rej)=>{let q=indexedDB.open('capture-lab',2);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('audio'))q.result.createObjectStore('audio')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function saveAudio(id,blob){db??=await openDB();await new Promise((res,rej)=>{let tx=db.transaction('audio','readwrite');tx.objectStore('audio').put(blob,id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function getAudio(id){db??=await openDB();return new Promise((res,rej)=>{let tx=db.transaction('audio','readonly'),q=tx.objectStore('audio').get(id);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}
window.addEventListener('error',e=>recordError('PAGE_ERROR',e.error||new Error(e.message)));window.addEventListener('unhandledrejection',e=>recordError('PROMISE_ERROR',e.reason instanceof Error?e.reason:new Error(String(e.reason))));
$('#dg').textContent=navigator.gpu?'sí':'no';$('#dmem').textContent=navigator.deviceMemory?`${navigator.deviceMemory} GB aprox.`:'no informada';$('#dm').textContent='worker';$('#dmodel').textContent='se elige al cargar';render();renderLog();
