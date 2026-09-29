(function(){
'use strict';

const VIEW_SCHEMA='prometeo.v11-stats-view/v1';
const SOURCE_SCHEMA='prometeo.control-room-stats/v1';

function reasonText(value){
  if(value===null||value===undefined)return null;
  return String(value?.message||value);
}
function unknown(reason,source='none',checkedAt=new Date().toISOString()){
  return Object.freeze({
    schema:VIEW_SCHEMA,
    status:'unknown',
    source,
    checked_at:checkedAt,
    generated_at:null,
    data:null,
    error:reasonText(reason)||'compiled stats unavailable'
  });
}
function explicitStale(meta={}){
  const sourceStatus=String(meta.source_status||'').toLowerCase();
  const bundleMode=String(meta.bundle_mode||'').toLowerCase();
  return sourceStatus==='stale'||sourceStatus==='last-good'||bundleMode==='stale'||meta.explicit_stale===true;
}
function normalize(document,meta={}){
  const checkedAt=meta.checked_at||new Date().toISOString();
  if(!document||typeof document!=='object')return unknown('compiled stats document missing',meta.source||'none',checkedAt);
  if(document.schema!==SOURCE_SCHEMA)return unknown('compiled stats schema unavailable',meta.source||'unknown',checkedAt);
  return Object.freeze({
    schema:VIEW_SCHEMA,
    status:explicitStale(meta)?'stale':'available',
    source:meta.source||'compiled-stats',
    checked_at:checkedAt,
    generated_at:document.generated_at||null,
    data:document,
    error:null
  });
}
function metric(view,section,key){
  const row=view?.data?.[section]?.[key];
  if(!row||typeof row!=='object'||row.state!=='observed'||!Object.prototype.hasOwnProperty.call(row,'value')){
    return Object.freeze({
      state:'unknown',
      value:null,
      reason:reasonText(row?.reason)||'metric not observed'
    });
  }
  return Object.freeze({
    state:'observed',
    value:row.value,
    coverage:row.coverage??null
  });
}
function sample(view,section,key){
  const row=view?.data?.[section]?.[key];
  if(!row||typeof row!=='object'||row.state!=='observed'){
    return Object.freeze({
      state:'unknown',
      sample_count:0,
      median_ms:null,
      p95_ms:null,
      min_ms:null,
      max_ms:null
    });
  }
  return Object.freeze({
    state:'observed',
    sample_count:Number.isFinite(Number(row.sample_count))?Number(row.sample_count):null,
    median_ms:Number.isFinite(Number(row.median_ms))?Number(row.median_ms):null,
    p95_ms:Number.isFinite(Number(row.p95_ms))?Number(row.p95_ms):null,
    min_ms:Number.isFinite(Number(row.min_ms))?Number(row.min_ms):null,
    max_ms:Number.isFinite(Number(row.max_ms))?Number(row.max_ms):null
  });
}
function fromBundle(bundle=window.PROMETEO_V11_LAST){
  const checkedAt=new Date().toISOString();
  const stats=bundle?.stats||null;
  const state=bundle?.freshness?.sources?.stats||null;
  if(!stats||stats.schema!==SOURCE_SCHEMA){
    return unknown(
      state?.error||'compiled GitHub stats are not present in the current V11 bundle',
      state?.source||'bundle',
      checkedAt
    );
  }
  return normalize(stats,{
    source:state?.source||'bundle',
    source_status:state?.status||null,
    bundle_mode:bundle?.freshness?.mode||null,
    checked_at:checkedAt
  });
}
async function fetchCurrent(){
  const checkedAt=new Date().toISOString();
  const cfg=window.PROMETEO_CONTROL_CONFIG_V1||{};
  if(!cfg.statsUrl)return unknown('statsUrl is not configured','config',checkedAt);
  try{
    const response=await fetch(cfg.statsUrl,{cache:'no-store',credentials:'omit'});
    if(!response.ok)return unknown('statsUrl HTTP '+response.status,'github',checkedAt);
    const document=await response.json();
    return normalize(document,{source:'github',checked_at:checkedAt});
  }catch(error){
    return unknown(error,'github',checkedAt);
  }
}
async function load(){
  const bundled=fromBundle();
  if(bundled.status!=='unknown')return bundled;
  return fetchCurrent();
}

window.PROMETEO_STATS_V1=Object.freeze({
  schema:VIEW_SCHEMA,
  source_schema:SOURCE_SCHEMA,
  load,
  fetchCurrent,
  fromBundle,
  normalize,
  metric,
  sample,
  unknown
});
})();
