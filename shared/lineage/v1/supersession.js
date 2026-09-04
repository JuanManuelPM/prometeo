((global)=>{
 'use strict';if(global.PrometeoSupersession)return;
 function fail(code,msg,detail={}){const e=new Error(msg);e.code=code;e.detail=detail;throw e}
 function validate(records){
  const ids=new Set(),key=new Map();
  for(const r of records){
   if(!r.id||ids.has(r.id))fail('PROMETEO_SUP_ID','Missing/duplicate supersession id');ids.add(r.id);
   if(!r.scope||!r.old||!r.new)fail('PROMETEO_SUP_FIELDS','Supersession missing scope/old/new',{r});
   const k=`${r.scope}:${r.old}`;
   if(key.has(k)&&key.get(k)!==r.new)fail('PROMETEO_SUP_CONFLICT',`Conflicting supersession ${k}`,{a:key.get(k),b:r.new});
   key.set(k,r.new);
  }
  for(const r of records){
   let cur=r.new,seen=new Set([r.old]);let guard=0;
   while(guard++<100){if(seen.has(cur))fail('PROMETEO_SUP_CYCLE','Supersession cycle',{scope:r.scope,at:cur});seen.add(cur);const n=records.find(x=>x.scope===r.scope&&x.old===cur);if(!n)break;cur=n.new;}
  }
  return {ok:true,count:ids.size};
 }
 function resolve(value,scope,records){validate(records);let cur=value,trail=[],guard=0;while(guard++<100){const r=records.find(x=>x.scope===scope&&x.old===cur);if(!r)break;trail.push(r);cur=r.new;}return {input:value,scope,current:cur,trail:structuredClone(trail)}}
 global.PrometeoSupersession=Object.freeze({version:'1.0.0-candidate',validate,resolve});
})(typeof globalThis!=='undefined'?globalThis:window);
