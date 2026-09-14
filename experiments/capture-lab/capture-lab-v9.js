const ENDPOINT='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/prometeo-live-lab-v1';
const KEY_STORE='prometeoLiveLabKey';
const NOTES_KEY='captureLabNotes';
const DELETED_KEY='captureLabDeletedV9';
const ARCHIVED_KEY='captureLabArchivedV9';
const HISTORY_KEY='captureLabHistoryV9';

await import('./capture-lab-v8.js?v=9');

const labKey=()=>localStorage.getItem(KEY_STORE)||'';
const jread=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k)||'')||fallback}catch{return fallback}};
const setFrom=k=>new Set(jread(k,[]));
let deleted=setFrom(DELETED_KEY), archived=setFrom(ARCHIVED_KEY), selected=new Set();
let undoTimer=null, lastDeleted=null, jobsBusy=false;

// Deleted notes must never resurrect when an old in-memory transcription finishes.
const priorSetItem=Storage.prototype.setItem;
Storage.prototype.setItem=function(k,v){
  if(this===localStorage&&k===NOTES_KEY){
    try{const a=JSON.parse(v);if(Array.isArray(a))v=JSON.stringify(a.filter(n=>!deleted.has(String(n?.id||''))))}catch{}
  }
  return priorSetItem.call(this,k,v);
};

function notes(){try{return JSON.parse(localStorage.getItem(NOTES_KEY)||'[]')}catch{return[]}}
function activeIds(){return notes().map(n=>String(n.id)).filter(id=>id&&!deleted.has(id)&&!archived.has(id))}
function saveSets(){localStorage.setItem(DELETED_KEY,JSON.stringify([...deleted]));localStorage.setItem(ARCHIVED_KEY,JSON.stringify([...archived]))}
function pushHistory(rows,route){const h=jread(HISTORY_KEY,[]);for(const n of rows)h.unshift({...n,_history:{route,at:Date.now()}});localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,600)))}
function authHeaders(){return{'content-type':'application/json','x-live-lab-key':labKey()}}
async function api(body){const r=await fetch(ENDPOINT,{method:'POST',headers:authHeaders(),body:JSON.stringify(body)});let data={};try{data=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(data?.error||`HTTP ${r.status}`),{data,status:r.status});return data}
async function syncNow(){return api({action:'sync',notes:notes()})}
function countText(text){const c=document.querySelector('#count');if(c)c.textContent=text}
function toast(text,action=null){let t=document.querySelector('#v9Toast');if(!t){t=document.createElement('div');t.id='v9Toast';document.body.append(t)}t.innerHTML='';const s=document.createElement('span');s.textContent=text;t.append(s);if(action){const b=document.createElement('button');b.textContent=action.label;b.onclick=action.fn;t.append(b)}t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),4200)}

function archiveLocal(ids,route){const idset=new Set(ids.map(String)),all=notes(),rows=all.filter(n=>idset.has(String(n.id)));pushHistory(rows,route);for(const id of idset)archived.add(id);selected.clear();saveSets();decorateSoon();}

async function deleteOne(id){
  id=String(id);if(!id||deleted.has(id))return;
  const row=notes().find(n=>String(n.id)===id)||null;
  deleted.add(id);archived.delete(id);selected.delete(id);saveSets();lastDeleted={id,row};decorateSoon();
  clearTimeout(undoTimer);
  toast('Nota eliminada',{label:'Deshacer',fn:()=>undoDelete()});
  undoTimer=setTimeout(async()=>{try{await api({action:'delete_notes',note_ids:[id]})}catch(e){console.error('delete remote',e)};forcePurgeDeleted()},4000);
}
function undoDelete(){
  if(!lastDeleted)return;clearTimeout(undoTimer);const {id,row}=lastDeleted;deleted.delete(id);saveSets();
  if(row){const a=notes();if(!a.some(n=>String(n.id)===id)){a.unshift(row);localStorage.setItem(NOTES_KEY,JSON.stringify(a))}}
  api({action:'restore_notes',note_ids:[id]}).catch(()=>{});lastDeleted=null;toast('Nota restaurada');decorateSoon();
}
function forcePurgeDeleted(){const a=notes().filter(n=>!deleted.has(String(n.id)));localStorage.setItem(NOTES_KEY,JSON.stringify(a));}

