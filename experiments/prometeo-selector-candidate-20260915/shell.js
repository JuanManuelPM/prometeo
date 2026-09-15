import {MENU} from './registry.js';

const DRAG_PX=8, SNAP_MS=210, SELECT_RESIST_PX=28, REENGAGE_PX=14;
const $=s=>document.querySelector(s);
const shell=$('#shell'),anchor=$('#anchor'),menu=$('#menu'),menuList=$('#menuList'),menuTitle=$('#menuTitle'),veil=$('#veil');
const home=$('#home'),pageHost=$('#pageHost'),draft=$('#draft'),stream=$('#noteStream'),recordCard=$('#recordCard');
const notesPanel=$('#notesPanel'),notesList=$('#notesList');
const STORAGE={corner:'prometeo.candidate.v3.corner',draft:'prometeo.candidate.v3.draft',nav:'prometeo.candidate.v3.nav',fallbackNotes:'prometeo.candidate.v3.notes'};
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const buzz=(ms=8)=>{try{navigator.vibrate?.(ms)}catch{}};
let toastTimer=0;function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('on'),1200)}

const state={corner:localStorage.getItem(STORAGE.corner)||'br',menuOpen:false,path:[],selected:0,page:null,back:[],voice:null,voiceReady:false,recording:false,recTimer:0,recStarted:0,recElapsed:0,recPaused:false,changeClient:null};
try{const saved=JSON.parse(sessionStorage.getItem(STORAGE.nav)||'null');if(saved){state.path=Array.isArray(saved.path)?saved.path:[];state.selected=Number(saved.selected)||0;state.page=saved.page||null;state.back=Array.isArray(saved.back)?saved.back:[]}}catch{}
draft.value=localStorage.getItem(STORAGE.draft)||'';
draft.addEventListener('input',()=>localStorage.setItem(STORAGE.draft,draft.value));

function saveNav(){try{sessionStorage.setItem(STORAGE.nav,JSON.stringify({path:state.path,selected:state.selected,page:state.page,back:state.back.slice(-20)}))}catch{}}
function currentNode(){let node=MENU;for(const id of state.path){const next=node.items?.find(x=>x.id===id);if(!next)break;node=next}return node}
function items(){return currentNode().items||[]}
function menuPosition(){
  const r=anchor.getBoundingClientRect(),gap=4,w=Math.min(302,innerWidth-14),maxH=Math.min(innerHeight*.68,520);menu.style.width=`${w}px`;
  const top=state.corner[0]==='t';const left=state.corner[1]==='l';
  menu.style.left=left?`${Math.max(6,r.left)}px`:`${Math.max(6,r.right-w)}px`;
  if(top){menu.style.top=`${Math.min(innerHeight-maxH-6,r.bottom+gap)}px`;menu.style.bottom='auto'}else{menu.style.bottom=`${Math.max(6,innerHeight-r.top+gap)}px`;menu.style.top='auto'}
}
function renderMenu(){
  const node=currentNode();menuTitle.textContent=node.title||node.label||'Prometeo';const arr=items();state.selected=Math.max(0,Math.min(state.selected,Math.max(0,arr.length-1)));
  menuList.innerHTML='';arr.forEach((item,i)=>{const b=document.createElement('button');b.className='row'+(i===state.selected?' selected':'');b.dataset.i=i;b.innerHTML=`<span>${escapeHtml(item.label)}</span><span class="chev">${item.items?'›':''}</span>`;b.addEventListener('click',()=>{state.selected=i;renderMenu();activateSelected()});menuList.append(b)});
  requestAnimationFrame(()=>menuList.querySelector('.selected')?.scrollIntoView({block:'nearest'}));menuPosition();saveNav();
}
function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function openMenu(){state.menuOpen=true;shell.classList.add('menu-open');menu.setAttribute('aria-hidden','false');renderMenu();buzz(5)}
function closeMenu(){state.menuOpen=false;shell.classList.remove('menu-open');menu.setAttribute('aria-hidden','true');buzz(4);saveNav()}
function stepSelection(delta){const arr=items();if(!arr.length)return;state.selected=(state.selected+delta+arr.length)%arr.length;renderMenu();buzz(6)}
function enterItem(item){if(!item)return;if(item.items){state.path.push(item.id);state.selected=0;renderMenu();buzz(8);return}closeMenu();if(item.action)return runAction(item.action);if(item.href)return openPage(item)}
function activateSelected(){enterItem(items()[state.selected])}
function menuBack(){if(state.path.length){state.path.pop();state.selected=0;renderMenu();buzz(7);return}if(state.page&&state.back.length){restoreBack();return}closeMenu()}

