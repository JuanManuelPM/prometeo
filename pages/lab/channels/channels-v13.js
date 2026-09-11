(()=>{
'use strict';
let pending=false,opening=false;
const q=s=>document.querySelector(s);
function quotaNeeded(){const health=q('#v10Live'),hf=q('[data-provider="huggingface_zerogpu"]');return !!health&&/capacidad|sin cuota/i.test(health.textContent||'')&&!!hf&&/sin conectar|guardado|rechazada/i.test(hf.textContent||'')}
function openHF(){
  pending=true;
  q('#v11Rail [data-studio="sources"]')?.click();
  q('#v5Creative [data-v5="sources"]')?.click();
  queueMicrotask(resolveHF);
}
function resolveHF(){
  if(!pending||opening)return;
  const row=q('[data-provider="huggingface_zerogpu"]');
  if(!row)return;
  opening=true;pending=false;row.click();
  setTimeout(()=>{q('#v5ConnectBox')?.scrollIntoView({block:'center',behavior:'smooth'});opening=false},80);
}
function addFallbackCTA(){
  const out=q('#v5Output');if(!out||out.querySelector('[data-hf-quota]'))return;
  if(!/pools IA gratuitos están ocupados|ZeroGPU sin cuota|sin cuota ahora/i.test(out.textContent||''))return;
  const row=document.createElement('div');row.className='v5-compose-row';row.innerHTML='<button class="v5-inline" data-hf-quota>ampliar cuota gratis →</button><span>un token HF · todos los motores ZeroGPU</span>';out.appendChild(row);
}
function addSourcesGate(){
  const host=q('#v5Host'),live=q('#v10Live');if(!host||!live)return;
  const old=q('#v13QuotaGate');
  if(!quotaNeeded()){old?.remove();return}
  if(old)return;
  const gate=document.createElement('div');gate.id='v13QuotaGate';gate.className='v5-source-head';gate.innerHTML='<div><b>ZeroGPU llegó al límite anónimo</b><span>un único token gratuito amplía FLUX, LTX Fast, LTX‑2.5 y MiniMax</span></div><button class="v5-inline" data-hf-quota>conectar Hugging Face →</button>';
  live.before(gate);
}
document.addEventListener('click',e=>{
  const t=e.target.closest?.('#v7Sources,[data-v9-sources],[data-hf-quota]');if(!t)return;
  if(t.matches('[data-hf-quota]'))e.preventDefault();
  setTimeout(openHF,0);
},true);
const mo=new MutationObserver(()=>queueMicrotask(()=>{addFallbackCTA();addSourcesGate();resolveHF()}));
mo.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
window.addEventListener('creator:probe-updated',()=>setTimeout(addSourcesGate,50));
addFallbackCTA();addSourcesGate();
})();