function openBlank(){try{return window.open('about:blank','_blank')}catch{return null}}
async function launch(mode,ids){
  const clean=[...new Set((ids||[]).map(String).filter(Boolean))];if(!clean.length){toast('No hay notas seleccionadas');return}
  const popup=openBlank();countText(mode==='planner'?'preparando…':'abriendo directo…');
  try{
    await syncNow();
    const d=await api({action:'dispatch',mode,note_ids:clean});
    archiveLocal(d.note_ids||clean,mode==='planner'?'PREPARED':'DIRECT_SUBMITTED');
    countText(mode==='planner'?`planner · ${d.note_count}`:`directo · ${d.note_count}`);
    toast(mode==='planner'?'Planner abierto':'Worker directo abierto');
    if(popup)popup.location.href=d.chatgpt_url;else location.href=d.chatgpt_url;
  }catch(e){popup?.close();countText('error · reintentar');toast(e?.data?.error==='NO_NEW_NOTES'?'Esas notas ya fueron enviadas':'No pude abrir el trabajo')}
}

function installGlobalPrepare(){
  const old=document.querySelector('.spring[data-action="prepare"]');if(!old||old.dataset.v9==='1')return;
  const s=old.cloneNode(true);s.dataset.v9='1';s.removeAttribute('data-b');old.replaceWith(s);
  bindRail(s,()=>launch('planner',activeIds()));
  const reveal=s.querySelector('.reveal');if(reveal)reveal.textContent='Planner';
}
function bindRail(s,onFire){const k=s.querySelector('.springKnob');if(!k)return;let down=false,start=0,x=0;const max=()=>Math.max(1,s.clientWidth-k.clientWidth-8),draw=()=>k.style.transform=`translateX(${x}px)`;k.onpointerdown=e=>{down=true;start=e.clientX-x;k.setPointerCapture(e.pointerId)};k.onpointermove=e=>{if(!down)return;x=Math.max(0,Math.min(max(),e.clientX-start));draw()};k.onpointerup=()=>{if(!down)return;down=false;const fire=x>max()*.8;if(fire){x=max();draw();setTimeout(onFire,60)}setTimeout(()=>{x=0;k.style.transition='transform .25s cubic-bezier(.2,.85,.25,1)';draw();setTimeout(()=>k.style.transition='',280)},fire?170:0)}}

function enterSelection(id){selected.add(String(id));decorateSoon();}
function toggleSelection(id){id=String(id);selected.has(id)?selected.delete(id):selected.add(id);decorateSoon();}
function exitSelection(){selected.clear();decorateSoon();}

function installGesture(note){
  if(note.dataset.v9Gesture==='1')return;note.dataset.v9Gesture='1';note.classList.add('v9note');note.style.touchAction='pan-y';
  let down=false,x0=0,y0=0,dx=0,dy=0,horizontal=false,longTimer=null,suppress=false;
  const id=()=>String(note.dataset.noteId||'');
  const reset=()=>{note.style.transition='transform .22s cubic-bezier(.2,.8,.2,1)';note.style.transform='translateX(0)';note.classList.remove('swipeLeft','swipeRight');setTimeout(()=>note.style.transition='',240)};
  note.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;down=true;x0=e.clientX;y0=e.clientY;dx=dy=0;horizontal=false;suppress=false;clearTimeout(longTimer);longTimer=setTimeout(()=>{if(down&&!horizontal&&Math.abs(dx)<8&&Math.abs(dy)<8){suppress=true;enterSelection(id());try{navigator.vibrate?.(18)}catch{}}},430)},true);
  note.addEventListener('pointermove',e=>{if(!down)return;dx=e.clientX-x0;dy=e.clientY-y0;if(!horizontal&&Math.abs(dx)>11&&Math.abs(dx)>Math.abs(dy)*1.25){horizontal=true;clearTimeout(longTimer);suppress=true;try{note.setPointerCapture(e.pointerId)}catch{}}if(!horizontal)return;e.preventDefault();const lim=Math.min(118,Math.max(-118,dx));note.style.transform=`translateX(${lim}px)`;note.classList.toggle('swipeLeft',lim<0);note.classList.toggle('swipeRight',lim>0)}, {capture:true,passive:false});
  note.addEventListener('pointerup',e=>{if(!down)return;down=false;clearTimeout(longTimer);if(horizontal){e.preventDefault();e.stopPropagation();if(dx<-72)deleteOne(id());else if(dx>88)launch('direct',[id()]);reset();setTimeout(()=>suppress=false,250)}},true);
  note.addEventListener('pointercancel',()=>{down=false;clearTimeout(longTimer);reset()},true);
  note.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();return}if(selected.size){e.preventDefault();e.stopImmediatePropagation();toggleSelection(id())}},true);
}

