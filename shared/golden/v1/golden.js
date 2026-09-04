((global)=>{
 'use strict';if(global.PrometeoGolden)return;
 function fail(code,msg){const e=new Error(msg);e.code=code;throw e}
 function validate(reg){
  if(reg?.schema!=='prometeo.golden-references/v1')fail('PROMETEO_GOLDEN_SCHEMA','Invalid golden registry');
  const ids=new Set();for(const r of reg.references||[]){if(!r.id||ids.has(r.id))fail('PROMETEO_GOLDEN_ID','Missing/duplicate golden id');ids.add(r.id);if(!r.source_identity)fail('PROMETEO_GOLDEN_SOURCE',`Golden ${r.id} missing source identity`);if(r.representation&&!r.source_identity)fail('PROMETEO_GOLDEN_REP_SOURCE','Representation cannot stand without source identity');}
  return {ok:true,count:ids.size};
 }
 function preferred(refs,artifactId){
  const list=refs.filter(r=>r.artifact_id===artifactId);
  return structuredClone(list.find(r=>r.kind==='exact-source')||list[0]||null);
 }
 global.PrometeoGolden=Object.freeze({version:'1.0.0-candidate',validate,preferred});
})(typeof globalThis!=='undefined'?globalThis:window);
