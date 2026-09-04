/* Prometeo Context Pack Compiler v1 — smallest sufficient deterministic task context. */
((global)=>{
 'use strict';if(global.PrometeoContextPacks)return;
 function fail(code,msg,detail={}){const e=new Error(msg);e.code=code;e.detail=detail;throw e}
 function normalizeRequest(s){return String(s||'').trim()}
 async function compile({workItem,foundry,catalogPage,role='implementer',target='internal',maxRecords=24,maxBytes=64000,tags=[]}={}){
   if(!workItem?.id||!workItem.request)fail('PROMETEO_PACK_WORK_ITEM','Work item id/request required');
   if(!foundry)fail('PROMETEO_PACK_FOUNDRY','Foundry required');
   if(!catalogPage?.id)fail('PROMETEO_PACK_TARGET','Catalog page required');
   const autoTags=new Set([catalogPage.id,'page','contract','release','testing',...tags]);
   const words=normalizeRequest(workItem.request).toLowerCase();
   if(/button|bot[oó]n|control/.test(words)){autoTags.add('button');autoTags.add('material');autoTags.add('control')}
   if(/color|palette|paleta/.test(words)){autoTags.add('design-kernel')}
   if(/pagekit|pizarra|laser|láser/.test(words)){autoTags.add('pagekit')}
   const selection=foundry.select({query:`${workItem.request} ${catalogPage.title||''}`,role,tags:[...autoTags],maxRecords,target,allowProject:target!=='external'?true:true});
   const included=selection.selected.map(x=>({id:x.id,why:x.why,authority:x.record.authority,privacy:x.record.privacy,reopen_handle:x.record.reopen_handle||null,source_refs:x.record.source_refs||[]}));
   // Target source is mandatory and cannot be displaced by ranking budget.
   const targetSource={id:`TARGET:${catalogPage.id}`,why:['target-source'],authority:catalogPage.truth?.authority||'SOURCE_REFERENCE',privacy:'PROJECT',reopen_handle:`catalog:${catalogPage.id}`,source_refs:[catalogPage.source]};
   if(!included.some(x=>x.id===targetSource.id))included.unshift(targetSource);
   const privacy=global.PrometeoPrivacy?.strongest([workItem.privacy||'LOCAL',...included.map(x=>x.privacy)])||'LOCAL';
   if(target==='external'&&!global.PrometeoPrivacy?.canExport(privacy,{allowProject:true}))fail('PROMETEO_PACK_PRIVACY','Pack cannot be exported',{privacy});
   const sourceDigests=[...(catalogPage.truth?.exact_source_digest?[catalogPage.truth.exact_source_digest]:[]),...(catalogPage.truth?.source_identity?[catalogPage.truth.source_identity]:[])];
   const reopen=[...new Set(included.map(x=>x.reopen_handle).filter(Boolean))];
   const draft={schema:'prometeo.context-pack/v1',work_item_id:workItem.id,target:{page_id:catalogPage.id,title:catalogPage.title,href:catalogPage.href,source:catalogPage.source,writable_target:structuredClone(catalogPage.truth?.writable_target||null)},role,request:workItem.request,included,excluded:selection.excluded,privacy,source_digests:sourceDigests,reopen_handles:reopen,budget:{max_records:maxRecords,max_bytes:maxBytes}};
   const serialized=global.PrometeoDurable.stable(draft);
   if(new TextEncoder().encode(serialized).length>maxBytes)fail('PROMETEO_PACK_BUDGET','Context pack exceeds byte budget',{bytes:new TextEncoder().encode(serialized).length,maxBytes});
   const digest=await global.PrometeoDurable.digest(draft);
   return Object.freeze({...draft,id:`CTX-PACK-${digest.slice(0,20)}`,digest,bytes:new TextEncoder().encode(serialized).length});
 }
 global.PrometeoContextPacks=Object.freeze({version:'1.0.0-candidate',compile});
})(typeof globalThis!=='undefined'?globalThis:window);
