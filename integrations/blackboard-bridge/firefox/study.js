const bbApi=typeof browser!=='undefined'?browser:chrome;
function post(type,data={}){window.postMessage({source:'prometeo-blackboard-bridge',type,...data},'*')}
function ready(){post('PROMETEO_BB_READY',{version:'0.2.1'})}
ready();[250,1000,2500,5000].forEach(ms=>setTimeout(ready,ms));
window.addEventListener('message',async e=>{
  if(e.source!==window||!e.data||e.data.source!=='prometeo-study-library')return;
  const m=e.data;
  try{
    if(m.type==='PROMETEO_BB_PAIR'){const r=await bbApi.runtime.sendMessage({type:'PAIR',token:m.token});post('PROMETEO_BB_RESULT',{request:'pair',result:r})}
    if(m.type==='PROMETEO_BB_SYNC'){const r=await bbApi.runtime.sendMessage({type:'SYNC'});post('PROMETEO_BB_RESULT',{request:'sync',result:r})}
    if(m.type==='PROMETEO_BB_STATUS'){const r=await bbApi.runtime.sendMessage({type:'STATUS'});post('PROMETEO_BB_STATUS_RESULT',{result:r})}
    if(m.type==='PROMETEO_BB_OPEN')bbApi.runtime.sendMessage({type:'OPEN_BLACKBOARD'});
  }catch(err){post('PROMETEO_BB_RESULT',{request:m.type,error:String(err)})}
});
bbApi.runtime.onMessage.addListener(m=>{if(m?.type==='PROMETEO_BB_EVENT')post('PROMETEO_BB_EVENT',{data:m.data})});
