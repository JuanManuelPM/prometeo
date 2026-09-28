(function(){
'use strict';
const CFG=window.PROMETEO_CONTROL_CONFIG_V1;
if(!CFG)throw new Error('PROMETEO_CONTROL_CONFIG_V1 missing');
const CACHE_KEY='prometeo.control.v11.bundle.v2';
const TIMEOUT=6500;
const OPTIONAL={org:'prometeo_organism_projection_v1_1',ctx:'prometeo_work_contexts_projection_v1',act:'prometeo_control_room_activity_v1',stats:'prometeo_statistics_v3'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const one=x=>Array.isArray(x)&&x.length===1?x[0]:x;
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
async function getJson(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(url+' · HTTP '+r.status);return r.json()}
function readCache(){try{const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return x?.tree?x:null}catch{return null}}
function writeCache(x){try{localStorage.setItem(CACHE_KEY,JSON.stringify(x))}catch{}}
function fire(bundle,error=null){window.dispatchEvent(new CustomEvent('PROMETEO_V11_DATA',{detail:{bundle,error}}))}
async function catalogs(){
 const [manifest,legacy]=await Promise.allSettled([getJson(CFG.catalogUrl),getJson(CFG.legacyCatalogUrl)]);
 return {
  catalogManifest:manifest.status==='fulfilled'?manifest.value:{schema:'prometeo.catalog-manifest/v1',pages:[]},
  cat:legacy.status==='fulfilled'?legacy.value:{projects:[],tools:[],surfaces:[]},
  failures:[manifest.status==='rejected'?{key:'catalogManifest',message:String(manifest.reason?.message||manifest.reason)}:null,legacy.status==='rejected'?{key:'legacyCatalog',message:String(legacy.reason?.message||legacy.reason)}:null].filter(Boolean)
 };
}
async function refresh(base={}){
 const b={...base},failures=[];let freshCore=false;
 try{b.tree=await rpc('prometeo_current_tree_v2',1);freshCore=true}
 catch(e){failures.push({key:'tree',message:String(e?.message||e)});if(!b.tree)throw e}
 await sleep(100);
 const entries=Object.entries(OPTIONAL);
 const settled=await Promise.allSettled(entries.map(([,n])=>rpc(n,1)));
 settled.forEach((r,i)=>{const [k,n]=entries[i];if(r.status==='fulfilled')b[k]=r.value;else failures.push({key:k,message:n+' · '+String(r.reason?.message||r.reason)})});
 const cats=await catalogs();b.cat=cats.cat;b.catalogManifest=cats.catalogManifest;failures.push(...cats.failures);
 b.cached_at=new Date().toISOString();
 b.freshness={mode:failures.length?'partial':'live',freshCore,failures,at:b.cached_at};
 writeCache(b);fire(b);return b;
}
function emergency(cat,catalogManifest,error){
 return {
  tree:{semantic_registry:[],work:{counts:{},active_objectives:[]},health:{issues:[],issue_count:0}},
  org:{nodes:[],edges:[],coverage:{}},ctx:{contexts:[]},act:{events:[]},stats:{},cat,catalogManifest,
  cached_at:new Date().toISOString(),freshness:{mode:'catalog-only',freshCore:false,failures:[{key:'tree',message:String(error?.message||error)}]}
 };
}
async function load(){
 const cached=readCache();
 if(cached){
  cached.freshness={mode:'stale',freshCore:false,failures:[],at:cached.cached_at||cached.tree?.generated_at||null};
  refresh(cached).catch(e=>fire(cached,String(e?.message||e)));
  return cached;
 }
 try{return await refresh({})}
 catch(e){const cats=await catalogs();const b=emergency(cats.cat,cats.catalogManifest,e);writeCache(b);fire(b,String(e?.message||e));return b}
}
window.PROMETEO_DATA_V11={load,refresh,readCache};
})();
