(function(){
'use strict';
const CFG=window.PROMETEO_CONTROL_CONFIG_V1||{};
const GRAPH=CFG.capabilityGraphUrl||'../../coordination/semantic-relations/CAPABILITY_GRAPH_V1.json';
const PROFILE='../../coordination/workstreams/chat-native-control-plane-v1/chat-objects/chat-object-prometeo-visual-steward/CHAT_OBJECT.json';
let graph=null,profile=null,loading=null;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function getJson(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(url+' · HTTP '+r.status);return r.json()}
async function load(){if(loading)return loading;loading=Promise.all([getJson(GRAPH),getJson(PROFILE)]).then(([g,p])=>{graph=g;profile=p;return{g,p}}).finally(()=>loading=null);return loading}
function objectByNode(k){return(graph?.objects||[]).find(o=>o.node_key===k)||null}
function objectById(id){return(graph?.objects||[]).find(o=>o.id===id)||null}
function incoming(target,type=null){return(graph?.relations||[]).filter(r=>r.target===target&&(!type||r.type===type))}
function outgoing(source,type=null){return(graph?.relations||[]).filter(r=>r.source===source&&(!type||r.type===type))}
function chips(items){return items.length?'<div class="steward-list">'+items.map(x=>'<span class="steward-chip">'+esc(x)+'</span>').join('')+'</div>':'<span style="opacity:.5">—</span>'}
async function copyText(text){try{await navigator.clipboard.writeText(text);return true}catch{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok}}
function toast(msg){const api=window.PROMETEO_CONTINUITY_V1;if(document.getElementById('continuityToast')){const e=document.getElementById('continuityToast');e.textContent=msg;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),1800)}else console.info(msg)}
function latestChange(targetId){return incoming(targetId,'CHANGES').map(r=>objectById(r.source)).filter(Boolean).sort((a,b)=>new Date(b.occurred_at||0)-new Date(a.occurred_at||0))[0]||null}
function relatedChats(targetId){return incoming(targetId).filter(r=>['DISCUSSES','MODIFIES'].includes(r.type)).map(r=>objectById(r.source)).filter(o=>o?.kind==='CHAT_SESSION')}
function alternatives(targetId){return incoming(targetId,'VARIANT_OF').map(r=>objectById(r.source)).filter(Boolean)}
function patterns(targetId){return outgoing(targetId,'USES_PATTERN').map(r=>objectById(r.target)).filter(Boolean)}
function stewardFor(targetId){return incoming(targetId,'STEWARDS').map(r=>objectById(r.source)).find(o=>o?.kind==='CHAT_OBJECT')||null}
function line(label,content){return '<div class="steward-line"><b>'+esc(label)+'</b><div>'+content+'</div></div>'}
async function render(meta){
 await load();const target=objectByNode(meta?.nodeKey),old=document.getElementById('stewardPanelV1');if(old)old.remove();if(!target)return;
 const steward=stewardFor(target.id),change=latestChange(target.id),alts=alternatives(target.id),chats=relatedChats(target.id),pats=patterns(target.id);
 if(!steward&&!['SURFACE:CONTROL_ROOM','COMPONENT:CONTROL_NAVIGATION'].includes(meta.nodeKey))return;
 const panel=document.createElement('section');panel.id='stewardPanelV1';panel.className='steward-panel';
 const avatar=profile?.cover_image_url?'<img src="'+esc(profile.cover_image_url)+'" alt="">':esc(profile?.emoji||steward?.emoji||'🎨');
 const last=change?esc(change.title||change.id)+' · '+esc(change.status||''):'sin cambio estructurado todavía';
 panel.innerHTML='<div class="steward-head"><div class="steward-avatar">'+avatar+'</div><div><div class="steward-title">'+esc(profile?.short_name||steward?.title||'Visual Steward')+'</div><div class="steward-sub">'+esc(profile?.role||'VISUAL_SYSTEMS_STEWARD')+' · rol/contexto, no authority</div></div></div>'+
  line('last change',last)+line('recent chats',chips(chats.map(x=>x.title)))+line('alternatives',chips(alts.map(x=>x.title)))+line('patterns',chips(pats.map(x=>x.title)))+
  '<div class="steward-actions"><button class="primary" id="stewardNewSession">Nueva sesión Visual Steward</button><button id="stewardHistory">Historial</button></div>';
 const actions=document.querySelector('#drawer .dactions');actions?.parentNode?.insertBefore(panel,actions);
 document.getElementById('stewardNewSession')?.addEventListener('click',async()=>{const fn=window.PROMETEO_CONTINUITY_V1?.specializedBootstrapPrompt;if(!fn)return;await copyText(fn(profile,meta.nodeKey));toast('Bootstrap Visual Steward copiado')});
 document.getElementById('stewardHistory')?.addEventListener('click',()=>document.querySelector('.tab[data-view="historial"]')?.click());
}
const prev=window.PROMETEO_V11_ENTITY_OPENED;
window.PROMETEO_V11_ENTITY_OPENED=meta=>{try{prev?.(meta)}catch{};render(meta).catch(()=>{})};
window.PROMETEO_STEWARD_V1={load,render,profile:()=>profile,graph:()=>graph};
load().catch(()=>{});
})();
