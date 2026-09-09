import {CaptureStore} from './store.js';
import {RecorderController,TranscriptionQueue,microphoneDiagnostics} from './recorder.js';
import {CaptureRemote} from './remote.js';
import {V53CaptureHost} from './v53-host.js';

const frame=document.getElementById('prometeoFrame');
const status=document.getElementById('p4Status');
const dispatch=document.getElementById('p4Dispatch');
const dispatchText=document.getElementById('p4DispatchText');
const copyButton=document.getElementById('p4Copy');
const chatButton=document.getElementById('p4Chat');

let host=null;
let ownership=null;
const store=new CaptureStore();
const remote=new CaptureRemote({onState:s=>setStatus(s.linked?'privado · vinculado':s.error?'privado · sin vínculo':'local')});
const workerURL=new URL('./transcription-worker.js',import.meta.url).href;
const recorder=new RecorderController({
  store,
  ownership:null,
  contextProvider:async()=>{if(!host)throw new Error('Prometeo todavía está cargando');return host.context()},
  onState:s=>setStatus(s.active?(s.paused?'grabación pausada':'grabando'):'listo'),
  onSaved:()=>setStatus('audio guardado · transcripción en cola')
});
const queue=new TranscriptionQueue({store,workerURL,quality:'small',onChange:async c=>{
  if(c.transcript_revision){setStatus(`transcripta · ${c.metadata?.remote_revision?'sincronizada':'pendiente'}`);try{const out=await remote.syncCapture(c);await store.putCapture(out.capture)}catch{}}
  host?.reconcile();
}});

frame.addEventListener('load',async()=>{
  try{
    const [catalog,manifest]=await Promise.all([
      fetch('/prometeo/catalog/pages.json',{cache:'no-store'}).then(r=>r.json()),
      fetch('/prometeo/catalog/CATALOG_MANIFEST.json',{cache:'no-store'}).then(r=>r.json())
    ]);
    ownership=frame.contentWindow?.PrometeoOwnership||globalThis.PrometeoOwnership||null;
    recorder.ownership=ownership;
    host=new V53CaptureHost({
      frameWindow:frame.contentWindow,
      catalog,
      catalogManifest:manifest,
      store,
      recorder,
      queue,
      remote,
      ownership,
      assetBase:new URL('./',import.meta.url).href,
      onPatent:showPatent
    });
    await queue.init();
    await host.mount();
    const d=await microphoneDiagnostics();
    setStatus(d.secure_context&&d.get_user_media&&d.media_recorder?'listo · mic compatible':'mic no disponible');
    if(remote.hasSecret())remote.connect().catch(()=>{});
  }catch(error){console.error(error);setStatus(`error · ${error.message}`)}
});

function showPatent(result){
  const command=result.command||`PROMETEO PATENT · ${result.patent_code}\n${result.patent_url||''}`;
  dispatchText.value=command;dispatch.hidden=false;
}
copyButton?.addEventListener('click',async()=>{await navigator.clipboard.writeText(dispatchText.value);setStatus('patente copiada')});
chatButton?.addEventListener('click',async()=>{await navigator.clipboard.writeText(dispatchText.value);window.open('https://chatgpt.com/','_blank','noopener')});
document.getElementById('p4CloseDispatch')?.addEventListener('click',()=>dispatch.hidden=true);
document.getElementById('p4Diag')?.addEventListener('click',async()=>{const d=await microphoneDiagnostics();alert(JSON.stringify(d,null,2))});
function setStatus(text){if(status)status.textContent=text}