$('#menuClose').addEventListener('click',closeMenu);$('#menuBack').addEventListener('click',menuBack);veil.addEventListener('click',closeMenu);

function sourceMeta(){return {sourcePath:state.page?.href||location.pathname,sourceHref:state.page?.href||location.href,sourceTitle:state.page?.label||'Prometeo',pageId:'prometeo-universal-shell-v5'}}
function snapshot(){let scrollY=0;try{scrollY=pageHost.hidden?0:(pageHost.contentWindow?.scrollY||0)}catch{}return {page:state.page,path:[...state.path],selected:state.selected,corner:state.corner,scrollY,draft:draft.value}}
function openPage(item){state.back.push(snapshot());state.page={id:item.id,label:item.label,href:item.href};state.path=[];state.selected=0;home.hidden=true;pageHost.hidden=false;pageHost.src=item.href;pageHost.onload=()=>{try{pageHost.contentWindow.scrollTo(0,0)}catch{}};saveNav();buzz(10)}
function restoreBack(){const x=state.back.pop();if(!x)return;state.page=x.page||null;state.path=x.path||[];state.selected=x.selected||0;state.corner=x.corner||state.corner;setCorner(state.corner,false);draft.value=x.draft||draft.value;localStorage.setItem(STORAGE.draft,draft.value);if(state.page?.href){home.hidden=true;pageHost.hidden=false;pageHost.src=state.page.href;pageHost.onload=()=>{try{pageHost.contentWindow.scrollTo(0,x.scrollY||0)}catch{}}}else{pageHost.hidden=true;pageHost.removeAttribute('src');home.hidden=false}closeMenu();saveNav();buzz(9)}

function setCorner(c,animate=true){state.corner=c;anchor.className=`anchor ${c}${animate?'':' dragging'}`;const margin=5,top=c[0]==='t'?margin:Math.max(margin,innerHeight-anchor.offsetHeight-margin),left=c[1]==='l'?margin:Math.max(margin,innerWidth-anchor.offsetWidth-margin);anchor.style.left=`${left}px`;anchor.style.top=`${top}px`;requestAnimationFrame(()=>anchor.classList.remove('dragging'));localStorage.setItem(STORAGE.corner,c);positionRecorder();if(state.menuOpen)menuPosition()}
function nearestCorner(x,y){const cx=x+anchor.offsetWidth/2,cy=y+anchor.offsetHeight/2;return `${cy<innerHeight/2?'t':'b'}${cx<innerWidth/2?'l':'r'}`}
setCorner(state.corner,false);addEventListener('resize',()=>setCorner(state.corner,false));

let pointer=null;
anchor.addEventListener('pointerdown',e=>{
  if(e.button!==undefined&&e.button!==0)return;e.preventDefault();anchor.setPointerCapture?.(e.pointerId);
  const r=anchor.getBoundingClientRect();pointer={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,left:r.left,top:r.top,moved:false,gesture:state.menuOpen,ox:e.clientX,oy:e.clientY,lastAxis:null};
});
anchor.addEventListener('pointermove',e=>{
  if(!pointer||pointer.id!==e.pointerId)return;e.preventDefault();pointer.x=e.clientX;pointer.y=e.clientY;
  if(pointer.gesture){handleMenuGesture(e.clientX,e.clientY);return}
  const dx=e.clientX-pointer.startX,dy=e.clientY-pointer.startY;if(!pointer.moved&&Math.hypot(dx,dy)>=DRAG_PX){pointer.moved=true;anchor.classList.add('dragging');buzz(5)}
  if(pointer.moved){const x=Math.max(-4,Math.min(innerWidth-anchor.offsetWidth+4,pointer.left+dx)),y=Math.max(-4,Math.min(innerHeight-anchor.offsetHeight+4,pointer.top+dy));anchor.style.left=`${x}px`;anchor.style.top=`${y}px`}
});
anchor.addEventListener('pointerup',finishPointer);anchor.addEventListener('pointercancel',finishPointer);
function finishPointer(e){if(!pointer||pointer.id!==e.pointerId)return;const p=pointer;pointer=null;if(p.gesture)return;if(p.moved){const r=anchor.getBoundingClientRect();const c=nearestCorner(r.left,r.top);anchor.style.transitionDuration=`${SNAP_MS}ms`;setCorner(c,true);setTimeout(()=>anchor.style.transitionDuration='',SNAP_MS+20)}else openMenu()}
function handleMenuGesture(x,y){if(!pointer)return;const dx=x-pointer.ox,dy=y-pointer.oy,adx=Math.abs(dx),ady=Math.abs(dy);
  if(adx<REENGAGE_PX&&ady<REENGAGE_PX)pointer.lastAxis=null;
  if(ady>=SELECT_RESIST_PX&&ady>adx){const inwardSign=state.corner[0]==='t'?1:-1;const logical=dy*inwardSign>0?1:-1;stepSelection(logical);pointer.ox=x;pointer.oy=y;pointer.lastAxis='y';return}
  if(adx>=SELECT_RESIST_PX&&adx>ady){const inwardSign=state.corner[1]==='l'?1:-1;const inward=dx*inwardSign>0;if(inward)activateSelected();else menuBack();pointer.ox=x;pointer.oy=y;pointer.lastAxis='x'}
}

