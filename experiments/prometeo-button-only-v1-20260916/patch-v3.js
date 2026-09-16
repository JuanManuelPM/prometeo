import {listNotes,removeNote} from '../../shared/prometeo-shell/v1/db.js';
import {createChangeLoopClient} from '../../shared/capture/v1/change-loop.js';

const client=createChangeLoopClient();
const $=s=>document.querySelector(s);
const PREFIX='prometeo.button.only.v1.';
const GROUPS_KEY=PREFIX+'groups';
const CURRENT_KEY=PREFIX+'current';
const TEXT_KEY=PREFIX+'text';
const AUDIO_UPLOAD='prometeo.button.audio-upload.v1:';
const AUDIO_ATTACHMENT='prometeo.button.audio-attachment.v1:';
const DELETE_ENDPOINT='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/prometeo-button-notes-v1';
const SECRET_KEYS=['prometeo.capture.workspace.secret.v2','prometeo.capture.workspace.secret.v1'];
let enhanceTimer=0;

const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const writeJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups=()=>readJSON(GROUPS_KEY,[]);
const currentGroup=()=>{
  const all=groups();
  const id=localStorage.getItem(CURRENT_KEY)||all[0]?.id;
  return all.find(x=>x.id===id)||all[0]||null;
};
const pageFor=g=>({id:`prometeo-button-${g.id}`,title:`Prometeo · ${g.name}`,href:location.href,baseline:{surface:'PROMETEO_BUTTON_ONLY_V1',group_id:g.id}});
const showError=msg=>{const e=$('#error');if(!e)return;e.textContent=msg||'';e.classList.toggle('hidden',!msg)};
const workspaceSecret=()=>{for(const k of SECRET_KEYS){try{const v=localStorage.getItem(k);if(v&&v.length>=32)return v}catch{}}return''};