function decorateNotes(){
  installGlobalPrepare();
  const visible=activeIds();
  document.querySelectorAll('#feed .note').forEach(note=>{
    const id=String(note.dataset.noteId||'');
    if(deleted.has(id)||archived.has(id)){note.style.display='none';return}else note.style.display='';
    installGesture(note);note.classList.toggle('selected',selected.has(id));
    const m=note.querySelector('.meta');if(m)m.textContent=selected.size?(selected.has(id)?'seleccionada':'tocar para sumar'):'tocar · editar   ← borrar   directo →';
  });
  const empty=document.querySelector('#empty');if(empty)empty.classList.toggle('hidden',visible.length>0);
  const row=document.querySelector('#prepareRow');if(row)row.classList.toggle('hidden',visible.length===0||selected.size>0);
  if(!selected.size)countText(`${visible.length} ${visible.length===1?'nota nueva':'notas nuevas'}`);
  renderSelectionDock();
}
let decoTimer=null;function decorateSoon(){clearTimeout(decoTimer);decoTimer=setTimeout(decorateNotes,0)}
new MutationObserver(decorateSoon).observe(document.querySelector('#feed'),{childList:true,subtree:true});

function ensureSelectionDock(){let d=document.querySelector('#v9Selection');if(d)return d;d=document.createElement('div');d.id='v9Selection';d.innerHTML=`<button class="v9trash" data-a="delete">×</button><div class="v9SelText"><b>0</b><small>seleccionadas</small></div><div class="v9MiniSpring" data-a="planner"><span>Planner</span><i>→</i></div><div class="v9MiniSpring" data-a="direct"><span>Directo</span><i>→</i></div>`;document.body.append(d);d.querySelector('[data-a="delete"]').onclick=()=>{for(const id of [...selected])deleteOne(id);selected.clear();decorateSoon()};d.querySelector('[data-a="planner"]').onclick=()=>launch('planner',[...selected]);d.querySelector('[data-a="direct"]').onclick=()=>launch('direct',[...selected]);return d}
function renderSelectionDock(){const d=ensureSelectionDock();d.classList.toggle('show',selected.size>0);d.querySelector('b').textContent=String(selected.size);}

async function pollJobs(){if(jobsBusy||!labKey())return;jobsBusy=true;try{const d=await api({action:'jobs'});renderJobs(d.jobs||[])}catch{}finally{jobsBusy=false}}
function ensureJobsSection(){let s=document.querySelector('#v9Jobs');if(s)return s;s=document.createElement('section');s.id='v9Jobs';const top=document.querySelector('.top');top?.insertAdjacentElement('afterend',s);return s}
function renderJobs(all){const s=ensureJobsSection();const jobs=all.filter(j=>['PREPARED','LAUNCHED','WORKING','BLOCKED','FAILED'].includes(String(j.status))).slice(0,12);s.innerHTML='';s.classList.toggle('show',jobs.length>0);for(const j of jobs){const a=document.createElement('article');a.className='v9job';const launched=!['PREPARED','BLOCKED','FAILED'].includes(String(j.status));a.innerHTML=`<div><b></b><small></small></div>${launched?'<em>trabajando</em>':'<div class="spring v9JobSpring"><div class="reveal">Producir</div><div class="springKnob"><svg viewBox="0 0 24 24"><path d="M5 12h12M13 7l5 5-5 5"/></svg></div></div>'}`;a.querySelector('b').textContent=j.title||'Trabajo';a.querySelector('small').textContent=j.summary||j.target||`${(j.source_refs||[]).length} notas`;if(!launched){const rail=a.querySelector('.v9JobSpring');bindRail(rail,()=>launchJob(j.id,rail))}s.append(a)}}
async function launchJob(id,rail){const popup=openBlank();rail?.classList.add('busy');try{const d=await api({action:'dispatch_job',job_id:id});if(popup)popup.location.href=d.chatgpt_url;else location.href=d.chatgpt_url;toast('Worker abierto');setTimeout(pollJobs,700)}catch(e){popup?.close();rail?.classList.remove('busy');toast('No pude abrir el worker')}}

