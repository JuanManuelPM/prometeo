(function(){
'use strict';

const LOCATOR='CHATLOC-STT-LIVE-UX-20260929';
const INDEX='../../coordination/chat-recovery/INDEX.json';
const indexUrl=()=>new URL(INDEX,location.href);

const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
async function json(url){try{const r=await fetch(url,{cache:'no-store'});return r.ok?await r.json():null}catch{return null}}
async function copy(text){
  try{await navigator.clipboard.writeText(text);return true}catch{
    const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;
  }
}
function toast(text){
  let el=document.getElementById('sttNowToastV1');
  if(!el){el=document.createElement('div');el.id='sttNowToastV1';el.className='continuity-toast';document.body.appendChild(el)}
  el.textContent=text;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),1600);
}
async function render(){
  const root=document.getElementById('now');if(!root)return false;
  root.querySelector('.stt-now-canary-v1')?.remove();
  const index=await json(INDEX),entry=(index?.entries||[]).find(x=>x.chat_locator_id===LOCATOR);
  if(!entry)return false;
  const api=window.PROMETEO_CONTINUITY_V1;if(!api)return false;
  const section=document.createElement('section');section.className='section stt-now-canary-v1';
  const ideas=(entry.important_ideas||[]).slice(0,5);
  section.innerHTML='<div class="section-head"><div class="section-title">Conversación</div><div class="section-action">Chat Recovery V2 · proyección</div></div>'+
    '<article class="history-session recovery-card" data-now-conversation="'+esc(LOCATOR)+'">'+
      '<div class="history-avatar fallback">🎙️</div><div>'+
        '<div class="history-session-top"><b>'+esc(entry.title||entry.chat_title||'STT Live')+'</b><time>'+esc(entry.project_name||entry.project||'Prometeo')+'</time></div>'+
        '<div class="history-focus">'+esc(entry.purpose||'')+'</div>'+
        '<div class="history-session-summary">'+esc(ideas.map((x,i)=>(i+1)+'. '+x).join(' · '))+'</div>'+
        '<div class="history-session-status"><span class="history-handoff ready">RECOVERY V2</span> <span>sin authority nueva</span></div>'+
        '<div class="history-session-actions"><button data-stt-search>Buscar</button><button class="primary" data-stt-adopt>Adoptar</button><a href="'+esc(new URL(entry.entry_ref,indexUrl()).href)+'" target="_blank" rel="noopener">Evidencia ↗</a></div>'+
      '</div></article>';
  const activity=root.querySelector('.live-work-v1');
  if(activity)activity.insertAdjacentElement('afterend',section);else root.prepend(section);
  section.querySelector('[data-stt-search]')?.addEventListener('click',async()=>{
    await copy(api.recoverySearchPrompt(entry));toast('Locator copiado');
  });
  section.querySelector('[data-stt-adopt]')?.addEventListener('click',async()=>{
    const detail=await json(new URL(entry.entry_ref,indexUrl()).href);
    await copy(api.recoveryAdoptPrompt(entry,detail));toast('Prompt de adopción copiado');
  });
  return true;
}
function install(){
  const api=window.PROMETEO_CONTINUITY_V1;
  if(api&&!api.__sttNowWrapped){
    const base=api.decorateNow;
    api.decorateNow=async function(){const result=await base?.();await render();return result};
    api.__sttNowWrapped=true;
  }
  if(document.querySelector('.view#ahora.on'))setTimeout(render,0);
  window.addEventListener('PROMETEO_V11_DATA',()=>{if(document.querySelector('.view#ahora.on'))setTimeout(render,0)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();

window.PROMETEO_STT_NOW_CANARY_V1={locator:LOCATOR,render};
})();
