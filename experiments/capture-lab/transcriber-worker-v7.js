import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';
let transcriber=null, selected=null, loading=null, draining=false;
const queue=[];
const post=(type,p={})=>self.postMessage({type,...p});
const errObj=e=>({name:e?.name||'Error',message:e?.message||String(e),stack:String(e?.stack||'').slice(0,1800)});

async function ensureEngine(jobId){
 if(transcriber)return transcriber;
 if(loading)return loading;
 loading=(async()=>{
  const hasGPU=!!self.navigator.gpu;
  const baseDtype={encoder_model:'fp32',decoder_model_merged:'q4'};
  const smallGpuDtype={encoder_model:'fp16',decoder_model_merged:'q4'};
  const attempts=[];
  // v7 quality experiment: one level up for short Spanish notes.
  // Preserve the accepted base path as automatic fallback.
  if(hasGPU) attempts.push({model:'onnx-community/whisper-small',device:'webgpu',dtype:smallGpuDtype,profile:'preciso'});
  if(hasGPU) attempts.push({model:'onnx-community/whisper-base',device:'webgpu',dtype:baseDtype,profile:'respaldo'});
  attempts.push({model:'onnx-community/whisper-base',device:'wasm',dtype:baseDtype,profile:'respaldo'});
  let last=null;
  for(const a of attempts){
   try{
    post('stage',{jobId,stage:'MODEL_LOADING',detail:`${a.model.split('/').pop()} · ${a.device} · ${a.profile}`});
    const progress_callback=p=>{
      if(p?.status==='ready'||p?.status==='done')return;
      if(p?.file)post('stage',{jobId,stage:'MODEL_LOADING',detail:`${a.device} · ${String(p.file).split('/').pop()}`});
    };
    transcriber=await pipeline('automatic-speech-recognition',a.model,{device:a.device,dtype:a.dtype,progress_callback});
    selected=a;
    post('engine',{model:a.model.split('/').pop(),device:a.device,dtype:a.dtype,profile:a.profile});
    post('stage',{jobId,stage:'MODEL_READY',detail:`${a.model.split('/').pop()} · ${a.device} · ${a.profile}`});
    return transcriber;
   }catch(e){
    last=e;
    post('stage',{jobId,stage:'MODEL_ATTEMPT_FAILED',detail:`${a.model.split('/').pop()} · ${a.device}: ${e?.message||e}`});
    try{await transcriber?.dispose?.()}catch{}
    transcriber=null;
   }
  }
  throw last||new Error('No se pudo iniciar ningún backend de Whisper');
 })().finally(()=>loading=null);
 return loading;
}

async function run(item){
 const {jobId,audio}=item;
 try{
  post('stage',{jobId,stage:'WAITING_ENGINE',detail:'Preparando motor local'});
  const pipe=await ensureEngine(jobId);
  post('stage',{jobId,stage:'INFERENCE',detail:`${selected?.model?.split('/').pop()||'Whisper'} · español · ${selected?.profile||'auto'}`});
  const out=await pipe(audio,{language:'spanish',task:'transcribe',chunk_length_s:30,stride_length_s:5,return_timestamps:false});
  post('result',{jobId,text:out?.text||''});
 }catch(e){post('error',{jobId,stage:'WORKER_FAILED',...errObj(e)})}
}

async function drain(){
 if(draining)return;
 draining=true;
 try{while(queue.length){await run(queue.shift())}}finally{draining=false}
}

self.onmessage=e=>{
 const m=e.data||{};
 if(m.type!=='transcribe')return;
 queue.push(m);
 post('stage',{jobId:m.jobId,stage:'WORKER_QUEUED',detail:`cola ${queue.length}`});
 drain();
};