const style=document.createElement('style');style.textContent=`
.v9note{position:relative;transition:border-color .16s,background .16s}.v9note.swipeLeft{background:#34202b!important;border-color:#9d536855!important}.v9note.swipeRight{background:#1d3440!important;border-color:#5e9cb055!important}.v9note.selected{border-color:#86a8c466!important;background:#ffffff09!important;box-shadow:inset 0 0 0 1px #86a8c422}.v9note.selected:after{content:'✓';position:absolute;right:11px;top:10px;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:#82a4bf;color:#172131;font-size:11px;font-weight:800}.v9note.swipeLeft:before,.v9note.swipeRight:before{position:absolute;top:50%;transform:translateY(-50%);font-size:9px;letter-spacing:.12em;font-weight:700}.v9note.swipeLeft:before{content:'BORRAR';right:14px;color:#e0a3b1}.v9note.swipeRight:before{content:'DIRECTO';left:14px;color:#9bc7d3}
#v9Toast{position:fixed;z-index:80;left:50%;bottom:calc(104px + env(safe-area-inset-bottom));transform:translate(-50%,12px);display:flex;gap:14px;align-items:center;background:#0e1723ee;border:1px solid #ffffff12;border-radius:14px;padding:9px 11px;color:#aebccc;font-size:11px;opacity:0;pointer-events:none;transition:.2s}#v9Toast.show{opacity:1;transform:translate(-50%,0);pointer-events:auto}#v9Toast button{border:0;background:none;color:#d3e0ec;font-weight:650;font-size:11px}
#v9Selection{position:fixed;z-index:18;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translate(-50%,18px);width:min(652px,calc(100% - 28px));height:68px;border:1px solid #ffffff10;border-radius:20px;background:#172131f2;backdrop-filter:blur(15px);display:grid;grid-template-columns:46px 1fr 102px 102px;gap:8px;align-items:center;padding:8px;opacity:0;pointer-events:none;transition:.2s;box-shadow:0 16px 40px #0007}#v9Selection.show{opacity:1;transform:translate(-50%,0);pointer-events:auto}.v9trash{width:42px;height:42px;border:0;border-radius:50%;background:#2c2029;color:#c88999;font-size:22px}.v9SelText b{display:block;font-size:14px}.v9SelText small{display:block;color:#6f8198;font-size:9px}.v9MiniSpring{height:44px;border-radius:22px;background:#101823;box-shadow:inset 5px 5px 9px #0008,inset -2px -2px 5px #ffffff07;display:flex;align-items:center;justify-content:space-between;padding:0 6px 0 11px;font-size:9px;color:#74869c}.v9MiniSpring i{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-style:normal;background:linear-gradient(145deg,#304660,#1d2d43);box-shadow:4px 5px 9px #0008;color:#9aabc0}
#v9Jobs{display:none;margin:0 0 18px;gap:8px;flex-direction:column}#v9Jobs.show{display:flex}.v9job{border:1px solid #ffffff10;border-radius:17px;background:#ffffff05;padding:11px 12px;display:grid;grid-template-columns:1fr 132px;gap:11px;align-items:center}.v9job b{display:block;font-size:13px;font-weight:600}.v9job small{display:block;margin-top:4px;color:#71839a;font-size:10px;line-height:1.35}.v9job em{font-style:normal;color:#88a99a;font-size:10px;text-align:right}.v9job .spring{height:42px}.v9job .springKnob{width:34px;height:34px}.v9job .reveal{font-size:8px}.v9job .busy{opacity:.55}
@media(max-width:520px){#v9Selection{grid-template-columns:44px 1fr 86px 86px}.v9MiniSpring{padding-left:8px}.v9job{grid-template-columns:1fr 112px}}
`;document.head.append(style);

decorateSoon();pollJobs();setInterval(pollJobs,2600);
