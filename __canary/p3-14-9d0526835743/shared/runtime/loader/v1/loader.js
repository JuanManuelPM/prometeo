/* Direct same-document backstage loader. Does not create visible UI or an outer iframe. */
((global)=>{
 'use strict';if(global.PrometeoBackstageLoader)return;
 const BUILD='PROMETEO_V53_COMPLETE_EXAMPLE_ATLAS_20260901';
 function fail(code,msg){const e=new Error(msg);e.code=code;throw e}
 async function load({base='.',bootOrder,documentRef=global.document}={}){
  if(global.__PROMETEO_BUILD__!==BUILD)fail('PROMETEO_LOADER_BUILD','Wrong V53 build');
  if(!bootOrder||bootOrder.mode!=='SAME_DOCUMENT_BACKSTAGE_NO_OUTER_IFRAME')fail('PROMETEO_LOADER_ORDER','Invalid boot order');
  if(!documentRef?.head)fail('PROMETEO_LOADER_DOCUMENT','Document head required');
  for(const rel of bootOrder.scripts){
   if(bootOrder.forbidden?.includes(rel))fail('PROMETEO_LOADER_FORBIDDEN',`Forbidden runtime ${rel}`);
   if([...documentRef.scripts||[]].some(s=>s.dataset?.prometeoRuntime===rel))continue;
   await new Promise((resolve,reject)=>{const s=documentRef.createElement('script');s.src=new URL(rel,new URL(base,global.location?.href||'https://local.invalid/')).href;s.dataset.prometeoRuntime=rel;s.onload=resolve;s.onerror=()=>reject(Object.assign(new Error(`Failed ${rel}`),{code:'PROMETEO_LOADER_SCRIPT'}));documentRef.head.appendChild(s)});
  }
  return global.PrometeoPart2Platform||null;
 }
 global.PrometeoBackstageLoader=Object.freeze({version:'1.0.0-candidate',BUILD,load});
})(typeof globalThis!=='undefined'?globalThis:window);
