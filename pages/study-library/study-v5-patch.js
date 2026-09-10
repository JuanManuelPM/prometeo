(()=>{'use strict';
const V5={base:new Map(),remote:new Map(),saveFade:null,unread:0,boardTopic:null,boardSaveTimer:null,lastDeleted:null};
const old={wireSession,renderRoster,renderNotes,renderChunks,renderChat,onBroadcast,syncDoc};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const timeAgo=s=>{const d=Math.max(0,Date.now()-new Date(s||Date.now()).getTime()),m=Math.floor(d/60000);return m<1?'ahora':m<60?`hace ${m} min`:`hace ${Math.floor(m/60)} h`};
function setSaveState(text,kind=''){
  const e=$('#saveState'); if(!e)return;
  e.textContent=text; e.dataset.kind=kind; e.classList.add('visible');
  clearTimeout(V5.saveFade); if(kind==='ok')V5.saveFade=setTimeout(()=>e.classList.remove('visible'),1100);
}
function resetBase(n){V5.base.set(n.id,{content:n.content||'',revision:Number(n.revision||1),updated_at:n.updated_at||null});}
function editRange(base,value){
  base=String(base??''); value=String(value??''); let p=0;
  while(p<base.length&&p<value.length&&base[p]===value[p])p++;
  let s=0; while(s<base.length-p&&s<value.length-p&&base[base.length-1-s]===value[value.length-1-s])s++;
  return {start:p,end:base.length-s,text:value.slice(p,value.length-s)};
}
function mergeThree(base,local,remote){
  if(remote===base)return {text:local,conflict:false};
  if(local===base)return {text:remote,conflict:false};
  if(local===remote)return {text:local,conflict:false};
  const a=editRange(base,local),b=editRange(base,remote);
  if(a.end<=b.start){
    const first=base.slice(0,a.start)+a.text+base.slice(a.end);
    const shift=a.text.length-(a.end-a.start),bs=b.start+shift,be=b.end+shift;
    return {text:first.slice(0,bs)+b.text+first.slice(be),conflict:false};
  }
  if(b.end<=a.start){
    const first=base.slice(0,b.start)+b.text+base.slice(b.end);
    const shift=b.text.length-(b.end-b.start),as=a.start+shift,ae=a.end+shift;
    return {text:first.slice(0,as)+a.text+first.slice(ae),conflict:false};
  }
  return {text:remote,conflict:true};
}
function authorMeta(n){
  if(!clean(n.content)&&n.block_type!=='board')return '';
  const edited=n.last_editor_id&&n.last_editor_id!==n.author_id;
  const title=`Escrito por ${n.author_name||'Participante'}${edited?` · editado por ${n.last_editor_name}`:''} · ${timeAgo(n.updated_at||n.created_at)}`;
  return `<div class="noteAttribution" title="${esc(title)}"><span class="authorMini">${esc(initials(n.author_name||'?'))}</span><span class="authorReveal">${esc(edited?n.last_editor_name:n.author_name||'Participante')}</span></div>`;
}
function boardCard(n){
  const p=n.payload||{},img=p.image||'';
  return `<div class="boardNoteCard">${img?`<img src="${img}" alt="Captura del pizarrón">`:'<div class="boardNoteEmpty">Pizarrón</div>'}<div class="boardNoteFoot"><span>Pizarrón · ${esc(p.saved_at?fmtClock(p.saved_at):'guardado')}</span><button class="boardOpenFromNote" data-board-note="${n.id}">abrir</button></div></div>`;
}
function renderNotesV5(){
  const el=$('#noteList'); if(!el)return;
  notes=notes.filter(n=>!n.deleted_at).sort((a,b)=>a.position-b.position);
  notes.forEach(n=>{if(!V5.base.has(n.id))resetBase(n)});
  el.innerHTML=notes.map(n=>`<div class="noteBlock ${n.block_type==='board'?'isBoard':''}" data-block="${n.id}">${authorMeta(n)}<div class="noteBody">${n.block_type==='board'?boardCard(n):`<div class="editor" contenteditable="true" spellcheck="true">${esc(n.content)}</div>`}<div class="editingChip" id="edit-${n.id}">${editingBy[n.id]?esc(editingBy[n.id]+' editando'):''}</div><button class="noteDelete" data-delete="${n.id}" title="Borrar bloque" aria-label="Borrar bloque">×</button></div></div>`).join('');
  $$('.noteBlock .editor').forEach(ed=>{const id=ed.closest('.noteBlock').dataset.block;
    ed.onfocus=()=>{setActivity('editando notas',id); const n=notes.find(x=>x.id===id); if(n&&!V5.base.has(id))resetBase(n)};
    ed.onblur=()=>{setActivity('online');saveNoteNow(id,ed.innerText)};
    ed.oninput=()=>scheduleNote(id,ed.innerText);
    ed.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();saveNoteNow(id,ed.innerText);addNoteBlock(id)}};
  });
  $$('[data-delete]').forEach(b=>b.onclick=()=>deleteNoteBlock(b.dataset.delete));
  $$('[data-board-note]').forEach(b=>b.onclick=()=>switchWorkspace('board'));
}
function scheduleNoteV5(id,text){
  const n=notes.find(x=>x.id===id); if(!n)return;
  n.content=text; n.last_editor_id=st.profile.id;n.last_editor_name=st.profile.name;
  setSaveState('guardando…','saving'); clearTimeout(saveBlockTimers.get(id));
  saveBlockTimers.set(id,setTimeout(()=>saveNoteNow(id,text),650));
  broadcast('editing',{blockId:id,name:st.profile.name});
}
async function saveNoteV5(id,text){
  const n=notes.find(x=>x.id===id); if(!n||!roomClient||n.block_type==='board')return;
  const base=V5.base.get(id)||{content:n.content||'',revision:Number(n.revision||1)};
  const expected=Number(base.revision||1),patch={content:text,last_editor_id:st.profile.id,last_editor_name:st.profile.name,revision:expected+1,updated_at:new Date().toISOString()};
  setSaveState('guardando…','saving');
  let q=await roomClient.from('study_note_blocks').update(patch).eq('id',id).eq('revision',expected).is('deleted_at',null).select('*').maybeSingle();
  if(q.error){setSaveState('sin red','error');return}
  if(q.data){Object.assign(n,q.data);resetBase(n);V5.remote.delete(id);setSaveState('guardado','ok');broadcast('note',{block:n});syncDoc();return}
  const latest=await roomClient.from('study_note_blocks').select('*').eq('id',id).maybeSingle();
  if(latest.error||!latest.data){setSaveState('sin red','error');return}
  const server=latest.data;
  if(server.deleted_at){await recoveredSibling(n,text);setSaveState('guardado','ok');toast('Recuperé tu texto porque el bloque se borró en otro dispositivo');return}
  const m=mergeThree(base.content||'',text,server.content||'');
  if(m.conflict){Object.assign(n,server);resetBase(n);await recoveredSibling(n,text);renderNotes();setSaveState('guardado','ok');toast('Junté los cambios sin perder texto');return}
  const retry={content:m.text,last_editor_id:st.profile.id,last_editor_name:st.profile.name,revision:Number(server.revision||1)+1,updated_at:new Date().toISOString()};
  q=await roomClient.from('study_note_blocks').update(retry).eq('id',id).eq('revision',server.revision).is('deleted_at',null).select('*').maybeSingle();
  if(q.data){Object.assign(n,q.data);resetBase(n);const ed=$(`.noteBlock[data-block="${id}"] .editor`);if(ed&&ed.innerText!==m.text)ed.innerText=m.text;setSaveState('guardado','ok');broadcast('note',{block:n});syncDoc()}else setSaveState('reintentando…','saving');
}
async function recoveredSibling(source,text){
  const idx=notes.findIndex(x=>x.id===source.id),next=notes[idx+1],pos=next?(source.position+next.position)/2:source.position+1;
  const n={id:crypto.randomUUID(),session_id:room.id,block_key:crypto.randomUUID(),position:pos,content:text,author_id:st.profile.id,author_name:st.profile.name,last_editor_id:st.profile.id,last_editor_name:st.profile.name,revision:1,block_type:'text',payload:{recovered_from:source.id},created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  const q=await roomClient.from('study_note_blocks').insert(n).select('*').single(); if(q.data){notes.push(q.data);resetBase(q.data);broadcast('note',{block:q.data})}
}
async function addNoteV5(after){
  const sorted=[...notes].filter(n=>!n.deleted_at).sort((a,b)=>a.position-b.position),i=after?sorted.findIndex(x=>x.id===after):-1,prev=i>=0?sorted[i]:sorted.at(-1),next=i>=0?sorted[i+1]:null,pos=prev?(next?(prev.position+next.position)/2:prev.position+1):1;
  const n={id:crypto.randomUUID(),session_id:room.id,block_key:crypto.randomUUID(),position:pos,content:'',author_id:st.profile.id,author_name:st.profile.name,last_editor_id:st.profile.id,last_editor_name:st.profile.name,revision:1,block_type:'text',payload:{},created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  const q=await roomClient.from('study_note_blocks').insert(n).select('*').single(); if(q.error){toast('No se pudo crear el bloque');return}
  notes.push(q.data);resetBase(q.data);renderNotes();broadcast('note',{block:q.data});setTimeout(()=>$(`.noteBlock[data-block="${q.data.id}"] .editor`)?.focus(),20);
}
async function deleteNoteBlock(id){
  const n=notes.find(x=>x.id===id);if(!n)return; const b=V5.base.get(id)||{revision:Number(n.revision||1)};
  const at=new Date().toISOString(),q=await roomClient.from('study_note_blocks').update({deleted_at:at,revision:Number(b.revision)+1,updated_at:at,last_editor_id:st.profile.id,last_editor_name:st.profile.name}).eq('id',id).eq('revision',b.revision).is('deleted_at',null).select('*').maybeSingle();
  if(q.error){toast('No se pudo borrar');return} if(!q.data){toast('Cambió mientras lo borrabas; lo dejé');await reloadOne(id);return}
  notes=notes.filter(x=>x.id!==id);V5.base.delete(id);renderNotes();broadcast('note-delete',{id,revision:q.data.revision,deleted_at:at});syncDoc();showUndo(q.data);
}
async function reloadOne(id){const q=await roomClient.from('study_note_blocks').select('*').eq('id',id).maybeSingle();if(q.data&&!q.data.deleted_at){const i=notes.findIndex(x=>x.id===id);if(i>=0)notes[i]=q.data;else notes.push(q.data);resetBase(q.data);renderNotes()}}
function showUndo(row){
  V5.lastDeleted=row; const e=$('#toast');e.innerHTML=`Borrado <button id="undoDelete" class="toastUndo">deshacer</button>`;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>{e.classList.remove('show');V5.lastDeleted=null},7000);$('#undoDelete').onclick=undoDelete;
}
async function undoDelete(){const d=V5.lastDeleted;if(!d)return;const q=await roomClient.from('study_note_blocks').update({deleted_at:null,revision:Number(d.revision)+1,updated_at:new Date().toISOString(),last_editor_id:st.profile.id,last_editor_name:st.profile.name}).eq('id',d.id).eq('revision',d.revision).select('*').maybeSingle();if(q.data){notes.push(q.data);resetBase(q.data);renderNotes();broadcast('note',{block:q.data});syncDoc();toast('Restaurado')}V5.lastDeleted=null}
function syncDocV5(){clearTimeout(syncDocV5.t);syncDocV5.t=setTimeout(async()=>{const txt=notes.filter(x=>!x.deleted_at).sort((a,b)=>a.position-b.position).map(x=>x.block_type==='board'?'[Pizarrón guardado]':x.content).filter(Boolean).join('\n\n');await roomClient.from('study_session_docs').upsert({session_id:room.id,shared_notes:txt,version:Date.now(),updated_by:st.profile.name,updated_at:new Date().toISOString()},{onConflict:'session_id'})},900)}
function renderRosterV5(){
  const r=$('#roster');if(!r)return;const onlineIds=new Set();Object.values(presence).flat().forEach(x=>onlineIds.add(x.participantId));if(!onlineIds.size)onlineIds.add(st.profile.id);
  r.innerHTML=[...onlineIds].map(id=>{const p=participants[id]||{display_name:id===st.profile.id?st.profile.name:'Participante',avatar_data:id===st.profile.id?st.profile.avatar:''},ps=Object.values(presence).flat().find(x=>x.participantId===id),a=p.avatar_data;return `<div class="player" title="${esc((p.display_name||'Participante')+' · '+(ps?.activity||'online'))}"><div class="avatar">${a?`<img src="${a}">`:esc(initials(p.display_name))}<i class="activityDot"></i></div><div class="playerText"><div class="playerName">${esc(p.display_name)}</div><div class="playerState">${esc(ps?.activity||'online')}</div></div></div>`}).join('');
}
function renderChunksV5(){
  const el=$('#chunks');if(!el)return;const arr=[...chunks].sort((a,b)=>(a.start_ms||0)-(b.start_ms||0)||String(a.created_at).localeCompare(String(b.created_at))),ready=arr.filter(x=>x.status==='ready'&&x.transcript),pending=arr.filter(x=>['queued','transcribing'].includes(x.status)),errors=arr.filter(x=>x.status==='error'),latestPending=pending.at(-1);
  el.innerHTML=ready.map(x=>`<div class="chunk ready"><div class="chunkMeta"><span>${esc(x.participant_name)} · ${ms(x.start_ms)}</span><span>${ms(x.end_ms)}</span></div><div class="chunkText">${esc(x.transcript)}</div></div>`).join('')+(latestPending?`<div class="chunk pending"><div class="chunkMeta"><span>${esc(latestPending.participant_name)} · ${ms(latestPending.start_ms)}–${ms(latestPending.end_ms)}</span><span>${pending.length>1?pending.length+' tramos ':''}<span class="loader"><i></i><i></i><i></i></span></span></div><div class="chunkText">${esc(latestPending.provisional_text||'Transcribiendo este tramo…')}</div></div>`:'')+(errors.length?`<div class="chunk errorLine">${errors.length} tramo${errors.length>1?'s':''} pendiente${errors.length>1?'s':''} de reintento</div>`:'')+(!ready.length&&!pending.length?'<div class="chunk emptyTranscript">La transcripción aparece acá mientras grabás.</div>':'');
  el.scrollTop=el.scrollHeight;renderFullTranscript();updateBoardCaption();
}
function renderChatV5(){old.renderChat();updateChatTab()}
function updateChatTab(){const b=$('.sideTab[data-side="chat"]');if(!b)return;b.innerHTML=`Walky chat${V5.unread?` <span class="unread">${V5.unread}</span>`:''}`}
function onBroadcastV5(p){
  if(!p||p.from===st.profile.id)return;
  if(p.type==='note'){
    const b=p.block,i=notes.findIndex(x=>x.id===b.id),focused=document.activeElement?.closest?.('.noteBlock')?.dataset.block;
    if(focused===b.id){V5.remote.set(b.id,b);return}
    if(b.deleted_at){if(i>=0)notes.splice(i,1);V5.base.delete(b.id)}else{if(i>=0)notes[i]=b;else notes.push(b);resetBase(b)}renderNotes();
  }else if(p.type==='note-delete'){
    const focused=document.activeElement?.closest?.('.noteBlock')?.dataset.block;
    if(focused===p.id){V5.remote.set(p.id,{id:p.id,deleted_at:p.deleted_at,revision:p.revision});return}
    notes=notes.filter(x=>x.id!==p.id);V5.base.delete(p.id);renderNotes();
  }else if(p.type==='chat'){
    if(!chat.some(x=>x.id===p.message.id)){chat.push(p.message);if(sideTab!=='chat')V5.unread++;renderChat();if(st.audio.autoplay)queueSpeak(p.message)}
  }else old.onBroadcast(p);
}
function latestTranscript(){const x=[...chunks].filter(x=>x.status==='ready'&&x.transcript).sort((a,b)=>(a.start_ms||0)-(b.start_ms||0)).at(-1);return x?x.transcript:''}
function updateBoardCaption(){const e=$('#boardCaption');if(e)e.textContent=latestTranscript()||'La transcripción va apareciendo a la derecha mientras usás el pizarrón.'}
function boardKey(){V5.boardTopic=`class-${room.id}`;return V5.boardTopic}
async function hydrateBoard(){
  const topic=boardKey(),key=`study:v2:modelos-teorias-ii:whiteboard-v7:${topic}`;
  try{const q=await roomClient.from('study_board_states').select('*').eq('session_id',room.id).maybeSingle();if(q.data?.state&&Object.keys(q.data.state).length)localStorage.setItem(key,JSON.stringify(q.data.state))}catch{}
}
async function saveBoardState(){
  clearTimeout(V5.boardSaveTimer);V5.boardSaveTimer=setTimeout(async()=>{const topic=boardKey(),key=`study:v2:modelos-teorias-ii:whiteboard-v7:${topic}`,raw=localStorage.getItem(key);if(!raw)return;let state;try{state=JSON.parse(raw)}catch{return}await roomClient.from('study_board_states').upsert({session_id:room.id,state,revision:Date.now(),updated_by:st.profile.name,updated_at:new Date().toISOString()},{onConflict:'session_id'});setSaveState('guardado','ok')},400);
}
async function mountBoard(){
  const host=$('#boardHost');if(!host)return;await hydrateBoard();if(host.querySelector('iframe'))return;const f=document.createElement('iframe');f.id='boardFrame';f.className='boardFrame';f.title='Pizarrón de la clase';f.src=`../study-system-v2-whiteboard-v7.html?topic=${encodeURIComponent(boardKey())}&embed=1&v=7`;f.onload=()=>{try{const d=f.contentDocument,sty=d.createElement('style');sty.textContent=`.wbReference,.wbIdentity,.wbRight,.wbPasteHint{display:none!important}.wbWorkspace{grid-template-columns:1fr!important}.wbTop{height:52px!important;padding:0 12px!important}.wbToolbarWrap{margin:auto!important}.wbBoard{min-width:0!important}.wbAdd{bottom:14px!important;right:14px!important}`;d.head.appendChild(sty)}catch{}};host.appendChild(f);
}
function switchWorkspace(mode){
  const board=mode==='board';$('#notesPane')?.classList.toggle('hide',board);$('#boardPane')?.classList.toggle('hide',!board);$$('[data-workspace]').forEach(b=>b.classList.toggle('on',b.dataset.workspace===mode));if(board){mountBoard();setActivity('pizarrón')}else setActivity('online');
}
function canvasSnapshot(){
  try{const f=$('#boardFrame'),c=f?.contentDocument?.querySelector('.wbCanvas');if(!c||!c.width||!c.height)return null;const maxW=1200,scale=Math.min(1,maxW/c.width),o=document.createElement('canvas');o.width=Math.max(1,Math.round(c.width*scale));o.height=Math.max(1,Math.round(c.height*scale));o.getContext('2d').drawImage(c,0,0,o.width,o.height);return o.toDataURL('image/webp',.82)}catch{return null}
}
async function saveBoardToNotes(){
  const image=canvasSnapshot();if(!image){toast('Todavía no hay una imagen del pizarrón');return}await saveBoardState();const sorted=[...notes].filter(n=>!n.deleted_at).sort((a,b)=>a.position-b.position),pos=(sorted.at(-1)?.position||0)+1,now=new Date().toISOString(),n={id:crypto.randomUUID(),session_id:room.id,block_key:crypto.randomUUID(),position:pos,content:'',author_id:st.profile.id,author_name:st.profile.name,last_editor_id:st.profile.id,last_editor_name:st.profile.name,revision:1,block_type:'board',payload:{image,board_topic:boardKey(),saved_at:now},created_at:now,updated_at:now};
  setSaveState('guardando…','saving');const q=await roomClient.from('study_note_blocks').insert(n).select('*').single();if(q.error){setSaveState('sin red','error');return}notes.push(q.data);resetBase(q.data);broadcast('note',{block:q.data});syncDoc();setSaveState('guardado','ok');toast('Pizarrón guardado en las notas');
}
function renderSessionV5(){
  const c=C[room.courseId]||{name:room.courseId};
  $('#app').innerHTML=`<main class="session v5"><header class="sessionTop"><div class="sessionHead"><div class="sessionIdentity"><button class="linkBtn" id="backCourse">← ${esc(c.name)}</button><div class="sessionTitle">${esc(room.title)}</div><div class="sessionDate">${fmtDate(room.date)} · ${esc(room.unitId||'clase')}</div></div><div class="rosterWrap"><div class="roster" id="roster"></div></div><div class="sessionActions"><button class="linkBtn" id="shareRoom">compartir</button><button class="linkBtn" id="profile">perfil</button></div></div></header><div class="sessionGrid"><aside class="rail"><div class="railLabel">Clase</div><div id="partList"></div><div class="railDivider"></div><button class="profileBtn" id="profile2">${esc(st.profile.name)} <span>editar</span></button></aside><section class="workspace"><div class="workspaceHead"><nav class="workspaceTabs"><button class="workspaceTab on" data-workspace="notes">Notas</button><button class="workspaceTab" data-workspace="board">Pizarrón</button></nav><div class="saveState" id="saveState">guardado</div></div><div id="notesPane" class="notesPane"><div id="noteList"></div><button class="addBlock" id="addBlock">+ bloque</button></div><div id="boardPane" class="boardPane hide"><div class="boardTopline"><div id="boardCaption" class="boardCaption">La transcripción va apareciendo a la derecha mientras usás el pizarrón.</div><button id="saveBoardNote" class="boardSave">guardar en notas</button></div><div id="boardHost" class="boardHost"></div></div></section><aside class="side"><nav class="sideTabs"><button class="sideTab ${sideTab==='transcript'?'on':''}" data-side="transcript">Transcripción</button><button class="sideTab ${sideTab==='chat'?'on':''}" data-side="chat">Walky chat</button></nav><section class="panel ${sideTab==='transcript'?'on':''}" id="transcriptPanel">${transcriptPanelHTML()}</section><section class="panel ${sideTab==='chat'?'on':''}" id="chatPanel">${chatPanelHTML()}</section></aside></div></main>`;
  wireSession();renderRoster();renderParts();renderNotes();renderChunks();renderChat();updateBoardCaption();
}
function wireSessionV5(){
  old.wireSession();$$('[data-workspace]').forEach(b=>b.onclick=()=>switchWorkspace(b.dataset.workspace));$('#saveBoardNote').onclick=saveBoardToNotes;
  $$('.sideTab').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.side==='chat'){V5.unread=0;updateChatTab()}}));
}
window.addEventListener('message',e=>{if(e.origin!==location.origin||!e.data)return;if(e.data.type==='study-wb7-thumb'&&e.data.topicId===V5.boardTopic)saveBoardState();if(e.data.type==='study-wb7-close'&&e.data.topicId===V5.boardTopic)switchWorkspace('notes')});
function install(){
  renderSession=renderSessionV5;wireSession=wireSessionV5;renderRoster=renderRosterV5;renderNotes=renderNotesV5;scheduleNote=scheduleNoteV5;saveNoteNow=saveNoteV5;addNoteBlock=addNoteV5;renderChunks=renderChunksV5;renderChat=renderChatV5;onBroadcast=onBroadcastV5;syncDoc=syncDocV5;
  try{if(typeof view!=='undefined'&&view==='session'&&room){notes=notes.filter(n=>!n.deleted_at);notes.forEach(resetBase);renderSession()}}catch(e){console.warn('v5 late mount',e)}
  document.documentElement.dataset.studyVersion='5';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})();
