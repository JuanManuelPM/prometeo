import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm';

env.allowLocalModels=false;
env.useBrowserCache=true;

let transcriberPromise=null;
let activeId=null;
let selectedModel='';

function modelOrder(){
  const memory=Number(navigator?.deviceMemory||0);
  const cores=Number(navigator?.hardwareConcurrency||0);
  const ua=String(navigator?.userAgent||'');
  const constrained=/Android|iPhone|iPad|Mobile/i.test(ua)||(memory>0&&memory<=4)||(cores>0&&cores<=4);
  return constrained
    ? ['Xenova/whisper-tiny','Xenova/whisper-base']
    : ['Xenova/whisper-small','Xenova/whisper-base','Xenova/whisper-tiny'];
}

async function buildTranscriber(){
  let lastError=null;
  for(const model of modelOrder()){
    try{
      const t=await pipeline('automatic-speech-recognition',model,{device:'wasm',dtype:'q8'});
      selectedModel=model;
      return t;
    }catch(error){lastError=error}
  }
  throw lastError||new Error('No pude cargar un modelo de transcripción.');
}

function getTranscriber(){
  if(!transcriberPromise)transcriberPromise=buildTranscriber().catch(error=>{transcriberPromise=null;throw error});
  return transcriberPromise;
}

self.onmessage=async event=>{
  const data=event.data||{};
  if(data.type==='warmup'){
    try{await getTranscriber();self.postMessage({type:'model-ready',model:selectedModel})}catch(error){self.postMessage({type:'warmup-error',error:error?.message||String(error)})}
    return;
  }
  if(data.type!=='transcribe'||!data.id||!data.audio||activeId)return;
  activeId=data.id;
  try{
    self.postMessage({type:'status',id:data.id,status:'loading'});
    const transcriber=await getTranscriber();
    self.postMessage({type:'status',id:data.id,status:'transcribing',model:selectedModel});
    const result=await transcriber(new Float32Array(data.audio),{
      language:'spanish',task:'transcribe',do_sample:false,temperature:0,
      num_beams:selectedModel.includes('tiny')?3:5,chunk_length_s:30,stride_length_s:5,return_timestamps:false
    });
    const text=String(result?.text||'').replace(/\s+/g,' ').trim();
    if(!text)throw new Error('La transcripción quedó vacía.');
    self.postMessage({type:'done',id:data.id,text,model:selectedModel});
  }catch(error){
    transcriberPromise=null;
    self.postMessage({type:'error',id:data.id,error:error?.message||String(error),model:selectedModel||null});
  }finally{activeId=null}
};
