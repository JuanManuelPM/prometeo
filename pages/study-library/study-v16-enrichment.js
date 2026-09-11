(()=>{'use strict';
if(window.__STUDY_ENRICHMENT_V16)return;window.__STUDY_ENRICHMENT_V16=true;

const REG16='./course-enrichment-v16.json?v=160';
const DB16='study-cover-v16',STORE16='covers',FAIL16='study:coverfail:v16:';
let registry16={courses:[]},byId16=new Map(),observer16=null,mutation16=null,db16=null,queue16=[],active16=0;
const MAX_ACTIVE16=2;
const esc16=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const idle16=fn=>('requestIdleCallback'in window?requestIdleCallback(fn,{timeout:2200}):setTimeout(fn,900));

function style16(){if(document.querySelector('#studyV16Style'))return;const s=document.createElement('style');s.id='studyV16Style';s.textContent=`
.cover11,.cover12{position:relative;overflow:hidden}.coverPhoto16{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;opacity:0;transform:scale(1.01);transition:opacity .28s ease,transform .45s ease;filter:saturate(.88) contrast(1.03)}.coverPhoto16.ready{opacity:1}.book11:hover .coverPhoto16.ready,.book12:hover .coverPhoto16.ready{transform:scale(1.035)}.coverPhotoWash16{position:absolute;inset:0;z-index:2;background:linear-gradient(to bottom,transparent 35%,color-mix(in srgb,var(--bg,#111326) 12%,transparent) 56%,color-mix(in srgb,var(--bg,#111326) 86%,transparent) 100%);pointer-events:none;opacity:0;transition:opacity .25s}.coverPhoto16.ready~.coverPhotoWash16{opacity:1}.cover11 .coverTitle11,.cover12 .coverTitle11,.cover11 .coverSpine11,.cover12 .coverSpine11{position:relative;z-index:3}
.archive16{margin:0 0 18px;border:1px solid color-mix(in srgb,var(--ink,#d8d1ff) 17%,transparent);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 16px}.archive16Main{min-width:0}.archive16Label{display:block;font-size:9px;letter-spacing:.12em;text-transform:uppercase;opacity:.58;margin-bottom:4px}.archive16Main b{display:block;font-size:13px;line-height:1.2}.archive16Main p{margin:5px 0 0;font-size:10px;line-height:1.4;opacity:.62;max-width:760px}.archive16Actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.archive16Actions a{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 11px;border:1px solid currentColor;color:inherit;text-decoration:none;font-size:10px;font-weight:650;white-space:nowrap}.archive16Actions a.primary16{background:var(--ink,#d8d1ff);color:var(--bg,#111326)}.archive16Approx{font-size:9px;opacity:.48;margin-left:6px;font-weight:400}.coverSource16{position:absolute;right:8px;top:8px;z-index:4;width:22px;height:22px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--ink,#d8d1ff) 30%,transparent);background:color-mix(in srgb,var(--bg,#111326) 72%,transparent);font-size:9px;text-decoration:none;opacity:0;transition:opacity .18s}.courseHero11:hover .coverSource16{opacity:.75}
@media(max-width:700px){.archive16{grid-template-columns:1fr}.archive16Actions{justify-content:flex-start}.archive16Actions a{flex:1}.coverSource16{opacity:.55}}
@media(prefers-reduced-motion:reduce){.coverPhoto16,.coverPhotoWash16{transition:none}}
`;document.head.appendChild(s)}

function dbOpen16(){if(db16)return Promise.resolve(db16);return new Promise((res,rej)=>{const q=indexedDB.open(DB16,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE16))q.result.createObjectStore(STORE16)};q.onsuccess=()=>{db16=q.result;res(db16)};q.onerror=()=>rej(q.error)})}
async function dbGet16(k){try{const d=await dbOpen16();return await new Promise((res,rej)=>{const t=d.transaction(STORE16,'readonly'),r=t.objectStore(STORE16).get(k);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}catch{return null}}
async function dbPut16(k,v){try{const d=await dbOpen16();await new Promise((res,rej)=>{const t=d.transaction(STORE16,'readwrite');t.objectStore(STORE16).put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch{}}
function coverKey16(row){return `${row.course_id}:${row.cover?.pin_id||''}`}
function microlink16(url){return 'https://api.microlink.io/?'+new URLSearchParams({url,embed:'image.url'}).toString()}
function recentFail16(id){try{const t=Number(localStorage.getItem(FAIL16+id)||0);return t&&Date.now()-t<6*60*60*1000}catch{return false}}
function markFail16(id){try{localStorage.setItem(FAIL16+id,String(Date.now()))}catch{}}
function clearFail16(id){try{localStorage.removeItem(FAIL16+id)}catch{}}

async function fetchCover16(row){
 const key=coverKey16(row),hit=await dbGet16(key);if(hit?.blob instanceof Blob&&hit.blob.size>500)return hit.blob;
 if(recentFail16(row.course_id))throw new Error('cover cooldown');
 const r=await fetch(microlink16(row.cover.pin_url),{mode:'cors',cache:'force-cache'});if(!r.ok)throw new Error('cover '+r.status);
 const b=await r.blob();if(!/^image\//.test(b.type)||b.size<500)throw new Error('cover invalid');
 await dbPut16(key,{blob:b,at:Date.now(),pin_id:row.cover.pin_id});clearFail16(row.course_id);return b;
}
function enqueue16(row,host,priority=false){if(!row?.cover?.pin_url||!host||host.dataset.cover16==='ready'||host.dataset.cover16==='queued')return;host.dataset.cover16='queued';queue16.push({row,host,priority});queue16.sort((a,b)=>Number(b.priority)-Number(a.priority));pump16()}
function pump16(){while(active16<MAX_ACTIVE16&&queue16.length){const job=queue16.shift();active16++;loadCover16(job).finally(()=>{active16--;pump16()})}}
async function loadCover16({row,host}){
 if(!host?.isConnected){if(host?.dataset)delete host.dataset.cover16;return}
 let img=host.querySelector(':scope>.coverPhoto16');if(!img){img=document.createElement('img');img.className='coverPhoto16';img.alt='';img.decoding='async';img.loading='lazy';const wash=document.createElement('i');wash.className='coverPhotoWash16';host.prepend(wash);host.prepend(img)}
 try{const blob=await fetchCover16(row);if(!host.isConnected)return;const u=URL.createObjectURL(blob);img.onload=()=>{img.classList.add('ready');host.dataset.cover16='ready';setTimeout(()=>URL.revokeObjectURL(u),1500)};img.onerror=()=>{markFail16(row.course_id);URL.revokeObjectURL(u);host.dataset.cover16='fallback'};img.src=u}
 catch(e){markFail16(row.course_id);host.dataset.cover16='fallback'}
}
function observeCover16(row,host){if(!observer16)observer16=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const id=e.target.closest('[data-book12]')?.dataset.book12||e.target.closest('[data-book11]')?.dataset.book11||e.target.dataset.course16;const r=byId16.get(id);if(r)enqueue16(r,e.target,true);observer16.unobserve(e.target)}}),{rootMargin:'420px 0px'});host.dataset.course16=row.course_id;observer16.observe(host)}

function patchLibrary16(){
 document.querySelectorAll('[data-book12]').forEach(b=>{const row=byId16.get(b.dataset.book12),cover=b.querySelector('.cover12,.cover11');if(row&&cover&&!cover.dataset.v16){cover.dataset.v16='1';observeCover16(row,cover)}});
 document.querySelectorAll('[data-book11]').forEach(b=>{const row=byId16.get(b.dataset.book11),cover=b.querySelector('.cover11');if(row&&cover&&!cover.dataset.v16){cover.dataset.v16='1';observeCover16(row,cover)}})
}
function archiveHTML16(row){
 const h=row?.historical_archive,c=row?.current_external;if(!h&&!c)return'';
 const approx=h?.match==='approx';
 return `<section class="archive16" data-archive16="${esc16(row.course_id)}"><div class="archive16Main"><span class="archive16Label">Material de la materia</span><b>${c?'Material actual disponible':h?'Archivo histórico'+(approx?'<span class="archive16Approx">equivalencia de plan anterior</span>':''):''}</b><p>${h?'El archivo histórico puede corresponder a programas anteriores. El Drive dejó de actualizarse periódicamente en diciembre de 2018; contrastalo con el programa y las fuentes actuales.':'Fuentes actuales externas de esta materia.'}</p></div><div class="archive16Actions">${c?`<a class="primary16" href="${esc16(c.url)}" target="_blank" rel="noopener">${esc16(c.label||'Material actual')} ↗</a>`:''}${h?`<a href="${esc16(h.url)}" target="_blank" rel="noopener">Archivo histórico ↗</a>`:''}</div></section>`
}
function patchCourse16(){
 if(typeof view==='undefined'||view!=='course'||typeof course==='undefined'||!course||document.querySelector('.assessmentView10'))return;const row=byId16.get(course),hero=document.querySelector('.courseHero11');if(!row||!hero)return;
 const cover=hero.querySelector('.cover11,.cover12');if(cover&&!cover.dataset.v16){cover.dataset.v16='1';enqueue16(row,cover,true);if(row.cover?.pin_url&&!cover.querySelector('.coverSource16')){const a=document.createElement('a');a.className='coverSource16';a.href=row.cover.pin_url;a.target='_blank';a.rel='noopener';a.title='Referencia visual en Pinterest';a.textContent='↗';cover.appendChild(a)}}
 if(!document.querySelector(`[data-archive16="${CSS.escape(row.course_id)}"]`)){const x=archiveHTML16(row);if(x)hero.insertAdjacentHTML('afterend',x)}
}
function patch16(){style16();patchLibrary16();patchCourse16()}
function warm16(){
 if(navigator.connection?.saveData)return;const rows=registry16.courses.filter(x=>x.year_no<=2);let i=0;
 const next=()=>{if(i>=rows.length)return;const row=rows[i++];if(!recentFail16(row.course_id))dbGet16(coverKey16(row)).then(hit=>{if(!hit?.blob){const ghost=document.createElement('div');ghost.style.display='none';document.body.appendChild(ghost);enqueue16(row,ghost,false);setTimeout(()=>ghost.remove(),15000)}});setTimeout(next,2500)};setTimeout(next,4000)
}
async function boot16(){
 try{const r=await fetch(REG16,{cache:'force-cache'});if(!r.ok)throw new Error('registry');registry16=await r.json();byId16=new Map((registry16.courses||[]).map(x=>[x.course_id,x]));style16();patch16();mutation16=new MutationObserver(()=>requestAnimationFrame(patch16));mutation16.observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});idle16(warm16);window.PrometeoStudyEnrichmentV16={registry:registry16,patch:patch16,course:id=>byId16.get(id),clearCoverCache:()=>indexedDB.deleteDatabase(DB16)}}catch(e){console.warn('Study Library V16 enrichment',e)}
}
boot16();
})();
