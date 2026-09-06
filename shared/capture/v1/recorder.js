import {createCapture,attachDurableAudio,transitionProcessing,appendTranscriptRevision,markSync,validateCapture} from './capture-core.js';

const fail=(code,message,detail={})=>{const e=new Error(message);e.code=code;e.detail=detail;throw e};

export async function microphoneDiagnostics(){
  let permission='unknown';
  try{const p=await navigator.permissions?.query?.({name:'microphone'});permission=p?.state||'unknown'}catch{}
  return Object.freeze({
    secure_context:!!globalThis.isSecureContext,
    get_user_media:!!navigator.mediaDevices?.getUserMedia,
    media_recorder:typeof MediaRecorder!=='undefined',
    permission,
    supported_mime:supportedMime()
  });
}

export function supportedMime(){
  const choices=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'];
  return choices.find(x=>globalThis.MediaRecorder?.isTypeSupported?.(x))||'';
}

export class RecorderController{
  constructor({store,onState=()=>{},onSaved=()=>{},contextProvider,ownership=null}={}){
    if(!store)fail('PROMETEO_RECORDER_STORE','CaptureStore required');
    if(typeof contextProvider!=='function')fail('PROMETEO_RECORDER_CONTEXT','contextProvider required');
    this.store=store;this.onState=onState;this.onSaved=onSaved;this.contextProvider=contextProvider;this.ownership=ownership;
    this.stream=null;this.session=null;this.releaseTimer=null;this.focusLease=null;
  }
  async ensureStream(){
    clearTimeout(this.releaseTimer);
    if(this.stream?.active)return this.stream;
    if(!globalThis.isSecureContext||!navigator.mediaDevices?.getUserMedia)fail('PROMETEO_MIC_SECURE_CONTEXT','Open Prometeo through HTTPS to use the microphone');
    this.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    return this.stream;
  }
  async start(){
    if(this.session)return this.state();
    const context=await this.contextProvider();
    const capture=createCapture({context,privacy:'LOCAL',metadata:{capture_runtime:'shared/capture/v1'}});
    const stream=await this.ensureStream();const mime=supportedMime();
    const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
    const chunks=[];const started=performance.now();
    if(this.ownership?.acquireFocus){
      const top=this.ownership.snapshot?.().focus?.at(-1)||null;
      this.focusLease=this.ownership.acquireFocus('capture.voice',{parentLeaseId:top?.id||null,restoreKey:'capture:return',scope:'voice-recording'});
    }
    this.session={capture,rec,chunks,started,elapsed:0,paused:false,discard:false};
    rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
    rec.start(250);this.onState(this.state());return this.state();
  }
  pauseResume(){
    const s=this.session;if(!s)return;
    if(s.paused){try{s.rec.resume()}catch{};s.paused=false;s.started=performance.now()}
    else{s.elapsed+=performance.now()-s.started;try{s.rec.pause()}catch{};s.paused=true}
    this.onState(this.state());
  }
  state(){const s=this.session;if(!s)return{active:false,paused:false,elapsed:0,capture_id:null};let elapsed=s.elapsed;if(!s.paused)elapsed+=performance.now()-s.started;return{active:true,paused:s.paused,elapsed,capture_id:s.capture.id}}
  async save(){
    const s=this.session;if(!s)return null;this.session=null;
    const stopped=new Promise((resolve,reject)=>{const old=s.rec.onstop;s.rec.onstop=async()=>{try{old?.();resolve()}catch(e){reject(e)}}});
    try{s.rec.stop()}catch(e){this.releaseFocus();throw e}
    this.onState(this.state());await stopped;
    try{
      const blob=new Blob(s.chunks,{type:s.rec.mimeType||supportedMime()||'audio/webm'});
      if(blob.size<350)fail('PROMETEO_MIC_EMPTY','The recording is empty');
      const digest=await blobDigest(blob);
      let capture=attachDurableAudio(s.capture,{digest,mime:blob.type,size:blob.size,local_ref:`idb:${s.capture.id}:audio`});
      // Atomic local durability boundary: the Blob and its identity are persisted before QUEUED exists.
      await this.store.putAudioBlob(capture,blob);
      capture=transitionProcessing(capture,'QUEUED');
      await this.store.putCapture(capture);
      this.onSaved(capture);this.releaseSoon();this.releaseFocus();return capture;
    }catch(e){
      let failed=s.capture;try{failed=transitionProcessing(failed,'ERROR',{error:e?.message||String(e)});await this.store.putCapture(failed)}catch{}
      this.releaseSoon();this.releaseFocus();throw e;
    }
  }
  discard(){const s=this.session;if(!s)return;this.session=null;s.discard=true;try{s.rec.stop()}catch{};this.onState(this.state());this.releaseSoon();this.releaseFocus()}
  releaseFocus(){if(this.focusLease&&this.ownership?.releaseFocus){try{this.ownership.releaseFocus(this.focusLease)}catch{}this.focusLease=null}}
  releaseSoon(){clearTimeout(this.releaseTimer);this.releaseTimer=setTimeout(()=>{if(this.session)return;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null},900)}
  close(){clearTimeout(this.releaseTimer);this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.releaseFocus()}
}

