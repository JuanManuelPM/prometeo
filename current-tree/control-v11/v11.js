import {listNotes,putNote,getNote} from '../../shared/prometeo-shell/v1/db.js';
import {VoiceQueue} from '../../shared/prometeo-shell/v1/voice.js';
import {PrometeoRemote} from '../../shared/prometeo-shell/v2/sync.js';
import {mountPageChangeLoop,createChangeLoopClient} from '../../shared/capture/v1/change-loop.js';
import {normalizeVisibleResultProjection,projectVisibleResultFromG05} from './result-adapter-v1.js';

const $=q=>document.querySelector(q);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const remote=new PrometeoRemote();
const changeClient=createChangeLoopClient();
let bundle=window.PROMETEO_V11_LAST||null;
let pages=[],pageMap=new Map(),selectedPage=null,loop=null,unread=0,syncTimer=null,previewManifest=null,previewMap=new Map(),resultProjection=null,chatSessionIndex=null,chatJournalCache=new Map(),capabilityGraph=null,openCapabilityHubId=null,commandBusy=false,restoringRoute=false,restoredRoute=false,activePanel=null;
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
 const nodes=bundle?.org?.nodes||[];
 if(p?.node_key){const exact=nodes.find(n=>n.node_key===p.node_key);if(exact)return exact}
 const key=pathKey(p?.href||p?.public_url),direct=p?.id?nodes.find(n=>n.payload?.page_id===p.id||n.payload?.surface_id===p.id):null;
 if(direct)return direct;
 return nodes.find(n=>{
  const hay=[n.public_route,n.source_ref,n.payload?.public_url].filter(Boolean).map(pathKey);
  return hay.some(x=>x&&key&&(x===key||x.includes(key)||key.includes(x)));
 })||null;
}
function contextsFor(node){
 if(!node)return[];
 return (bundle?.ctx?.contexts||[]).filter(x=>x.organism_parent_key===node.node_key).sort((a,b)=>new Date(b.last_activity_at)-new Date(a.last_activity_at));
}
function staticPreviewUrl(item){
 const p=String(item?.preview_path||'').replace(/^\/+/,'');
 if(!p)return'';
 try{return new URL('../../'+p,import.meta.url).href}catch{return''}
}
function installPreviewManifest(manifest){
 previewManifest=manifest?.schema==='prometeo.static-preview-manifest/v1'?manifest:null;
 previewMap=new Map();
 for(const item of previewManifest?.surfaces||[]){
  if(item?.id)previewMap.set('id:'+String(item.id),item);
  const k=pathKey(item?.url||'');if(k)previewMap.set('url:'+k,item);
 }
}
async function loadPreviewManifest(){
 const cfg=window.PROMETEO_CONTROL_CONFIG_V1||{};
 const url=cfg.previewManifestUrl||'./previews/manifest.json';
 const manifest=await publicEvidence(url);
 installPreviewManifest(manifest);
 return previewManifest;
}
function previewFor(p){
 return previewMap.get('id:'+String(p?.id||''))||previewMap.get('url:'+pathKey(p?.href||p?.public_url||''))||null;
}
function previewMarkup(p){
 const pv=previewFor(p);if(!pv)return'';
 const state=String(pv.state||'UNAVAILABLE').toUpperCase(),src=state==='AVAILABLE'?staticPreviewUrl(pv):'';
 const stamp=pv.observed_at||pv.checked_at||null;
 if(!src)return `<div class="preview-empty-v11" data-preview-state="${esc(state)}">Preview ${esc(state.toLowerCase())}${stamp?' · '+esc(stamp):''}</div>`;
 return `<div class="workspace-preview-v11" data-preview-state="${esc(state)}"><img src="${esc(src)}" alt="Preview estática de ${esc(p.title||p.id)}" loading="lazy" decoding="async" style="display:block;width:100%;height:118px;object-fit:cover;border:1px solid #282e35;border-radius:9px;background:#0c0e11"><div class="workspace-meta"><span>preview estática</span>${stamp?'<span>'+esc(stamp)+'</span>':''}</div></div>`;
}
function renderPreviewGrid(){
 const root=$('#previewGridV11');if(!root)return;
 const rows=previewManifest?.surfaces||[];
 if(!rows.length){root.innerHTML='<div class="preview-empty-v11">Manifest de previews no disponible. No se inventa una miniatura viva.</div>';return}
 root.innerHTML=rows.map(item=>{
  const state=String(item.state||'UNAVAILABLE').toUpperCase(),src=state==='AVAILABLE'?staticPreviewUrl(item):'';
  if(!src)return `<article class="preview-empty-v11" data-preview-state="${esc(state)}"><b>${esc(item.title||item.id)}</b> · ${esc(state.toLowerCase())}</article>`;
  return `<article data-preview-state="${esc(state)}"><img src="${esc(src)}" alt="Preview estática de ${esc(item.title||item.id)}" loading="lazy" decoding="async" style="display:block;width:100%;height:150px;object-fit:cover;border:1px solid #282e35;border-radius:9px;background:#0c0e11"><div class="workspace-meta"><span>${esc(item.title||item.id)}</span><span>${esc(state.toLowerCase())}</span></div></article>`;
 }).join('');
}
function pageObj(p){
 const node=organismFor(p),ctx=contextsFor(node)[0]||null;
 return {
  ...p,
  page_id:p.id,
  node_key:node?.node_key||p.node_key||null,
  context_key:ctx?.context_key||p.context_key||null,
  execution_delivery_mode:'WORKER_POOL',
  served_identity:p.source_identity||null,
  baseline:{served_identity:p.source_identity||null,artifact_state:p.artifact_state||null,node_key:node?.node_key||p.node_key||null,context_key:ctx?.context_key||p.context_key||null},
  surface_id:p.surface_id||p.id,
  project_id:p.project_id||node?.owner_key||null,
  authority_status:p.authority||p.authority_status||null,
  target_path:p.writable_target?.path||p.target_path||null,
  target_source_blob:p.target_source_blob||p.writable_target?.git_blob_sha||null,
  semantic_context:{
   object_kind:p.kind||'PAGE',
   node_key:node?.node_key||p.node_key||null,
   context_key:ctx?.context_key||p.context_key||null,
   surface_id:p.surface_id||p.id,
   project_id:p.project_id||node?.owner_key||null,
   authority_status:p.authority||p.authority_status||null,
   target_path:p.writable_target?.path||p.target_path||null
  }
 };
}
function noteMeta(p){
 const q=pageObj(p);
 return {
  sourcePath:q.public_url||q.href||location.pathname,sourceHref:q.public_url||q.href||location.href,
  sourceTitle:q.title||q.id,viewport:`${innerWidth}x${innerHeight}`,pageId:q.id,transcriptRevision:1,
  metadata:{source_kind:'HUMAN_AUDIO',control_surface:'CONTROL_ROOM_V11',node_key:q.node_key||null,context_key:q.context_key||null,object_kind:q.kind||'PAGE'}
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

const VALID_VIEWS=new Set(['ahora','proyectos','chats','espacios','trabajo','herramientas','historial','estadisticas','organismo']);
function routeState(url=location.href){
 const u=new URL(url,location.href);
 return {view:u.searchParams.get('view')||null,page:u.searchParams.get('page')||null,node:u.searchParams.get('node')||null,panel:u.searchParams.get('panel')||null,work:u.searchParams.get('work')||null};
}
function writeRoute(patch={},replace=false){
 if(restoringRoute)return;
 const u=new URL(location.href),before=u.search;
 for(const [k,v] of Object.entries(patch)){if(v===null||v===undefined||v==='')u.searchParams.delete(k);else u.searchParams.set(k,String(v))}
 if(u.search===before)return;
 history[replace?'replaceState':'pushState']({prometeo:true},'',u.pathname+u.search+u.hash);
}
function stableControlUrl({view=null,page=null,node=null,panel=null,work=null}={}){
 const u=new URL('../control/',import.meta.url);
 for(const [k,v] of Object.entries({view,page,node,panel,work}))if(v)u.searchParams.set(k,String(v));
 return u.href;
}
function sourceHref(ref){
 const x=String(ref||'');
 if(/^https:\/\//.test(x))return x;
 if(x.startsWith('GitHub:/'))return 'https://github.com/JuanManuelPM/prometeo/blob/main/'+x.slice(8).split('/').map(encodeURIComponent).join('/');
 return '';
}
function objectForNode(info={}){
 const key=String(info.nodeKey||info.node_key||'').trim(),node=(bundle?.org?.nodes||[]).find(n=>n.node_key===key)||null;
 if(!key)return null;
 const existing=pages.find(p=>organismFor(p)?.node_key===key);
 if(existing)return {...existing,node_key:key,kind:existing.kind||node?.kind||info.kind||'PAGE'};
 const route=node?.public_route||node?.payload?.public_url||'';
 const href=route?(route.startsWith('http')?route:new URL(route,'https://juanmanuelpm.github.io/prometeo/').href):location.href;
 return {
  id:'node:'+key,title:node?.title||info.title||key,href,public_url:href,
  category_path:['Prometeo','Organismo'],live_status:node?.status||'',artifact_state:node?.status||'',
  authority:node?.status||'',source_identity:'organism-node:'+key,writable_target:null,
  source_repo:'JuanManuelPM/prometeo',source_entrypoint:null,kind:node?.kind||info.kind||'NODE',
  node_key:key,project_id:node?.owner_key||info.ownerKey||null
 };
}
function contextHistoryFor(p){
 const node=organismFor(p),items=[];
 if(node?.source_ref)items.push({kind:'fuente',title:node.title||node.node_key,detail:'owner · '+(node.owner_key||'—')+' · '+(node.status||'—'),created_at:node.updated_at||null,href:sourceHref(node.source_ref)});
 for(const c of contextsFor(node).slice(0,5)){
  items.push({kind:'work context',title:c.title||c.context_key,detail:[c.summary,c.next_action?'Siguiente: '+c.next_action:''].filter(Boolean).join('\n'),created_at:c.last_activity_at||c.updated_at||null,href:sourceHref(c.source_ref)});
 }
 const exact=(bundle?.act?.events||[]).filter(e=>node&&e.node_key===node.node_key).sort((a,b)=>new Date(b.occurred_at)-new Date(a.occurred_at)).slice(0,8);
 for(const e of exact)items.push({kind:e.kind||e.event_type||'actividad',title:e.title||e.event_type||'Evento',detail:[e.event_type,e.scope].filter(Boolean).join(' · '),created_at:e.occurred_at||null,href:sourceHref(e.source_ref)});
 return items.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
}
function exactBackForPage(pageId,work=null){
 const p=pageMap.get(pageId)||selectedPage,node=p?organismFor(p):null;
 return stableControlUrl({view:'espacios',page:pageId,node:node?.node_key||null,panel:work?'result':'notes',work});
}
async function openNotesForPage(p,{view='espacios',push=true,work=null}={}){
 if(!p)return false;selectedPage=p;activePanel=work?'result':'notes';
 const node=organismFor(p);
 if(push)writeRoute({view,page:p.id,node:node?.node_key||null,panel:activePanel,work:work||null});
 const l=await ensureLoop();
 if(work)return l?.openResult(pageObj(p),work);
 return l?.open(pageObj(p));
}
async function openNodeNotes(info,{push=true}={}){
 const p=objectForNode(info);if(!p)return false;selectedPage=p;activePanel='notes';
 if(push)writeRoute({view:info.view||'organismo',page:null,node:p.node_key||info.nodeKey,panel:'notes',work:null});
 const l=await ensureLoop();return l?.open(pageObj(p));
}
async function restoreRoute(force=false){
 if(restoringRoute||(!force&&restoredRoute))return;
 restoringRoute=true;
 try{
  const st=routeState();
  if(!st.panel&&loop){loop.close();activePanel=null}
  if(st.view&&VALID_VIEWS.has(st.view)&&typeof window.setView==='function')window.setView(st.view);
  if(st.node&&!st.page&&typeof window.openEntity==='function')window.openEntity(st.node);
  if(st.page){
   const p=pageMap.get(st.page);
   if(p){selectedPage=p;if(st.panel==='notes'||st.panel==='result'){const l=await ensureLoop();if(st.panel==='result'&&st.work)await l?.openResult(pageObj(p),st.work);else await l?.open(pageObj(p));activePanel=st.panel}}
  }else if(st.node&&st.panel==='notes'){
   const p=objectForNode({nodeKey:st.node,view:st.view||'organismo'});
   if(p){selectedPage=p;const l=await ensureLoop();await l?.open(pageObj(p));activePanel='notes'}
  }
 }finally{restoringRoute=false;restoredRoute=true}
}

async function createTextCapture(text,target){
 const p=target?.id?target:pageObj(selectedPage||{id:'control-room-v11',title:'Control Room V11',href:location.href});
 const now=Date.now(),note={
  id:crypto.randomUUID?.()||`txt-${now}-${Math.random().toString(36).slice(2)}`,created:now,status:'done',
  text:String(text||'').trim(),audio:null,error:'',sourcePath:p.public_url||p.href||location.pathname,
  sourceHref:p.public_url||p.href||location.href,sourceTitle:p.title||p.id,viewport:`${innerWidth}x${innerHeight}`,
  pageId:p.id,transcriptRevision:1,metadata:{source_kind:'HUMAN_TEXT',control_surface:'CONTROL_ROOM_V11',node_key:p.node_key||p.semantic_context?.node_key||null,context_key:p.context_key||p.semantic_context?.context_key||null,object_kind:p.kind||p.semantic_context?.object_kind||'PAGE'}
 };
 if(!note.text)return null;
 await putNote(note);remote.syncCapture(note,p).catch(()=>{});return note;
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
  hostUrl:(pageId,work)=>exactBackForPage(pageId,work),
  navigatePage:async pageId=>{selectedPage=pageMap.get(pageId)||selectedPage;const node=selectedPage?organismFor(selectedPage):null;writeRoute({view:'espacios',page:pageId,node:node?.node_key||null,panel:'notes',work:null})},
  historyForPage:p=>contextHistoryFor(p),
  onOpen:p=>{activePanel='notes'},
  onClose:()=>{activePanel=null;writeRoute({panel:null,work:null},true)},
  openLegacyNotes:()=>toast('Captura local disponible'),
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
 return `<article class="workspace-card" data-page="${esc(p.id)}">${previewMarkup(p)}<div class="workspace-top"><div><div class="workspace-title">${esc(p.title)}</div><div class="workspace-kind">${esc(p.kind)} · ${esc(groupName(p))}</div></div><div class="workspace-state">${esc(p.artifact_state||p.live_status||'')}</div></div><div class="workspace-desc">${esc(String(desc||'').slice(0,230))}</div><div class="workspace-meta"><span>${node?'⌁ '+esc(node.node_key):'catalog'}</span>${ctx?'<span>contexto durable</span>':''}${p.last_verified?'<span>verificado '+esc(p.last_verified)+'</span>':''}</div><div class="workspace-actions"><button class="notes" data-notes="${esc(p.id)}">Notas · HACER</button><a href="${esc(p.href)}" target="_blank" rel="noopener">abrir ↗</a><button class="manual" data-manual="${esc(p.id)}">↻ manual</button></div></article>`;
}
function renderSpaces(){
 const root=$('#workspacesV11');if(!root)return;
 const q=String($('#workspaceSearchV11')?.value||'').trim().toLowerCase();
 const rows=pages.filter(p=>!q||[p.title,p.id,groupName(p),p.source_identity,p.writable_target?.path].filter(Boolean).join(' ').toLowerCase().includes(q));
 const groups=new Map();for(const p of rows){const g=groupName(p);if(!groups.has(g))groups.set(g,[]);groups.get(g).push(p)}
 root.innerHTML=[...groups.entries()].map(([g,items])=>`<section><div class="workspace-group-head"><div class="workspace-group-title">${esc(g)}</div><div class="workspace-count">${items.length}</div></div><div class="workspace-grid">${items.map(card).join('')}</div></section>`).join('')||'<div class="rdesc">No encontré páginas con ese filtro.</div>';
 root.querySelectorAll('[data-notes]').forEach(b=>b.onclick=async e=>{e.stopPropagation();await openNotesForPage(pageMap.get(b.dataset.notes),{view:'espacios',push:true})});
 root.querySelectorAll('[data-manual]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const p=pageMap.get(b.dataset.manual);toast(await copy(manualPrompt(p))?'Prompt manual copiado':'No pude copiar')});
}
function setCommandState(state,message){
 const el=$('#commandStateV11');if(!el)return;el.dataset.state=state;el.textContent=message;
}
function commandPage(){
 return selectedPage?pageObj(selectedPage):pageObj({id:'control-room-v11',title:'Control Room V11',href:location.href,public_url:location.href,category_path:['Prometeo'],kind:'CONTROL_ROOM'});
}
async function submitCommandV11(){
 const input=$('#commandInputV11'),button=$('#commandSendV11');if(!input||!button||commandBusy)return;
 const text=String(input.value||'').trim();
 if(!text){setCommandState('idle','Sin enviar · escribí una instrucción concreta.');return}
 const ingress=window.PROMETEO_INGRESS_V1;
 if(!ingress||typeof ingress.submit!=='function'){
  setCommandState('boundary','Ingreso durable no disponible todavía · el texto queda intacto. Usá Notas · HACER o ↻ manual.');
  return;
 }
 commandBusy=true;button.disabled=true;setCommandState('sending','Preparando ingreso durable…');
 try{
  const result=await ingress.submit({page:commandPage(),text,kind:'work'});
  const status=String(result?.status||'').toUpperCase(),ref=result?.ref?String(result.ref):'';
  if(result?.queued===true){
   setCommandState('queued','En cola durable'+(ref?' · '+ref:'')+' · todavía no implica worker activo.');
   input.value='';
   renderWork().catch(()=>{});
  }else if(result?.error||/BOUNDARY|BLOCK|UNAVAILABLE|DENIED|FAIL/.test(status)){
   setCommandState('boundary','No quedó en cola'+(status?' · '+status.toLowerCase():'')+(result?.error?' · '+String(result.error):'')+'. El texto se conserva para reintento/fallback.');
  }else{
   setCommandState('unknown','El adapter respondió sin confirmar queued=true. No se asume trabajo durable ni worker activo.');
  }
 }catch(e){
  setCommandState('boundary','Ingreso falló cerrado · '+String(e?.message||e)+'. El texto se conserva.');
 }finally{commandBusy=false;button.disabled=false}
}
function bindCommandV11(){
 const input=$('#commandInputV11'),button=$('#commandSendV11');if(!input||!button||button.dataset.bound)return;
 button.dataset.bound='1';button.addEventListener('click',()=>submitCommandV11());
 input.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();submitCommandV11()}});
 if(window.PROMETEO_INGRESS_V1&&typeof window.PROMETEO_INGRESS_V1.submit==='function')setCommandState('ready','Listo para preparar trabajo durable. Enviar no equivale a worker activo.');
 else setCommandState('boundary','Adapter de ingreso todavía no disponible · Notas · HACER y ↻ manual siguen disponibles.');
}
function renderWorkBadge(){const tab=document.querySelector('.tab[data-view="trabajo"]');if(tab)tab.textContent=unread?'Trabajo · '+unread:'Trabajo'}
async function publicEvidence(url){
 if(!url)return null;
 try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)return null;return await r.json()}catch{return null}
}
async function publicText(url){
 if(!url)return null;
 try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)return null;return await r.text()}catch{return null}
}

