/* Automatic Modification Resolver v1 — resolves a human request to exact page/work/context route. */
((global)=>{
 'use strict';if(global.PrometeoModificationResolver)return;
 function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
 function score(request,p){
   const q=new Set(norm(request).split(/\s+/).filter(Boolean)),hay=norm(`${p.id} ${p.title} ${p.description||''}`);
   let n=0;for(const t of q)if(hay.includes(t))n+=t.length>4?3:1;
   if(norm(request).includes(norm(p.id)))n+=20;if(norm(request).includes(norm(p.title)))n+=30;return n;
 }
 function resolveTarget(request,pages,{aliases={calendar:'calendar',calendario:'calendar','adriana':'arte-adriana'}}={}){
  const q=norm(request);
  for(const [a,id] of Object.entries(aliases))if(q.includes(norm(a))){const p=pages.find(x=>x.id===id);if(p)return {status:'RESOLVED',page:p,reason:`alias:${a}`}}
  const ranked=pages.map(p=>({p,s:score(request,p)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s||a.p.id.localeCompare(b.p.id));
  if(!ranked.length)return {status:'NEEDS_TARGET_RESOLUTION',candidates:[]};
  if(ranked[1]&&ranked[0].s===ranked[1].s)return {status:'NEEDS_TARGET_RESOLUTION',candidates:ranked.slice(0,5).map(x=>({id:x.p.id,title:x.p.title,score:x.s}))};
  return {status:'RESOLVED',page:ranked[0].p,reason:`score:${ranked[0].s}`};
 }
 async function plan({request,pages,manifest,foundry,privacy='LOCAL'}={}){
  const target=resolveTarget(request,pages.pages||pages);if(target.status!=='RESOLVED')return target;
  const truth=(manifest.pages||[]).find(x=>x.page_id===target.page.id);if(!truth){const e=new Error('Target missing catalog truth');e.code='PROMETEO_MOD_TARGET_TRUTH';throw e}
  const page={...structuredClone(target.page),truth};
  if(!truth.writable_target)return Object.freeze({status:'NEEDS_SOURCE_RESOLUTION',target:{page_id:page.id,title:page.title,href:page.href,source:page.source},reason:'No writable target is registered for this current artifact.'});
  const seed=await global.PrometeoWorkflow.seed({request,privacy,source_refs:[truth.source_identity]});
  const work=await global.PrometeoWorkflow.workItem(seed,{target:{page_id:page.id,source:page.source,href:page.href,writable_target:structuredClone(truth.writable_target)},owner:'ai-worker',dependencies:[truth.source_identity]});
  const pack=await global.PrometeoContextPacks.compile({workItem:work,foundry,catalogPage:page,role:'implementer',target:'internal',tags:[page.id]});
  return Object.freeze({status:'RESOLVED',target:{page_id:page.id,title:page.title,href:page.href,source:page.source,writable_target:structuredClone(truth.writable_target),truth},seed,work_item:work,context_pack:pack,required_tests:['source-identity','page-contract','known-diseases','candidate-only-release'],release_policy:'RETURN_CANDIDATE_ONLY_NO_CURRENT_MUTATION'});
 }
 global.PrometeoModificationResolver=Object.freeze({version:'1.0.0-candidate',resolveTarget,plan});
})(typeof globalThis!=='undefined'?globalThis:window);
