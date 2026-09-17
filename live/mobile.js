(()=>{
  const $=id=>document.getElementById(id);
  const FEED='./feed.json';
  const CACHE='prometeo-live-last-feed-v3';
  const INBOX_READ='prometeo-live-inbox-read-v1';
  const POLL=3000;
  let current=null;
  let currentStamp=null;
  let selectedDay=null;

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
  const time=t=>{if(!t)return'—';const d=new Date(t);return Number.isNaN(d.getTime())?'—':d.toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit'})};
  const dayKey=t=>{if(!t)return null;const d=new Date(t);if(Number.isNaN(d.getTime()))return null;const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const o=Object.fromEntries(p.map(x=>[x.type,x.value]));return`${o.year}-${o.month}-${o.day}`};
  const today=()=>dayKey(new Date().toISOString());
  const dayLabel=d=>{if(!d)return'—';const td=today();if(d===td)return'hoy';const base=new Date(`${td}T12:00:00-03:00`),x=new Date(`${d}T12:00:00-03:00`);const diff=Math.round((base-x)/86400000);if(diff===1)return'ayer';const [y,m,dd]=d.split('-');return`${dd}/${m}`};
  const duration=ms=>{if(ms==null||!Number.isFinite(ms))return'—';const s=Math.max(0,Math.floor(ms/1000));if(s<60)return`${s}s`;const m=Math.floor(s/60);if(m<60)return`${m}m`;const h=Math.floor(m/60);return`${h}h ${m%60}m`};
  const ageMs=t=>t?Math.max(0,Date.now()-Date.parse(t)):Infinity;
  const minsLeft=t=>Math.max(0,Math.ceil((Date.parse(t)-Date.now())/60000));
  const thresholds=f=>({active:(f.thresholds?.stale_suspect_minutes??6)*60000,recovery:(f.thresholds?.recovery_eligible_minutes??10)*60000,allocating:(f.thresholds?.allocation_silent_minutes??3)*60000});
  const shortId=(v='')=>{const s=String(v);return s.length>24?`${s.slice(0,12)}…${s.slice(-7)}`:s};

  function effective(w,f){
    if(w.end_at)return'done';
    const th=thresholds(f);
    const hasAssignment=!!(w.pin_at||w.job_id||w.assignment_count);
    if(!hasAssignment)return ageMs(w.first_seen)>=th.allocating?'silent':'allocating';
    const a=ageMs(w.last_signal_at||w.pin_at||w.start_at||w.first_seen);
    if(a>=th.recovery)return'replaceable';
    if(a>=th.active)return'suspect';
    return w.status==='recovery'?'recovery':'working';
  }
  function stateLabel(s){return({working:'trabajando',recovery:'recuperando',suspect:'sin señal',replaceable:'reemplazable',allocating:'buscando tarea',silent:'sin PIN',done:'terminó'})[s]||s}
  function stateClass(s){return s==='recovery'?'working':s}
  function recoveryAt(w,f){const base=w.last_signal_at||w.pin_at||w.start_at||w.first_seen;if(!base)return null;return new Date(Date.parse(base)+thresholds(f).recovery).toISOString()}
  function taskName(w){return w.task&&w.task!=='Buscando trabajo'?w.task:'Buscando trabajo'}
  function portfolioJob(w,f){
    if(!w.job_id)return null;
    for(const project of f.projects||[])for(const job of project.jobs||[])if(job.job_id===w.job_id)return job;
    return null;
  }
  function pinEvidence(w,f){
    const job=portfolioJob(w,f);
    if(!job||!job.pin_generation)return'';
    const collisions=Number(job.collision_count||0);
    const mode=String(job.authority_mode||'');
    const detail=[`PIN G${String(job.pin_generation).padStart(6,'0')}`,`dueño ${shortId(job.owner||w.worker_id||'—')}`,`${collisions} ${collisions===1?'colisión':'colisiones'}`,mode.includes('recovery')?'recuperación':null].filter(Boolean).join(' · ');
    return `<br>${esc(detail)}`;
  }

  function activeCard(w,f){
    const s=effective(w,f),r=recoveryAt(w,f),elapsed=ageMs(w.pin_at||w.start_at||w.first_seen);
    let recovery='';
    if(s==='replaceable'||s==='silent')recovery=s==='silent'?'no consiguió PIN':'reemplazable ahora';
    else if(r)recovery=`reemplazo en ${minsLeft(r)}m`;
    const pin=w.pin_at?`PIN ${time(w.pin_at)}`:`abrió ${time(w.first_seen)}`;
    const extra=[w.project,w.assignment_count>1?`${w.assignment_count} tareas`:null,w.collision_count?`${w.collision_count} colisiones`:null].filter(Boolean).join(' · ');
    return `<details class="workerCard" data-worker="${esc(w.worker_id)}"><summary><div class="cardTop"><div><div class="task">${esc(taskName(w))}</div><div class="stateLine ${stateClass(s)}"><i class="stateDot"></i><span>${esc(stateLabel(s))} · ${esc(pin)}</span></div><div class="recoveryText countdown" data-recovery-at="${esc(r||'')}" data-state="${esc(s)}">${esc(recovery)}</div></div><div class="elapsed">${esc(duration(elapsed))}</div></div></summary><div class="tech">${esc(extra||'sin detalle extra')}${pinEvidence(w,f)}<br>${esc(w.worker_id)}${w.last_signal_at?`<br>última señal ${esc(time(w.last_signal_at))}`:''}</div></details>`;
  }
  function finishedCard(w){
    const started=w.pin_at||w.start_at||w.first_seen;
    const d=started&&w.end_at?Date.parse(w.end_at)-Date.parse(started):w.duration_ms;
    const result=w.result?String(w.result):'resultado durable';
    return `<details class="doneRow"><summary><span class="doneTime">${esc(time(w.end_at))}</span><span class="doneTask">${esc(taskName(w))}</span><span class="doneDur">${esc(duration(d))}</span></summary><div class="doneDetail">${esc(result)}<br>${esc(w.worker_id)}</div></details>`;
  }
  function historyFromWorkers(f){
    if(Array.isArray(f.history)&&f.history.length)return f.history;
    const map=new Map();for(const w of f.workers||[]){const d=dayKey(w.first_seen);if(!d)continue;const h=map.get(d)||{date:d,seen:0,finished:0,replaceable:0,collisions:0,worker_ids:[]};h.seen++;if(w.end_at)h.finished++;if(['replaceable','silent'].includes(effective(w,f)))h.replaceable++;h.collisions+=w.collision_count||0;h.worker_ids.push(w.worker_id);map.set(d,h)}return[...map.values()].sort((a,b)=>b.date.localeCompare(a.date));
  }
  function renderDayDetail(day,f){
    selectedDay=day;
    if(!day){$('dayDetail').innerHTML='';return}
    const rows=(f.workers||[]).filter(w=>dayKey(w.first_seen)===day).sort((a,b)=>Date.parse(b.end_at||b.first_seen||0)-Date.parse(a.end_at||a.first_seen||0));
    $('dayDetail').innerHTML=rows.length?rows.map(w=>`<div class="historyWorker"><time>${esc(time(w.end_at||w.first_seen))}</time><span>${esc(taskName(w))}</span><b>${esc(w.end_at?duration(w.duration_ms):stateLabel(effective(w,f)))}</b></div>`).join(''):'<div class="empty">Sin detalle durable para ese día.</div>';
  }
  function renderDays(f){
    const hist=historyFromWorkers(f).filter(h=>h.date!==today());
    const max=Math.max(1,...hist.map(h=>h.seen));
    $('days').innerHTML=hist.slice(0,21).map(h=>`<button class="dayRow" data-day="${esc(h.date)}"><span class="dayLabel">${esc(dayLabel(h.date))}</span><span class="dayTrack"><i style="width:${Math.max(4,h.seen/max*100)}%"></i></span><span class="dayCount">${h.seen}</span></button>`).join('')||'<div class="empty">Todavía no hay días anteriores.</div>';
    $('days').querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>renderDayDetail(selectedDay===b.dataset.day?null:b.dataset.day,f));
    if(selectedDay)renderDayDetail(selectedDay,f);
  }

  function renderInbox(f){
    const rows=f.inbox||[];
    $('inbox').innerHTML=rows.length?rows.map(m=>`<article class="message"><div class="messageTop"><span class="messageId">${esc(m.message_id||'')}</span><time>${esc(time(m.created_at))}</time></div><div class="messageText">${esc(m.text)}</div></article>`).join(''):'<div class="empty">Nada nuevo. Mejor así.</div>';
    let read=0;try{read=Number(localStorage.getItem(INBOX_READ)||0)}catch{}
    const unread=rows.filter(m=>Date.parse(m.created_at||0)>read).length;$('inboxCount').textContent=unread?`· ${unread}`:'';
  }
  function renderProjects(f){
    const projects=(f.projects||[]).slice().sort((a,b)=>(b.priority||0)-(a.priority||0));
    $('projects').innerHTML=projects.map(p=>{const js=p.jobs||[],done=js.filter(j=>j.state==='done').length,work=js.filter(j=>['working','recovery','suspect'].includes(j.state)).length,rep=js.filter(j=>j.state==='replaceable').length,ready=js.filter(j=>['ready','partial'].includes(j.state)).length,pct=js.length?Math.round(done/js.length*100):0;const meta=[work?`${work} trabajando`:null,rep?`${rep} trabado`:null,ready?`${ready} listos`:null].filter(Boolean).join(' · ')||'sin pendientes visibles';return`<article class="project"><div class="projectTop"><div><div class="projectName">${esc(p.label)}</div><div class="projectMeta">${esc(meta)}</div></div><div class="projectCount">${done}/${js.length}</div></div><div class="miniBar"><i style="width:${pct}%"></i></div></article>`}).join('')||'<div class="empty">Sin proyectos.</div>';
  }
  function renderProduction(f){
    const hist=historyFromWorkers(f),todayRow=hist.find(h=>h.date===today())||{seen:0,finished:0,replaceable:0,median_duration_ms:null};const workers=f.workers||[];const todayFinished=workers.filter(w=>w.end_at&&dayKey(w.first_seen)===today());const med=todayRow.median_duration_ms??(()=>{const a=todayFinished.map(w=>w.duration_ms).filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null})();
    $('productionStats').innerHTML=`<div class="prodStat"><strong>${todayRow.finished||todayFinished.length}</strong><span>terminaron hoy</span></div><div class="prodStat"><strong>${esc(duration(med))}</strong><span>duración mediana</span></div><div class="prodStat"><strong>${f.summary?.workers?.replaceable||0}</strong><span>reemplazables</span></div><div class="prodStat"><strong>×${Number(f.summary?.portfolio?.reproduction||0).toFixed(1)}</strong><span>sucesores / cierre</span></div>`;
    const max=Math.max(1,...hist.slice(0,14).map(h=>h.finished||0));$('productionDays').innerHTML=hist.slice(0,14).map(h=>`<div class="prodDay"><span>${esc(dayLabel(h.date))}</span><span class="prodBar"><i style="width:${Math.max(3,(h.finished||0)/max*100)}%"></i></span><b>${h.finished||0}</b></div>`).join('');
    $('plans').innerHTML=(f.plans||[]).slice().reverse().map(p=>`<article class="plan"><div class="planTop"><b>${esc(p.label)}</b><span>${p.percent}%</span></div><div class="planBar"><i style="width:${p.percent}%"></i></div><small>${p.remaining} pendientes · ${p.done}/${p.total} cerrados</small></article>`).join('')||'<div class="empty">Sin planes.</div>';
  }

  function render(f,cached=false){
    current=f;currentStamp=f.generated_at||f.source_sha||String(Date.now());try{localStorage.setItem(CACHE,JSON.stringify(f))}catch{}
    const workers=f.workers||[],active=workers.filter(w=>!w.end_at),effectiveRows=active.map(w=>({...w,_state:effective(w,f)}));const replaceable=effectiveRows.filter(w=>['replaceable','silent'].includes(w._state)).length,suspect=effectiveRows.filter(w=>w._state==='suspect').length,working=effectiveRows.filter(w=>['working','recovery'].includes(w._state)).length,allocating=effectiveRows.filter(w=>w._state==='allocating').length;
    if(replaceable)$('headline').textContent=`${replaceable} para reemplazar${working?` · ${working} trabajando`:''}`;else if(suspect)$('headline').textContent=`${working} trabajando · ${suspect} sin señal`;else if(working||allocating)$('headline').textContent=`${working} trabajando${allocating?` · ${allocating} entrando`:''}`;else $('headline').textContent='Todo quieto';
    $('statusLine').textContent='6 min sin señal = sospechoso · 10 min = reemplazable';$('activeCount').textContent=active.length?`${active.length} abiertos`:'ninguno';
    const order={replaceable:0,silent:1,suspect:2,working:3,recovery:3,allocating:4};effectiveRows.sort((a,b)=>(order[a._state]-order[b._state])||Date.parse(a.first_seen||0)-Date.parse(b.first_seen||0));$('active').innerHTML=effectiveRows.length?effectiveRows.map(w=>activeCard(w,f)).join(''):'<div class="empty">No hay workers abiertos.</div>';
    const finished=workers.filter(w=>w.end_at&&dayKey(w.first_seen)===today()).sort((a,b)=>Date.parse(b.end_at)-Date.parse(a.end_at));$('finished').innerHTML=finished.length?finished.slice(0,8).map(finishedCard).join(''):'<div class="empty">Todavía no terminó ninguno hoy.</div>';
    renderDays(f);renderInbox(f);renderProjects(f);renderProduction(f);refreshClocks(cached);
  }

  function refreshClocks(cached=false){
    if(!current)return;const age=ageMs(current.generated_at),ok=age<30000,late=age<120000;$('dot').className='dot '+(ok?'ok':late?'late':'stale');$('age').textContent=(cached?'cache · ':'')+(age<60000?`${Math.round(age/1000)}s`:`${Math.round(age/60000)}m`);
    document.querySelectorAll('.countdown').forEach(el=>{const s=el.dataset.state,r=el.dataset.recoveryAt;if(s==='replaceable')el.textContent='reemplazable ahora';else if(s==='silent')el.textContent='no consiguió PIN';else if(r)el.textContent=`reemplazo en ${minsLeft(r)}m`});
  }

  async function load(){
    try{const r=await fetch(`${FEED}?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(r.status);const f=await r.json();const stamp=f.generated_at||f.source_sha;if(stamp!==currentStamp)render(f);else refreshClocks()}
    catch(e){if(current){refreshClocks(true);return}try{const c=JSON.parse(localStorage.getItem(CACHE)||'null');if(c)render(c,true);else throw 0}catch{$('dot').className='dot stale';$('age').textContent='sin feed';$('headline').textContent='Sin lectura';$('statusLine').textContent='el registro durable sigue intacto'}}
  }

  document.querySelectorAll('[data-go]').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.go;$(id).scrollIntoView({behavior:'smooth',inline:'start',block:'nearest'});if(id==='inboxView'){try{localStorage.setItem(INBOX_READ,String(Date.now()))}catch{}$('inboxCount').textContent=''}});
  $('rail').addEventListener('scroll',()=>{const views=[...document.querySelectorAll('.view')],idx=Math.round($('rail').scrollLeft/Math.max(1,$('rail').clientWidth));document.querySelectorAll('.tabs button').forEach((b,i)=>b.classList.toggle('selected',i===idx))},{passive:true});
  load();setInterval(load,POLL);setInterval(()=>{if(current){render(current);}},30000);
})();