export class TranscriptionQueue{
  constructor({store,workerURL,onChange=()=>{},quality='small'}={}){if(!store||!workerURL)fail('PROMETEO_QUEUE_CONFIG','store and workerURL required');this.store=store;this.workerURL=workerURL;this.onChange=onChange;this.quality=quality;this.worker=null;this.processing=false;this.activeId=null}
  async init(){
    for(const c of await this.store.listQueue()){
      if(['MODEL_LOADING','TRANSCRIBING'].includes(c.processing_state)){const reset=transitionProcessing(c,'QUEUED');await this.store.putCapture(reset)}
      else if(c.processing_state==='SAVED_LOCAL'){const q=transitionProcessing(c,'QUEUED');await this.store.putCapture(q)}
    }
    this.process();
  }
  ensureWorker(){
    if(this.worker)return this.worker;
    const w=new Worker(this.workerURL,{type:'module'});
    w.onmessage=async e=>{
      const d=e.data||{};if(d.type==='model-ready'||!d.id)return;
      let c=await this.store.getCapture(d.id);if(!c)return;
      try{
        if(d.type==='status')c=transitionProcessing(c,d.status);
        if(d.type==='done'){
          const text=String(d.text||'').replace(/\s+/g,' ').trim();
          const td=await textDigest(text);
          c=appendTranscriptRevision(c,{text,state:'MACHINE',source:'whisper',model:d.model||d.tier||null,digest:td});
          c=markSync(c,'PENDING');this.processing=false;this.activeId=null;
        }
        if(d.type==='error'){
          c=transitionProcessing(c,'ERROR',{error:d.error||'Transcription failed'});this.processing=false;this.activeId=null;
        }
        await this.store.putCapture(c);this.onChange(c,d);
      }finally{if(d.type==='done'||d.type==='error')this.process()}
    };
    w.onerror=()=>{this.processing=false;this.activeId=null;this.process()};this.worker=w;return w;
  }
  warmup(){try{this.ensureWorker().postMessage({type:'warmup',quality:this.quality})}catch{}}
  async process(){
    if(this.processing)return;
    const queue=await this.store.listQueue();const next=queue.find(c=>c.processing_state==='QUEUED'&&c.audio?.present);if(!next)return;
    const blob=await this.store.getAudioBlob(next.id);if(!blob){const bad=transitionProcessing(next,'ERROR',{error:'Durable audio Blob missing'});await this.store.putCapture(bad);this.onChange(bad);return this.process()}
    this.processing=true;this.activeId=next.id;let loading=transitionProcessing(next,'MODEL_LOADING');await this.store.putCapture(loading);this.onChange(loading);
    try{const pcm=await decode16k(blob);this.ensureWorker().postMessage({type:'transcribe',id:next.id,audio:pcm.buffer,quality:this.quality},[pcm.buffer])}
    catch(e){let bad=transitionProcessing(loading,'ERROR',{error:e?.message||String(e)});await this.store.putCapture(bad);this.processing=false;this.activeId=null;this.onChange(bad);this.process()}
  }
  retry(id){return this.store.getCapture(id).then(async c=>{if(!c)return false;const q=transitionProcessing(c,'QUEUED');await this.store.putCapture(q);this.process();return true})}
  close(){try{this.worker?.terminate()}catch{};this.worker=null;this.processing=false;this.activeId=null}
}

export async function blobDigest(blob){const h=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function textDigest(text){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(text)));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}

async function decode16k(blob){
  const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)fail('PROMETEO_AUDIO_CONTEXT','AudioContext unavailable');const ctx=new AC();
  try{const decoded=await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0));const mono=new Float32Array(decoded.length);for(let c=0;c<decoded.numberOfChannels;c++){const data=decoded.getChannelData(c);for(let i=0;i<decoded.length;i++)mono[i]+=data[i]/decoded.numberOfChannels}if(decoded.sampleRate===16000)return mono;const ratio=decoded.sampleRate/16000;const out=new Float32Array(Math.max(1,Math.round(mono.length/ratio)));for(let i=0;i<out.length;i++){const p=i*ratio,a=Math.floor(p),b=Math.min(a+1,mono.length-1),f=p-a;out[i]=mono[a]*(1-f)+mono[b]*f}return out}finally{try{await ctx.close()}catch{}}
}
