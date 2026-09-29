(function(){
'use strict';

const VERSION='PROMETEO_CONTROL_DIAGNOSTICS_V1';
const STORE='prometeo.control.v11.diagnostics.v1';
const MAX_EVENTS=180;
const COALESCE_MS=15000;
const SESSION=(crypto.randomUUID?.()||('session-'+Date.now()+'-'+Math.random().toString(36).slice(2)));
const SAFE_ROUTE_KEYS=new Set(['view','page','node','panel','work']);
let events=read();
let listeners=[];
let mounted=false;

function read(){
  try{
    const x=JSON.parse(localStorage.getItem(STORE)||'[]');
    return Array.isArray(x)?x.slice(-MAX_EVENTS):[];
  }catch{return []}
}
function persist(){
  try{localStorage.setItem(STORE,JSON.stringify(events.slice(-MAX_EVENTS)))}catch{}
}
function cleanText(value,max=1000){
  let s=String(value==null?'':value);
  s=s.replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi,'Bearer [REDACTED]');
  s=s.replace(/(token|secret|apikey|api_key|authorization)=([^\s&]+)/gi,'$1=[REDACTED]');
  if(s.length>max)s=s.slice(0,max)+'…';
  return s;
}
function safeUrl(raw){
  if(!raw)return null;
  try{
    const u=new URL(String(raw),location.href);
    return u.origin+u.pathname;
  }catch{return cleanText(raw,420)}
}
function safeRoute(){
  const u=new URL(location.href),q=new URLSearchParams();
  for(const [k,v] of u.searchParams)if(SAFE_ROUTE_KEYS.has(k))q.set(k,v);
  return u.pathname+(q.size?'?'+q.toString():'');
}
function sourceFromUrl(url){
  const x=String(url||'');
  if(x.includes('/rpc/prometeo_current_tree_v2'))return'tree';
  if(x.includes('/rpc/prometeo_organism_projection'))return'org';
  if(x.includes('/rpc/prometeo_work_contexts_projection'))return'ctx';
  if(x.includes('/rpc/prometeo_control_room_activity'))return'act';
  if(x.includes('/rpc/prometeo_statistics'))return'stats';
  if(x.includes('/coordination/project-context-v1/'))return'projectContext';
  if(x.includes('/previews/manifest.json'))return'previews';
  if(x.includes('/catalog/CATALOG_MANIFEST.json'))return'catalog';
  if(x.includes('/live/runtime.json'))return'runtime';
  if(x.includes('/live/claim-frontier.json'))return'claimFrontier';
  if(x.includes('/prometeo-change-loop-v1'))return'pageChange';
  if(x.includes('/prometeo-capture'))return'capture';
  return null;
}
function fingerprint(e){
  return [e.kind,e.source,e.status,e.method,e.url,e.message].map(x=>x==null?'':String(x)).join('|');
}
function emit(){
  for(const fn of listeners)try{fn(events)}catch{}
  render();
}
function record(input={}){
  const at=new Date().toISOString();
  const entry={
    id:crypto.randomUUID?.()||('diag-'+Date.now()+'-'+Math.random().toString(36).slice(2)),
    session:SESSION,
    at,
    last_at:at,
    count:1,
    level:String(input.level||'error').toLowerCase(),
    kind:String(input.kind||'error'),
    source:cleanText(input.source||sourceFromUrl(input.url)||'unknown',100),
    status:Number.isFinite(Number(input.status))?Number(input.status):null,
    method:input.method?String(input.method).toUpperCase():null,
    url:safeUrl(input.url),
    message:cleanText(input.message||input.error?.message||input.error||'Error',1200),
    stack:cleanText(input.stack||input.error?.stack||'',1800)||null
  };
  const fp=fingerprint(entry),last=events[events.length-1],lastMs=Date.parse(last?.last_at||last?.at||0);
  if(last&&last.fingerprint===fp&&Date.now()-lastMs<=COALESCE_MS){
    last.count=Number(last.count||1)+1;
    last.last_at=at;
  }else{
    entry.fingerprint=fp;
    events.push(entry);
    if(events.length>MAX_EVENTS)events=events.slice(-MAX_EVENTS);
  }
  persist();emit();
  return entry;
}
function sourceFailure(source,error,url=null,status=null){
  return record({kind:'source',source,url,status,error,level:'error'});
}
function counts(){
  const current=events.filter(e=>e.session===SESSION);
  return {
    session_events:current.length,
    session_occurrences:current.reduce((n,e)=>n+Number(e.count||1),0),
    total_events:events.length,
    total_occurrences:events.reduce((n,e)=>n+Number(e.count||1),0)
  };
}
function snapshot(){
  const freshness=window.PROMETEO_V11_LAST?.freshness||null;
  const activeView=document.querySelector('.view.on')?.id||null;
  return {
    schema:'prometeo.control-diagnostic-packet/v1',
    created_at:new Date().toISOString(),
    diagnostics_version:VERSION,
    page:{
      route:safeRoute(),
      title:document.title,
      view:activeView,
      viewport:{width:innerWidth,height:innerHeight},
      online:navigator.onLine
    },
    runtime_text:cleanText(document.getElementById('runtime')?.textContent||'',900),
    freshness:freshness?{
      mode:freshness.mode||null,
      freshCore:!!freshness.freshCore,
      observed_at:freshness.observed_at||null,
      checked_at:freshness.checked_at||null,
      failures:Array.isArray(freshness.failures)?freshness.failures.map(x=>({key:cleanText(x.key,100),message:cleanText(x.message,700)})):[],
      sources:Object.fromEntries(Object.entries(freshness.sources||{}).map(([k,v])=>[k,{
        status:v?.status||null,source:v?.source||null,url:safeUrl(v?.url),observed_at:v?.observed_at||null,checked_at:v?.checked_at||null,error:cleanText(v?.error||'',700)||null
      }]))
    }:null,
    counts:counts(),
    recent_events:events.slice(-80).map(({fingerprint,...e})=>e),
    privacy:{
      note_bodies_included:false,
      request_bodies_included:false,
      request_headers_included:false,
      query_strings_in_urls_included:false
    }
  };
}
async function copyState(){
  const text='PROMETEO_DIAGNOSTIC_PACKET_V1\n'+JSON.stringify(snapshot(),null,2);
  try{
    await navigator.clipboard.writeText(text);
  }catch{
    const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
  }
  const el=document.getElementById('diagCopyStatus');if(el){el.textContent='copiado';setTimeout(()=>{if(el)el.textContent=''},1800)}
  return text;
}
function clear(){
  events=[];persist();emit();
}
function escapeHtml(x){return String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){
  if(!mounted)return;
  const c=counts(),btn=document.getElementById('diagBtn'),badge=document.getElementById('diagCount'),summary=document.getElementById('diagSummary'),list=document.getElementById('diagList');
  if(badge)badge.textContent=String(c.session_occurrences);
  if(btn){btn.classList.toggle('has-errors',c.session_occurrences>0);btn.title=c.session_occurrences?c.session_occurrences+' errores/eventos en esta sesión':'Sin errores registrados en esta sesión'}
  if(summary){
    const fresh=window.PROMETEO_V11_LAST?.freshness;
    const failed=Array.isArray(fresh?.failures)?fresh.failures.length:0;
    summary.textContent=(fresh?.mode||'sin freshness')+' · '+failed+' fuentes con error · '+c.session_occurrences+' eventos esta sesión · '+c.total_occurrences+' acumulados';
  }
  if(list){
    const rows=events.slice().reverse().slice(0,100);
    list.innerHTML=rows.length?rows.map(e=>'<article class="diag-event '+escapeHtml(e.level)+'"><div class="diag-event-top"><span>'+escapeHtml(e.kind)+' · '+escapeHtml(e.source)+'</span><time>'+escapeHtml(new Date(e.last_at||e.at).toLocaleTimeString('es-AR'))+(e.count>1?' ×'+e.count:'')+'</time></div><div class="diag-event-msg">'+escapeHtml(e.message)+'</div><div class="diag-event-meta">'+[e.method,e.status,e.url].filter(Boolean).map(escapeHtml).join(' · ')+'</div></article>').join(''):'<div class="diag-empty">Sin errores registrados todavía.</div>';
  }
}
function open(){document.getElementById('diagTerminal')?.classList.add('on');render()}
function close(){document.getElementById('diagTerminal')?.classList.remove('on')}
function mount(){
  if(mounted)return;mounted=true;
  document.getElementById('diagBtn')?.addEventListener('click',open);
  document.getElementById('diagClose')?.addEventListener('click',close);
  document.getElementById('diagCopy')?.addEventListener('click',()=>copyState());
  document.getElementById('diagClear')?.addEventListener('click',clear);
  render();
}
const nativeFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
  const url=typeof input==='string'?input:input?.url;
  const method=String(init?.method||input?.method||'GET').toUpperCase();
  const start=performance.now();
  try{
    const response=await nativeFetch(input,init);
    if(!response.ok)record({kind:'http',source:sourceFromUrl(url),url,method,status:response.status,message:'HTTP '+response.status+' · '+Math.round(performance.now()-start)+'ms'});
    return response;
  }catch(error){
    record({kind:'network',source:sourceFromUrl(url),url,method,error,message:(error?.name||'NetworkError')+' · '+(error?.message||'fetch failed')});
    throw error;
  }
};
addEventListener('error',event=>{
  const target=event.target;
  if(target&&target!==window&&(target.src||target.href)){
    record({kind:'resource',source:target.tagName?.toLowerCase()||'resource',url:target.src||target.href,message:'Recurso no cargó'});
    return;
  }
  if(event.error||event.message)record({kind:'js',source:event.filename?'script':'window',url:event.filename,error:event.error,message:event.message||event.error?.message||'JavaScript error',stack:event.error?.stack});
},true);
addEventListener('unhandledrejection',event=>{
  const r=event.reason;record({kind:'promise',source:'unhandledrejection',error:r,message:r?.message||String(r||'Unhandled rejection'),stack:r?.stack});
});
addEventListener('online',()=>render());
addEventListener('offline',()=>record({kind:'network',source:'browser',level:'warn',message:'Navegador offline'}));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else queueMicrotask(mount);

window.PROMETEO_DIAGNOSTICS_V1=Object.freeze({
  version:VERSION,record,sourceFailure,snapshot,copyState,clear,open,close,counts,
  subscribe(fn){if(typeof fn==='function'){listeners.push(fn);return()=>{listeners=listeners.filter(x=>x!==fn)}}return()=>{}},
  rerender:render
});
})();
