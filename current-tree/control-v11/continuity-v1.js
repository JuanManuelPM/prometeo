(function(){
'use strict';

const VERSION='PROMETEO_CONTINUITY_V1';
const PREFLIGHT='https://juanmanuelpm.github.io/prometeo/coordination/bootstrap/UNIVERSAL_SESSION_PREFLIGHT_V1.txt';
const CURRENT_TREE='https://juanmanuelpm.github.io/prometeo/current-tree/';
const DESIGN_DNA='https://github.com/JuanManuelPM/prometeo/blob/main/coordination/design-dna/INDEX.json';
const WORK_CONTEXT='https://juanmanuelpm.github.io/prometeo/current-tree/work-context/invoke.txt';
const CONTROL='https://juanmanuelpm.github.io/prometeo/current-tree/control/';
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
function continuityPacket(project){
  const b=bundle();
  return {
    schema:'prometeo.project-continuity-packet/v1',
    generated_at:new Date().toISOString(),
    selected_project:project?{
      key:projectKey(project),title:project.title||null,subtitle:project.subtitle||null,node_key:project.node_key||null,status:project.status||null,surface_ids:project.surface_ids||[]
    }:{key:'PROMETEO_ALL',title:'Prometeo completo'},
    mandatory_preflight:{
      url:PREFLIGHT,
      order:['CURRENT_TREE_V2','CURRENT_ARCHITECTURE','ORGANISM','OBJECTIVE_PLAN','WORK_CONTEXT_SESSION','DESIGN_DNA_IF_MATERIAL','DRIFT','REQUEST_CLASSIFICATION','MUTATE'],
      request_classes:['CONTINUE','COMPATIBLE_DELTA','EXPERIMENT','REPLAN','DESTRUCTIVE_RESET']
    },
    stable_refs:{control:CONTROL,current_tree:CURRENT_TREE,design_dna:DESIGN_DNA,work_context:WORK_CONTEXT},
    current_snapshot:{
      tree:b.tree||null,
      organism:b.org||null,
      work_contexts:project?{contexts:relevantContexts(project)}:(b.ctx||null),
      activity:b.act||null,
      catalog:b.cat||null,
      freshness:b.freshness||null
    },
    chat_sessions:relevantSessions(project),
    capability_graph:capabilityGraph,
    visible_result_projection:resultProjection,
    privacy:{
      public_durable_projection_only:true,
      local_note_bodies_included:false,
      private_prompt_text_included:false,
      credentials_included:false
    },
    reopen_law:'Human new intent may change the plan, but a fresh shell must recover organism/plan/baseline/lineage and record whether the request is continuation, compatible delta, experiment, replan or destructive reset before durable mutation.'
  };
}
function newChatPrompt(project){
  const p=project||{title:'Prometeo completo',node_key:'PROJECT:PROMETEO'};
  return `PROMETEO · NUEVO CHAT DURABLE V1

FOCUS_PROJECT: ${p.title||'Prometeo'}
FOCUS_NODE: ${p.node_key||'AUTO_RESOLVE'}

LEÉ PRIMERO:
${PREFLIGHT}
${CURRENT_TREE}

PRIMERA ACCIÓN DURABLE:
1. Creá SESSION_ID + SESSION_PIN frescos. No reutilices una sesión histórica.
2. Buscá si ya existe Chat Object / Work Context para este proyecto o propósito. Reutilizá identidad larga si corresponde; no dupliques owners.
3. Publicá SESSION.json + JOURNAL.json + CONTINUE.txt e incorporá la sesión al índice durable.
4. Ejecutá el preflight completo: Current Tree V2 → arquitectura CURRENT → Organismo (ubicá realmente el target y dependencias) → objetivo/plan/checkpoint → Work Context/session lineage → Design DNA/golden si el cambio es material → drift.
5. Clasificá la próxima instrucción humana como CONTINUE / COMPATIBLE_DELTA / EXPERIMENT / REPLAN / DESTRUCTIVE_RESET.
6. El pedido humano manda como intención. Si contradice el plan anterior, NO lo ignores: registrá el cambio y preservá lineage/baseline; aislá como alternativa/experimento cuando corresponda o replanteá explícitamente si eso pidió el humano.
7. En cada turno material, antes de responder, publicá journal sanitizado: intención, conclusión, acciones reales, refs, decisiones, boundaries y next_action.
8. Nunca publiques prompt raw, notas privadas, tokens, headers ni chain-of-thought.
9. No inventes queue/scheduler/CURRENT paralelos. Reutilizá source owners y arquitectura existente.
10. Si el humano quiere identidad visual para el chat/proyecto, podés agregar cover_image_url sólo si existe un asset público real con provenance; la imagen es UX, nunca authority.

CONTROL ROOM:
${CONTROL}

Cuando termines el bootstrap, quedá listo para que el humano te diga qué quiere hacer. No le pidas que reconstruya contexto ya durable.`;
}
function adoptPrompt(project){
  const p=project||{title:'Prometeo completo',node_key:'PROJECT:PROMETEO'};
  return `PROMETEO · ADOPTAR ESTE CHAT EXISTENTE V1

Este chat ya tiene conversación y trabajo previo. Desde AHORA adoptalo como Chat Session durable sin pedirme que resuma lo anterior.

FOCUS_PROJECT: ${p.title||'Prometeo'}
FOCUS_NODE: ${p.node_key||'AUTO_RESOLVE'}

LEÉ:
${PREFLIGHT}
${CURRENT_TREE}

HACÉ:
1. Inspeccioná la conversación actual + evidencia durable disponible y resolvé qué Chat Object / Project / Tools / Pages representa.
2. Creá SESSION_ID + SESSION_PIN frescos para ESTE chat.
3. Registrá predecessor sólo si encontrás uno real; no lo inventes.
4. Publicá SESSION/JOURNAL/CONTINUE y el índice.
5. Backfilleá únicamente hitos materiales que puedas sostener por conversación visible o refs durables; marcá backfill como tal.
6. Ubicá el trabajo en Organismo y recuperá objetivo/plan/baseline antes de la próxima mutación.
7. Desde este turno en adelante, publicá cada interacción material al journal antes de responder.
8. Si el trabajo mejora una Tool/Page/Project ajenos al foco original, agregá relaciones tipadas; no mudes el chat de “carpeta”.
9. Si el humano quiere identidad visual, podés publicar cover_image_url con asset/provenance real.
10. No publiques prompt raw ni información privada.

Después continuá normalmente. El humano no vuelve a ser message bus.`;
}
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
    <div class="continuity-head"><div><div class="continuity-title">∞ Continuidad</div><div class="continuity-sub">Podés perder este chat. El proyecto no debería perderse con él.</div></div><span class="continuity-state">PREFLIGHT V1</span></div>
    <div class="continuity-select-row"><label>Foco</label><select id="continuityProject">${projectOptionHtml()}</select></div>
    <div class="continuity-actions">
      <button class="primary" id="continuityNew">Nuevo chat</button>
      <button id="continuityAdopt">Adoptar chat abierto</button>
      <button id="continuityExport">Exportar proyecto</button>
      <button id="continuityCopy">Copiar paquete</button>
      <a href="https://chatgpt.com/" target="_blank" rel="noopener">abrir ChatGPT ↗</a><a href="${PREFLIGHT}" target="_blank" rel="noopener">preflight ↗</a>
    </div>
    <div class="continuity-note">Nuevo/Adoptar no crean otra autoridad: generan un bootstrap que obliga al chat a leer Current Tree + Organismo + plan + Work Context + Design DNA cuando corresponda antes de modificar.</div>
  </section>`;
}
function sessionHtml(s){
  const img=s.cover_image_url?'<img class="history-avatar" src="'+esc(s.cover_image_url)+'" alt="">':'<div class="history-avatar fallback">💬</div>';
  const chatLink=s.chat_url?'<a href="'+esc(s.chat_url)+'" target="_blank" rel="noopener">abrir chat ↗</a>':'';
  return '<article class="history-session" data-session="'+esc(s.session_id)+'">'+img+'<div><div class="history-session-top"><b>'+esc(s.title||s.session_id)+'</b><time>'+esc(clock(s.last_activity_at))+'</time></div><div class="history-session-summary">'+esc(s.current_summary||'')+'</div><div class="history-session-actions"><button data-cont="'+esc(s.session_id)+'">Continuar</button><button data-journal="'+esc(s.session_id)+'">Ver journal</button>'+chatLink+'</div><div class="history-session-journal" data-journal-body="'+esc(s.session_id)+'" hidden></div></div></article>';
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
  hr.innerHTML='<div class="timeline-dir"><span>PRESENTE</span><span>↓ hacia el pasado</span></div><div class="timeline">'+Object.entries(groups).map(([d,es])=>'<section class="day"><div class="dayhead">'+esc(d)+'</div>'+es.map(e=>'<article class="event history-event"><div class="eventtime">'+esc(clock(e.at))+' · '+esc(e.type)+'</div><div class="eventtitle">'+esc(e.title)+'</div><div class="eventdesc">'+esc(e.desc||'')+'</div>'+(e.refs?.length?'<div class="history-links">'+e.refs.filter(r=>r?.url).slice(0,5).map(r=>'<a href="'+esc(r.url)+'" target="_blank" rel="noopener">'+esc(r.label||r.kind||'ref')+' ↗</a>').join('')+'</div>':'')+'</article>').join('')+'</section>').join('')+'</div>';
  return true;
}
function bindCenter(){
  const sel=document.getElementById('continuityProject');
  if(sel)sel.onchange=()=>{localStorage.setItem(STORE_PROJECT,sel.value);renderHistory()};
  const getP=()=>selectedProject();
  document.getElementById('continuityNew')?.addEventListener('click',async()=>{await copyText(newChatPrompt(getP()));toast('Prompt de nuevo chat copiado')});
  document.getElementById('continuityAdopt')?.addEventListener('click',async()=>{await copyText(adoptPrompt(getP()));toast('Prompt de adopción copiado')});
  document.getElementById('continuityExport')?.addEventListener('click',()=>{const p=getP(),packet=continuityPacket(p),slug=(p?.title||'prometeo').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');download('prometeo-'+slug+'-continuity.json',JSON.stringify(packet,null,2)+'\n')});
  document.getElementById('continuityCopy')?.addEventListener('click',async()=>{await copyText(JSON.stringify(continuityPacket(getP()),null,2));toast('Paquete de continuidad copiado')});
}
function bindSessions(root,sessions){
  root.querySelectorAll('[data-cont]').forEach(btn=>btn.onclick=async()=>{
    const s=sessions.find(x=>x.session_id===btn.dataset.cont);if(!s)return;
    const prompt=await getText(s.public_continue_url||abs(s.continue_url,cfg().chatSessionsUrl||location.href));
    if(!prompt){toast('No pude cargar CONTINUE.txt');return}
    const guarded=prompt.includes('UNIVERSAL_SESSION_PREFLIGHT_V1')?prompt:('PREFLIGHT OBLIGATORIO: '+PREFLIGHT+'\n\n'+prompt);
    await copyText(guarded);toast('Continuación copiada');
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
  window.PROMETEO_CONTINUITY_V1={version:VERSION,renderHistory,decorateNow,continuityPacket,newChatPrompt,adoptPrompt,goContinuity};
  document.getElementById('continuityBtn')?.addEventListener('click',goContinuity);
  window.addEventListener('PROMETEO_V11_DATA',()=>{if(document.querySelector('.view#historial.on'))renderHistory();if(document.querySelector('.view#ahora.on'))setTimeout(decorateNow,0)});
  if(document.querySelector('.view#ahora.on'))setTimeout(decorateNow,0);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
