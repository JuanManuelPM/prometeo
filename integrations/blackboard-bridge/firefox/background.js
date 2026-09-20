const api=typeof browser!=='undefined'?browser:chrome;
const BB_API='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/study-blackboard-v1';
const BB_INGEST=BB_API+'?action=ingest';
const BB_DATA=BB_API+'?action=data';
const BB_FILES='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/study-blackboard-files-v1';
const BB_WORKSPACE='colo-study';
const BB_ROOTS=[
 BB_BASE+'/',
 BB_BASE+'/ultra/course',
 BB_BASE+'/ultra/stream',
 BB_BASE+'/webapps/calendar/viewPersonal',
 BB_BASE+'/webapps/blackboard/execute/announcement?method=search&context=mybb&handle=my_announcements&returnUrl=/webapps/portal/execute/tabs/tabAction?tab_tab_group_id=_1_1&tabId=_1_1&forwardUrl=index.jsp',
 BB_BASE+'/webapps/portal/execute/tabs/tabAction?tab_tab_group_id=_1_1'
];
let bbRunning=null;
async function bbStore(){const x=await api.storage.local.get(['studyToken','deviceId','lastSync']);if(!x.deviceId){x.deviceId=crypto.randomUUID();await api.storage.local.set({deviceId:x.deviceId})}return x}
function bbHeaders(token){return{'x-study-token':token,'x-study-workspace':BB_WORKSPACE}}
async function bbIngest(payload){const s=await bbStore();if(!s.studyToken)throw new Error('not_paired');const r=await fetch(BB_INGEST,{method:'POST',credentials:'omit',headers:{'content-type':'application/json',...bbHeaders(s.studyToken)},body:JSON.stringify({...payload,device_id:s.deviceId})});if(!r.ok)throw new Error('ingest_'+r.status);return r.json()}
function bbCanonicalPageUrl(x){try{const u=new URL(x);u.hash='';return u.href}catch{return''}}
function bbGoodCourseUrl(x){return !!x&&x.startsWith(BB_BASE)&&!bbFile(x,'')&&!/bbcswebdav|attachment|download/i.test(x)&&/course_id=|courseId=|type=Course|\/ultra\/courses\//i.test(x)}
async function bbKnownCourseUrls(token){try{const r=await fetch(BB_DATA,{headers:bbHeaders(token),cache:'no-store'});if(!r.ok)return[];const d=await r.json();return [...new Set((d.courses||[]).map(x=>bbCanonicalPageUrl(x.href)).filter(bbGoodCourseUrl))]}catch{return[]}}
async function bbNotify(data){const tabs=await api.tabs.query({url:'https://juanmanuelpm.github.io/prometeo/pages/study-library/*'}).catch(()=>[]);for(const t of tabs)if(t.id!=null)api.tabs.sendMessage(t.id,{type:'PROMETEO_BB_EVENT',data}).catch(()=>{})}
async function bbFetchPage(url){const r=await fetch(url,{credentials:'include',redirect:'follow',cache:'no-store',headers:{accept:'text/html,application/xhtml+xml'}});const ct=r.headers.get('content-type')||'';if(!r.ok||!ct.includes('text/html'))return null;return{url:r.url||url,...parseBBPage(await r.text(),r.url||url)}}
function bbNameFromDisposition(cd,fallback){const m=String(cd||'').match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);if(!m)return fallback;try{return decodeURIComponent(m[1].replace(/^"|"$/g,''))}catch{return m[1].replace(/^"|"$/g,'')}}
async function bbMirrorFiles(items=[]){
 const s=await bbStore();if(!s.studyToken)return{mirrored:0,skipped:0,failed:0,candidates:0,errors:['not_paired']};let known=[];try{const r=await fetch(BB_FILES+'?action=index',{headers:bbHeaders(s.studyToken),cache:'no-store'});if(r.ok)known=(await r.json()).files||[]}catch{}
 const km=new Map(known.map(x=>[x.item_key,x])),cut=Date.now()-12*60*60*1000;
 const candidates=items.filter(x=>x?.item_type==='file'&&x.href&&!/\.(mp4|mov|avi|mkv|webm|wav|flac)(?:[?#]|$)/i.test(x.href)).filter(x=>!km.has(x.item_key)||new Date(km.get(x.item_key).mirrored_at||0).getTime()<cut).slice(0,80);
 let mirrored=0,skipped=0,failed=0,index=0;const errors=[];
 async function worker(){while(index<candidates.length){const x=candidates[index++];try{const r=await fetch(x.href,{credentials:'include',redirect:'follow',cache:'no-store',headers:{accept:'application/pdf,application/octet-stream,*/*'}});if(!r.ok)throw new Error('file_'+r.status);const ct=(r.headers.get('content-type')||'application/octet-stream').split(';')[0].trim();if(/text\/html/i.test(ct)){skipped++;if(errors.length<8)errors.push('html:'+String(x.title||x.href).slice(0,110));continue}const len=Number(r.headers.get('content-length')||0);if(len>52428800){skipped++;continue}const blob=await r.blob();if(blob.size>52428800||!blob.size){skipped++;continue}const name=bbNameFromDisposition(r.headers.get('content-disposition'),x.file_name||x.title||'archivo');const fd=new FormData();fd.append('item_key',x.item_key);fd.append('course_key',x.course_key||'');fd.append('source_url',x.href);fd.append('file_name',name);fd.append('file',new File([blob],name,{type:ct}));const up=await fetch(BB_FILES+'?action=upload',{method:'POST',headers:bbHeaders(s.studyToken),body:fd});if(!up.ok){let detail='';try{detail=(await up.json()).error||''}catch{}throw new Error('mirror_'+up.status+(detail?':'+detail:''))}mirrored++;if((mirrored+failed)%4===0)await bbNotify({state:'mirroring',mirrored,remaining:Math.max(0,candidates.length-mirrored-skipped-failed),at:Date.now()})}catch(e){failed++;if(errors.length<8)errors.push(String(e?.message||e).slice(0,180))}}}
 await Promise.all([worker(),worker(),worker()]);return{mirrored,skipped,failed,candidates:candidates.length,errors}
}
const bbSleep=ms=>new Promise(r=>setTimeout(r,ms));
function bbTermRank(code=''){const m=String(code).match(/^(20\d{2})C([12])C_/i);return m?(+m[1])*10+(+m[2]):0}
function bbAcademicCode(c){const k=String(c?.course_key||'');if(/^20\d{2}C[12]C_/i.test(k))return k;return String(c?.raw?.academic_code||bbCourseCodeFromText(c?.title||'')||'')}
async function bbKnownData(token){try{const r=await fetch(BB_DATA,{headers:bbHeaders(token),cache:'no-store'});if(!r.ok)return{courses:[],items:[]};return await r.json()}catch{return{courses:[],items:[]}}}
async function bbRenderedSnapshot(url,settle=3600){
 let tab=null;
 try{
  tab=await api.tabs.create({url,active:false});
  for(let i=0;i<45;i++){let t=null;try{t=await api.tabs.get(tab.id)}catch{}if(t?.status==='complete')break;await bbSleep(250)}
  await bbSleep(settle);
  for(let i=0;i<4;i++){try{const s=await api.tabs.sendMessage(tab.id,{type:'PROMETEO_BB_SNAPSHOT'});if(s?.url)return s}catch{}await bbSleep(1200)}
  return null;
 }catch{return null}
 finally{if(tab?.id!=null)try{await api.tabs.remove(tab.id)}catch{}}
}
function bbCourseNameKey(s=''){
 let x=bbPrettyCourseTitle(String(s||''),'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\bIII\b/g,'3').replace(/\bII\b/g,'2').replace(/\bI\b/g,'1');
 return x.replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function bbBuildRegistry(...sets){
 const all=sets.flat().filter(Boolean),internalToAcademic=new Map(),byAcademic=new Map();
 const rows=all.map(c=>({c,academic:bbAcademicCode(c),internal:String(c?.course_key||''),href:bbCanonicalPageUrl(c?.href||''),key:bbCourseNameKey(c?.title||c?.course_key||'')}));
 const academicRows=rows.filter(r=>r.academic);
 for(const r of rows){
  if(r.academic)continue;
  if(!r.internal||/^20\d{2}C[12]C_/i.test(r.internal)||!bbGoodCourseUrl(r.href)||!r.key)continue;
  const matches=academicRows.filter(a=>a.key&&(a.key===r.key||a.key.includes(r.key)||r.key.includes(a.key)));
  if(matches.length===1)r.academic=matches[0].academic;
 }
 for(const r of rows){
  const {c,academic,internal,href}=r;
  if(academic&&internal&&!/^20\d{2}C[12]C_/i.test(internal))internalToAcademic.set(internal,academic);
  if(academic){
    const prev=byAcademic.get(academic)||{academic,internal:'',href:'',title:''};
    if(internal&&!/^20\d{2}C[12]C_/i.test(internal))prev.internal=internal;
    if(bbGoodCourseUrl(href))prev.href=href;
    if(c?.title)prev.title=c.title;
    byAcademic.set(academic,prev);
  }
 }
 return{internalToAcademic,byAcademic};
}
async function bbSync(reason='manual'){
 if(bbRunning)return bbRunning;
 bbRunning=(async()=>{
  const store=await bbStore();
  await bbNotify({state:'syncing',reason,at:Date.now()});
  const knownData=store.studyToken?await bbKnownData(store.studyToken):{courses:[],items:[]};
  const knownCourseText=(knownData.items||[]).map(x=>String(x?.body_text||'')+' '+String(x?.title||'')).join('\n');
  const textCourses=bbBodyCourses(knownCourseText);
  const registrySnap=await bbRenderedSnapshot(BB_BASE+'/ultra/course',4600);
  if(registrySnap?.needs_login){await bbNotify({state:'needs_login',at:Date.now()});return{ok:false,needs_login:true}}
  let registry=bbBuildRegistry(knownData.courses||[],textCourses,registrySnap?.courses||[]);
  const allAcademic=[...registry.byAcademic.keys()];
  const currentRank=Math.max(0,...allAcademic.map(bbTermRank));
  const expectedCodes=allAcademic.filter(c=>bbTermRank(c)===currentRank).sort();
  const courseSnapshots=[],renderedCodes=new Set();
  for(const code of expectedCodes){
    const entry=registry.byAcademic.get(code);
    if(!entry?.href)continue;
    const snap=await bbRenderedSnapshot(entry.href,3800);
    if(snap?.needs_login){await bbNotify({state:'needs_login',at:Date.now()});return{ok:false,needs_login:true}}
    if(snap){courseSnapshots.push(snap);renderedCodes.add(code)}
  }
  registry=bbBuildRegistry(knownData.courses||[],textCourses,registrySnap?.courses||[],...courseSnapshots.map(x=>x.courses||[]));
  const normalizeCourse=c=>{
    const original=String(c?.course_key||''),academic=bbAcademicCode(c)||registry.internalToAcademic.get(original)||original;
    return {...c,course_key:academic,raw:{...(c.raw||{}),internal_course_key:academic!==original?original:(c.raw?.internal_course_key||null)}};
  };
  const normalizeItem=x=>{
    const original=String(x?.course_key||''),academic=registry.internalToAcademic.get(original)||String(x?.raw?.academic_code||'')||original||null;
    return {...x,course_key:academic||null,raw:{...(x.raw||{}),internal_course_key:academic&&original&&academic!==original?original:(x.raw?.internal_course_key||null)}};
  };
  const courses=new Map(),items=new Map(),queue=[...BB_ROOTS],seen=new Set();let pages=0,login=false;
  const mergeCourse=c=>{if(!c)return;const n=normalizeCourse(c),prev=courses.get(n.course_key);if(!prev||bbCourseTitleScore(n.title,n.course_key)>bbCourseTitleScore(prev.title,prev.course_key)||(!prev.href&&n.href))courses.set(n.course_key,{...prev,...n})};
  const mergeItem=x=>{if(!x)return;const n=normalizeItem(x);items.set(n.item_key,n)};
  const mergeSnapshot=p=>{if(!p)return;for(const c of p.courses||[])mergeCourse(c);for(const x of p.items||[])mergeItem(x);for(const h0 of p.enqueue||[]){const h=bbCanonicalPageUrl(h0);if(h&&bbUseful(h)&&!bbFile(h,'')&&!queue.includes(h))queue.push(h)}};
  for(const c of knownData.courses||[])mergeCourse(c);
  for(const c of textCourses)mergeCourse(c);
  mergeSnapshot(registrySnap);for(const p of courseSnapshots)mergeSnapshot(p);
  for(const code of expectedCodes){const h=registry.byAcademic.get(code)?.href;if(bbGoodCourseUrl(h)&&!queue.includes(h))queue.push(h)}
  const known=store.studyToken?await bbKnownCourseUrls(store.studyToken):[];for(const h of known)if(!queue.includes(h))queue.push(h);
  while(queue.length&&pages<180&&items.size<4200){
    const raw=queue.shift(),url=bbCanonicalPageUrl(raw);if(!url||seen.has(url))continue;seen.add(url);let p=null;try{p=await bbFetchPage(url)}catch{}if(!p)continue;
    if(p.password||/login|auth/i.test(new URL(p.url).pathname)){login=true;continue}
    pages++;for(const c of p.courses)mergeCourse(c);for(const x of p.items)if(items.size<4200)mergeItem(x);
    for(const h0 of p.enqueue){const h=bbCanonicalPageUrl(h0);if(h&&!seen.has(h)&&!queue.includes(h)&&bbUseful(h)&&!bbFile(h,''))queue.push(h)}
    for(const c0 of p.courses){const c=normalizeCourse(c0),h=bbCanonicalPageUrl(c.href);if(bbGoodCourseUrl(h)&&!seen.has(h)&&!queue.includes(h))queue.push(h)}
    if(pages%8===0)await bbNotify({state:'syncing',pages,courses:courses.size,items:items.size,queue:queue.length,coverage:{expected:expectedCodes.length,rendered:renderedCodes.size},at:Date.now()})
  }
  if(!pages&&!courseSnapshots.length&&login){await bbNotify({state:'needs_login',at:Date.now()});return{ok:false,needs_login:true}}
  if(!pages&&!courseSnapshots.length){const out={state:'error',error:'Abrí Blackboard una vez y volvé a sincronizar.',at:Date.now()};await bbNotify(out);return{ok:false,...out}}
  const all=[...items.values()],result=await bbIngest({courses:[...courses.values()],items:all,pages:pages+courseSnapshots.length}),mirror=await bbMirrorFiles(all);
  const missing=expectedCodes.filter(c=>!registry.byAcademic.get(c)?.href),unrendered=expectedCodes.filter(c=>registry.byAcademic.get(c)?.href&&!renderedCodes.has(c));
  const complete=expectedCodes.length>0&&!missing.length&&!unrendered.length;
  const coverage={term_rank:currentRank,expected:expectedCodes.length,resolved:expectedCodes.length-missing.length,rendered:renderedCodes.size,expected_codes:expectedCodes,missing,unrendered};
  const out={state:complete?'ok':'partial',pages:pages+courseSnapshots.length,courses:courses.size,items:items.size,files:mirror,coverage,ingest:result?.ingest||{},at:Date.now()};
  await api.storage.local.set({lastSync:out});await bbNotify(out);return{ok:complete,...out};
 })().finally(()=>bbRunning=null);
 return bbRunning
}
api.runtime.onInstalled.addListener(()=>api.alarms.create('prometeo-bb-auto',{periodInMinutes:15}));
api.alarms.onAlarm.addListener(a=>{if(a.name==='prometeo-bb-auto')api.storage.local.get('studyToken').then(x=>x.studyToken&&bbSync('auto')).catch(()=>{})});
api.runtime.onMessage.addListener(m=>{if(!m)return;if(m.type==='PAIR')return api.storage.local.set({studyToken:m.token,workspace:BB_WORKSPACE}).then(()=>{api.alarms.create('prometeo-bb-auto',{periodInMinutes:15});return bbSync('pair')});if(m.type==='SYNC')return bbSync('manual');if(m.type==='STATUS')return bbStore().then(x=>({paired:!!x.studyToken,lastSync:x.lastSync||null,running:!!bbRunning}));if(m.type==='OPEN_BLACKBOARD')return api.tabs.create({url:BB_BASE+'/'});if(m.type==='PAGE_SNAPSHOT'&&m.payload)return bbIngest({courses:m.payload.courses||[],items:m.payload.items||[],pages:1}).then(async()=>{const mirror=await bbMirrorFiles(m.payload.items||[]);await bbNotify({state:'page_captured',url:m.payload.url,files:mirror,at:Date.now()})}).catch(()=>{})});