async function loadCapabilityGraph(){
 const cfg=window.PROMETEO_CONTROL_CONFIG_V1||{};
 capabilityGraph=await publicEvidence(cfg.capabilityGraphUrl||'../../coordination/semantic-relations/CAPABILITY_GRAPH_V1.json');
 return capabilityGraph;
}
function graphObjectMap(){
 return new Map((capabilityGraph?.objects||[]).map(x=>[x.id,x]));
}
function capabilityRelations(id){
 return (capabilityGraph?.relations||[]).filter(r=>r.source===id||r.target===id);
}
function capGitHref(ref){
 const x=String(ref||'').replace(/^\/+/, '');
 return x?'https://github.com/JuanManuelPM/prometeo/blob/main/'+x.split('/').map(encodeURIComponent).join('/'):'';
}
function capabilityHubMarkup(cap,map){
 const rels=capabilityRelations(cap.id);
 const variants=rels.filter(r=>r.source===cap.id&&r.type==='HAS_VARIANT').map(r=>({rel:r,obj:map.get(r.target)})).filter(x=>x.obj);
 const incoming=rels.filter(r=>r.target===cap.id).map(r=>({rel:r,obj:map.get(r.source)})).filter(x=>x.obj);
 const projects=incoming.filter(x=>x.obj.kind==='PROJECT');
 const chats=incoming.filter(x=>x.obj.kind==='CHAT_SESSION');
 const ownerRefs=Array.isArray(cap.refs)?cap.refs:[];
 const opened=openCapabilityHubId===cap.id;
 const rows=(items,kind)=>items.map(({rel,obj})=>{
   let href='';
   if(obj.kind==='ALTERNATIVE')href=capGitHref(obj.ref);
   else if(obj.kind==='CHAT_SESSION')href=stableControlUrl({view:'chats'});
   else if(obj.kind==='PROJECT')href=stableControlUrl({view:'proyectos'});
   return '<div class="cap-rel"><div><div class="cap-rel-title">'+esc(obj.title||obj.id)+'</div><div class="cap-rel-sub">'+esc(obj.summary||obj.status||obj.id)+'</div></div><div><div class="cap-rel-kind">'+esc(rel.type)+'</div>'+(href?'<a href="'+esc(href)+'" target="_blank" rel="noopener">abrir ↗</a>':'')+'</div></div>';
 }).join('');
 return '<article class="cap-card" data-capability="'+esc(cap.id)+'"><div class="cap-main"><div class="tool-emoji">'+esc(cap.emoji||'◈')+'</div><div><div class="tool-top"><div><div class="tool-title">'+esc(cap.title||cap.id)+'</div><div class="tool-sub">'+esc(cap.summary||'')+'</div></div><div class="tool-status '+String(cap.status||'').toLowerCase()+'">'+esc(cap.status||'')+'</div></div><div class="cap-chips"><span class="cap-chip">'+variants.length+' variantes</span><span class="cap-chip">'+projects.length+' proyectos</span><span class="cap-chip">'+chats.length+' chats</span></div><div class="cap-actions"><button class="primary" data-cap-toggle="'+esc(cap.id)+'">'+(opened?'Cerrar hub':'Ver hub')+'</button>'+(cap.public_url?'<a href="'+esc(cap.public_url)+'" target="_blank" rel="noopener">abrir herramienta ↗</a>':'')+'</div></div><div></div></div><div class="cap-hub" data-cap-body="'+esc(cap.id)+'" '+(opened?'':'hidden')+'>'+(projects.length?'<section class="cap-section"><div class="cap-section-title">Proyectos / contextos</div>'+rows(projects,'PROJECT')+'</section>':'')+(chats.length?'<section class="cap-section"><div class="cap-section-title">Chats relacionados</div>'+rows(chats,'CHAT_SESSION')+'</section>':'')+(variants.length?'<section class="cap-section"><div class="cap-section-title">Alternativas / variantes</div>'+rows(variants,'ALTERNATIVE')+'</section>':'')+(ownerRefs.length?'<section class="cap-section"><div class="cap-section-title">Source owners / evidencia</div>'+ownerRefs.map(ref=>'<div class="cap-rel"><div><div class="cap-rel-title">'+esc(ref.split('/').pop())+'</div><div class="cap-rel-sub">'+esc(ref)+'</div></div><div><a href="'+esc(capGitHref(ref))+'" target="_blank" rel="noopener">fuente ↗</a></div></div>').join('')+'</section>':'')+'<div class="cap-note">Este hub es una proyección del grafo. No convierte alternatives en CURRENT ni hace que un chat sea owner de la herramienta.</div></div></article>';
}
function renderCapabilityTools(){
 const root=$('#tools');if(!root)return false;
 if(!capabilityGraph){return false}
 const map=graphObjectMap(),caps=(capabilityGraph.objects||[]).filter(x=>x.kind==='CAPABILITY');
 const represented=new Set(caps.map(c=>c.node_key).filter(Boolean));
 const legacy=(bundle?.cat?.tools||[]).filter(t=>!represented.has(t.node_key));
 root.innerHTML='<section class="section"><div class="section-head"><div class="section-title">Hubs de capability</div><div class="section-action">'+caps.length+' con relaciones</div></div><div class="tool-grid">'+caps.map(c=>capabilityHubMarkup(c,map)).join('')+'</div></section>'+(legacy.length?'<section class="section"><div class="section-head"><div class="section-title">Otras herramientas registradas</div><div class="section-action">'+legacy.length+'</div></div><div class="tool-grid">'+legacy.map(x=>'<article class="tool-card" data-key="'+esc(x.node_key)+'"><div class="tool-emoji">'+esc(x.emoji)+'</div><div><div class="tool-top"><div><div class="tool-title">'+esc(x.title)+'</div><div class="tool-sub">'+esc(x.summary)+'</div></div><div class="tool-status '+String(x.status).toLowerCase()+'">'+esc(x.status)+'</div></div><div class="tool-meta"><span>todavía sin relations V1</span></div></div><button class="tool-open" data-cap-open="'+esc(x.public_url||'')+'">abrir ↗</button></article>').join('')+'</div></section>':'')+'<div class="rdesc">Una capability puede relacionarse con muchos chats/proyectos/variantes. Ninguna de esas relaciones cambia por sí sola su autoridad.</div>';
 root.querySelectorAll('[data-cap-toggle]').forEach(btn=>btn.onclick=()=>{
   const id=btn.dataset.capToggle;openCapabilityHubId=openCapabilityHubId===id?null:id;renderCapabilityTools();
 });
 root.querySelectorAll('[data-cap-open]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();if(btn.dataset.capOpen)window.open(btn.dataset.capOpen,'_blank','noopener')});
 return true;
}
function chatAbs(url){if(!url)return null;try{return new URL(url,(window.PROMETEO_CONTROL_CONFIG_V1||{}).chatSessionsUrl||location.href).href}catch{return null}}
function chatTime(v){if(!v)return'—';try{return new Date(v).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch{return String(v)}}
function chatRefs(refs=[]){return refs.length?'<div class="chat-entry-links">'+refs.map(r=>'<a href="'+esc(r.url||'#')+'" target="_blank" rel="noopener">'+esc(r.label||r.kind||'ref')+' ↗</a>').join('')+'</div>':''}
function chatEntryMarkup(e){
 const actions=Array.isArray(e.actions)&&e.actions.length?'<div class="chat-entry-actions">'+e.actions.map(x=>'• '+esc(x)).join('<br>')+'</div>':'';
 return '<article class="chat-entry"><div class="chat-entry-top"><span>'+esc(e.entry_id||'entrada')+' · '+esc(e.entry_mode||'')+'</span><span>'+esc(chatTime(e.occurred_at))+'</span></div><div class="chat-entry-title">'+esc(e.assistant_conclusion||e.human_intent_summary||'Iteración')+'</div>'+(e.human_intent_summary?'<div class="chat-entry-text"><b>Intención:</b> '+esc(e.human_intent_summary)+'</div>':'')+actions+chatRefs(e.refs||[])+'</article>';
}
async function loadChatSessionIndex(){
 const cfg=window.PROMETEO_CONTROL_CONFIG_V1||{};
 chatSessionIndex=await publicEvidence(cfg.chatSessionsUrl||'../../coordination/chat-sessions/INDEX.json');
 return chatSessionIndex;
}
async function sessionJournal(session){
 const key=session?.session_id;if(!key)return null;
 if(chatJournalCache.has(key))return chatJournalCache.get(key);
 const url=session.public_journal_url||chatAbs(session.journal_url);
 const j=await publicEvidence(url);
 if(j)chatJournalCache.set(key,j);
 return j;
}
async function renderChats(){
 const root=$('#chatsV11');if(!root)return;
 let idx=chatSessionIndex;
 if(!idx)idx=await loadChatSessionIndex().catch(()=>null);
 const sessions=Array.isArray(idx?.sessions)?idx.sessions:[];
 if(!sessions.length){root.innerHTML='<div class="rdesc">Todavía no hay sesiones públicas adoptadas.</div>';return}
 root.innerHTML='<div class="chat-session-list">'+sessions.map(s=>'<article class="chat-session-card" data-chat-session="'+esc(s.session_id)+'"><div class="chat-session-head"><div><div class="chat-session-title">'+esc(s.title||s.session_id)+'</div><div class="chat-session-meta">'+esc(s.session_id)+' · '+esc(s.session_pin||'sin pin')+'</div></div><div class="chat-session-state">'+esc(s.status||'')+'</div></div><div class="chat-session-body"><div class="chat-session-summary">'+esc(s.current_summary||'')+'</div><div class="chat-session-next"><b>Siguiente:</b> '+esc(s.next_action||'—')+'</div><div class="chat-lineage">prev: '+esc(s.predecessor_session_id||'—')+' · next: '+esc(s.successor_session_id||'—')+' · '+Number(s.material_iteration_count||0)+' iteraciones</div><div class="chat-session-actions"><button class="primary" data-chat-continue="'+esc(s.session_id)+'">Copiar continuación</button><button data-chat-journal="'+esc(s.session_id)+'">Ver journal</button><a href="'+esc(s.public_journal_url||chatAbs(s.journal_url)||'#')+'" target="_blank" rel="noopener">JSON ↗</a><span class="chat-copy-status" data-chat-copy-status="'+esc(s.session_id)+'"></span></div></div><div class="chat-journal" data-chat-journal-body="'+esc(s.session_id)+'" hidden></div></article>').join('')+'</div>';
 root.querySelectorAll('[data-chat-journal]').forEach(btn=>btn.onclick=async()=>{
   const id=btn.dataset.chatJournal,sess=sessions.find(x=>x.session_id===id),body=root.querySelector('[data-chat-journal-body="'+CSS.escape(id)+'"]');
   if(!sess||!body)return;
   if(!body.hidden){body.hidden=true;btn.textContent='Ver journal';return}
   body.hidden=false;btn.textContent='Ocultar journal';body.innerHTML='<div class="rdesc" style="padding:10px 0">Cargando…</div>';
   const j=await sessionJournal(sess);
   const entries=Array.isArray(j?.entries)?j.entries.slice().reverse():[];
   body.innerHTML=entries.length?entries.map(chatEntryMarkup).join(''):'<div class="rdesc" style="padding:10px 0">No pude cargar el journal.</div>';
 });
 root.querySelectorAll('[data-chat-continue]').forEach(btn=>btn.onclick=async()=>{
   const id=btn.dataset.chatContinue,sess=sessions.find(x=>x.session_id===id),status=root.querySelector('[data-chat-copy-status="'+CSS.escape(id)+'"]');
   if(!sess)return;
   const prompt=await publicText(sess.public_continue_url||chatAbs(sess.continue_url));
   if(!prompt){if(status)status.textContent='no disponible';return}
   const ok=await copy(prompt);if(status){status.textContent=ok?'copiado':'falló';setTimeout(()=>status.textContent='',1800)}
 });
}
async function loadResultProjection(){
 const cfg=window.PROMETEO_CONTROL_CONFIG_V1||{};
 const [raw,g05]=await Promise.all([
  publicEvidence(cfg.resultProjectionUrl||'./result-candidate-v1.json'),
  publicEvidence(cfg.g05VerificationUrl||'../../coordination/goal-progress/G05_VERIFICATION.json')
 ]);
 resultProjection=projectVisibleResultFromG05(raw,g05);
 return resultProjection;
}
function evidenceHref(ref){
 const clean=String(ref||'').replace(/^\/+/, '');
 return clean?'https://github.com/JuanManuelPM/prometeo/blob/main/'+clean.split('/').map(encodeURIComponent).join('/'):'';
}
function visibleResultMarkup(){
 const r=resultProjection||normalizeVisibleResultProjection(null);
 const lineage=r.lineage||{},refs=[
  ['RETURN',lineage.builder_return_ref],
  ['VERIFY',lineage.verifier_ref],
  ['candidate',lineage.candidate_ref]
 ].filter(([,ref])=>ref);
 const links=refs.length?'<div class="context-meta">'+refs.map(([label,ref])=>'<a href="'+esc(evidenceHref(ref))+'" target="_blank" rel="noopener">'+esc(label)+'</a>').join(' · ')+'</div>':'<div class="context-meta">lineage G05 todavía no disponible</div>';
 const candidate=r.state==='VERIFIED'&&r.candidate_url?'<div class="dactions"><a class="dbtn primary" href="'+esc(r.candidate_url)+'" target="_blank" rel="noopener">abrir candidate</a></div>':'';
 return '<section class="worker-note" data-visible-result-state="'+esc(r.state)+'"><b>Resultado visible · '+esc(r.state.toLowerCase())+'</b> · '+esc(r.summary)+(r.fixture_contract_only?' · fixture contractual G06, no resultado real':'')+(r.blocker?' · '+esc(r.blocker):'')+links+candidate+'</section>';
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
 if(!resultProjection)await loadResultProjection().catch(()=>{resultProjection=normalizeVisibleResultProjection(null)});
 const resultPanel=visibleResultMarkup();
 if(!changeClient.hasWorkspace()){root.innerHTML=resultPanel+'<div class="worker-note"><b>Workspace local no vinculado.</b> Abrí Notas en cualquier página; Control Room intentará reutilizar/vincular el workspace existente del dispositivo.</div>';return}
 try{
  await changeClient.executionStatus({});
  const d=await changeClient.overview(),threads=d.threads||[];
  unread=threads.reduce((n,t)=>n+Number(t.unread_count||0),0);renderWorkBadge();
  root.innerHTML=resultPanel+'<div class="worker-note"><b>Este tablero no crea otra cola.</b> “HACER” congela tus notas en un Execution Packet y lo proyecta al allocator CURRENT. Los workers reclaman por la autoridad normal y el resultado vuelve al mismo thread.</div><div class="work-overview">'+(threads.length?threads.map(t=>`<article class="work-thread ${t.unread?'unread':''}" data-thread-page="${esc(t.page_id)}"><div class="work-thread-top"><div class="work-thread-title">${esc(t.page_title||t.page_id)}</div><div class="work-thread-count">${t.pending?esc(t.pending)+' pendientes':t.unread?'resultado nuevo':'al día'}</div></div><div class="work-thread-meta">${t.last_worked_at?'último trabajo '+new Date(t.last_worked_at).toLocaleString('es-AR'):'sin trabajo previo'}</div>${t.latest_result?'<div class="work-thread-result">'+esc(t.latest_result.status)+' · '+esc(typeof t.latest_result.summary==='string'?t.latest_result.summary:'resultado disponible')+'</div>':''}</article>`).join(''):'<div class="rdesc">Todavía no hay threads de página.</div>')+'</div>';
  root.querySelectorAll('[data-thread-page]').forEach(el=>el.onclick=async()=>{const p=pageMap.get(el.dataset.threadPage)||{id:el.dataset.threadPage,title:el.querySelector('.work-thread-title')?.textContent||el.dataset.threadPage,href:location.href,category_path:['Prometeo'],kind:'PAGE'};await openNotesForPage(p,{view:'trabajo',push:true})});
 }catch(e){await renderWorkFailure(root,e)}
}
async function hydrate(){
 bundle=window.PROMETEO_V11_LAST||bundle;
 pages=mergePages(catalogPages(),await visualPages());pageMap=new Map(pages.map(p=>[p.id,p]));
 if(!previewManifest)await loadPreviewManifest().catch(()=>installPreviewManifest(null));
 if(!resultProjection)await loadResultProjection().catch(()=>{resultProjection=normalizeVisibleResultProjection(null)});
 if(!capabilityGraph)await loadCapabilityGraph().catch(()=>{capabilityGraph=null});
 renderFreshness();renderPreviewGrid();renderSpaces();renderChats().catch(()=>{});renderCapabilityTools();renderWork().catch(()=>{});bindCommandV11();await restoreRoute(false);
 const search=$('#workspaceSearchV11');if(search&&!search.dataset.bound){search.dataset.bound='1';search.addEventListener('input',renderSpaces)}
 await remote.init().catch(()=>null);voice.init().catch(()=>{});
}
window.addEventListener('PROMETEO_V11_DATA',e=>{bundle=e.detail?.bundle||bundle;window.PROMETEO_V11_LAST=bundle;hydrate().catch(()=>{})});
window.PROMETEO_V11_RENDER_SPACES=renderSpaces;
window.PROMETEO_V11_RENDER_CHATS=()=>renderChats();
window.PROMETEO_V11_RENDER_TOOLS=()=>renderCapabilityTools();
window.PROMETEO_V11_RENDER_WORK=()=>renderWork();
window.PROMETEO_V11_SUBMIT_COMMAND=()=>submitCommandV11();
window.PROMETEO_V11_OPEN_PAGE_NOTES=(p,opts={})=>openNotesForPage(p,{view:opts.view||'espacios',push:opts.push!==false,work:opts.work||null});
window.PROMETEO_V11_OPEN_NODE_NOTES=(info,opts={})=>openNodeNotes(info,{push:opts.push!==false});
window.PROMETEO_V11_ENTITY_OPENED=info=>{if(restoringRoute)return;writeRoute({view:info?.view||'organismo',node:info?.nodeKey||null,page:null,panel:null,work:null})};
window.PROMETEO_V11_VIEW_CHANGED=v=>{if(restoringRoute||!VALID_VIEWS.has(v))return;writeRoute({view:v,panel:null,work:null},false)};
window.PROMETEO_V11_STABLE_URL=stableControlUrl;
addEventListener('popstate',()=>restoreRoute(true).catch(()=>{}));
setTimeout(()=>hydrate().catch(()=>{}),0);
setInterval(()=>{if(document.querySelector('.view#trabajo.on'))renderWork().catch(()=>{})},12000);
