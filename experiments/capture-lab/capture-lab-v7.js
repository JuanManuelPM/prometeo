const NativeWorker=window.Worker;
window.Worker=new Proxy(NativeWorker,{construct(Target,args){const src=String(args[0]||'');if(src.includes('transcriber-worker.js?v=6'))args[0]=src.replace('transcriber-worker.js?v=6','transcriber-worker-v7.js?v=7');return Reflect.construct(Target,args)}});
await import('./capture-lab-v6.js?v=7');
const model=document.querySelector('#dmodel');
if(model)model.textContent='whisper-small → base';
