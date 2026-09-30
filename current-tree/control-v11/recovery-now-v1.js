(function(){
'use strict';

const VERSION='1.0.0';
const INDEX='../../coordination/chat-recovery/INDEX.json';
const indexUrl=()=>new URL(INDEX,location.href);

const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]));
async function json(url){try{const r=await fetch(url,{cache:'no-store'});return r.ok?await r.json():null}catch{return null}}
async function copy(text){
  try{await navigator.clipboard.writeText(text);return true}catch{
    const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;
  }
}
function toast(text){
  let el=document.getElementById('recoveryNowToastV1');
  if(!el){el=document.createElement('div');el.id='recoveryNowToastV1';el.className='continuity-toast';document.body.appendChild(el)}
  el.textContent=text;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),1600);
}
const locatorId=entry=>{
  const id=String(entry?.chat_locator_id||'').trim();
  return /^CHATLOC-[A-Z0-9][A-Z0-9._-]*$/.test(id)?id:null;
};
const locatorRef=entry=>{
  const ref=String(entry?.entry_ref||'').trim();
  return /^entries\/[A-Z0-9][A-Z0-9._-]*\.json$/i.test(ref)?ref:null;
};
function eligibleEntries(index){
  const rows=(index?.entries||[])
    .filter(entry=>entry?.ui_projection?.control_room_now===true&&entry?.ui_projection?.authority_effect==='NONE')
    .map(entry=>({entry,id:locatorId(entry),ref:locatorRef(entry)}))
    .filter(row=>row.id&&row.ref)
    .sort((a,b)=>
      String(b.entry.source_last_material_at||b.entry.published_at||'').localeCompare(String(a.entry.source_last_material_at||a.entry.published_at||''))||
      a.id.localeCompare(b.id)||
      a.ref.localeCompare(b.ref)
    );
  const firstById=new Map(),conflicts=new Set();
  for(const row of rows){
    const prior=firstById.get(row.id);
    if(!prior)firstById.set(row.id,row);
    else if(prior.ref!==row.ref)conflicts.add(row.id);
  }
  return [...firstById.values()].filter(row=>!conflicts.has(row.id)).map(row=>row.entry);
}
function entryUrl(entry){return new URL(entry.entry_ref,indexUrl()).href}
let renderGeneration=0;
async function render(){
  const generation=++renderGeneration;
  const root=document.getElementById('now');if(!root)return false;
  root.querySelectorAll('.recovery-now-v1').forEach(el=>el.remove());
  root.querySelector('.ideas-now-v1')?.remove();
  root.querySelector('.stt-now-canary-v1')?.remove();

  const index=await json(INDEX);
  if(generation!==renderGeneration)return false;
  const entries=eligibleEntries(index);
  if(!entries.length)return false;
  const api=window.PROMETEO_CONTINUITY_V1;if(!api)return false;

  const detailPairs=await Promise.all(entries.map(async entry=>[entry.chat_locator_id,await json(entryUrl(entry))]));
  if(generation!==renderGeneration)return false;
  const details=new Map(detailPairs);
  root.querySelectorAll('.recovery-now-v1').forEach(el=>el.remove());
  const section=document.createElement('section');section.className='section recovery-now-v1';
  const cards=entries.map(entry=>{
    const detail=details.get(entry.chat_locator_id);
    const ideas=(detail?.important_ideas||entry.important_ideas||[]).slice(0,5);
    const summary=ideas.length?ideas.map((x,i)=>(i+1)+'. '+x).join(' · '):(detail?.summary||entry.purpose||(entry.status||[]).join(' · '));
    const purpose=detail?.purpose||entry.purpose||'';
    const project=entry.project_name||detail?.project_name||entry.project||'Prometeo';
    const avatar=entry.deep_read?'🧭':'💬';
    return '<article class="history-session recovery-card" data-now-conversation="'+esc(entry.chat_locator_id)+'">'+
      '<div class="history-avatar fallback">'+avatar+'</div><div>'+
        '<div class="history-session-top"><b>'+esc(entry.title||detail?.chat_title||entry.chat_locator_id)+'</b><time>'+esc(project)+'</time></div>'+
        '<div class="history-focus">'+esc(purpose)+'</div>'+
        '<div class="history-session-summary">'+esc(summary)+'</div>'+
        '<div class="history-session-status"><span class="history-handoff ready">RECOVERY V2</span> <span>sin authority nueva</span></div>'+
        '<div class="history-session-actions"><button data-recovery-now-search="'+esc(entry.chat_locator_id)+'">Buscar</button><button class="primary" data-recovery-now-adopt="'+esc(entry.chat_locator_id)+'">Adoptar</button><a href="'+esc(entryUrl(entry))+'" target="_blank" rel="noopener">Evidencia ↗</a></div>'+
      '</div></article>';
  }).join('');

  section.innerHTML='<div class="section-head"><div class="section-title">Conversaciones</div><div class="section-action">Chat Recovery V2 · proyección genérica</div></div>'+cards;
  const activity=root.querySelector('.live-work-v1');
  if(activity)activity.insertAdjacentElement('afterend',section);else root.prepend(section);

  section.querySelectorAll('[data-recovery-now-search]').forEach(btn=>btn.addEventListener('click',async()=>{
    const entry=entries.find(x=>x.chat_locator_id===btn.dataset.recoveryNowSearch);if(!entry)return;
    await copy(api.recoverySearchPrompt(entry));toast('Locator copiado');
  }));
  section.querySelectorAll('[data-recovery-now-adopt]').forEach(btn=>btn.addEventListener('click',async()=>{
    const entry=entries.find(x=>x.chat_locator_id===btn.dataset.recoveryNowAdopt);if(!entry)return;
    await copy(api.recoveryAdoptPrompt(entry,details.get(entry.chat_locator_id)));toast('Prompt de adopción copiado');
  }));
  return true;
}
function install(){
  const api=window.PROMETEO_CONTINUITY_V1;
  if(api&&!api.__recoveryNowWrapped){
    const base=api.decorateNow;
    api.decorateNow=async function(){const result=await base?.();await render();return result};
    api.__recoveryNowWrapped=true;
  }
  if(document.querySelector('.view#ahora.on'))setTimeout(render,0);
  window.addEventListener('PROMETEO_V11_DATA',()=>{if(document.querySelector('.view#ahora.on'))setTimeout(render,0)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();

window.PROMETEO_RECOVERY_NOW_V1={version:VERSION,selector:'ui_projection.control_room_now=true',eligibleEntries,render};
})();
