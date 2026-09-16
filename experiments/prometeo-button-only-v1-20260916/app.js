import {VoiceQueue} from '../../shared/prometeo-shell/v1/voice.js';
import {listNotes,getNote} from '../../shared/prometeo-shell/v1/db.js';
import {createChangeLoopClient} from '../../shared/capture/v1/change-loop.js';

const $=s=>document.querySelector(s);
const client=createChangeLoopClient();
const PROTOCOL='https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/coordination/BUTTON_WORKER_PROTOCOL_V1.md';
const PREFIX='prometeo.button.only.v1.';
const POS_KEY=PREFIX+'pos';
const GROUPS_KEY=PREFIX+'groups';
const CURRENT_KEY=PREFIX+'current';
const TEXT_KEY=PREFIX+'text';
const ACTIVE_KEY=PREFIX+'active';
const COMMAND_KEY=PREFIX+'command';
const AUDIO_UPLOAD='prometeo.button.audio-upload.v1:';
const AUDIO_ATTACHMENT='prometeo.button.audio-attachment.v1:';

let open=false,view='menu',drag=null,currentDetail=null,pollBusy=false,pollTimer=null,recRAF=0;
let groups=loadGroups();
let currentGroupId=localStorage.getItem(CURRENT_KEY)||groups[0].id;
let activeWork=readJSON(ACTIVE_KEY,null);
let lastCommand=localStorage.getItem(COMMAND_KEY)||'';

const panel=$('#panel'),button=$('#prometeo'),veil=$('#veil'),title=$('#title'),back=$('#back');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;

function readJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
function writeJSON(key,v){try{localStorage.setItem(key,JSON.stringify(v))}catch{}}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function buzz(v=4){try{navigator.vibrate?.(v)}catch{}}
function when(v){if(!v)return'';const ms=Date.now()-new Date(v).getTime(),m=Math.max(0,Math.round(ms/60000));return m<1?'ahora':m<60?`hace ${m}m`:`hace ${Math.round(m/60)}h`}
function loadGroups(){
  const rows=readJSON(GROUPS_KEY,null);
  if(Array.isArray(rows)&&rows.length)return rows;
  const initial=[{id:'group-'+uid(),name:'Grupo 1',created:Date.now()}];
  writeJSON(GROUPS_KEY,initial);
  return initial;
}
function currentGroup(){
  let g=groups.find(x=>x.id===currentGroupId);
  if(!g){g=groups[0];currentGroupId=g.id;localStorage.setItem(CURRENT_KEY,g.id)}
  return g;
}
function pageForGroup(g=currentGroup()){
  return{id:`prometeo-button-${g.id}`,title:`Prometeo · ${g.name}`,href:location.href,baseline:{surface:'PROMETEO_BUTTON_ONLY_V1',group_id:g.id}};
}
function pageFromId(id){
  const g=groups.find(x=>`prometeo-button-${x.id}`===id);
  return pageForGroup(g||currentGroup());
}
function textRows(){return readJSON(TEXT_KEY,[])}
function saveTextRows(rows){writeJSON(TEXT_KEY,rows.slice(-300))}
function groupTextRows(g=currentGroup()){return textRows().filter(x=>x.group_id===g.id)}
function showError(msg=''){const el=$('#error');el.textContent=msg;el.classList.toggle('hidden',!msg)}

