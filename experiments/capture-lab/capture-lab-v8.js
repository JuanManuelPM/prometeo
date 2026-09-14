const ENDPOINT='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/prometeo-live-lab-v1';
const KEY_STORE='prometeoLiveLabKey';
const NOTES_KEY='captureLabNotes';

const frag=new URLSearchParams(location.hash.replace(/^#/,''));
const incomingKey=frag.get('k');
if(incomingKey){
  localStorage.setItem(KEY_STORE,incomingKey);
  history.replaceState(null,'',location.pathname+location.search);
}
const labKey=()=>localStorage.getItem(KEY_STORE)||'';
function currentNotes(){try{return JSON.parse(localStorage.getItem(NOTES_KEY)||'[]')}catch{return[]}}

let syncTimer=null;
async function syncRemote(notes=currentNotes()){
  const key=labKey();
  if(!key)return {ok:false,error:'LAB_NOT_LINKED'};
  try{
    const r=await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json','x-live-lab-key':key},body:JSON.stringify({action:'sync',notes})});
    return await r.json();
  }catch(e){return {ok:false,error:'SYNC_FAILED',message:String(e?.message||e)}}
}
function queueSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncRemote(),120)}

const nativeSetItem=Storage.prototype.setItem;
Storage.prototype.setItem=function(k,v){const out=nativeSetItem.call(this,k,v);if(this===localStorage&&k===NOTES_KEY)queueSync();return out};

await import('./capture-lab-v7.js?v=8');
queueSync();

const prepare=document.querySelector('.spring[data-action="prepare"]');
if(prepare){
  const fresh=prepare.cloneNode(true);fresh.dataset.b='remote';prepare.replaceWith(fresh);
  const knob=fresh.querySelector('.springKnob');let on=false,start=0,x=0;
  const max=()=>fresh.clientWidth-knob.clientWidth-8;
  const draw=()=>knob.style.transform=`translateX(${x}px)`;
  const humanStatus=text=>{const c=document.querySelector('#count');if(c)c.textContent=text};
  async function launch(){
    const popup=window.open('about:blank','_blank');
    humanStatus('preparando…');
    try{
      await syncRemote(currentNotes());
      const r=await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json','x-live-lab-key':labKey()},body:JSON.stringify({action:'dispatch'})});
      const data=await r.json();
      if(!r.ok||!data?.chatgpt_url){popup?.close();humanStatus(data?.error==='NO_NEW_NOTES'?'sin notas nuevas':'error · reintentar');return}
      humanStatus(`enviado · ${data.note_count}`);
      if(popup)popup.location.href=data.chatgpt_url;else location.href=data.chatgpt_url;
    }catch(e){popup?.close();humanStatus('error · reintentar');console.error(e)}
  }
  knob.onpointerdown=e=>{on=true;start=e.clientX-x;knob.setPointerCapture(e.pointerId)};
  knob.onpointermove=e=>{if(!on)return;x=Math.min(max(),Math.max(0,e.clientX-start));draw()};
  knob.onpointerup=()=>{if(!on)return;on=false;const fire=x>max()*.82;if(fire){x=max();draw();launch()}setTimeout(()=>{x=0;knob.style.transition='transform .28s';draw();setTimeout(()=>knob.style.transition='',300)},fire?220:0)};
}

const model=document.querySelector('#dmodel');if(model)model.textContent='whisper-small → base';
