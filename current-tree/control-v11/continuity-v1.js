(function(){
'use strict';

const VERSION='PROMETEO_CONTINUITY_V1_FAST_PATH';
const FAST_PATH='FAST_REINCARNATION_PATH_V1';
const PREFLIGHT='https://juanmanuelpm.github.io/prometeo/coordination/bootstrap/UNIVERSAL_SESSION_PREFLIGHT_V1.txt';
const CURRENT_TREE='https://juanmanuelpm.github.io/prometeo/current-tree/';
const DESIGN_DNA='https://github.com/JuanManuelPM/prometeo/blob/main/coordination/design-dna/INDEX.json';
const WORK_CONTEXT='https://juanmanuelpm.github.io/prometeo/current-tree/work-context/invoke.txt';
const CONTROL='https://juanmanuelpm.github.io/prometeo/current-tree/control/';
const SPECIALIST_PROFILE='https://juanmanuelpm.github.io/prometeo/coordination/workstreams/chat-native-control-plane-v1/chat-objects/chat-object-prometeo-visual-steward/CHAT_OBJECT.json';
const STORE_PROJECT='prometeo.control.v11.continuity.project.v1';
let sessionsIndex=null,capabilityGraph=null,resultProjection=null,journalCache=new Map(),loading=null;

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg=()=>window.PROMETEO_CONTROL_CONFIG_V1||{};
const bundle=()=>window.PROMETEO_V11_LAST||{};
const abs=(url,base=location.href)=>{try{return new URL(url,base).href}catch{return url||''}};
async function getJson(url){
  if(!url)return null;
  try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)return null;return await r.json()}catch{return null}
}
async function getText(url){
  if(!url)return null;
  try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)return null;return await r.text()}catch{return null}
}
async function load(){
  if(loading)return loading;
  loading=Promise.all([
    getJson(cfg().chatSessionsUrl||'../../coordination/chat-sessions/INDEX.json'),
    getJson(cfg().capabilityGraphUrl||'../../coordination/semantic-relations/CAPABILITY_GRAPH_V1.json'),
    getJson(cfg().resultProjectionUrl||'./result-candidate-v1.json')
  ]).then(([s,g,r])=>{sessionsIndex=s;capabilityGraph=g;resultProjection=r;return true}).finally(()=>{loading=null});
  return loading;
}
async function journalFor(s){
  if(!s?.session_id)return null;
  if(journalCache.has(s.session_id))return journalCache.get(s.session_id);
  const u=s.public_journal_url||abs(s.journal_url,cfg().chatSessionsUrl||location.href);
  const j=await getJson(u);
  if(j)journalCache.set(s.session_id,j);
  return j;
}
function projectList(){
  return bundle()?.cat?.projects||[];
}
function selectedProject(){
  const id=localStorage.getItem(STORE_PROJECT)||'__ALL__';
  return id==='__ALL__'?null:projectList().find(p=>(p.node_key||p.id||p.title)===id)||null;
}
function projectKey(p){return p?.node_key||p?.id||p?.title||'__ALL__'}
function projectOptionHtml(){
  const current=selectedProject(),key=current?projectKey(current):'__ALL__';
  return '<option value="__ALL__" '+(key==='__ALL__'?'selected':'')+'>Prometeo completo</option>'+
    projectList().map(p=>'<option value="'+esc(projectKey(p))+'" '+(key===projectKey(p)?'selected':'')+'>'+esc(p.title||projectKey(p))+'</option>').join('');
}
function relevantContexts(project){
  const all=bundle()?.ctx?.contexts||[];
  if(!project)return all;
  const needle=[project.node_key,project.title,project.subtitle].filter(Boolean).map(x=>String(x).toLowerCase());
  return all.filter(c=>needle.some(n=>JSON.stringify(c).toLowerCase().includes(n)));
}
function relevantSessions(project){
  const all=sessionsIndex?.sessions||[];
  if(!project)return all;
  const graph=capabilityGraph||{},rels=graph.relations||[],objs=new Map((graph.objects||[]).map(o=>[o.id,o]));
  const projectObjects=[...objs.values()].filter(o=>o.kind==='PROJECT'&&[project.title,project.node_key].filter(Boolean).some(v=>JSON.stringify(o).toLowerCase().includes(String(v).toLowerCase())));
  const relatedCaps=new Set();
  for(const po of projectObjects)for(const r of rels)if(r.source===po.id)relatedCaps.add(r.target);
  const sessionIds=new Set();
  for(const r of rels)if(relatedCaps.has(r.target)&&String(r.source).startsWith('CHAT:')){
    const o=objs.get(r.source);if(o?.session_id)sessionIds.add(o.session_id);
  }
  const direct=all.filter(s=>JSON.stringify(s).toLowerCase().includes(String(project.title||'').toLowerCase()));
  return [...new Map([...direct,...all.filter(s=>sessionIds.has(s.session_id))].map(x=>[x.session_id,x])).values()];
}
function missingOwner(name,ref,b){
  const src=b?.freshness?.sources?.[name]||null;
  return {state:'UNAVAILABLE_AT_EXPORT',owner:name,ref,source_status:src?.status||'unknown',source:src?.source||null,error:src?.error||null,checked_at:b?.freshness?.checked_at||new Date().toISOString()};
}
function continuityPacket(project){
  const b=bundle(),contexts=project?{contexts:relevantContexts(project)}:(b.ctx||null);
  const missing=[];
  const tree=b.tree||missingOwner('tree',CURRENT_TREE,b);if(!b.tree)missing.push('tree');
  const organism=b.org||missingOwner('org',CURRENT_TREE+'?view=organismo',b);if(!b.org)missing.push('organism');
  const workContexts=contexts||missingOwner('ctx',WORK_CONTEXT,b);if(!contexts)missing.push('work_contexts');
  const sessions=relevantSessions(project);
  return {
    schema:'prometeo.project-continuity-packet/v1',
    generated_at:new Date().toISOString(),
    completeness:missing.length?'DEGRADED_EXPLICIT':'COMPLETE_PUBLIC_SNAPSHOT',
    missing_critical_sources:missing,
    selected_project:project?{
      key:projectKey(project),title:project.title||null,subtitle:project.subtitle||null,node_key:project.node_key||null,status:project.status||null,surface_ids:project.surface_ids||[]
    }:{key:'PROMETEO_ALL',title:'Prometeo completo'},
    mandatory_preflight:{
      url:PREFLIGHT,
      fast_path:FAST_PATH,
      first_durable_action:'CREATE_SUCCESSOR_SESSION',
      ready_budget:{durable_reads_min:3,durable_reads_max:6,successor_publication_cas:1},
      request_classes:['CONTINUE','COMPATIBLE_DELTA','EXPERIMENT','REPLAN','DESTRUCTIVE_RESET']
    },
    stable_refs:{control:CONTROL,current_tree:CURRENT_TREE,design_dna:DESIGN_DNA,work_context:WORK_CONTEXT},
    current_snapshot:{
      tree,
      organism,
      work_contexts:workContexts,
      activity:b.act||missingOwner('act',CONTROL+'?view=historial',b),
      catalog:b.cat||null,
      freshness:b.freshness||null
    },
    chat_sessions:sessions,
    handoff_readiness:sessions.map(s=>({session_id:s.session_id,...handoffReadiness(s)})),
    capability_graph:capabilityGraph,
    visible_result_projection:resultProjection,
    privacy:{
      public_durable_projection_only:true,
      local_note_bodies_included:false,
      private_prompt_text_included:false,
      credentials_included:false
    },
    reopen_law:'Create durable session identity/lineage first, then read target-specific owners. Human new intent may change the plan; preserve baseline and lineage.'
  };
}
async function refreshedContinuityPacket(project){
  try{
    const dl=window.PROMETEO_DATA_V11;
    const base=dl?.readCache?.()||bundle()||{};
    const fresh=await dl?.refresh?.(base);
    if(fresh)window.PROMETEO_V11_LAST=fresh;
  }catch(e){
    try{window.PROMETEO_DIAGNOSTICS_V1?.sourceFailure?.('continuity-refresh',e,null,null)}catch{}
  }
  await load();
  return continuityPacket(project);
}
function handoffReadiness(s){
  const missing=[];
  if(!s?.session_id)missing.push('session_id');
  if(!s?.chat_object_id)missing.push('chat_object_id');
  if(!s?.current_summary)missing.push('current_summary');
  if(!s?.next_action)missing.push('next_action');
  if(!(s?.public_session_url||s?.session_url))missing.push('session_ref');
  if(!(s?.public_journal_url||s?.journal_url))missing.push('journal_ref');
  if(!(s?.public_continue_url||s?.continue_url))missing.push('continue_ref');
  return {ready:missing.length===0,label:missing.length?'MISSING HANDOFF DATA':'READY TO REINCARNATE',missing};
}
function continuePrompt(s){
  const sessionUrl=s?.public_session_url||abs(s?.session_url,cfg().chatSessionsUrl||location.href);
  const journalUrl=s?.public_journal_url||abs(s?.journal_url,cfg().chatSessionsUrl||location.href);
  return `PROMETEO CONTINUE

CHAT_OBJECT_ID: ${s?.chat_object_id||'UNKNOWN'}
PREDECESSOR: ${s?.session_id||'UNKNOWN'}
PIN: ${s?.session_pin||'UNKNOWN'}

READ:
${PREFLIGHT}
${sessionUrl||'SESSION_REF_MISSING'}
${journalUrl||'JOURNAL_REF_MISSING'}
${CURRENT_TREE}

FIRST DURABLE ACTION:
Create a fresh successor SESSION_ID + SESSION_PIN, publish SESSION/JOURNAL/CONTINUE + index lineage, then continue predecessor next_action.

RULE:
Read pointers, not the world. No broad search, repo clone or Supabase before READY unless predecessor next_action explicitly requires it.`;
}
function interactiveBootstrapPrompt(mode,project,roleHint='GENERAL'){
  const p=project||{title:'Prometeo completo',node_key:'PROJECT:PROMETEO'};
  return `PROMETEO SESSION BOOTSTRAP

MODE: ${mode}
FOCUS_PROJECT: ${p.title||'Prometeo'}
FOCUS_NODE: ${p.node_key||'AUTO_RESOLVE'}
ROLE_HINT: ${roleHint}

READ:
${PREFLIGHT}
${CURRENT_TREE}

FIRST DURABLE ACTION:
Create fresh SESSION_ID + SESSION_PIN and publish SESSION/JOURNAL/CONTINUE + index. Resolve/reuse an existing durable Chat Object matching ROLE_HINT when one exists; create a new Chat Object Profile only for a genuinely new durable role, never per task.

THEN:
Resolve only the relevant Organism subgraph and exact plan/source owners. For ADOPT_EXISTING, backfill supported material milestones only after the session exists. Classify material human deltas as CONTINUE / COMPATIBLE_DELTA / EXPERIMENT / REPLAN / DESTRUCTIVE_RESET.

RULE:
Read pointers, not the world. No broad search, repo clone or Supabase before READY unless actual next_action requires it. Never publish raw prompts, private notes, credentials, headers or hidden reasoning.`;
}
function specializedBootstrapPrompt(profile,focusObject='SURFACE:CONTROL_ROOM',project=null){
  const p=project||selectedProject()||{title:'Prometeo',node_key:'PROJECT:PROMETEO'},prof=profile||{};
  const profileRef=prof.public_url||SPECIALIST_PROFILE,designRefs=(prof.design_knowledge_refs||[]).join(' ; ')||'coordination/design-knowledge/DESIGN_KNOWLEDGE_INDEX_V1.json';
  return `PROMETEO SESSION BOOTSTRAP\n\nMODE: NEW_SPECIALIZED\nCHAT_OBJECT_ID: ${prof.chat_object_id||'chat-object-prometeo-visual-steward'}\nCHAT_OBJECT_PROFILE_REF: ${profileRef}\nROLE: ${prof.role||'VISUAL_SYSTEMS_STEWARD'}\nFOCUS_PROJECT: ${p.title||'Prometeo'}\nFOCUS_NODE: ${p.node_key||'PROJECT:PROMETEO'}\nFOCUS_OBJECT: ${focusObject}\nDESIGN_KNOWLEDGE_REFS: ${designRefs}\n\nREAD:\n${PREFLIGHT}\n${CURRENT_TREE}\n${profileRef}\n\nFIRST DURABLE ACTION:\nReuse this durable Chat Object and create a fresh SESSION_ID + SESSION_PIN; publish SESSION/JOURNAL/CONTINUE + index lineage before target-specific expansion. Do not mint another specialist if this profile already fits.\n\nTHEN:\nResolve only the relevant Organism subgraph, source owner, plan/baseline, design refs and recent change refs for ${focusObject}. Role/profile gives context, never mutation authority.\n\nRULE:\nUse FAST_REINCARNATION_PATH_V1. Pointers first; no giant specialist prompt, no new memory/queue/scheduler/Organism.`;
}
function newChatPrompt(project){return interactiveBootstrapPrompt('NEW',project);}
function adoptPrompt(project){return interactiveBootstrapPrompt('ADOPT_EXISTING',project);}
function download(name,text,type='application/json'){
  const a=document.createElement('a'),blob=new Blob([text],{type});a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function copyText(text){
  try{await navigator.clipboard.writeText(text);return true}catch{
    const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;
  }
}
function toast(msg){
  let e=document.getElementById('continuityToast');
  if(!e){e=document.createElement('div');e.id='continuityToast';e.className='continuity-toast';document.body.appendChild(e)}
  e.textContent=msg;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),1800);
}
function centerHtml(){
  const p=selectedProject();
  return `<section class="continuity-center" id="continuityCenter">
    <div class="continuity-head"><div><div class="continuity-title">∞ Continuidad</div><div class="continuity-sub">Podés perder este chat. El proyecto no debería perderse con él.</div></div><span class="continuity-state">FAST PATH V1</span></div>
    <div class="continuity-select-row"><label>Foco</label><select id="continuityProject">${projectOptionHtml()}</select><label>Rol</label><select id="continuityRole"><option value="GENERAL">General</option><option value="VISUAL_UX">Visual / UX</option><option value="TOOL_RESEARCH">Tool research</option><option value="PROJECT_GUIDE">Project guide</option><option value="DEBUG_DIAGNOSTICS">Debug / diagnostics</option><option value="RESEARCH">Research</option><option value="CUSTOM">Custom</option></select></div>
    <div class="continuity-actions">
      <button class="primary" id="continuityNew">Nuevo chat</button>
      <button id="continuityAdopt">Adoptar chat abierto</button>
      <button id="continuityExport">Exportar proyecto</button>
      <button id="continuityCopy">Copiar paquete</button>
      <a href="https://chatgpt.com/" target="_blank" rel="noopener">abrir ChatGPT ↗</a><a href="${PREFLIGHT}" target="_blank" rel="noopener">preflight ↗</a>
    </div>
    <div class="continuity-note">Nuevo/Adoptar usan el mismo contrato universal: sesión durable primero, READY con pointers, y recién después expansión del target. Fuentes degradadas no disparan arqueología automática.</div>
  </section>`;
}
function sessionHtml(s){
  const img=s.cover_image_url?'<img class="history-avatar" src="'+esc(s.cover_image_url)+'" alt="">':'<div class="history-avatar fallback">💬</div>';
  const chatLink=s.chat_url?'<a href="'+esc(s.chat_url)+'" target="_blank" rel="noopener">abrir chat ↗</a>':'';
  const h=handoffReadiness(s),focus=[s.active_project,...(s.focus_objects||[])].filter(Boolean).join(' · ');
  const handoff='<span class="history-handoff '+(h.ready?'ready':'missing')+'">'+esc(h.label)+'</span>';
  const next=s.next_action?'<div class="history-next"><b>siguiente</b> '+esc(s.next_action)+'</div>':'';
  const focusHtml=focus?'<div class="history-focus">'+esc(focus)+'</div>':'';
  return '<article class="history-session" data-session="'+esc(s.session_id)+'">'+img+'<div><div class="history-session-top"><b>'+esc(s.title||s.session_id)+'</b><time>'+esc(clock(s.last_activity_at))+'</time></div>'+focusHtml+'<div class="history-session-status">'+handoff+' <span>'+esc(s.status||'')+'</span></div><div class="history-session-summary">'+esc(s.current_summary||'')+'</div>'+next+'<div class="history-session-actions"><button data-cont="'+esc(s.session_id)+'" '+(h.ready?'':'disabled')+'>Continuar</button><button data-journal="'+esc(s.session_id)+'">Ver journal</button>'+chatLink+'</div><div class="history-session-journal" data-journal-body="'+esc(s.session_id)+'" hidden></div></div></article>';
}
function clock(d){try{return new Intl.DateTimeFormat('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(d))}catch{return'—'}}
function day(d){try{return new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(d))}catch{return'—'}}
async function allHistoryEvents(){
  await load();
  const out=[];
  for(const e of bundle()?.act?.events||[]){
    if(!e.occurred_at)continue;
    out.push({at:e.occurred_at,type:e.kind||'EVENT',title:e.title||e.event_type||'Evento',desc:[e.event_type,e.scope].filter(Boolean).join(' · '),node_key:e.node_key||null,refs:e.source_ref?[{label:'fuente',url:e.source_ref}]:[]});
  }
  for(const s of sessionsIndex?.sessions||[]){
    const j=await journalFor(s);
    for(const e of j?.entries||[]){
      out.push({at:e.occurred_at,type:'CHAT',title:s.title||'Chat',desc:e.assistant_conclusion||e.human_intent_summary||'',session:s,entry:e,refs:e.refs||[]});
    }
  }
  for(const o of capabilityGraph?.objects||[]){
    if(o.kind!=='CHANGE'||!o.occurred_at)continue;
    const refs=[o.before_ref?{label:'before',url:o.before_ref}:null,o.after_ref?{label:'after',url:o.after_ref}:null,o.commit_url?{label:'commit',url:o.commit_url}:null,o.rollback_ref?{label:'rollback',url:o.rollback_ref}:null].filter(Boolean);
    out.push({at:o.occurred_at,type:'CAMBIO',title:o.title||o.id,desc:o.summary||o.human_intent||o.change_type||'',node_key:o.target_node_key||null,refs});
  }
  if(resultProjection?.generated_at){
    out.push({at:resultProjection.generated_at,type:'RESULTADO',title:'Resultado visible V11',desc:resultProjection.summary||resultProjection.state||'',refs:[resultProjection.candidate_url?{label:'candidate',url:resultProjection.candidate_url}:null].filter(Boolean)});
  }
  return out.sort((a,b)=>new Date(b.at)-new Date(a.at));
}
async function renderHistory(){
  const root=document.getElementById('history');if(!root)return false;
  root.innerHTML=centerHtml()+'<section class="section"><div class="section-head"><div class="section-title">Sesiones recientes</div><div class="section-action">hora local</div></div><div id="historySessions" class="history-sessions"><div class="rdesc">Cargando…</div></div></section><section class="section"><div class="section-head"><div class="section-title">Todo lo que pasó</div><div class="section-action">chats · trabajo · resultados · contexto</div></div><div id="historyUnified"><div class="rdesc">Cargando…</div></div></section>';
  bindCenter();
  await load();
  const sr=document.getElementById('historySessions');
  const sessions=(sessionsIndex?.sessions||[]).slice().sort((a,b)=>new Date(b.last_activity_at)-new Date(a.last_activity_at));
  sr.innerHTML=sessions.length?sessions.slice(0,8).map(sessionHtml).join(''):'<div class="rdesc">No hay sesiones adoptadas todavía.</div>';
  bindSessions(sr,sessions);
  const events=await allHistoryEvents();
  const groups={};for(const e of events.slice(0,120))(groups[day(e.at)]??=[]).push(e);
  const hr=document.getElementById('historyUnified');
  hr.innerHTML='<div class="timeline-dir"><span>PRESENTE</span><span>↓ hacia el pasado</span></div><div class="timeline">'+Object.entries(groups).map(([d,es])=>'<section class="day"><div class="dayhead">'+esc(d)+'</div>'+es.map(e=>'<article class="event history-event"'+(e.node_key?' data-history-key="'+esc(e.node_key)+'"':'')+'><div class="eventtime">'+esc(clock(e.at))+' · '+esc(e.type)+'</div><div class="eventtitle">'+esc(e.title)+'</div><div class="eventdesc">'+esc(e.desc||'')+'</div>'+(e.refs?.length?'<div class="history-links">'+e.refs.filter(r=>r?.url).slice(0,5).map(r=>'<a href="'+esc(r.url)+'" target="_blank" rel="noopener">'+esc(r.label||r.kind||'ref')+' ↗</a>').join('')+'</div>':'')+'</article>').join('')+'</section>').join('')+'</div>';
  hr.querySelectorAll('[data-history-key]').forEach(el=>el.addEventListener('click',ev=>{if(ev.target.closest('a'))return;window.PROMETEO_V11_OPEN_ENTITY?.(el.dataset.historyKey)}));
  return true;
}
function bindCenter(){
  const sel=document.getElementById('continuityProject');
  if(sel)sel.onchange=()=>{localStorage.setItem(STORE_PROJECT,sel.value);renderHistory()};
  const getP=()=>selectedProject();
  const role=()=>document.getElementById('continuityRole')?.value||'GENERAL';
  document.getElementById('continuityNew')?.addEventListener('click',async()=>{const r=role();if(r==='VISUAL_UX'){const prof=await getJson(SPECIALIST_PROFILE);await copyText(specializedBootstrapPrompt(prof,'SURFACE:CONTROL_ROOM',getP()));toast('Nueva sesión Visual Steward copiada')}else{await copyText(interactiveBootstrapPrompt('NEW',getP(),r));toast('Prompt de nuevo chat copiado')}});
  document.getElementById('continuityAdopt')?.addEventListener('click',async()=>{await copyText(adoptPrompt(getP()));toast('Prompt de adopción copiado')});
  document.getElementById('continuityExport')?.addEventListener('click',async()=>{const p=getP();toast('Actualizando snapshot…');const packet=await refreshedContinuityPacket(p),slug=(p?.title||'prometeo').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');download('prometeo-'+slug+'-continuity.json',JSON.stringify(packet,null,2)+'\n');toast(packet.missing_critical_sources.length?'Exportado · fuentes degradadas explícitas':'Proyecto exportado')});
  document.getElementById('continuityCopy')?.addEventListener('click',async()=>{toast('Actualizando snapshot…');const packet=await refreshedContinuityPacket(getP());await copyText(JSON.stringify(packet,null,2));toast(packet.missing_critical_sources.length?'Copiado · fuentes degradadas explícitas':'Paquete de continuidad copiado')});
}
function bindSessions(root,sessions){
  root.querySelectorAll('[data-cont]').forEach(btn=>btn.onclick=async()=>{
    const s=sessions.find(x=>x.session_id===btn.dataset.cont);if(!s)return;
    const h=handoffReadiness(s);if(!h.ready){toast('Faltan datos de handoff');return}
    await copyText(continuePrompt(s));toast('Continuación mínima copiada');
  });
  root.querySelectorAll('[data-journal]').forEach(btn=>btn.onclick=async()=>{
    const s=sessions.find(x=>x.session_id===btn.dataset.journal),body=root.querySelector('[data-journal-body="'+CSS.escape(btn.dataset.journal)+'"]');if(!s||!body)return;
    if(!body.hidden){body.hidden=true;btn.textContent='Ver journal';return}
    body.hidden=false;btn.textContent='Ocultar journal';
    const j=await journalFor(s);const es=(j?.entries||[]).slice().reverse().slice(0,12);
    body.innerHTML=es.length?es.map(e=>'<div class="history-journal-entry"><time>'+esc(clock(e.occurred_at))+'</time><div><b>'+esc(e.assistant_conclusion||e.entry_id)+'</b><p>'+esc(e.human_intent_summary||'')+'</p></div></div>').join(''):'<div class="rdesc">Journal no disponible.</div>';
  });
}
function decorateNow(){
  const root=document.getElementById('now');if(!root||root.querySelector('.live-work-v1'))return;
  const w=bundle()?.tree?.work?.counts||{};
  const sec=document.createElement('section');sec.className='section live-work-v1';
  sec.innerHTML='<div class="section-head"><div class="section-title">Trabajo vivo</div><div class="section-action">estado actual, no historial</div></div><div class="live-work-grid"><div><b>'+Number(w.ACTIVE||0)+'</b><span>active</span></div><div><b>'+Number(w.READY||0)+'</b><span>ready</span></div><div><b>'+Number(w.BLOCKED||0)+'</b><span>blocked</span></div></div>';
  root.prepend(sec);
}
function goContinuity(){
  const tab=document.querySelector('.tab[data-view="historial"]');tab?.click();setTimeout(()=>document.getElementById('continuityCenter')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
}
function install(){
  window.PROMETEO_CONTINUITY_V1={version:VERSION,renderHistory,decorateNow,continuityPacket,refreshedContinuityPacket,newChatPrompt,adoptPrompt,specializedBootstrapPrompt,goContinuity};
  document.getElementById('continuityBtn')?.addEventListener('click',goContinuity);
  window.addEventListener('PROMETEO_V11_DATA',()=>{if(document.querySelector('.view#historial.on'))renderHistory();if(document.querySelector('.view#ahora.on'))setTimeout(decorateNow,0)});
  if(document.querySelector('.view#ahora.on'))setTimeout(decorateNow,0);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
