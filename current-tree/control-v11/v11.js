import {listNotes,putNote,getNote} from '../../shared/prometeo-shell/v1/db.js';
import {VoiceQueue} from '../../shared/prometeo-shell/v1/voice.js';
import {PrometeoRemote} from '../../shared/prometeo-shell/v2/sync.js';
import {mountPageChangeLoop,createChangeLoopClient} from '../../shared/capture/v1/change-loop.js';

const $=q=>document.querySelector(q);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const remote=new PrometeoRemote();
const changeClient=createChangeLoopClient();
let bundle=window.PROMETEO_V11_LAST||null;
let pages=[],pageMap=new Map(),selectedPage=null,loop=null,unread=0,syncTimer=null;
const toastEl=document.createElement('div');toastEl.className='v11-toast';document.body.appendChild(toastEl);
function toast(s){toastEl.textContent=s;toastEl.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>toastEl.classList.remove('on'),1500)}
function abs(href){try{return new URL(href,'https://juanmanuelpm.github.io/prometeo/catalog/CATALOG_MANIFEST.json').href}catch{return href||''}}
function pathKey(p){return String(p||'').replace(/^https?:\/\/juanmanuelpm\.github\.io\/prometeo\//,'').replace(/^\.\.\//,'').replace(/^\.\//,'').replace(/index\.html$/,'').replace(/\/$/,'')}
function catalogPages(){
 const rows=(bundle?.catalogManifest?.pages||[]).map(p=>({
  id:p.page_id,title:p.title||p.page_id,href:abs(p.href),public_url:abs(p.href),
  category_path:Array.isArray(p.category_path)?p.category_path:[],
  live_status:p.live_status||'',artifact_state:p.artifact_state||'',authority:p.authority||'',
  source_identity:p.source_identity||'',writable_target:p.writable_target||null,
  last_verified:p.last_verified||null,human_accepted_scope:p.human_accepted_scope||null,
  source_entrypoint:p.writable_target?.path||null,source_repo:p.writable_target?.repository||'JuanManuelPM/prometeo',
  kind:'PAGE'
 }));
 return rows;
}
async function visualPages(){
 try{
  await import('../../visuals/registry-v1.js');
  const reg=window.PROMETEO_VISUALS_REGISTRY_V1,base='https://juanmanuelpm.github.io/prometeo/visuals/';
  const out=[];
  for(const folder of reg?.folders||[])for(const item of folder.items||[]){
   if(!item?.front||!item?.src)continue;
   const href=new URL(item.src,base).href;
   out.push({
    id:'visual-'+item.front,title:item.label||item.front,href,public_url:href,
    category_path:['prometeo','visuales',folder.label||folder.id],live_status:'live',artifact_state:'VISUAL_FRONT',
    source_identity:'visual-front:'+item.front,writable_target:null,source_repo:'JuanManuelPM/prometeo',
    source_entrypoint:null,kind:'VISUAL_FRONT',front:item.front,
    handoff:item.handoff?new URL(item.handoff,base).href:null
   });
  }
  return out;
 }catch{return[]}
}
function mergePages(a,b){
 const by=new Map(a.map(x=>[pathKey(x.href)||x.id,x]));
 for(const p of b){const k=pathKey(p.href)||p.id;if(!by.has(k))by.set(k,p);else{const old=by.get(k);by.set(k,{...old,front:p.front||old.front,handoff:p.handoff||old.handoff})}}
 return [...by.values()].sort((x,y)=>groupName(x).localeCompare(groupName(y),'es')||x.title.localeCompare(y.title,'es'));
}
function groupName(p){
 const a=(p.category_path||[]).filter(x=>String(x).toLowerCase()!=='prometeo');
 return a.length?a.slice(0,2).join(' / '):(p.kind==='VISUAL_FRONT'?'Visuales':'Sin carpeta');
}
function organismFor(p){
 const key=pathKey(p.href),nodes=bundle?.org?.nodes||[];
 return nodes.find(n=>{
  const hay=[n.public_route,n.source_ref,n.payload?.public_url].filter(Boolean).map(pathKey);
  return hay.some(x=>x&&key&& (x===key||x.includes(key)||key.includes(x)));
 })||null;
}
function contextsFor(node){
 if(!node)return[];
 return (bundle?.ctx?.contexts||[]).filter(x=>x.organism_parent_key===node.node_key).sort((a,b)=>new Date(b.last_activity_at)-new Date(a.last_activity_at));
}
function pageObj(p){
 const node=organismFor(p),ctx=contextsFor(node)[0]||null;
 return {
  ...p,
  page_id:p.id,
  execution_delivery_mode:'WORKER_POOL',
  served_identity:p.source_identity||null,
  baseline:{served_identity:p.source_identity||null,artifact_state:p.artifact_state||null,node_key:node?.node_key||null,context_key:ctx?.context_key||null},
  surface_id:p.id,
  project_id:node?.owner_key||null,
  authority_status:p.authority||null,
  target_path:p.writable_target?.path||null,
  target_source_blob:null
 };
}
function noteMeta(p){
 return {
  sourcePath:p.public_url||p.href||location.pathname,sourceHref:p.public_url||p.href||location.href,
  sourceTitle:p.title||p.id,viewport:`${innerWidth}x${innerHeight}`,pageId:p.id,transcriptRevision:1,
  metadata:{source_kind:'HUMAN_AUDIO',control_surface:'CONTROL_ROOM_V11'}
 };
}
const voice=new VoiceQueue({
 workerURL:location.hostname==='juanmanuelpm.github.io'?'/prometeo/shared/prometeo-shell/v1/prometeo-voice-worker-v2.js?v=2':'../../shared/prometeo-shell/v1/prometeo-voice-worker-v2.js?v=2',
 onChange:()=>scheduleSync(),
 onRecording:()=>{}
});
async function syncPageNotes(p){
 if(!p)return;
 await remote.init().catch(()=>null);
 const notes=await listNotes();
 for(const n of notes)if((n.pageId||'')===p.id){
  try{await remote.syncCapture(n,p)}catch{}
 }
}
function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>selectedPage&&syncPageNotes(pageObj(selectedPage)).catch(()=>{}),250)}
async function createTextCapture(text,target){
 const p=target?.id?target:pageObj(selectedPage||{id:'control-room-v11',title:'Control Room V11',href:location.href});
 const now=Date.now(),note={
  id:crypto.randomUUID?.()||`txt-${now}-${Math.random().toString(36).slice(2)}`,created:now,status:'done',
  text:String(text||'').trim(),audio:null,error:'',sourcePath:p.public_url||p.href||location.pathname,
  sourceHref:p.public_url||p.href||location.href,sourceTitle:p.title||p.id,viewport:`${innerWidth}x${innerHeight}`,
  pageId:p.id,transcriptRevision:1,metadata:{source_kind:'HUMAN_TEXT',control_surface:'CONTROL_ROOM_V11'}
 };
 if(!note.text)return null;
 await putNote(note);await remote.syncCapture(note,p).catch(()=>{});return note;
}
async function retryLocal(id){const n=await getNote(id);if(!n?.audio)return null;n.status='queued';n.error='';await putNote(n);voice.processQueue();return n}
async function ensureLoop(){
 if(loop)return loop;
 await remote.init().catch(()=>null);
 loop=mountPageChangeLoop({client:changeClient,adapter:{
  getPage:()=>selectedPage?pageObj(selectedPage):null,
  syncNow:async()=>{if(selectedPage)await syncPageNotes(pageObj(selectedPage))},
  createTextCapture,
  listLocalNotes:()=>listNotes(),
  getLocalNote:id=>getNote(id),
  retryLocalTranscription:retryLocal,
  recordingState:()=>voice.state(),
  startRecording:async()=>{await voice.start();return voice.state()},
  pauseResumeRecording:()=>{voice.pauseResume();return voice.state()},
  saveRecording:async()=>voice.save(noteMeta(pageObj(selectedPage))),
  discardRecording:()=>{voice.discard();return voice.state()},
  workDeliveryMode:()=> 'WORKER_POOL',
  onPrepared:(d,{kind})=>{if(kind==='work'&&d?.queued_to_worker_pool){toast('Trabajo en cola para workers');renderWork().catch(()=>{})}},
  previewUrl:url=>window.open(url,'_blank','noopener'),
  hostUrl:(pageId)=>pageMap.get(pageId)?.href||location.href,
  navigatePage:async pageId=>{selectedPage=pageMap.get(pageId)||selectedPage},
  openLegacyNotes:()=>toast('Vinculando workspace…'),
  onUnread:n=>{unread=Number(n||0);renderWorkBadge()}
 }});
 return loop;
}
function manualPrompt(p){
 if(p.handoff)return `↻ Reencarná el frente ${p.front||p.title} de JuanManuelPM/prometeo. Leé COMPLETO ${p.handoff} y seguí su INCARNATION CONTRACT. Verificá repo real. No edites hasta ACTUALIZÁ.`;
 const wt=p.writable_target?JSON.stringify(p.writable_target):'null';
 return `↻ PROMETEO · REENCARNACIÓN MANUAL\nPAGE_ID: ${p.id}\nTITLE: ${p.title}\nPUBLIC: ${p.href}\nSOURCE_IDENTITY: ${p.source_identity||'—'}\nWRITABLE_TARGET: ${wt}\n\nLeé COMPLETO https://juanmanuelpm.github.io/prometeo/current-tree/workspace/invoke.txt y seguí su contrato. Verificá CURRENT/source owners/repo real. Recuperá continuidad durable disponible y no edites hasta ACTUALIZÁ.`;
}
async function copy(t){try{await navigator.clipboard.writeText(t);return true}catch{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.append(a);a.select();let ok=false;try{ok=document.execCommand('copy')}catch{}a.remove();return ok}}
function renderFreshness(){
 const b=$('#freshbarV11');if(!b)return;const f=bundle?.freshness||{};b.className='freshbar '+(f.mode==='live'?'live':f.mode==='partial'||f.mode==='stale'?'warn':'');
 const n=(f.failures||[]).length;b.innerHTML=`<span class="freshdot"></span><span>${f.mode==='live'?'actualizado':f.mode==='stale'?'última copia · actualizando':f.mode==='partial'?'actualización parcial':'respaldo de catálogo'}${n?' · '+n+' fuente'+(n===1?'':'s')+' con error':''}</span>`;
}
function card(p){
 const node=organismFor(p),ctx=contextsFor(node)[0],desc=ctx?.summary||p.human_accepted_scope||p.source_identity||p.writable_target?.path||'';
 return `<article class="workspace-card" data-page="${esc(p.id)}"><div class="workspace-top"><div><div class="workspace-title">${esc(p.title)}</div><div class="workspace-kind">${esc(p.kind)} · ${esc(groupName(p))}</div></div><div class="workspace-state">${esc(p.artifact_state||p.live_status||'')}</div></div><div class="workspace-desc">${esc(String(desc||'').slice(0,230))}</div><div class="workspace-meta"><span>${node?'⌁ '+esc(node.node_key):'catalog'}</span>${ctx?'<span>contexto durable</span>':''}${p.last_verified?'<span>verificado '+esc(p.last_verified)+'</span>':''}</div><div class="workspace-actions"><button class="notes" data-notes="${esc(p.id)}">Notas · HACER</button><a href="${esc(p.href)}" target="_blank" rel="noopener">abrir ↗</a><button class="manual" data-manual="${esc(p.id)}">↻ manual</button></div></article>`;
}
function renderSpaces(){
 const root=$('#workspacesV11');if(!root)return;
 const q=String($('#workspaceSearchV11')?.value||'').trim().toLowerCase();
 const rows=pages.filter(p=>!q||[p.title,p.id,groupName(p),p.source_identity,p.writable_target?.path].filter(Boolean).join(' ').toLowerCase().includes(q));
 const groups=new Map();for(const p of rows){const g=groupName(p);if(!groups.has(g))groups.set(g,[]);groups.get(g).push(p)}
 root.innerHTML=[...groups.entries()].map(([g,items])=>`<section><div class="workspace-group-head"><div class="workspace-group-title">${esc(g)}</div><div class="workspace-count">${items.length}</div></div><div class="workspace-grid">${items.map(card).join('')}</div></section>`).join('')||'<div class="rdesc">No encontré páginas con ese filtro.</div>';
 root.querySelectorAll('[data-notes]').forEach(b=>b.onclick=async e=>{e.stopPropagation();selectedPage=pageMap.get(b.dataset.notes);const l=await ensureLoop();await l?.open(pageObj(selectedPage))});
 root.querySelectorAll('[data-manual]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const p=pageMap.get(b.dataset.manual);toast(await copy(manualPrompt(p))?'Prompt manual copiado':'No pude copiar')});
}
function renderWorkBadge(){const tab=document.querySelector('.tab[data-view="trabajo"]');if(tab)tab.textContent=unread?'Trabajo · '+unread:'Trabajo'}
async function publicEvidence(url){
 if(!url)return null;
 try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)return null;return await r.json()}catch{return null}
}
async function renderWorkFailure(root,error){
 const cfg=window.PROMETEO_CONTROL_CONFIG_V1||{};
 const [canary,diagnosis]=await Promise.all([
  publicEvidence(cfg.pageChangeCanaryUrl),
  publicEvidence(cfg.pageChangeDiagnosisUrl)
 ]);
 const externallyBlocked=canary?.status==='BLOCKED_EXTERNAL_CONTROL_PLANE'||diagnosis?.status==='BLOCKED_EXTERNAL_STORAGE';
 if(externallyBlocked){
  const diskFull=diagnosis?.root_cause?.code==='DISK_FULL_PG_WAL';
  const observed=diagnosis?.observed_at||canary?.generated_at||null;
  const when=observed?new Date(observed).toLocaleString('es-AR'):'sin timestamp';
  root.innerHTML='<div class="worker-note"><b>Page Change bloqueado por infraestructura.</b> '+(diskFull?'PostgreSQL no puede completar recovery porque el disco no tiene espacio para WAL. ':'El control plane no está aceptando trabajo nuevo. ')+'V11 conserva navegación y feedback local, pero no inventa workers ni ejecución mientras esta frontera siga caída.</div><div class="rdesc">evidencia durable · '+esc(when)+' · V11 sigue CANDIDATE · V10 sigue baseline CURRENT</div>';
  return;
 }
 root.innerHTML='<div class="rdesc">No pude cargar Page Change: '+esc(error?.message||error)+'</div>';
}
async function renderWork(){
 const root=$('#workV11');if(!root)return;
 if(!changeClient.hasWorkspace()){root.innerHTML='<div class="worker-note"><b>Workspace local no vinculado.</b> Abrí Notas en cualquier página; Control Room intentará reutilizar/vincular el workspace existente del dispositivo.</div>';return}
 try{
  await changeClient.executionStatus({});
  const d=await changeClient.overview(),threads=d.threads||[];
  unread=threads.reduce((n,t)=>n+Number(t.unread_count||0),0);renderWorkBadge();
  root.innerHTML='<div class="worker-note"><b>Este tablero no crea otra cola.</b> “HACER” congela tus notas en un Execution Packet y lo proyecta al allocator CURRENT. Los workers reclaman por la autoridad normal y el resultado vuelve al mismo thread.</div><div class="work-overview">'+(threads.length?threads.map(t=>`<article class="work-thread ${t.unread?'unread':''}" data-thread-page="${esc(t.page_id)}"><div class="work-thread-top"><div class="work-thread-title">${esc(t.page_title||t.page_id)}</div><div class="work-thread-count">${t.pending?esc(t.pending)+' pendientes':t.unread?'resultado nuevo':'al día'}</div></div><div class="work-thread-meta">${t.last_worked_at?'último trabajo '+new Date(t.last_worked_at).toLocaleString('es-AR'):'sin trabajo previo'}</div>${t.latest_result?'<div class="work-thread-result">'+esc(t.latest_result.status)+' · '+esc(typeof t.latest_result.summary==='string'?t.latest_result.summary:'resultado disponible')+'</div>':''}</article>`).join(''):'<div class="rdesc">Todavía no hay threads de página.</div>')+'</div>';
  root.querySelectorAll('[data-thread-page]').forEach(el=>el.onclick=async()=>{selectedPage=pageMap.get(el.dataset.threadPage)||{id:el.dataset.threadPage,title:el.querySelector('.work-thread-title')?.textContent||el.dataset.threadPage,href:location.href,category_path:['Prometeo']};const l=await ensureLoop();await l?.open(pageObj(selectedPage))});
 }catch(e){await renderWorkFailure(root,e)}
}
async function hydrate(){
 bundle=window.PROMETEO_V11_LAST||bundle;
 pages=mergePages(catalogPages(),await visualPages());pageMap=new Map(pages.map(p=>[p.id,p]));
 renderFreshness();renderSpaces();renderWork().catch(()=>{});
 const search=$('#workspaceSearchV11');if(search&&!search.dataset.bound){search.dataset.bound='1';search.addEventListener('input',renderSpaces)}
 await remote.init().catch(()=>null);voice.init().catch(()=>{});
}
window.addEventListener('PROMETEO_V11_DATA',e=>{bundle=e.detail?.bundle||bundle;window.PROMETEO_V11_LAST=bundle;hydrate().catch(()=>{})});
window.PROMETEO_V11_RENDER_SPACES=renderSpaces;
window.PROMETEO_V11_RENDER_WORK=()=>renderWork();
window.PROMETEO_V11_OPEN_PAGE_NOTES=async p=>{selectedPage=p;const l=await ensureLoop();return l?.open(pageObj(p))};
setTimeout(()=>hydrate().catch(()=>{}),0);
setInterval(()=>{if(document.querySelector('.view#trabajo.on'))renderWork().catch(()=>{})},12000);
