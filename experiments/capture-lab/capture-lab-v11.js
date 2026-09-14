const NativeOpen = window.open.bind(window);
const HANDOFF_KEY = 'prometeoLastCopiedHandoffV11';

function promptFromChatGPTUrl(url){
  try{
    const u=new URL(String(url),location.href);
    if(u.hostname.endsWith('chatgpt.com')) return u.searchParams.get('q')||'';
  }catch{}
  return '';
}

function saveHandoff(url,prompt){
  const row={url:String(url||''),prompt:String(prompt||''),at:Date.now()};
  localStorage.setItem(HANDOFF_KEY,JSON.stringify(row));
  return row;
}

function currentHandoff(){
  try{return JSON.parse(localStorage.getItem(HANDOFF_KEY)||'null')}catch{return null}
}

function ensureCopyBar(){
  let box=document.querySelector('#v11CopyBar');
  if(box)return box;
  box=document.createElement('aside');
  box.id='v11CopyBar';
  box.innerHTML=`<div class="v11CopyText"><b>Listo para ChatGPT</b><small>pegá y enviá</small></div><button class="v11Again">Copiar otra vez</button><button class="v11Close" aria-label="ocultar">×</button>`;
  document.body.append(box);
  box.querySelector('.v11Again').onclick=()=>{
    const row=currentHandoff();
    if(row?.prompt)copyHandoff(row.prompt,row.url,true);
  };
  box.querySelector('.v11Close').onclick=()=>box.classList.remove('show');
  return box;
}

function showBar(ok=true){
  const box=ensureCopyBar();
  const b=box.querySelector('.v11CopyText b');
  const s=box.querySelector('.v11CopyText small');
  b.textContent=ok?'Copiado':'Link listo';
  s.textContent=ok?'abrí ChatGPT · pegá · enviar':'tocá “Copiar otra vez”';
  box.classList.add('show');
}

async function clipboardWrite(text){
  if(navigator.clipboard?.writeText){
    try{await navigator.clipboard.writeText(text);return true}catch{}
  }
  try{
    const ta=document.createElement('textarea');
    ta.value=text;
    ta.setAttribute('readonly','');
    ta.style.position='fixed';
    ta.style.left='-9999px';
    ta.style.top='0';
    document.body.append(ta);
    ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);
    const ok=document.execCommand('copy');
    ta.remove();
    return !!ok;
  }catch{return false}
}

async function copyHandoff(prompt,url,manual=false){
  const text=String(prompt||url||'').trim();
  if(!text)return false;
  saveHandoff(url,text);
  const ok=await clipboardWrite(text);
  showBar(ok);
  if(ok){
    try{navigator.vibrate?.(18)}catch{}
  }
  return ok;
}

function clipboardPopupShim(){
  let closed=false;
  const locationShim={};
  Object.defineProperty(locationShim,'href',{
    get(){return 'about:blank'},
    set(v){
      if(closed||!v)return;
      const url=String(v);
      const prompt=promptFromChatGPTUrl(url)||url;
      copyHandoff(prompt,url);
      // Deliberately do NOT navigate. V11 is copy-only by design.
    }
  });
  return {
    get closed(){return closed},
    close(){closed=true},
    location:locationShim,
    focus(){},
  };
}

window.open=function(url='',target='',features=''){
  if(String(url)==='about:blank'&&String(target)==='_blank') return clipboardPopupShim();
  return NativeOpen(url,target,features);
};

await import('./capture-lab-v9.js?v=11');

const style=document.createElement('style');
style.textContent=`
#v11CopyBar{position:fixed;z-index:95;left:50%;bottom:calc(104px + env(safe-area-inset-bottom));transform:translate(-50%,14px);width:min(620px,calc(100% - 28px));display:grid;grid-template-columns:1fr auto 28px;gap:8px;align-items:center;padding:9px 9px 9px 12px;border:1px solid #ffffff12;border-radius:17px;background:#101a27f5;backdrop-filter:blur(15px);box-shadow:0 18px 48px #0008;opacity:0;pointer-events:none;transition:.2s}
#v11CopyBar.show{opacity:1;pointer-events:auto;transform:translate(-50%,0)}
.v11CopyText b{display:block;font-size:12px;font-weight:650;color:#d5dfe9}.v11CopyText small{display:block;margin-top:2px;font-size:9px;color:#73869d}.v11Again{border:0;border-radius:11px;padding:9px 10px;background:#253951;color:#b8c6d5;font-size:9px}.v11Close{border:0;background:transparent;color:#697c92;font-size:18px;padding:4px}
@media(min-width:900px){#v11CopyBar{bottom:22px}}
`;
document.head.append(style);

const old=currentHandoff();
if(old&&Date.now()-Number(old.at||0)<6*60*60*1000)showBar(true);
