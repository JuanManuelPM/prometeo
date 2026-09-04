((global)=>{
 'use strict';if(global.PrometeoBooks)return;
 const TIERS=['HOT','WARM','COLD'];
 function fail(code,msg){const e=new Error(msg);e.code=code;throw e}
 function validate(...books){
  const seen=new Set();
  for(const b of books){if(b?.schema!=='prometeo.context-book/v1'||!TIERS.includes(b.tier))fail('PROMETEO_BOOK_SCHEMA','Invalid book');for(const i of b.items||[]){if(seen.has(i.id))fail('PROMETEO_BOOK_DUPLICATE',`Item appears in multiple tiers: ${i.id}`);seen.add(i.id);}}
  return {ok:true,count:seen.size};
 }
 function move({hot,warm,cold},id,to){
  if(!TIERS.includes(to))fail('PROMETEO_BOOK_TIER',`Invalid tier ${to}`);
  const docs={HOT:structuredClone(hot),WARM:structuredClone(warm),COLD:structuredClone(cold)};
  let item=null;for(const d of Object.values(docs)){const idx=(d.items||[]).findIndex(x=>x.id===id);if(idx>=0){item=d.items.splice(idx,1)[0];break;}}
  if(!item)fail('PROMETEO_BOOK_ITEM',`Unknown book item ${id}`);
  docs[to].items.push(item);return {hot:docs.HOT,warm:docs.WARM,cold:docs.COLD};
 }
 global.PrometeoBooks=Object.freeze({version:'1.0.0-candidate',validate,move});
})(typeof globalThis!=='undefined'?globalThis:window);
