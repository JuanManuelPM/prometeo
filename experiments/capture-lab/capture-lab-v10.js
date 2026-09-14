const NativeOpen = window.open.bind(window);
const HANDOFF_KEY = 'prometeoLastHandoffV10';

function isLikelyMobile(){
  try{
    return matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }catch{return false}
}

function parsePromptFromChatGPTUrl(url){
  try{
    const u = new URL(url, location.href);
    if(u.hostname.endsWith('chatgpt.com')) return u.searchParams.get('q') || '';
  }catch{}
  return '';
}

function saveHandoff(url){
  const prompt = parsePromptFromChatGPTUrl(url);
  const row = {url, prompt, at:Date.now()};
  localStorage.setItem(HANDOFF_KEY, JSON.stringify(row));
  return row;
}

function currentHandoff(){
  try{return JSON.parse(localStorage.getItem(HANDOFF_KEY)||'null')}catch{return null}
}

function sameTabPopupShim(){
  let closed = false;
  const locationShim = {};
  Object.defineProperty(locationShim,'href',{
    get(){return 'about:blank'},
    set(v){
      if(closed || !v) return;
      saveHandoff(String(v));
      window.location.assign(String(v));
    }
  });
  return {
    get closed(){return closed},
    close(){closed=true},
    location:locationShim,
    focus(){},
  };
}

if(isLikelyMobile()){
  window.open = function(url='', target='', features=''){
    if(String(url)==='about:blank' && String(target)==='_blank') return sameTabPopupShim();
    return NativeOpen(url,target,features);
  };
}

await import('./capture-lab-v9.js?v=10');

function ensureRescue(){
  let box=document.querySelector('#v10Rescue');
  if(box) return box;
  box=document.createElement('aside');
  box.id='v10Rescue';
  box.innerHTML=`<div class="v10RescueText"><b>Último envío</b><small></small></div><a class="v10Open" href="#">Abrir</a><button class="v10Copy">Copiar</button><button class="v10Share">Compartir</button><button class="v10Close" aria-label="ocultar">×</button>`;
  document.body.append(box);
  return box;
}

async function copyText(text){
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return}
  const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();document.execCommand('copy');ta.remove();
}

function renderRescue(){
  const row=currentHandoff();
  const box=ensureRescue();
  const fresh=row && Date.now()-Number(row.at||0) < 12*60*60*1000;
  box.classList.toggle('show',!!fresh);
  if(!fresh) return;
  box.querySelector('small').textContent = row.prompt?.split('\n')?.[0] || 'handoff listo';
  const a=box.querySelector('.v10Open');a.href=row.url;a.onclick=()=>{};
  box.querySelector('.v10Copy').onclick=async()=>{
    try{await copyText(row.prompt||row.url); flash('Copiado')}catch{flash('No pude copiar')}
  };
  const share=box.querySelector('.v10Share');
  share.hidden=!navigator.share;
  share.onclick=async()=>{
    try{await navigator.share({title:'Prometeo',text:row.prompt||row.url})}catch{}
  };
  box.querySelector('.v10Close').onclick=()=>box.classList.remove('show');
}

function flash(text){
  const box=ensureRescue(), b=box.querySelector('.v10RescueText b');
  const prior=b.textContent;b.textContent=text;setTimeout(()=>b.textContent=prior,1000);
}

const style=document.createElement('style');
style.textContent=`
#v10Rescue{position:fixed;z-index:79;left:50%;bottom:calc(104px + env(safe-area-inset-bottom));transform:translate(-50%,14px);width:min(640px,calc(100% - 28px));display:grid;grid-template-columns:1fr auto auto auto 26px;gap:7px;align-items:center;padding:8px 8px 8px 11px;border-radius:16px;border:1px solid #ffffff12;background:#111b28f2;backdrop-filter:blur(14px);box-shadow:0 16px 45px #0008;opacity:0;pointer-events:none;transition:.2s}
#v10Rescue.show{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.v10RescueText{min-width:0}.v10RescueText b{display:block;font-size:11px;font-weight:650}.v10RescueText small{display:block;margin-top:2px;color:#71839a;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v10Rescue a,#v10Rescue button{border:0;border-radius:10px;padding:8px 9px;background:#203149;color:#aebfd2;font-size:9px;text-decoration:none}#v10Rescue .v10Open{background:#2a405c;color:#d1dce8}.v10Close{background:transparent!important;padding:5px!important;font-size:17px!important;color:#6f8094!important}
@media(min-width:900px){#v10Rescue{bottom:20px}}
`;
document.head.append(style);

renderRescue();
window.addEventListener('pageshow',renderRescue);
window.addEventListener('focus',()=>setTimeout(renderRescue,80));
