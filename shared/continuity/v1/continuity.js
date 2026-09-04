((global)=>{
 'use strict'; if(global.PrometeoContinuity)return;
 function fail(code,msg){const e=new Error(msg);e.code=code;throw e}
 function validatePending(doc){
  if(doc?.schema!=='prometeo.pending/v1')fail('PROMETEO_PENDING_SCHEMA','Invalid pending schema');
  const ids=new Set();for(const x of doc.items||[]){if(!x.id||ids.has(x.id))fail('PROMETEO_PENDING_ID','Missing/duplicate pending id');ids.add(x.id);if(!x.state||!x.next_action)fail('PROMETEO_PENDING_FIELDS','Pending requires state and next_action');}
  return {ok:true,count:ids.size};
 }
 function validateCarry(doc){
  if(doc?.schema!=='prometeo.carry/v1')fail('PROMETEO_CARRY_SCHEMA','Invalid carry schema');
  const ids=new Set();for(const x of doc.items||[]){if(!x.id||ids.has(x.id))fail('PROMETEO_CARRY_ID','Missing/duplicate carry id');ids.add(x.id);if(!x.text||!x.kind)fail('PROMETEO_CARRY_FIELDS','Carry requires kind/text');}
  return {ok:true,count:ids.size};
 }
 function validateWatermarks(doc){
  if(doc?.schema!=='prometeo.watermarks/v1')fail('PROMETEO_WATERMARK_SCHEMA','Invalid watermark schema');
  for(const [id,w] of Object.entries(doc.sources||{})){if(!w.last_ingested)fail('PROMETEO_WATERMARK_INGESTED',`Missing last_ingested for ${id}`);if(!w.last_verified_digest)fail('PROMETEO_WATERMARK_DIGEST',`Missing digest for ${id}`);}
  return {ok:true,count:Object.keys(doc.sources||{}).length};
 }
 function advanceWatermark(doc,source,patch,{expectedLastIngested=null}={}){
  const next=structuredClone(doc);const cur=next.sources[source];
  if(!cur)fail('PROMETEO_WATERMARK_SOURCE',`Unknown watermark source ${source}`);
  if(expectedLastIngested!==null&&cur.last_ingested!==expectedLastIngested)fail('PROMETEO_WATERMARK_STALE',`Stale watermark ${source}`);
  next.sources[source]={...cur,...structuredClone(patch)};return next;
 }
 global.PrometeoContinuity=Object.freeze({version:'1.0.0-candidate',validatePending,validateCarry,validateWatermarks,advanceWatermark});
})(typeof globalThis!=='undefined'?globalThis:window);