async function remoteDelete(action,payload){
  const secret=workspaceSecret();
  if(!secret)throw new Error('Este dispositivo todavía no está vinculado a Prometeo.');
  const r=await fetch(DELETE_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${secret}`},body:JSON.stringify({action,...payload})});
  let body={};try{body=await r.json()}catch{}
  if(!r.ok){const e=new Error(body.error==='NOTE_ALREADY_SUBMITTED'?'Esta nota ya fue enviada a un worker.':(body.error||`No pude eliminar (${r.status}).`));e.code=body.error;throw e}
  return body;
}

async function itemMap(){
  const g=currentGroup();if(!g)return[];
  const page=pageFor(g);
  let detail=null;
  if(client.hasWorkspace())try{detail=await client.detail(page)}catch{}
  const pending=new Map((detail?.pending||[]).map(x=>[x.capture_id,x]));
  const links=new Map((detail?.capture_links||[]).map(x=>[x.capture_id,x]));
  const attachments=new Map((detail?.attachments||[]).map(x=>[x.id,x]));
  const rows=[];
  for(const t of readJSON(TEXT_KEY,[]).filter(x=>x.group_id===g.id)){
    const a=attachments.get(t.id);
    rows.push({id:t.id,kind:'text',created:t.created||0,state:a?.state||'LOCAL',submitted:['SUBMITTED','METABOLIZED'].includes(a?.state),text:t.text||''});
  }
  const audio=(await listNotes()).filter(n=>n.pageId===page.id);
  for(const n of audio){
    const l=links.get(n.id),p=pending.get(n.id);
    rows.push({id:n.id,kind:'audio',created:n.created||0,state:l?.state||(p?'PENDING':'LOCAL'),submitted:['SUBMITTED','METABOLIZED'].includes(l?.state),text:p?.text||n.text||'',local:n});
  }
  rows.sort((a,b)=>new Date(a.created).getTime()-new Date(b.created).getTime());
  return rows;
}

function clearOpenNotes(except=null){
  document.querySelectorAll('#notesList .note').forEach(n=>{if(n!==except)n.classList.remove('actions-open','swiped')});
}

function bindGesture(note,main){
  if(main.dataset.gestureBound==='1')return;
  main.dataset.gestureBound='1';
  let gesture=null,suppressClick=false;
  main.style.touchAction='pan-y';
  main.addEventListener('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0)return;
    gesture={id:e.pointerId,sx:e.clientX,sy:e.clientY,dx:0,horizontal:false};
    try{main.setPointerCapture(e.pointerId)}catch{}
  });
  main.addEventListener('pointermove',e=>{
    const g=gesture;if(!g||g.id!==e.pointerId)return;
    const dx=e.clientX-g.sx,dy=e.clientY-g.sy;
    if(!g.horizontal&&Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.2)g.horizontal=true;
    if(!g.horizontal)return;
    g.dx=Math.max(-84,Math.min(12,dx));
    main.style.transform=`translateX(${g.dx}px)`;
    e.preventDefault();
  },{passive:false});
  const finish=e=>{
    const g=gesture;if(!g||(e.pointerId!==undefined&&g.id!==e.pointerId))return;
    gesture=null;
    try{main.releasePointerCapture(g.id)}catch{}
    if(g.horizontal){
      suppressClick=true;setTimeout(()=>suppressClick=false,260);
      main.style.transform='';
      note.classList.toggle('swiped',g.dx<-38);
      note.classList.remove('actions-open');
      if(g.dx<-38)try{navigator.vibrate?.(4)}catch{}
    }
  };
  main.addEventListener('pointerup',finish);
  main.addEventListener('pointercancel',finish);
  main.addEventListener('click',e=>{
    if(suppressClick||e.target.closest('button'))return;
    clearOpenNotes(note);
    note.classList.remove('swiped');
    note.classList.toggle('actions-open');
  });
}

async function deleteItem(info,note){
  if(info.submitted){showError('Esta nota ya fue enviada. Podés borrarla de futuros grupos, pero no de un paquete que ya salió.');return}
  const yes=confirm(info.kind==='audio'?'¿Eliminar esta nota de audio?':'¿Eliminar esta nota?');
  if(!yes)return;
  showError('');note.classList.add('deleting');
  try{
    if(info.kind==='text'){
      await remoteDelete('delete_attachment',{attachment_id:info.id});
      const rows=readJSON(TEXT_KEY,[]).filter(x=>x.id!==info.id);writeJSON(TEXT_KEY,rows);
    }else{
      await remoteDelete('delete_capture',{capture_id:info.id});
      const aid=localStorage.getItem(AUDIO_ATTACHMENT+info.id);
      if(aid){try{await remoteDelete('delete_attachment',{attachment_id:aid})}catch(e){if(e.code==='NOTE_ALREADY_SUBMITTED')throw e}}
      await removeNote(info.id);
      for(const k of [AUDIO_UPLOAD+info.id,AUDIO_ATTACHMENT+info.id])try{localStorage.removeItem(k)}catch{}
    }
    note.remove();
    const count=$('#count');if(count)count.textContent=String(document.querySelectorAll('#notesList .note').length);
    const g=currentGroup();if(g&&client.hasWorkspace())try{await client.syncPage(pageFor(g))}catch{}
    try{navigator.vibrate?.([4,25,4])}catch{}
  }catch(e){note.classList.remove('deleting');showError(e?.message||'No pude eliminar la nota.')}
}

async function enhanceNotes(){
  const root=$('#notesList');if(!root)return;
  const dom=[...root.querySelectorAll(':scope > .note')];
  if(!dom.length)return;
  const items=await itemMap();
  dom.forEach((note,i)=>{
    const info=items[i];if(!info)return;
    const key=`${info.kind}:${info.id}:${info.state}`;
    if(note.dataset.patchKey===key)return;
    note.dataset.patchKey=key;
    note.classList.toggle('not-deletable',!!info.submitted);
    let main=note.querySelector(':scope > .noteMain');
    if(!main){
      main=document.createElement('div');main.className='noteMain';
      [...note.children].forEach(ch=>main.appendChild(ch));
      note.appendChild(main);
      const swipe=document.createElement('button');swipe.className='swipeDelete';swipe.type='button';swipe.textContent='Eliminar';note.appendChild(swipe);
      const actions=document.createElement('div');actions.className='noteActions';actions.innerHTML='<button type="button" data-note-copy>Copiar</button><button type="button" class="danger" data-note-delete>Eliminar</button>';note.appendChild(actions);
      bindGesture(note,main);
    }
    const delButtons=note.querySelectorAll('[data-note-delete],.swipeDelete');
    delButtons.forEach(b=>{b.disabled=!!info.submitted;b.onclick=e=>{e.stopPropagation();deleteItem(info,note)}});
    const copy=note.querySelector('[data-note-copy]');if(copy)copy.onclick=async e=>{e.stopPropagation();const text=info.text||note.querySelector('.noteText')?.innerText||'';try{await navigator.clipboard.writeText(text);copy.textContent='Copiado';setTimeout(()=>copy.textContent='Copiar',900)}catch{}};
  });
}
function scheduleEnhance(){clearTimeout(enhanceTimer);enhanceTimer=setTimeout(()=>enhanceNotes().catch(()=>{}),80)}
const root=$('#notesList');if(root)new MutationObserver(scheduleEnhance).observe(root,{childList:true,subtree:true});
document.querySelectorAll('[data-open="notes"],#groups,#newGroup').forEach(el=>el.addEventListener('click',()=>setTimeout(scheduleEnhance,220)));
scheduleEnhance();

if(!('PointerEvent' in window)){
  const b=$('#prometeo');let t=null;
  b?.addEventListener('touchstart',e=>{const p=e.touches[0],r=b.getBoundingClientRect();t={sx:p.clientX,sy:p.clientY,x:r.left+r.width/2,y:r.top+r.height/2,moved:false}},{passive:true});
  b?.addEventListener('touchmove',e=>{if(!t)return;const p=e.touches[0],dx=p.clientX-t.sx,dy=p.clientY-t.sy;if(!t.moved&&Math.hypot(dx,dy)<8)return;t.moved=true;const v=visualViewport||{width:innerWidth,height:innerHeight,offsetLeft:0,offsetTop:0};const x=Math.max(24,Math.min(v.width-24,t.x+dx)),y=Math.max(24,Math.min(v.height-24,t.y+dy));document.documentElement.style.setProperty('--btn-x',`${x}px`);document.documentElement.style.setProperty('--btn-y',`${y}px`);e.preventDefault()},{passive:false});
  b?.addEventListener('touchend',()=>{if(!t)return;const moved=t.moved;t=null;if(!moved)b.click()});
}

const COMMAND_KEY=PREFIX+'command';
setInterval(()=>{
  const command=localStorage.getItem(COMMAND_KEY)||'';
  if(!command)return;
  const box=$('#promptBox');if(box&&!box.textContent)box.textContent=command;
},1200);
