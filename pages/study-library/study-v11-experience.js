(()=>{'use strict';
if(window.__STUDY_LIBRARY_V11)return;window.__STUDY_LIBRARY_V11=true;
const BB11_API='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/study-blackboard-v1';
const BB11_TOKEN='study_bb_workspace_token';
const MONTHS11=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAYS11=['dom','lun','mar','mié','jue','vie','sáb'];
const ART11=['split','grid','line','cell','wave','stone'];
let data11={courses:[],events:[],items:[],sources:[]},registry11={assessments:[]},cursor11=new Date(),keyToCourse11=new Map(),courseKeys11=new Map(),loaded11=false;
const norm11=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const clean11=(s,n=500)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,n);
const ymd11=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const localDate11=s=>{if(!s)return null;const d=new Date(s);return isNaN(d)?null:d};
const humanDate11=s=>{const d=localDate11(s);return d?d.toLocaleDateString('es-AR',{day:'numeric',month:'short'}).replace('.',''):''};
const hash11=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
function alias11(row){
 const s=norm11(`${row.course_key||''} ${row.title||''}`);
 if(/modelos y teorias 2/.test(s))return{id:'modelos',name:'Modelos y Teorías II',art:'split'};
 if(/est aplicada a la psicologia/.test(s))return{id:'estadistica',name:'Estadística aplicada a la Psicología',art:'grid'};
 if(/sensacion y percepcion/.test(s))return{id:'sensacion',name:'Sensación y Percepción',art:'cell'};
 if(/sociologia/.test(s))return{id:'sociologia',name:'Sociología',art:'line'};
 const code=(String(row.title||'').match(/\((202\dC\dC_[^)]+)\)/)||[])[1]||String(row.course_key||'');
 let name=String(row.title||row.course_key||'Materia').replace(/\s*\([^)]*\)\s*$/,'').replace(/_M_[A-Z]{2}_[\d.\-]+.*$/i,'').replace(/_/g,' ').replace(/\s+/g,' ').trim();
 name=name.toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase());
 return{id:'bb-'+String(row.course_key||code).replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase(),name:name||'Materia',art:ART11[hash11(code)%ART11.length]};
}
function term11(row){const s=String(row.title||'')+' '+String(row.course_key||'');if(/2026C1C/i.test(s))return'1º año · 1º cuatrimestre';if(/2026C2C/i.test(s))return'1º año · 2º cuatrimestre';return row.term||'2026'}
function saneUnits11(units){return (units||[]).filter(u=>!/contenido por integrar|unidad de muestra|segundo parcial/i.test(String(u?.[2]||'')+' '+String(u?.[3]||'')))}
function courseKeysFor11(id){return courseKeys11.get(id)||[]}
function courseItems11(id){const ks=new Set(courseKeysFor11(id));return (data11.items||[]).filter(x=>ks.has(x.course_key))}
function sourceAge11(){const s=(data11.sources||[]).find(x=>x.source_id==='palermo');if(!s?.last_sync_at)return'';const mins=Math.max(0,Math.round((Date.now()-new Date(s.last_sync_at).getTime())/60000));return mins<2?'ahora':mins<60?`hace ${mins} min`:`hace ${Math.round(mins/60)} h`}
function courseFromEvent11(e){
 const n=norm11(e.title).replace(/^evento /,'');
 const hit=(data11.items||[]).find(x=>x.course_key&&norm11(x.title).replace(/^evento /,'')===n);
 return hit?.course_key?keyToCourse11.get(hit.course_key)||null:null;
}
function addDerivedAssessments11(){
 for(const e of data11.events||[]){if(!/parcial|examen|recuperatorio/i.test(e.title||''))continue;const id=courseFromEvent11(e);if(!id||!C[id])continue;C[id].ass=C[id].ass||[];const d=e.starts_at?ymd11(new Date(e.starts_at)):'';const n=norm11(e.title);const code=/recuper/.test(n)?'R':/2do|segundo/.test(n)?'P2':/1er|primer/.test(n)?'P1':'E';if(!C[id].ass.some(a=>a[0]===code||a[2]===d))C[id].ass.push([code,clean11(e.title,100),d]);}
}
function reconcile11(){
 keyToCourse11.clear();courseKeys11.clear();
 for(const row of data11.courses||[]){const a=alias11(row),id=a.id;keyToCourse11.set(row.course_key,id);if(!courseKeys11.has(id))courseKeys11.set(id,[]);courseKeys11.get(id).push(row.course_key);
   if(!C[id])C[id]={name:a.name,term:term11(row),desc:'',units:[],ass:[]};
   C[id].name=a.name;C[id].term=term11(row);C[id].art11=a.art;C[id].bbTitle=row.title;C[id].bbHref=row.href||'';C[id].bbLastSeen=row.last_seen_at||'';C[id].units=saneUnits11(C[id].units);
 }
 if(C.modelos)C.modelos.units=saneUnits11(C.modelos.units);
 addDerivedAssessments11();
}
async function load11(){
 const token=localStorage.getItem(BB11_TOKEN)||'';
 try{const rr=await fetch('./assessment-registry-v1.json?v=111',{cache:'no-store'});if(rr.ok)registry11=await rr.json()}catch{}
 if(token){try{const r=await fetch(BB11_API+'?action=data',{headers:{'x-study-token':token,'x-study-workspace':'colo-study'},cache:'no-store'});if(r.ok)data11=await r.json()}catch(e){console.warn('Study Library V11 Blackboard',e)}}
 reconcile11();loaded11=true;rerender11();
}
function canonicalCourses11(){
 const seen=new Set(),rows=[];
 for(const row of data11.courses||[]){const id=keyToCourse11.get(row.course_key);if(!id||seen.has(id))continue;seen.add(id);rows.push({id,course:C[id],term:C[id].term||term11(row),last:new Date(row.last_seen_at||0).getTime()})}
 if(!rows.length){const fallback=['modelos',...new Set(Object.values(st.sessions||{}).map(s=>s.courseId).filter(Boolean))];for(const id of fallback)if(C[id]&&!seen.has(id)){seen.add(id);rows.push({id,course:C[id],term:C[id].term||'2026',last:0})}}
 return rows;
}
function shelves11(){const groups=new Map();for(const x of canonicalCourses11()){const label=x.term||'Materias';if(!groups.has(label))groups.set(label,[]);groups.get(label).push(x)}return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es'))}
function cover11(id,c,hero=false){const art=c.art11||ART11[hash11(id)%ART11.length];return `<div class="cover11 ${hero?'hero11':''}" data-art11="${art}"><div class="coverArt11"></div><div class="coverSpine11"></div><div class="coverTitle11">${esc(c.name)}</div></div>`}
function eventType11(e){const n=norm11(e.title);return /parcial|examen/.test(n)?'exam':/recuper/.test(n)?'recovery':/entrega|tarea|trabajo/.test(n)?'due':'event'}
function combinedEvents11(){
 const out=[];
 for(const e of data11.events||[]){const d=localDate11(e.starts_at);if(!d)continue;const cid=courseFromEvent11(e);out.push({id:'bb:'+e.uid,date:ymd11(d),at:d,title:e.title,courseId:cid,courseName:cid&&C[cid]?.name||e.course_hint||'',type:eventType11(e),source:'Blackboard'});}
 for(const a of registry11.assessments||[]){if(!a.date)continue;const d=new Date(a.date+'T12:00:00');out.push({id:'ass:'+a.assessment_id,date:a.date,at:d,title:`${C[a.course_id]?.name||a.course_id} · ${a.label}`,courseId:a.course_id,courseName:C[a.course_id]?.name||'',type:'exam',source:'Study Library'});}
 const m=new Map();for(const e of out.sort((a,b)=>a.at-b.at)){const k=e.date+'|'+norm11(e.title);if(!m.has(k))m.set(k,e)}return [...m.values()].sort((a,b)=>a.at-b.at);
}
function monthGrid11(events){const y=cursor11.getFullYear(),m=cursor11.getMonth(),first=new Date(y,m,1,12),start=new Date(first);start.setDate(1-((first.getDay()+6)%7));const by=new Map();for(const e of events){if(!by.has(e.date))by.set(e.date,[]);by.get(e.date).push(e)}let html='';for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const k=ymd11(d),es=by.get(k)||[],today=k===ymd11(new Date());html+=`<button class="calDay11 ${d.getMonth()!==m?'out':''} ${today?'today':''} ${es.length?'marked '+(es.some(x=>x.type==='exam')?'exam':''):''}" data-date11="${k}" title="${esc(es.map(x=>x.title).join(' · '))}">${d.getDate()}</button>`}return html}
function week11(events){const s=new Date(cursor11);s.setDate(s.getDate()-((s.getDay()+6)%7));return Array.from({length:7},(_,i)=>{const d=new Date(s);d.setDate(s.getDate()+i);const es=events.filter(e=>e.date===ymd11(d));return `<div class="weekRow11"><div class="weekDate11">${DAYS11[d.getDay()]}<b>${d.getDate()}</b></div><div class="weekEvent11 ${es.length?'':'empty'}">${es.length?es.map(e=>`<span>${esc(e.courseName?e.courseName+' · ':'')}${esc(e.title.replace((e.courseName||'')+' · ',''))}</span>`).join(''):'—'}</div></div>`}).join('')}
function agenda11(events){const now=new Date();now.setHours(0,0,0,0);const future=events.filter(e=>e.at>=now).slice(0,8);return future.map(e=>`<button class="agendaItem11" ${e.courseId?`data-course11="${esc(e.courseId)}"`:''}><div class="agendaWhen11">${e.at.getDate()} ${MONTHS11[e.at.getMonth()].slice(0,3)}</div><div><b>${esc(e.title)}</b><span>${esc(e.courseName||e.source)}</span></div></button>`).join('')||'<div class="empty11">sin próximas fechas confirmadas</div>'}
function calendarRail11(events){const future=events.filter(e=>e.at>=new Date()).sort((a,b)=>a.at-b.at),next=future[0];return `<aside class="calendar11"><div class="calendarHead11"><b id="monthTitle11">${MONTHS11[cursor11.getMonth()]} ${cursor11.getFullYear()}</b><button id="today11">hoy</button></div><nav class="calTabs11"><button data-cal11="month" class="on">mes</button><button data-cal11="week">semana</button><button data-cal11="agenda">agenda</button></nav><div class="calPanel11 on" data-panel11="month"><div class="weekdays11"><span>lu</span><span>ma</span><span>mi</span><span>ju</span><span>vi</span><span>sá</span><span>do</span></div><div class="monthGrid11">${monthGrid11(events)}</div></div><div class="calPanel11" data-panel11="week">${week11(events)}</div><div class="calPanel11" data-panel11="agenda">${agenda11(events)}</div><div class="next11"><small>PRÓXIMO</small><b>${esc(next?.title||'Sin próximas fechas')}</b><span>${next?humanDate11(next.at):''}</span></div></aside>`}
function shelfHTML11(){return shelves11().map(([label,xs])=>`<section class="shelfSection11"><h2>${esc(label)}</h2><div class="booksViewport11"><div class="books11">${xs.map(({id,course:c})=>`<button class="book11" data-book11="${esc(id)}">${cover11(id,c)}<span>${esc(c.name)}</span></button>`).join('')}</div><div class="shelf11"></div></div></section>`).join('')}
function hydrateLibrary11(){const host=document.querySelector('main.library');if(!host||view!=='library')return;host.classList.add('study11Library');const events=combinedEvents11();host.innerHTML=`<div class="home11">${calendarRail11(events)}<section class="libraryStage11"><header class="libraryHead11"><div><b>Biblioteca</b><span>1º año</span></div><small>${sourceAge11()?`fuentes ${esc(sourceAge11())}`:''}</small></header>${shelfHTML11()}</section></div>`;host.querySelectorAll('[data-book11]').forEach(b=>b.onclick=()=>openCourse(b.dataset.book11));host.querySelectorAll('[data-course11]').forEach(b=>b.onclick=()=>openCourse(b.dataset.course11));host.querySelectorAll('[data-cal11]').forEach(b=>b.onclick=()=>{host.querySelectorAll('[data-cal11]').forEach(x=>x.classList.toggle('on',x===b));host.querySelectorAll('[data-panel11]').forEach(x=>x.classList.toggle('on',x.dataset.panel11===b.dataset.cal11))});const t=host.querySelector('#today11');if(t)t.onclick=()=>{cursor11=new Date();hydrateLibrary11()};}
function assessments11(id){const c=C[id]||{},base=(c.ass||[]).map(a=>({assessment_id:`${id}-${String(a[0]).toLowerCase()}`,course_id:id,code:a[0],label:a[1],date:a[2]||null,status:'metadata-only',study_instance_id:null})),m=new Map(base.map(x=>[x.code,x]));for(const a of registry11.assessments||[])if(a.course_id===id)m.set(a.code,{...(m.get(a.code)||{}),...a});return [...m.values()].sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999')))}
function nextAssessment11(id){const now=ymd11(new Date());return assessments11(id).filter(a=>a.date&&a.date>=now).sort((a,b)=>a.date.localeCompare(b.date))[0]||null}
function program11(c,ss){const units=saneUnits11(c.units);if(!units.length)return `<div class="programEmpty11"><b>Programa</b><span>sin fuente de programa sincronizada</span></div>`;return `<div class="programList11">${units.map(u=>`<article class="unit11"><button class="unitHead11"><span>${esc(u[0])}</span><span><b>${esc(u[1])}</b><small>${esc(u[2]||'')}</small></span><i>+</i></button><div class="unitBody11"><p>${esc(u[3]||'')}</p>${ss.filter(s=>s.unitId===u[0]).map(s=>`<button class="sourceClass11 openClass" data-id="${s.id}">${fmtDate(s.date)} · ${esc(s.title)}</button>`).join('')}</div></article>`).join('')}</div>`}
function materials11(id){const xs=courseItems11(id).filter(x=>!['page','calendar-page','announcement-page'].includes(x.item_type)).filter((x,i,a)=>a.findIndex(y=>norm11(y.title)===norm11(x.title)&&y.href===x.href)===i).slice(0,50);if(!xs.length)return'<div class="programEmpty11"><b>Materiales</b><span>sin materiales detectados todavía</span></div>';const order={file:0,assignment:1,announcement:2,content:3,link:4};xs.sort((a,b)=>(order[a.item_type]??8)-(order[b.item_type]??8));return `<div class="materials11">${xs.map(x=>`<a class="materialRow11" href="${esc(x.href||'#')}" target="_blank" rel="noopener"><span>${esc(x.item_type==='file'?'archivo':x.item_type==='announcement'?'anuncio':x.item_type==='assignment'?'entrega':'fuente')}</span><b>${esc(clean11(x.title||x.file_name||'Material',180))}</b>${x.due_at?`<time>${humanDate11(x.due_at)}</time>`:''}</a>`).join('')}</div>`}
function assessmentPanel11(id){const xs=assessments11(id);return `<div class="assessmentPanel11"><small>EVALUACIONES</small>${xs.map(a=>`<button class="assessmentMini11" ${a.study_instance_id?`data-assessment10="${esc(a.assessment_id)}"`:''}><b>${esc(a.code)}</b><span><strong>${esc(a.label)}</strong><em>${esc(a.date?fmtDate(a.date):'a definir')}</em></span><i class="${a.study_instance_id?'ready':''}"></i></button>`).join('')||'<span class="empty11">sin evaluaciones confirmadas</span>'}</div>`}
function courseBody11(id,c,ss){if(courseTab==='program')return program11(c,ss);if(courseTab==='materials')return materials11(id);return courseBody(c,ss)}
function hydrateCourse11(){const host=document.querySelector('main.course');if(!host||view!=='course'||!course||!C[course])return;host.classList.add('study11Course');const c=C[course],ss=courseSessions(course),next=nextAssessment11(course),last=ss[0]||null,matCount=courseItems11(course).filter(x=>!['page','calendar-page','announcement-page'].includes(x.item_type)).length;host.innerHTML=`<div class="courseTop11"><button id="backCourse11">←</button><span>Biblioteca / ${esc(c.name)}</span><small>${esc(c.term||'')}</small></div><section class="courseHero11">${cover11(course,c,true)}<div class="courseIdentity11"><small>${esc(c.term||'')}</small><h1>${esc(c.name)}</h1>${c.desc?`<p>${esc(c.desc)}</p>`:''}<div class="courseNow11">${next?`<div><small>PRÓXIMO</small><b>${esc(next.label)}</b><span>${esc(fmtDate(next.date))}</span></div>`:''}${last?`<div><small>ÚLTIMA CLASE</small><b>${esc(last.title)}</b><span>${esc(fmtDate(last.date))}</span></div>`:''}${matCount?`<div><small>FUENTES</small><b>${matCount}</b><span>${esc(sourceAge11())}</span></div>`:''}</div></div>${assessmentPanel11(course)}</section><nav class="courseTabs11"><button data-tab11="program" class="${courseTab==='program'?'on':''}">Programa</button><button data-tab11="classes" class="${courseTab==='classes'?'on':''}">Clases</button><button data-tab11="ass" class="${courseTab==='ass'?'on':''}">Parciales</button><button data-tab11="materials" class="${courseTab==='materials'?'on':''}">Materiales</button></nav><section class="courseBody11" id="courseBody">${courseBody11(course,c,ss)}</section>`;
 host.querySelector('#backCourse11').onclick=renderLibrary;host.querySelectorAll('[data-tab11]').forEach(b=>b.onclick=()=>{courseTab=b.dataset.tab11;renderCourse()});host.querySelectorAll('.unitHead11').forEach(b=>b.onclick=()=>b.closest('.unit11').classList.toggle('open'));try{wireCourse()}catch(e){console.warn('Study Library V11 wire',e)}host.querySelectorAll('[data-assessment10]').forEach(b=>{if(typeof openAssessment10==='function')b.onclick=()=>openAssessment10(b.dataset.assessment10)});}
const renderLibraryBefore11=renderLibrary,renderCourseBefore11=renderCourse;
renderLibrary=function(){renderLibraryBefore11();setTimeout(hydrateLibrary11,0);setTimeout(hydrateLibrary11,180)};
renderCourse=function(){renderCourseBefore11();setTimeout(hydrateCourse11,0);setTimeout(hydrateCourse11,180)};
function rerender11(){if(view==='library')renderLibrary();else if(view==='course'&&!document.querySelector('.assessmentView10'))renderCourse()}
load11();setInterval(()=>{if(localStorage.getItem(BB11_TOKEN))load11()},10*60*1000);
})();