function setView(next){
  view=next;
  $('#menuView').classList.toggle('hidden',next!=='menu');
  $('#notesView').classList.toggle('hidden',next!=='notes');
  $('#workView').classList.toggle('hidden',next!=='work');
  back.classList.toggle('invisible',next==='menu');
  title.textContent=next==='menu'?'Prometeo':next==='notes'?'Nota':'Trabajos';
  if(next==='notes')refresh().catch(()=>{});
  if(next==='work'){refresh().catch(()=>{});renderActiveWork()}
  requestAnimationFrame(placePanel);
}
function viewport(){const v=visualViewport;return{w:v?.width||innerWidth,h:v?.height||innerHeight,ox:v?.offsetLeft||0,oy:v?.offsetTop||0}}
function loadPos(){const p=readJSON(POS_KEY,null);return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?p:{x:.90,y:.88}}
let pos=loadPos();
function applyPos(){
  const v=viewport(),m=24;
  const x=clamp(v.ox+pos.x*v.w,v.ox+m,v.ox+v.w-m),y=clamp(v.oy+pos.y*v.h,v.oy+m,v.oy+v.h-m);
  document.documentElement.style.setProperty('--btn-x',`${x}px`);
  document.documentElement.style.setProperty('--btn-y',`${y}px`);
  if(open)requestAnimationFrame(placePanel);
}
function setPos(x,y){
  const v=viewport(),m=24;
  x=clamp(x,v.ox+m,v.ox+v.w-m);y=clamp(y,v.oy+m,v.oy+v.h-m);
  pos={x:(x-v.ox)/v.w,y:(y-v.oy)/v.h};writeJSON(POS_KEY,pos);applyPos();
}
function placePanel(){
  if(!open)return;
  const v=viewport(),r=button.getBoundingClientRect(),pw=panel.offsetWidth,ph=panel.offsetHeight,g=13,m=7;
  const cx=r.left+r.width/2,cy=r.top+r.height/2;
  let x=cx<v.ox+v.w/2?cx+g:cx-pw-g;
  let y=cy<v.oy+v.h*.5?cy+g:cy-ph-g;
  x=clamp(x,v.ox+m,v.ox+v.w-pw-m);y=clamp(y,v.oy+m,v.oy+v.h-ph-m);
  document.documentElement.style.setProperty('--panel-x',`${x}px`);
  document.documentElement.style.setProperty('--panel-y',`${y}px`);
}
function openPanel(){open=true;panel.classList.add('open');panel.setAttribute('aria-hidden','false');veil.classList.add('open');button.classList.add('open');requestAnimationFrame(placePanel);buzz(4)}
function closePanel(){open=false;panel.classList.remove('open');panel.setAttribute('aria-hidden','true');veil.classList.remove('open');button.classList.remove('open');showError('');buzz(3)}
function togglePanel(){open?closePanel():openPanel()}
button.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  const r=button.getBoundingClientRect();
  drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,x:r.left+r.width/2,y:r.top+r.height/2,moved:false};
  try{button.setPointerCapture(e.pointerId)}catch{}
});
button.addEventListener('pointermove',e=>{
  const d=drag;if(!d||d.id!==e.pointerId)return;
  const dx=e.clientX-d.sx,dy=e.clientY-d.sy;
  if(!d.moved&&Math.hypot(dx,dy)<8)return;
  d.moved=true;button.classList.add('dragging');setPos(d.x+dx,d.y+dy);e.preventDefault();
},{passive:false});
button.addEventListener('pointerup',e=>{
  const d=drag;if(!d||d.id!==e.pointerId)return;drag=null;button.classList.remove('dragging');try{button.releasePointerCapture(e.pointerId)}catch{}
  if(d.moved){buzz(5);return}togglePanel();
});
button.addEventListener('pointercancel',()=>{drag=null;button.classList.remove('dragging')});
veil.onclick=closePanel;$('#close').onclick=closePanel;
back.onclick=()=>setView('menu');
document.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>setView(x.dataset.open));
addEventListener('resize',applyPos);visualViewport?.addEventListener('resize',applyPos);visualViewport?.addEventListener('scroll',applyPos);
applyPos();

function renderGroups(){
  const root=$('#groups');
  root.innerHTML=groups.map(g=>`<button class="groupBtn ${g.id===currentGroupId?'active':''}" data-group="${esc(g.id)}">${esc(g.name)}</button>`).join('');
  root.querySelectorAll('[data-group]').forEach(b=>b.onclick=async()=>{currentGroupId=b.dataset.group;localStorage.setItem(CURRENT_KEY,currentGroupId);currentDetail=null;renderGroups();await refresh()});
}
$('#newGroup').onclick=async()=>{
  const g={id:'group-'+uid(),name:`Grupo ${groups.length+1}`,created:Date.now()};
  groups.push(g);writeJSON(GROUPS_KEY,groups);currentGroupId=g.id;localStorage.setItem(CURRENT_KEY,g.id);currentDetail=null;renderGroups();await refresh();buzz(6);
};
renderGroups();

const voice=new VoiceQueue({
  workerURL:new URL('../../shared/prometeo-shell/v1/prometeo-voice-worker-v2.js?v=2',import.meta.url).href,
  onChange:()=>{syncAudio().catch(()=>{});refresh().catch(()=>{});updateButtonState()},
  onRecording:()=>{renderRecording();updateButtonState()}
});
await voice.init();

