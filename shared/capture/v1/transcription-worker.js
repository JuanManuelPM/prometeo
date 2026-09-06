import {pipeline,env} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm';

env.allowLocalModels=false;
env.useBrowserCache=true;

const TIERS=Object.freeze({
  small:{id:'small',model:'Xenova/whisper-small',label:'Whisper Small multilingual · Spanish',parameters_m:244},
  base:{id:'base',model:'Xenova/whisper-base',label:'Whisper Base multilingual · Spanish',parameters_m:74}
});
let current=null;
let currentPromise=null;
let activeId=null;

async function loadTier(id='small'){
  const tier=TIERS[id]||TIERS.small;
  if(current?.id===tier.id&&currentPromise)return currentPromise;
  current=tier;
  currentPromise=pipeline('automatic-speech-recognition',tier.model,{device:'wasm',dtype:'q8'});
  try{return await currentPromise}catch(e){current=null;currentPromise=null;throw e}
}

async function choose(quality='small'){
  const requested=quality==='base'?'base':'small';
  try{const transcriber=await loadTier(requested);return {transcriber,tier:TIERS[requested],fallback:false}}
  catch(error){
    if(requested!=='small')throw error;
    // Explicit supported fallback: multilingual Base only. Never silently downgrade to Tiny.
    self.postMessage({type:'quality-fallback',from:'small',to:'base',reason:error?.message||String(error)});
    const transcriber=await loadTier('base');return {transcriber,tier:TIERS.base,fallback:true};
  }
}

self.onmessage=async event=>{
  const data=event.data||{};
  if(data.type==='warmup'){
    try{const {tier}=await choose(data.quality||'small');self.postMessage({type:'model-ready',tier:tier.id,model:tier.model,label:tier.label})}
    catch(error){self.postMessage({type:'warmup-error',error:error?.message||String(error)})}
    return;
  }
  if(data.type!=='transcribe'||!data.id||!data.audio||activeId)return;
  activeId=data.id;
  try{
    self.postMessage({type:'status',id:data.id,status:'MODEL_LOADING'});
    const {transcriber,tier,fallback}=await choose(data.quality||'small');
    self.postMessage({type:'status',id:data.id,status:'TRANSCRIBING',tier:tier.id,model:tier.model,fallback});
    const result=await transcriber(new Float32Array(data.audio),{
      language:'spanish',
      task:'transcribe',
      do_sample:false,
      temperature:0,
      num_beams:5,
      chunk_length_s:30,
      stride_length_s:5,
      return_timestamps:false
    });
    self.postMessage({type:'done',id:data.id,text:String(result?.text||'').replace(/\s+/g,' ').trim(),tier:tier.id,model:tier.model,fallback});
  }catch(error){self.postMessage({type:'error',id:data.id,error:error?.message||String(error),tier:current?.id||null,model:current?.model||null})}
  finally{activeId=null}
};
