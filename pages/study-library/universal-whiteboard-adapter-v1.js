(()=>{'use strict';
if(window.PrometeoUniversalWhiteboard)return;
const ENGINE_ID='mnemonic-whiteboard-v10';
const ENGINE_URL='../study-system-v2-whiteboard-v10.html';
const prefix={base:'study:v2:modelos-teorias-ii:whiteboard-v7:',decor:'study:v2:modelos-teorias-ii:whiteboard-v9:decor:',thumb:'study:v2:modelos-teorias-ii:whiteboard-v10:thumb:',ready:'study:v2:modelos-teorias-ii:whiteboard-v10:thumb-ready:'};
const safe=s=>String(s??'').replace(/[^a-zA-Z0-9:_-]+/g,'-').replace(/-+/g,'-').replace(/(^-|-$)/g,'');
const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v&&typeof v==='object'?v:f}catch{return f}};
const keys=topicId=>({base:prefix.base+topicId,decor:prefix.decor+topicId,thumb:prefix.thumb+topicId,ready:prefix.ready+topicId});
function topicId(context,owner,id){return safe(`${context}:${owner}:${id}`)}
function normalizeState(raw){
  if(raw?.schema==='prometeo.whiteboard/v10')return {schema:raw.schema,engine:raw.engine||ENGINE_ID,base:raw.base||{version:7,blocks:['blank'],strokes:[],objects:[]},decor:raw.decor||{objects:[]},preview:raw.preview||'',preview_ready:raw.preview_ready!==false};
  if(raw&&typeof raw==='object'&&(Array.isArray(raw.strokes)||Array.isArray(raw.objects)||Array.isArray(raw.blocks)))return {schema:'prometeo.whiteboard/v10',engine:ENGINE_ID,base:raw,decor:{objects:[]},preview:'',preview_ready:false,migrated_from:'study-library-class-wb7'};
  return {schema:'prometeo.whiteboard/v10',engine:ENGINE_ID,base:{version:7,blocks:['blank'],strokes:[],objects:[]},decor:{objects:[]},preview:'',preview_ready:false};
}
function hydrate(id,raw){const s=normalizeState(raw),k=keys(id);try{localStorage.setItem(k.base,JSON.stringify(s.base||{}));localStorage.setItem(k.decor,JSON.stringify(s.decor||{objects:[]}));if(s.preview)localStorage.setItem(k.thumb,s.preview);else localStorage.removeItem(k.thumb);if(s.preview_ready)localStorage.setItem(k.ready,'1');else localStorage.removeItem(k.ready)}catch{}return s}
function capture(id,previewOverride){const k=keys(id),base=read(k.base,{version:7,blocks:['blank'],strokes:[],objects:[]}),decor=read(k.decor,{objects:[]}),preview=previewOverride!==undefined?previewOverride:(localStorage.getItem(k.thumb)||'');return {schema:'prometeo.whiteboard/v10',engine:ENGINE_ID,base,decor,preview,preview_ready:localStorage.getItem(k.ready)==='1'||!!preview,updated_at:new Date().toISOString()}}
function hasContent(state){const s=normalizeState(state);return !!((s.base?.strokes?.length)||(s.base?.objects?.length)||(s.decor?.objects?.length))}
function url(id,extra={}){const u=new URL(ENGINE_URL,location.href);u.searchParams.set('topic',id);u.searchParams.set('embed','1');u.searchParams.set('v','20260910-integration');Object.entries(extra).forEach(([k,v])=>v!=null&&u.searchParams.set(k,String(v)));return u.href}
window.PrometeoUniversalWhiteboard={version:1,engineId:ENGINE_ID,engineUrl:ENGINE_URL,topicId,keys,normalizeState,hydrate,capture,hasContent,url};
})();
