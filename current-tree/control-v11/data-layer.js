(function(){
'use strict';
const CFG=window.PROMETEO_CONTROL_CONFIG_V1;
if(!CFG)throw new Error('PROMETEO_CONTROL_CONFIG_V1 missing');
const CACHE_KEY='prometeo.control.v11.bundle.v2';
const TIMEOUT=6500;
const OPTIONAL={org:'prometeo_organism_projection_v1_1',ctx:'prometeo_work_contexts_projection_v1',act:'prometeo_control_room_activity_v1',stats:'prometeo_statistics_v3'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const one=x=>Array.isArray(x)&&x.length===1?x[0]:x;
const now=()=>new Date().toISOString();
const diag=(source,error,url=null,status=null)=>{try{window.PROMETEO_DIAGNOSTICS_V1?.sourceFailure?.(source,error,url,status)}catch{}};
if(!window.PROMETEO_CONTROL_PLANE_STATE_V1)window.PROMETEO_CONTROL_PLANE_STATE_V1=Object.freeze({blocked:true,status:'PROBING',source:'data-layer-bootstrap',observed_at:now()});
function observedAt(x){
 if(!x||typeof x!=='object')return null;
 return x.observed_at||x.generated_at||x.updated_at||x.checked_at||x.cached_at||x.created_at||null;
}
function sourceState(status,source,url,value,error,checkedAt){
 return {
  status,
  source,
  url:url||null,
  observed_at:status==='available'?observedAt(value):null,
  checked_at:checkedAt,
  error:error?String(error?.message||error):null
 };
}
async function rpc(name,retries=1){
 let last;
 for(let attempt=0;attempt<=retries;attempt++){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),TIMEOUT);
  try{
   const r=await fetch(CFG.rpcBase+name,{method:'POST',headers:{apikey:CFG.anonKey,Authorization:'Bearer '+CFG.anonKey,'Content-Type':'application/json'},body:'{}',cache:'no-store',signal:ctrl.signal});
   if(!r.ok)throw new Error(name+' · RPC '+r.status);
   return one(await r.json());
  }catch(e){last=e;if(attempt<retries)await sleep(600*(attempt+1))}
  finally{clearTimeout(timer)}
 }
 throw last||new Error(name+' unavailable');
}
async function getJson(url){
 if(!url)throw new Error('source URL unavailable');
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),TIMEOUT);
 try{
  const r=await fetch(url,{cache:'no-store',signal:ctrl.signal});
  if(!r.ok)throw new Error(url+' · HTTP '+r.status);
  return await r.json();
 }finally{clearTimeout(timer)}
}
function readCache(){
 try{
  const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
  return x&&(x.tree||x.catalogManifest||x.cat||x.runtime||x.claimFrontier)?x:null;
 }catch{return null}
}
function writeCache(x){try{localStorage.setItem(CACHE_KEY,JSON.stringify(x))}catch{}}
function fire(bundle,error=null){window.dispatchEvent(new CustomEvent('PROMETEO_V11_DATA',{detail:{bundle,error}}))}
async function catalogs(checkedAt){
 const sources=[['catalogManifest',CFG.catalogUrl],['legacyCatalog',CFG.legacyCatalogUrl]];
 const settled=await Promise.allSettled(sources.map(([,url])=>getJson(url)));
 const state={},failures=[];
 settled.forEach((r,i)=>{
  const [key,url]=sources[i];
  if(r.status==='fulfilled')state[key]=sourceState('available','catalog',url,r.value,null,checkedAt);
  else{state[key]=sourceState('unavailable','catalog',url,null,r.reason,checkedAt);failures.push({key,message:String(r.reason?.message||r.reason)});diag(key,r.reason,url)}
 });
 return {
  catalogManifest:settled[0].status==='fulfilled'?settled[0].value:null,
  cat:settled[1].status==='fulfilled'?settled[1].value:null,
  state,failures
 };
}
async function githubFallback(base,coreError,checkedAt){
 const b={...base};
 const specs=[
  ['runtime',CFG.continuityStateUrl],
  ['claimFrontier',CFG.claimFrontierUrl],
  ['stats',CFG.statsUrl],
  ['projectContext',CFG.projectContextUrl],
  ...(b.controlPlaneDiagnosis?[]:[['controlPlaneDiagnosis',CFG.pageChangeDiagnosisUrl]])
 ];
 const settled=await Promise.allSettled(specs.map(([,url])=>getJson(url)));
 const states={},failures=[{key:'tree',message:String(coreError?.message||coreError)}];diag('tree',coreError,CFG.rpcBase+'prometeo_current_tree_v2');
 settled.forEach((r,i)=>{
  const [key,url]=specs[i];
  if(r.status==='fulfilled'){
   const value=r.value;
   states[key]=sourceState('available','github',url,value,null,checkedAt);
   if(key==='runtime')b.runtime=value;
   if(key==='claimFrontier')b.claimFrontier=value;
   if(key==='stats')b.stats=value;
   if(key==='projectContext'){
    b.projectContext=value;
    if(value&&Array.isArray(value.contexts))b.ctx=value;
   }
   if(key==='controlPlaneDiagnosis'){
    b.controlPlaneDiagnosis=value;
    const blocked=/^BLOCKED_/.test(String(value?.status||''));
    globalThis.PROMETEO_CONTROL_PLANE_STATE_V1=Object.freeze({
      blocked,
      status:value?.status||null,
      diagnosis_id:value?.diagnosis_id||null,
      observed_at:value?.observed_at||null,
      source:'published-diagnosis'
    });
   }
  }else{
   states[key]=sourceState('unavailable','github',url,null,r.reason,checkedAt);
   failures.push({key,message:String(r.reason?.message||r.reason)});
  }
 });
 if(b.tree){
  states.tree={status:'last-good',source:'cache',url:null,observed_at:observedAt(b.tree)||b.freshness?.observed_at||b.cached_at||null,checked_at:checkedAt,error:String(coreError?.message||coreError)};
 }else{
  b.tree=null;
  states.tree={status:'unavailable',source:'rpc',url:CFG.rpcBase+'prometeo_current_tree_v2',observed_at:null,checked_at:checkedAt,error:String(coreError?.message||coreError)};
 }
 return {bundle:b,states,failures,githubAvailable:Object.values(states).some(s=>s.source==='github'&&s.status==='available')};
}
function bestObserved(bundle,states){
 const vals=[
  observedAt(bundle.tree),observedAt(bundle.runtime),observedAt(bundle.claimFrontier),observedAt(bundle.stats),observedAt(bundle.projectContext),
  ...Object.values(states||{}).map(s=>s?.observed_at),bundle.freshness?.observed_at,bundle.cached_at
 ].filter(Boolean);
 if(!vals.length)return null;
 const dated=vals.map(v=>[Date.parse(v),v]).filter(([n])=>Number.isFinite(n)).sort((a,b)=>b[0]-a[0]);
 return dated[0]?.[1]||vals[0];
}
async function refresh(base={}){
 const checkedAt=now();
 let b={...base},failures=[],freshCore=false,sourceStates={};
 let publishedDiagnosis=null,publishedBlocked=false;
 try{
  publishedDiagnosis=await getJson(CFG.pageChangeDiagnosisUrl);
  b.controlPlaneDiagnosis=publishedDiagnosis;
  publishedBlocked=/^BLOCKED_/.test(String(publishedDiagnosis?.status||''));
  sourceStates.controlPlaneDiagnosis=sourceState('available','github',CFG.pageChangeDiagnosisUrl,publishedDiagnosis,null,checkedAt);
  globalThis.PROMETEO_CONTROL_PLANE_STATE_V1=Object.freeze({
   blocked:publishedBlocked,status:publishedDiagnosis?.status||'UNKNOWN',
   diagnosis_id:publishedDiagnosis?.diagnosis_id||null,observed_at:publishedDiagnosis?.observed_at||null,
   source:'published-diagnosis'
  });
 }catch{}
 try{
  if(publishedBlocked)throw Object.assign(new Error('Current Tree RPC omitted · published control plane '+String(publishedDiagnosis?.status||'BLOCKED')),{code:'CONTROL_PLANE_BLOCKED'});
  b.tree=await rpc('prometeo_current_tree_v2',0);freshCore=true;
  globalThis.PROMETEO_CONTROL_PLANE_STATE_V1=Object.freeze({blocked:false,status:'RPC_AVAILABLE',source:'tree-probe',observed_at:checkedAt});
  sourceStates.tree=sourceState('available','rpc',CFG.rpcBase+'prometeo_current_tree_v2',b.tree,null,checkedAt);
 }catch(e){
  diag('tree',e,CFG.rpcBase+'prometeo_current_tree_v2');
  const gh=await githubFallback(b,e,checkedAt);
  b=gh.bundle;sourceStates={...sourceStates,...gh.states};failures.push(...gh.failures);
 }
 if(freshCore){
  await sleep(100);
  const entries=Object.entries(OPTIONAL);
  const settled=await Promise.allSettled(entries.map(([,n])=>rpc(n,1)));
  settled.forEach((r,i)=>{
   const [k,n]=entries[i],url=CFG.rpcBase+n;
   if(r.status==='fulfilled'){
    b[k]=r.value;sourceStates[k]=sourceState('available','rpc',url,r.value,null,checkedAt);
   }else{
    failures.push({key:k,message:n+' · '+String(r.reason?.message||r.reason)});diag(k,r.reason,url);
    sourceStates[k]=sourceState('unavailable','rpc',url,null,r.reason,checkedAt);
   }
  });
 }
 const cats=await catalogs(checkedAt);
 if(cats.cat!==null)b.cat=cats.cat;
 if(cats.catalogManifest!==null)b.catalogManifest=cats.catalogManifest;
 sourceStates={...sourceStates,...cats.state};failures.push(...cats.failures);
 const observed=bestObserved(b,sourceStates);
 let mode='live';
 if(!freshCore){
  const hasLastGood=sourceStates.tree?.status==='last-good';
  const hasGithub=Object.values(sourceStates).some(s=>s.source==='github'&&s.status==='available');
  mode=hasLastGood?'stale':hasGithub?'github-degraded':'catalog-only';
 }else if(failures.length)mode='partial';
 b.cached_at=checkedAt;
 b.freshness={mode,freshCore,failures,observed_at:observed,checked_at:checkedAt,at:checkedAt,sources:sourceStates};
 writeCache(b);window.PROMETEO_V11_LAST=b;fire(b);return b;
}
function emergency(cat,catalogManifest,error){
 const checkedAt=now();
 const failures=[{key:'tree',message:String(error?.message||error)}];
 return {
  tree:null,org:null,ctx:null,act:null,stats:null,cat:cat||null,catalogManifest:catalogManifest||null,
  cached_at:checkedAt,
  freshness:{mode:'catalog-only',freshCore:false,failures,observed_at:observedAt(catalogManifest)||observedAt(cat)||null,checked_at:checkedAt,at:checkedAt,sources:{tree:{status:'unavailable',source:'rpc',url:CFG.rpcBase+'prometeo_current_tree_v2',observed_at:null,checked_at:checkedAt,error:String(error?.message||error)}}}
 };
}
async function load(){
 const cached=readCache();
 if(cached){
  const checkedAt=now(),observed=cached.freshness?.observed_at||bestObserved(cached,cached.freshness?.sources)||null;
  cached.freshness={...(cached.freshness||{}),mode:'stale',freshCore:false,failures:cached.freshness?.failures||[],observed_at:observed,checked_at:checkedAt,at:checkedAt};
  window.PROMETEO_V11_LAST=cached;refresh(cached).catch(e=>fire(cached,String(e?.message||e)));
  return cached;
 }
 try{return await refresh({})}
 catch(e){
  const checkedAt=now(),cats=await catalogs(checkedAt).catch(()=>({cat:null,catalogManifest:null}));
  const b=emergency(cats.cat,cats.catalogManifest,e);writeCache(b);window.PROMETEO_V11_LAST=b;fire(b,String(e?.message||e));return b;
 }
}
window.PROMETEO_DATA_V11={load,refresh,readCache};
})();