function recordingMeta(){const p=pageForGroup();return{pageId:p.id,sourcePath:location.pathname,sourceHref:location.href,sourceTitle:p.title,viewport:`${innerWidth}x${innerHeight}`}}
async function currentAudioNotes(){const id=pageForGroup().id;return(await listNotes()).filter(n=>(n.pageId||'')===id).sort((a,b)=>(a.created||0)-(b.created||0))}
async function allButtonAudioNotes(){return(await listNotes()).filter(n=>groups.some(g=>`prometeo-button-${g.id}`===n.pageId))}
async function startRecording(){showError('');try{await voice.start();renderRecording();buzz(6)}catch(e){showError(e?.name==='NotAllowedError'?'Permití el micrófono.':(e?.message||'No pude grabar.'))}}
function pauseRecording(){voice.pauseResume();renderRecording();buzz(3)}
async function saveRecording(){
  try{
    const n=await voice.save(recordingMeta());renderRecording();
    for(let i=0;i<25;i++){const q=n?.id?await getNote(n.id):null;if(q?.audio)break;await sleep(100)}
    await syncAudio();await refresh();buzz([4,20,4]);
  }catch(e){showError(e?.message||'No pude guardar el audio.')}
}
function discardRecording(){voice.discard();renderRecording();buzz(6)}
function renderRecording(){
  const s=voice.state(),active=!!s.active;
  $('#rec').setAttribute('aria-pressed',active&&!s.paused?'true':'false');
  $('#state').textContent=active?(s.paused?'Pausado':'Grabando'):'Audio';
  $('#recActions').classList.toggle('hidden',!active);
  $('#pause').textContent=s.paused?'Continuar':'Pausar';
  button.classList.toggle('recording',active&&!s.paused);
  cancelAnimationFrame(recRAF);
  if(active){const tick=()=>{const q=voice.state();if(!q.active)return;const sec=Math.floor((q.elapsed||0)/1000);$('#state').textContent=`${q.paused?'Pausado':'Grabando'} · ${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;recRAF=requestAnimationFrame(tick)};tick()}
}
$('#rec').onclick=()=>voice.state().active?pauseRecording():startRecording();
$('#pause').onclick=pauseRecording;$('#saveAudio').onclick=saveRecording;$('#discardAudio').onclick=discardRecording;
renderRecording();

async function addText(){
  const ta=$('#draft'),text=String(ta.value||'').trim();if(!text)return;
  if(!client.hasWorkspace()){showError('Este dispositivo todavía no está vinculado a Prometeo.');return}
  showError('');$('#addText').disabled=true;
  try{
    const p=pageForGroup();const file=new File([text],`nota-${new Date().toISOString().replace(/[:.]/g,'-')}.txt`,{type:'text/plain;charset=utf-8'});
    const r=await client.uploadAttachment(file,p);const rows=textRows();rows.push({id:r.attachment.id,group_id:currentGroup().id,text,created:new Date().toISOString()});saveTextRows(rows);
    ta.value='';await refresh();buzz(5);
  }catch(e){showError(e?.message||'No pude guardar la nota.')}finally{$('#addText').disabled=false}
}
$('#addText').onclick=addText;
$('#draft').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();addText()}});

function createRelay(){
  let worker=null,busy=false,last=0;
  const get=()=>worker||(worker=new Worker(new URL('../../shared/prometeo-shell/v1/prometeo-voice-worker-v2.js?v=2',import.meta.url),{type:'module'}));
  async function decode16k(blob){
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('AudioContext no disponible');const ctx=new AC();
    try{const d=await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0)),mono=new Float32Array(d.length);for(let c=0;c<d.numberOfChannels;c++){const a=d.getChannelData(c);for(let i=0;i<d.length;i++)mono[i]+=a[i]/d.numberOfChannels}if(d.sampleRate===16000)return mono;const ratio=d.sampleRate/16000,out=new Float32Array(Math.max(1,Math.round(mono.length/ratio)));for(let i=0;i<out.length;i++){const p=i*ratio,a=Math.floor(p),b=Math.min(a+1,mono.length-1),f=p-a;out[i]=mono[a]*(1-f)+mono[b]*f}return out}finally{try{await ctx.close()}catch{}}
  }
  function transcribe(id,pcm){
    return new Promise((resolve,reject)=>{const w=get(),timer=setTimeout(()=>done(new Error('La transcripción tardó demasiado')),12*60e3);function done(err,v){clearTimeout(timer);w.removeEventListener('message',msg);w.removeEventListener('error',errh);err?reject(err):resolve(v)}function msg(e){const d=e.data||{};if(d.id!==id)return;if(d.type==='done')done(null,String(d.text||'').trim());if(d.type==='error')done(new Error(d.error||'No pude transcribir'))}function errh(e){done(new Error(e?.message||'Error de transcripción'))}w.addEventListener('message',msg);w.addEventListener('error',errh);w.postMessage({type:'transcribe',id,audio:pcm.buffer},[pcm.buffer])});
  }
  async function once(force=false){
    if(busy||!client.hasWorkspace()||navigator.onLine===false)return false;if(!force&&Date.now()-last<9000)return false;last=Date.now();busy=true;let job=null;
    try{job=(await client.claimTranscription()).job;if(!job)return false;const r=await fetch(job.audio_url,{cache:'no-store'});if(!r.ok)throw new Error(`Audio ${r.status}`);const text=await transcribe(job.capture_id,await decode16k(await r.blob()));if(!text)throw new Error('Transcripción vacía');await client.completeTranscription(job,text);return true}catch(e){if(job)try{await client.failTranscription(job,e)}catch{}return false}finally{busy=false}
  }
  return{once};
}
const relay=createRelay();

async function syncAudio(){
  if(!client.hasWorkspace())return;
  const notes=await allButtonAudioNotes();
  for(const n of notes){if(!n.audio||!n.id)continue;const key=AUDIO_UPLOAD+n.id,stamp=`${n.audio.size||0}:${n.created||0}`;if(localStorage.getItem(key)===stamp)continue;try{await client.uploadAudio(n.audio,n,pageFromId(n.pageId));localStorage.setItem(key,stamp)}catch{}}
  relay.once().then(ch=>{if(ch)refresh().catch(()=>{})}).catch(()=>{});
}
function localAudioState(n){const s=String(n?.status||'');if(s==='preparing')return'Guardando audio…';if(s==='queued')return'Esperando transcripción…';if(s==='loading')return'Cargando transcripción…';if(s==='transcribing')return'Transcribiendo…';if(s==='error')return n.error||'Error de transcripción';return''}
async function renderNotes(){
  renderGroups();const aud=await currentAudioNotes();
  const serverPending=new Map((currentDetail?.pending||[]).map(x=>[x.capture_id,x]));
  const serverProcessing=new Map((currentDetail?.processing||[]).map(x=>[x.id,x]));
  const attachmentStates=new Map((currentDetail?.attachments||[]).map(x=>[x.id,x.state]));
  const rows=[];
  for(const t of groupTextRows()){const st=attachmentStates.get(t.id)||'PENDING';rows.push({kind:'texto',text:t.text,created:t.created,state:st==='PENDING'?'ready':'submitted',side:st==='PENDING'?'listo':'enviado'})}
  for(const n of aud){const pending=serverPending.get(n.id),processing=serverProcessing.get(n.id);if(pending)rows.push({kind:'audio',text:pending.text||n.text||'',created:new Date(n.created).toISOString(),state:'ready',side:'listo'});else{const label=localAudioState(n)||processing?.processing_state||'Audio guardado';rows.push({kind:'audio',text:n.text||'',created:new Date(n.created).toISOString(),state:n.text?'ready':'processing',side:n.text?'local':'transcribiendo',label})}}
  rows.sort((a,b)=>new Date(a.created)-new Date(b.created));$('#count').textContent=String(rows.length);
  $('#notesList').innerHTML=rows.length?rows.map(r=>`<article class="note ${r.state}"><span class="noteDot"></span><div><div class="noteText">${r.text?esc(r.text):`<span class="token">${esc(r.label||'Transcribiendo…')}</span>`}</div><div class="noteMeta">${r.kind.toUpperCase()} · ${esc(when(r.created))}</div></div><div class="noteSide">${esc(r.side||'')}</div></article>`).join(''):'<div class="empty">Este grupo está vacío.</div>';
  updateButtonState(rows);
}

async function refresh(){
  if(!client.hasWorkspace()){showError('Este dispositivo todavía no está vinculado a Prometeo.');await renderNotes();return}
  showError('');try{const p=pageForGroup();await client.syncPage(p);currentDetail=await client.detail(p);await renderNotes();renderResults()}catch(e){showError(e?.message||'No pude sincronizar Prometeo.')}
}
function updateButtonState(rows=null){const rec=voice.state().active&&!voice.state().paused;button.classList.toggle('recording',rec);if(rows)button.classList.toggle('transcribing',rows.some(r=>r.state==='processing'))}
function resultSummary(r){return r?.summary&&typeof r.summary==='object'?r.summary:{text:String(r?.summary||'')}}
function renderResults(){
  const results=currentDetail?.results||[],last=results[results.length-1];
  $('#history').innerHTML=results.length?results.slice().reverse().slice(0,8).map(r=>{const s=resultSummary(r);return`<div class="historyRow"><b>${esc(r.status)} · ${esc(r.work_item_id)}</b><p>${esc(s.text||s.answer||'Trabajo terminado.')}</p></div>`}).join(''):'<div class="empty">Todavía no hay trabajos terminados en este grupo.</div>';
  if(!last){$('#result').classList.add('hidden');return}
  const s=resultSummary(last);$('#result').classList.remove('hidden');$('#resultWhen').textContent=when(last.created_at);$('#answer').textContent=s.answer||s.text||'Trabajo terminado.';
  const buckets=Array.isArray(s.buckets)?s.buckets:[];$('#buckets').innerHTML=buckets.map(b=>`<article class="bucket"><h3>${esc(b.title||'Frente')}</h3>${b.purpose?`<p>${esc(b.purpose)}</p>`:''}${Array.isArray(b.tasks)&&b.tasks.length?`<ul>${b.tasks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<div class="bucketFoot">${esc(b.deliverable||b.status||'')}</div></article>`).join('');
  if(last.seen_at==null)button.classList.add('result');
}

async function ensurePendingAudioAttachments(){
  const aud=await currentAudioNotes(),ready=new Set((currentDetail?.pending||[]).map(x=>x.capture_id));
  for(const n of aud){if(ready.has(n.id)||!n.audio)continue;const key=AUDIO_ATTACHMENT+n.id;if(localStorage.getItem(key))continue;const ext=(n.audio.type||'').includes('mp4')?'mp4':(n.audio.type||'').includes('ogg')?'ogg':'webm';const file=new File([n.audio],`audio-pendiente-${n.id}.${ext}`,{type:n.audio.type||'audio/webm'});try{const r=await client.uploadAttachment(file,pageForGroup());localStorage.setItem(key,r.attachment.id)}catch{}}
}
async function addModeDirective(mode){
  const text=mode==='plan'?'MODO DE ESTE ENVÍO: PLANIFICAR. Analizá el pedido y devolvé una planificación útil. No modifiques código ni publiques cambios salvo que otra nota del mismo grupo lo pida explícitamente.':'MODO DE ESTE ENVÍO: TRABAJAR. Ejecutá materialmente el pedido, preservando lo que ya funciona y haciendo cambios quirúrgicos cuando el pedido sea pequeño.';
  const file=new File([text],`modo-${mode}-${Date.now()}.txt`,{type:'text/plain;charset=utf-8'});await client.uploadAttachment(file,pageForGroup());
}
async function copyText(text){try{await navigator.clipboard.writeText(text);return true}catch{}try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.left='-9999px';document.body.append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return !!ok}catch{return false}}
async function prepare(mode,spring){
  if(!client.hasWorkspace()){showError('Este dispositivo todavía no está vinculado a Prometeo.');resetSpring(spring);return}
  if(voice.state().active)await saveRecording();if(String($('#draft').value||'').trim())await addText();spring.classList.add('busy');showError('');
  try{await syncAudio();await refresh();await ensurePendingAudioAttachments();await addModeDirective(mode);await client.syncPage(pageForGroup());const d=await client.trabajar(pageForGroup());lastCommand=`${d.command}\nBUTTON UI · ${PROTOCOL}`;activeWork={work_item_id:d.work_item_id,group_id:currentGroup().id,mode,created:Date.now()};writeJSON(ACTIVE_KEY,activeWork);localStorage.setItem(COMMAND_KEY,lastCommand);await copyText(lastCommand);setView('work');renderActiveWork();startPolling();buzz([5,22,5]);await refresh()}catch(e){showError(e?.code==='NO_PENDING_INTENT'?'No hay notas nuevas para enviar.':(e?.message||'No pude preparar el trabajo.'))}finally{spring.classList.remove('busy');resetSpring(spring)}
}
function setupSpring(spring){
  const knob=spring.querySelector('.springKnob');let state=null;const max=()=>Math.max(1,spring.clientWidth-knob.clientWidth-8),draw=x=>knob.style.setProperty('--sx',`${x}px`);
  spring.addEventListener('pointerdown',e=>{if(e.target.closest('.springKnob')==null)return;state={id:e.pointerId,start:e.clientX,x:0};knob.setPointerCapture(e.pointerId);e.preventDefault()});
  spring.addEventListener('pointermove',e=>{if(!state||state.id!==e.pointerId)return;state.x=clamp(e.clientX-state.start,0,max());draw(state.x);e.preventDefault()},{passive:false});
  spring.addEventListener('pointerup',e=>{if(!state||state.id!==e.pointerId)return;const x=state.x;state=null;try{knob.releasePointerCapture(e.pointerId)}catch{}if(x>max()*.80){draw(max());prepare(spring.dataset.mode,spring)}else resetSpring(spring)});
  spring.addEventListener('pointercancel',()=>{state=null;resetSpring(spring)});
}
function resetSpring(spring){const k=spring.querySelector('.springKnob');k.style.transition='transform .23s cubic-bezier(.2,.85,.25,1)';k.style.setProperty('--sx','0px');setTimeout(()=>k.style.transition='',250)}
document.querySelectorAll('.spring').forEach(setupSpring);

function renderActiveWork(){
  if(!activeWork){$('#activeWork').classList.add('hidden');return}
  $('#activeWork').classList.remove('hidden');$('#workTitle').textContent='Listo para pegar';$('#workStatus').textContent=`${activeWork.work_item_id} · ${activeWork.mode==='plan'?'planificar':'trabajar'}`;$('#workMessage').textContent='El prompt mínimo quedó copiado. Pegalo en un chat nuevo.';$('#promptBox').textContent=lastCommand;
}
$('#copyAgain').onclick=async()=>{if(lastCommand)await copyText(lastCommand)};
$('#openChat').onclick=()=>{if(lastCommand)window.open(`https://chatgpt.com/?q=${encodeURIComponent(lastCommand)}`,'_blank','noopener')};
$('#showPrompt').onclick=()=>$('#promptBox').classList.toggle('hidden');

async function fetchProgress(work){try{const r=await fetch(`https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/coordination/executions/${encodeURIComponent(work)}/PROGRESS.json?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)return null;const d=await r.json();return d?.work_item_id===work?d:null}catch{return null}}
function paintProgress(value=0,stage='',message=''){const p=clamp(Number(value)||0,0,100);$('#progressFill').style.width=`${p}%`;const marks=[10,30,55,80,95];[...$('#checkpoints').children].forEach((x,i)=>x.classList.toggle('on',p>=marks[i]));if(stage||message)$('#workMessage').textContent=`${stage?stage+' · ':''}${message||''}`}
async function pollWork(){
  if(!activeWork||pollBusy||!client.hasWorkspace())return;pollBusy=true;
  try{const st=await client.executionStatus({work_item_id:activeWork.work_item_id}),ex=(st.executions||[])[0];if(!ex)return;const card=$('#activeWork');card.classList.remove('claimed','working');$('#workStatus').textContent=`${activeWork.work_item_id} · ${ex.status}`;if(ex.status==='CLAIMED'){card.classList.add('claimed');$('#workTitle').textContent='Chat conectado';paintProgress(7,'FETCH','El worker abrió el paquete y recuperó el contexto.')}else if(!['READY','CANDIDATE_READY','VERIFIED','SERVED','BLOCKED','FAILED'].includes(ex.status)){card.classList.add('working');$('#workTitle').textContent='Trabajando'}const pg=await fetchProgress(activeWork.work_item_id);if(pg){card.classList.add('working');$('#workTitle').textContent=Number(pg.progress)>=95?'Cerrando':'Trabajando';paintProgress(pg.progress,pg.stage,pg.message)}if(ex.result||['CANDIDATE_READY','VERIFIED','SERVED','BLOCKED','FAILED'].includes(ex.status)){card.classList.remove('working');$('#workTitle').textContent=ex.status==='FAILED'?'Falló':ex.status==='BLOCKED'?'Bloqueado':'Terminado';paintProgress(100,'RETURN','Resultado recibido en Prometeo.');button.classList.add('result');await refresh()}}catch{}finally{pollBusy=false}
}
function startPolling(){clearInterval(pollTimer);pollWork();pollTimer=setInterval(pollWork,3500)}

addEventListener('online',()=>{syncAudio();refresh();relay.once(true).then(ch=>{if(ch)refresh()})});
setInterval(()=>{syncAudio().catch(()=>{});relay.once().then(ch=>{if(ch)refresh()}).catch(()=>{})},26000);

if(lastCommand)$('#promptBox').textContent=lastCommand;
if(activeWork){renderActiveWork();startPolling()}
await syncAudio();
await refresh();