async function saveTextNote(){const text=draft.value.trim();if(!text)return;const note={id:uid(),created:Date.now(),status:'done',kind:'text',text,audio:null,error:'',...sourceMeta()};draft.value='';localStorage.setItem(STORAGE.draft,'');try{const db=await import('/prometeo/shared/prometeo-shell/v1/db.js');await db.putNote(note)}catch{const a=JSON.parse(localStorage.getItem(STORAGE.fallbackNotes)||'[]');a.push(note);localStorage.setItem(STORAGE.fallbackNotes,JSON.stringify(a.slice(-100)))}renderNotes();toast('Guardado');buzz(7);try{const secret=localStorage.getItem('prometeo.capture.workspace.secret.v2')||localStorage.getItem('prometeo.capture.workspace.secret.v1');if(secret){const c=await changeClient();const file=new File([text],`nota-${Date.now()}.txt`,{type:'text/plain;charset=utf-8'});await c.uploadAttachment(file,{id:'prometeo-universal-shell-v5',title:state.page?.label||'Prometeo',href:state.page?.href||location.href,baseline:{surface:'PROMETEO_CANDIDATE_V3'}})}}catch(e){console.warn('remote note sync deferred',e)}}
$('#sendNote').addEventListener('click',saveTextNote);draft.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();saveTextNote()}});
async function getNotes(){let a=[];try{const db=await import('/prometeo/shared/prometeo-shell/v1/db.js');a=await db.listNotes()}catch{}try{a=[...a,...JSON.parse(localStorage.getItem(STORAGE.fallbackNotes)||'[]')]}catch{}const by=new Map(a.map(n=>[n.id,n]));return [...by.values()].sort((a,b)=>a.created-b.created)}
async function renderNotes(){const all=await getNotes();const last=all.slice(-8);stream.innerHTML=last.map(n=>`<div class="note"><small>${escapeHtml(n.sourceTitle||'Prometeo')} · ${timeShort(n.created)}</small>${escapeHtml(n.text||statusText(n))}</div>`).join('');stream.scrollTop=stream.scrollHeight;notesList.innerHTML=all.length?all.map(n=>`<div class="note"><small>${escapeHtml(n.sourceTitle||'Prometeo')} · ${timeShort(n.created)}</small>${escapeHtml(n.text||statusText(n))}</div>`).join(''):'<div class="note"><small>Prometeo</small>Todavía no hay notas.</div>';notesList.scrollTop=notesList.scrollHeight}
function statusText(n){return n.status==='queued'||n.status==='loading'||n.status==='transcribing'?'Transcribiendo…':n.status==='preparing'?'Guardando audio…':n.error||'Audio'}
function timeShort(t){const d=new Date(t||Date.now());return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
renderNotes();

async function ensureVoice(){if(state.voice)return state.voice;const mod=await import('/prometeo/shared/prometeo-shell/v1/voice.js');const worker='/prometeo/shared/prometeo-shell/v1/prometeo-voice-worker-v2.js?v=2';state.voice=new mod.VoiceQueue({workerURL:worker,onChange:()=>renderNotes(),onRecording:s=>syncRecordState(s)});mod.VoiceQueue&&state.voice.init().catch(()=>{});return state.voice}
async function startRecording(){closeMenu();showRecorder(true);state.recording=true;state.recStarted=performance.now();state.recElapsed=0;state.recPaused=false;syncRecordVisual();try{const v=await ensureVoice();await v.start();syncRecordState(v.state())}catch(e){state.recording=false;showRecorder(false);toast(e?.message||'No pude abrir el micrófono');buzz([18,30,18])}}
function syncRecordState(s){if(!s?.active){state.recording=false;showRecorder(false);return}state.recording=true;state.recPaused=!!s.paused;state.recElapsed=s.elapsed||0;syncRecordVisual()}
function showRecorder(on){recordCard.classList.toggle('on',on);recordCard.setAttribute('aria-hidden',on?'false':'true');positionRecorder();if(on){cancelAnimationFrame(state.recTimer);tickRec()}else cancelAnimationFrame(state.recTimer)}
function tickRec(){if(!state.recording)return;syncRecordVisual();state.recTimer=requestAnimationFrame(tickRec)}
function syncRecordVisual(){let ms=state.recElapsed;if(state.voice){try{ms=state.voice.state().elapsed}catch{}}const sec=Math.floor(ms/1000);$('#recTime').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;recordCard.classList.toggle('paused',state.recPaused);$('#recState').textContent=state.recPaused?'Pausado':'Grabando';recordCard.querySelector('.recordCore span').textContent=state.recPaused?'tocar · continuar':'tocar · pausa'}
function positionRecorder(){const c=state.corner,sideLeft=c[1]==='r';recordCard.style.left=sideLeft?'10px':'auto';recordCard.style.right=sideLeft?'auto':'10px';if(c[0]==='b'){recordCard.style.bottom=`max(82px,calc(82px + env(safe-area-inset-bottom)))`;recordCard.style.top='auto'}else{recordCard.style.top=`max(82px,calc(82px + env(safe-area-inset-top)))`;recordCard.style.bottom='auto'}}
let recPointer=null;recordCard.addEventListener('pointerdown',e=>{e.preventDefault();recordCard.setPointerCapture?.(e.pointerId);recPointer={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0}});recordCard.addEventListener('pointermove',e=>{if(!recPointer||e.pointerId!==recPointer.id)return;recPointer.dx=e.clientX-recPointer.x;recordCard.classList.toggle('swipe-left',recPointer.dx<-34);recordCard.classList.toggle('swipe-right',recPointer.dx>34)});recordCard.addEventListener('pointerup',async e=>{if(!recPointer||e.pointerId!==recPointer.id)return;const dx=recPointer.dx;recPointer=null;recordCard.classList.remove('swipe-left','swipe-right');if(dx<-64){state.voice?.discard();showRecorder(false);toast('Descartado');buzz([8,24,8]);return}if(dx>64){const v=state.voice;if(v){await v.save({...sourceMeta()});showRecorder(false);renderNotes();toast('Guardado · transcribiendo');buzz(12)}return}state.voice?.pauseResume();const s=state.voice?.state?.();state.recPaused=!!s?.paused;syncRecordVisual();buzz(7)});recordCard.addEventListener('pointercancel',()=>{recPointer=null;recordCard.classList.remove('swipe-left','swipe-right')});

async function openNotes(){closeMenu();await renderNotes();notesPanel.classList.add('on');buzz(5)}
$('#notesClose').addEventListener('click',()=>notesPanel.classList.remove('on'));
async function changeClient(){if(state.changeClient)return state.changeClient;const mod=await import('/prometeo/shared/capture/v1/change-loop.js');state.changeClient=mod.createChangeLoopClient();return state.changeClient}
async function sendWork(kind){const b=kind==='think'?$('#thinkBtn'):$('#workBtn');b.disabled=true;try{const c=await changeClient();const p={id:'prometeo-universal-shell-v5',title:state.page?.label||'Prometeo',href:state.page?.href||location.href,baseline:{surface:'PROMETEO_CANDIDATE_V3'}};await c.syncPage(p);const r=kind==='think'?await c.pensar(p):await c.trabajar(p);toast(kind==='think'?'Pensar preparado':'Trabajo preparado');if(r?.url)open(r.url,'_blank','noopener')}catch(e){toast(e?.message||'No pude enviar')}finally{b.disabled=false}}
$('#thinkBtn').addEventListener('click',()=>sendWork('think'));$('#workBtn').addEventListener('click',()=>sendWork('work'));

function runAction(action){if(action==='record')return startRecording();if(action==='notes')return openNotes();}

// Base interaction is already live here. Optional storage/voice/network services load only on use.
// This order is deliberate: a failed import must never leave a visible dead button.
pageHost.addEventListener('load',()=>saveNav());
addEventListener('pageshow',()=>{setCorner(state.corner,false);renderNotes()});
