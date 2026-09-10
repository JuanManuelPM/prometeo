(()=>{'use strict';
if(window.__STUDY_V9)return;window.__STUDY_V9=true;
const BB9_API='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/study-blackboard-v1';
const BB9_TOKEN_KEY='study_bb_workspace_token';
const BB9_INSTALL='./blackboard-bridge.html';
const old9={renderLibrary,renderCourse,renderSession};
let bb9={token:localStorage.getItem(BB9_TOKEN_KEY)||'',extension:false,paired:false,state:'idle',data:null,lastEvent:null};
function norm9(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function setup9(){
 const h=new URLSearchParams(location.hash.replace(/^#/,'')),t=h.get('bbsetup');
 if(t&&t.length>20){bb9.token=t;localStorage.setItem(BB9_TOKEN_KEY,t);history.replaceState(null,'',location.pathname+location.search);setTimeout(pair9,250)}
}
setup9();
function bbHeaders9(){return{'content-type':'application/json','x-study-token':bb9.token,'x-study-workspace':'colo-study'}}
async function bbCall9(action,method='GET',body=null){if(!bb9.token)throw new Error('not_configured');const r=await fetch(`${BB9_API}?action=${encodeURIComponent(action)}`,{method,headers:bbHeaders9(),body:body?JSON.stringify(body):undefined,cache:'no-store'});if(!r.ok)throw new Error('bb_'+r.status);return r.json()}
function ago9(s){if(!s)return 'nunca';const d=Math.max(0,Date.now()-new Date(s).getTime()),m=Math.floor(d/60000);return m<1?'ahora':m<60?`hace ${m} min`:m<1440?`hace ${Math.floor(m/60)} h`:`hace ${Math.floor(m/1440)} d`}
function date9(s){if(!s)return '';return new Date(s).toLocaleDateString('es-AR',{day:'2-digit',month:'short'}).replace('.','')}
function eventType9(x){const t=norm9(x.title);return /parcial|examen/.test(t)?'parcial':/recuper/.test(t)?'recuperatorio':/entrega|tp|trabajo/.test(t)?'entrega':'evento'}
function nextEvents9(){const now=Date.now()-86400000;return (bb9.data?.events||[]).filter(e=>new Date(e.starts_at).getTime()>=now).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)).slice(0,6)}
function latestSource9(){return (bb9.data?.sources||[]).find(x=>x.source_id==='palermo')||{} }
function changes9(){return (bb9.data?.changes||[]).slice(0,6)}
function panelHTML9(){
 const src=latestSource9(),ev=nextEvents9(),changes=changes9(),counts={courses:bb9.data?.courses?.length||0,items:bb9.data?.items?.length||0};
 const status=!bb9.token?'sin configurar':bb9.state==='syncing'?'sincronizando…':src.last_error?'con error':`actualizado ${ago9(src.last_sync_at)}`;
 return `<section class="bb9" id="bb9"><header class="bb9Head"><button class="bb9Title" id="bb9Toggle"><i class="bb9Dot ${bb9.extension?'live':''}"></i><b>Blackboard</b><span>${esc(status)}</span></button><div class="bb9Actions">${bb9.token?`<button id="bb9Sync" class="bb9Sync">↻</button>`:`<a class="bb9Install" href="${BB9_INSTALL}">instalar puente</a>`}</div></header><div class="bb9Body" id="bb9Body"><div class="bb9Stats"><span>${ev.length} próximas fechas</span><span>${counts.courses} materias detectadas</span><span>${counts.items} elementos</span><span>${bb9.extension?'puente activo':'calendario solamente'}</span></div>${ev.length?`<div class="bb9Events">${ev.map(e=>`<article><time>${date9(e.starts_at)}</time><i data-kind="${eventType9(e)}"></i><div><b>${esc(e.title)}</b><span>${esc(e.course_hint||'Blackboard')}</span></div></article>`).join('')}</div>`:'<div class="bb9Empty">No hay próximas fechas publicadas.</div>'}${changes.length?`<div class="bb9Changes"><small>CAMBIOS</small>${changes.map(c=>`<div><b>${esc(c.change_type==='created'?'nuevo':c.change_type==='updated'?'actualizado':c.change_type)}</b><span>${esc(c.title||c.entity_type)}</span><time>${ago9(c.created_at)}</time></div>`).join('')}</div>`:''}${bb9.token&&!bb9.extension?`<div class="bb9BridgeHint"><span>El calendario ya se sincroniza solo. Para archivos, anuncios, mensajes y contenido:</span><a href="${BB9_INSTALL}">instalar Blackboard Bridge</a></div>`:''}</div></section>`
}
function mount9(){
 if(view==='session')return;
 const anchor=document.querySelector('#communityV7')||document.querySelector('.top');if(!anchor)return;
 let el=document.querySelector('#bb9');if(el)el.outerHTML=panelHTML9();else anchor.insertAdjacentHTML('afterend',panelHTML9());wirePanel9();
}
function wirePanel9(){
 const b=$('#bb9Toggle'),body=$('#bb9Body');if(b&&body)b.onclick=()=>body.classList.toggle('open');
 $('#bb9Sync')?.addEventListener('click',sync9);
}
async function load9(){
 if(!bb9.token){mount9();return}
 try{await bbCall9('calendar-sync','POST',{});}catch{}
 try{bb9.data=await bbCall9('data');bb9.state='ok'}catch(e){bb9.state='error'}
 mount9();decorateCourse9();
}
async function sync9(){
 if(!bb9.token)return;
 bb9.state='syncing';mount9();
 try{await bbCall9('calendar-sync','POST',{});}catch{}
 if(bb9.extension)window.postMessage({source:'prometeo-study-library',type:'PROMETEO_BB_SYNC'},'*');
 setTimeout(load9,bb9.extension?1800:150);
}
function pair9(){if(!bb9.token||!bb9.extension)return;window.postMessage({source:'prometeo-study-library',type:'PROMETEO_BB_PAIR',token:bb9.token},'*')}
function ping9(){window.postMessage({source:'prometeo-study-library',type:'PROMETEO_BB_STATUS'},'*')}
window.addEventListener('message',e=>{
 const m=e.data;if(e.source!==window||!m||m.source!=='prometeo-blackboard-bridge')return;
 if(m.type==='PROMETEO_BB_READY'){bb9.extension=true;mount9();pair9();setTimeout(ping9,120)}
 if(m.type==='PROMETEO_BB_STATUS_RESULT'){bb9.extension=true;bb9.paired=!!m.result?.paired;mount9()}
 if(m.type==='PROMETEO_BB_EVENT'){bb9.extension=true;bb9.lastEvent=m.data;bb9.state=m.data?.state||bb9.state;mount9();if(['ok','page_captured'].includes(m.data?.state))setTimeout(load9,300)}
 if(m.type==='PROMETEO_BB_RESULT'){bb9.extension=true;if(m.error)bb9.state='error';else if(m.result?.needs_login)bb9.state='needs_login';else bb9.state='ok';mount9();setTimeout(load9,250)}
});
function matchCourse9(){if(view!=='course'||!course||!bb9.data)return null;const local=norm9(C[course]?.name);let best=null,score=0;for(const c of bb9.data.courses||[]){const n=norm9(c.title);let s=n===local?100:n.includes(local)||local.includes(n)?80:0;if(s>score){score=s;best=c}}return score>=80?best:null}
function decorateCourse9(){
 if(view!=='course')return;const hero=document.querySelector('.courseHero');if(!hero)return;const m=matchCourse9();let e=document.querySelector('#bbCourse9');if(e)e.remove();const items=m?(bb9.data.items||[]).filter(x=>x.course_key===m.course_key):[];const ann=items.filter(x=>/announcement/.test(x.item_type)).length,files=items.filter(x=>x.item_type==='file').length;hero.insertAdjacentHTML('afterend',`<div class="bbCourse9" id="bbCourse9"><span><i class="bb9Dot ${m?'live':''}"></i>Blackboard</span>${m?`<b>${esc(m.title)}</b><span>${files} archivos · ${ann} anuncios · ${items.length} elementos</span>`:'<span>todavía no vinculé esta materia automáticamente</span>'}</div>`)}
renderLibrary=function(){old9.renderLibrary();setTimeout(()=>{mount9();load9()},50)};
renderCourse=function(){old9.renderCourse();setTimeout(()=>{mount9();load9()},50)};
renderSession=function(){old9.renderSession()};
setTimeout(()=>{mount9();load9();setTimeout(()=>{window.postMessage({source:'prometeo-study-library',type:'PROMETEO_BB_STATUS'},'*')},400)},120);
setInterval(()=>{if(bb9.token)load9()},10*60*1000);
})();
