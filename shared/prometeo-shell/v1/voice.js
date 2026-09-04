import {listNotes,putNote,getNote} from './db.js';

const uid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;

export class VoiceQueue{
  constructor({workerURL,onChange,onRecording}){
    this.workerURL=workerURL;
    this.onChange=onChange||(()=>{});
    this.onRecording=onRecording||(()=>{});
    this.worker=null;
    this.processing=false;
    this.stream=null;
    this.current=null;
    this.releaseTimer=null;
  }

  async init(){
    const notes=await listNotes();
    for(const n of notes){
      if(['loading','transcribing'].includes(n.status)&&n.audio){n.status='queued';await putNote(n)}
      if(n.status==='preparing'&&!n.audio){n.status='error';n.error='La página se cerró antes de terminar de guardar el audio.';await putNote(n)}
    }
    this.processQueue();
  }

  ensureWorker(){
    if(this.worker) return this.worker;
    const w=new Worker(this.workerURL,{type:'module'});
    w.onmessage=async e=>{
      const d=e.data||{};
      if(d.type==='model-ready') return;
      if(!d.id) return;
      const note=await getNote(d.id);
      if(!note) return;
      if(d.type==='status') note.status=d.status;
      if(d.type==='done'){
        note.status='done';
        note.text=String(d.text||'').replace(/\s+/g,' ').trim();
        note.error='';
        this.processing=false;
      }
      if(d.type==='error'){
        note.status='error';
        note.error=d.error||'No pude transcribir.';
        this.processing=false;
      }
      await putNote(note);
      this.onChange();
      if(d.type==='done'||d.type==='error') this.processQueue();
    };
    w.onerror=()=>{this.processing=false;this.processQueue()};
    this.worker=w;
    return w;
  }

  warmup(){try{this.ensureWorker().postMessage({type:'warmup'})}catch{}}

  async ensureStream(){
    clearTimeout(this.releaseTimer);
    if(this.stream?.active) return this.stream;
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia) throw new Error('Abrí la página por HTTPS para usar el micrófono.');
    this.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    return this.stream;
  }

  mime(){
    const choices=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'];
    return choices.find(x=>MediaRecorder.isTypeSupported?.(x))||'';
  }

  async start(){
    if(this.current) return;
    const stream=await this.ensureStream();
    const mime=this.mime();
    const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
    const s={recorder,chunks:[],started:performance.now(),elapsed:0,paused:false,discard:false,id:null};
    this.current=s;
    recorder.ondataavailable=e=>{if(e.data?.size)s.chunks.push(e.data)};
    recorder.onstop=()=>this.finish(s);
    recorder.start(250);
    this.warmup();
    this.onRecording(this.state());
  }

  state(){
    const s=this.current;
    if(!s) return {active:false,paused:false,elapsed:0};
    let elapsed=s.elapsed;
    if(!s.paused) elapsed+=performance.now()-s.started;
    return {active:true,paused:s.paused,elapsed};
  }

  pauseResume(){
    const s=this.current;if(!s)return;
    if(s.paused){try{s.recorder.resume()}catch{}s.paused=false;s.started=performance.now()}
    else{s.elapsed+=performance.now()-s.started;try{s.recorder.pause()}catch{}s.paused=true}
    this.onRecording(this.state());
  }

  async save(meta){
    const s=this.current;if(!s)return;
    this.current=null;
    s.id=uid();
    const note={id:s.id,created:Date.now(),status:'preparing',text:'',audio:null,error:'',...meta};
    await putNote(note);
    this.onRecording(this.state());
    this.onChange();
    try{s.recorder.stop()}catch(e){note.status='error';note.error=e?.message||String(e);await putNote(note);this.onChange()}
    this.releaseSoon();
    return note;
  }

  discard(){
    const s=this.current;if(!s)return;
    this.current=null;s.discard=true;
    try{s.recorder.stop()}catch{}
    this.onRecording(this.state());
    this.releaseSoon();
  }

  releaseSoon(){
    clearTimeout(this.releaseTimer);
    this.releaseTimer=setTimeout(()=>{
      if(this.current)return;
      this.stream?.getTracks().forEach(t=>t.stop());
      this.stream=null;
    },900);
  }

  async finish(s){
    if(s.discard||!s.id) return;
    const note=await getNote(s.id);if(!note)return;
    try{
      const blob=new Blob(s.chunks,{type:s.recorder.mimeType||'audio/webm'});
      if(blob.size<350) throw new Error('La grabación quedó vacía.');
      note.audio=blob;note.status='queued';
      await putNote(note);this.onChange();this.processQueue();
    }catch(e){note.status='error';note.error=e?.message||String(e);await putNote(note);this.onChange()}
  }

  async processQueue(){
    if(this.processing) return;
    const notes=(await listNotes()).sort((a,b)=>a.created-b.created);
    const next=notes.find(n=>n.status==='queued'&&n.audio);
    if(!next) return;
    this.processing=true;next.status='loading';await putNote(next);this.onChange();
    try{
      const pcm=await decode16k(next.audio);
      this.ensureWorker().postMessage({type:'transcribe',id:next.id,audio:pcm.buffer},[pcm.buffer]);
    }catch(e){
      next.status='error';next.error=e?.message||String(e);await putNote(next);this.processing=false;this.onChange();this.processQueue();
    }
  }

  close(){
    this.stream?.getTracks().forEach(t=>t.stop());
    try{this.worker?.terminate()}catch{}
  }
}

async function decode16k(blob){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC) throw new Error('AudioContext no disponible.');
  const ctx=new AC();
  try{
    const decoded=await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0));
    const mono=new Float32Array(decoded.length);
    for(let c=0;c<decoded.numberOfChannels;c++){
      const data=decoded.getChannelData(c);
      for(let i=0;i<decoded.length;i++) mono[i]+=data[i]/decoded.numberOfChannels;
    }
    if(decoded.sampleRate===16000) return mono;
    const ratio=decoded.sampleRate/16000;
    const out=new Float32Array(Math.max(1,Math.round(mono.length/ratio)));
    for(let i=0;i<out.length;i++){
      const p=i*ratio,a=Math.floor(p),b=Math.min(a+1,mono.length-1),f=p-a;
      out[i]=mono[a]*(1-f)+mono[b]*f;
    }
    return out;
  }finally{try{await ctx.close()}catch{}}
}
