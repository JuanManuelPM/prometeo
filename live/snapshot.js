(() => {
  const FEED='./feed.json'; const REFRESH=3000; const CACHE='prometeo-live-feed-v1';
  const $=id=>document.getElementById(id);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
  const fmt=t=>{const d=new Date(t);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('es-AR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d)};
  const short=(s='',n=118)=>String(s).replace(/\s+/g,' ').trim().slice(0,n)+(String(s).replace(/\s+/g,' ').trim().length>n?'…':'');
  const stateLabel=s=>({ready:'listo',working:'trabajando',recovery:'recuperando',stale:'stale',done:'hecho',partial:'parcial',blocked:'bloqueado',returned:'volvió',waiting:'esperando',problem:'problema'})[s]||s;
  let last=null;

  function health(feed,fromCache=false){
    const age=Math.max(0,(Date.now()-Date.parse(feed.generated_at||0))/1000);
    $('pulse').className='pulse'+(age<90&&!fromCache?' ok':'');
    $('clock').textContent=fromCache?`último estado · ${Math.round(age)}s`:`live · ${Math.round(age)}s`;
    return age;
  }
  function renderPlans(plans=[]){
    $('plans').innerHTML=plans.map(p=>{
      const workers=p.items.filter(x=>x.state==='working');
      const marks=workers.slice(0,10).map((x,i)=>`<i class="worker" style="bottom:${Math.min(95,8+i*9)}%" title="${esc((x.owner||'worker')+' · '+x.opportunity_id)}"></i>`).join('');
      return `<article class="plan ${p.percent===100?'doneplan':''}"><div class="planmeta"><div class="plantitle">${esc(p.label)}</div><span class="plantime">${p.created_at?esc(fmt(p.created_at)):'—'}</span></div><div class="barzone"><div class="track"><div class="fill" style="height:${p.percent}%"></div><div class="workers">${marks}</div></div><div class="percent">${p.percent}%<small>ejecución</small></div></div><div class="planstats"><strong>${p.done}/${p.total}</strong> retornaron · faltan <strong>${p.remaining}</strong><br><span class="workingline">${p.working} trabajando</span> · ${p.ready} libres${p.problems?` · <span class="errorline">${p.problems} problemas</span>`:''}</div></article>`;
    }).join('')||'<div class="tiny" style="padding:24px 0">Sin planes visibles.</div>';
  }
  function renderProjects(projects=[]){
    $('projectMap').innerHTML=projects.slice().sort((a,b)=>(b.priority||0)-(a.priority||0)).map(p=>{
      const jobs=p.jobs||[], done=jobs.filter(j=>j.state==='done').length, working=jobs.filter(j=>['working','recovery'].includes(j.state)).length, ready=jobs.filter(j=>['ready','partial'].includes(j.state)).length;
      const next=jobs.filter(j=>['working','recovery','stale','ready','partial'].includes(j.state)).sort((a,b)=>(b.priority||0)-(a.priority||0))[0];
      const items=jobs.slice().sort((a,b)=>(b.priority||0)-(a.priority||0)).slice(0,5).map(j=>`<div class="pjob ${j.state}"><span class="pstate">${esc(stateLabel(j.state))}${j.origin==='derived'?' ↳':''}</span><span class="pjobtitle">${esc(j.title)}</span><span class="pworker">${esc(j.owner||j.authority_mode||'')}</span></div>`).join('');
      const pct=jobs.length?Math.round(done/jobs.length*100):0;
      return `<article class="projectrow"><div class="pidentity"><div class="pname">${esc(p.label)}</div><div class="pmeta">P${p.priority??'—'} · ${esc(p.status||'')}</div>${p.surface?.public_url?`<a class="plink" href="${esc(p.surface.public_url)}" target="_blank" rel="noreferrer">abrir</a>`:''}</div><div class="pbody"><div class="pgoal">${esc(p.goal||'')}</div><div class="pnext">${next?esc(stateLabel(next.state)+' · '+next.title):'sin trabajo abierto'}</div><div class="pjoblist">${items}</div></div><div class="pprogress"><div class="pcount"><strong>${done}/${jobs.length}</strong><span>cerrados</span></div><div class="psmall">${working} trabajando · ${ready} listos</div><div class="pbar"><i style="width:${pct}%"></i></div></div></article>`;
    }).join('')||'<div class="portfolioempty">Portfolio vacío.</div>';
  }
  function renderEvents(events=[]){
    const recent=events.slice(-22);
    $('trace').innerHTML=recent.map(e=>`<i class="${e.kind}" title="${esc((e.at?fmt(e.at)+' · ':'')+e.label)}"></i>`).join('')||'<i></i>';
    $('events').innerHTML=recent.slice().reverse().slice(0,12).map(e=>`<div class="event"><time>${e.at?fmt(e.at):'—'}</time><span>${esc(e.label)}</span></div>`).join('')||'<div class="tiny">Sin eventos.</div>';
  }
  function renderFlow(feed){
    const pj=feed.projects.flatMap(p=>(p.jobs||[]).map(j=>({...j,label:p.label}))).filter(j=>j.state!=='done');
    const qi=feed.plans.flatMap(p=>p.items||[]).filter(x=>['working','ready','problem','waiting'].includes(x.state));
    const rows=[...pj.map(j=>({state:j.state,title:j.title,sub:j.owner||j.label,priority:j.priority})),...qi.map(x=>({state:x.state,title:x.opportunity_id,sub:x.owner||short(x.mission,70),priority:x.priority}))].sort((a,b)=>(b.priority||0)-(a.priority||0)).slice(0,30);
    $('flow').innerHTML=rows.map(x=>`<div class="row"><div class="state ${x.state}">${esc(stateLabel(x.state))}</div><div class="task">${esc(x.title)}<small>${esc(x.sub||'')}</small></div><div class="prio">${x.priority??''}</div></div>`).join('')||'<div class="tiny">Sin trabajo abierto.</div>';
  }
  function render(feed,fromCache=false){
    last=feed; try{localStorage.setItem(CACHE,JSON.stringify(feed))}catch{}
    const age=health(feed,fromCache), ps=feed.summary.portfolio, qs=feed.summary.queues;
    $('working').textContent=qs.working; $('remaining').textContent=qs.remaining; $('returned').textContent=qs.returned; $('planCount').textContent=qs.plans;
    $('portfolioProjects').textContent=ps.projects; $('portfolioReady').textContent=ps.ready; $('portfolioWorking').textContent=ps.working; $('portfolioDone').textContent=ps.done; $('portfolioReproduction').textContent=`×${Number(ps.reproduction||0).toFixed(1)}`;
    $('portfolioSummary').textContent=`${ps.jobs} trabajos · ${ps.ready} listos · ${ps.working} trabajando · ${ps.done} hechos · ${ps.stale} stale · ${ps.collisions} colisiones · ${ps.derived} derivados`;
    const active=feed.projects.flatMap(p=>(p.jobs||[]).map(j=>({...j,project:p.label}))).filter(j=>['working','recovery'].includes(j.state))[0] || feed.plans.flatMap(p=>p.items||[]).find(x=>x.state==='working');
    $('sentence').innerHTML=active?`<span class="dim">Ahora:</span> ${esc(active.owner?active.owner+' → ':'')}${esc(active.title||active.opportunity_id||'trabajando')}`:ps.ready?`<span class="dim">Portfolio:</span> ${ps.ready} trabajos listos para /wc.`:'La red no muestra trabajo claimable ahora.';
    if(ps.ready>0){$('action').textContent=`Hay ${ps.ready} trabajos del portfolio listos. Los /wc los adjudican antes de ejecutar.`;$('copy').hidden=false}else if(ps.working>0||qs.working>0){$('action').textContent=`Nada obligatorio: ${ps.working+qs.working} trabajos están declarados en ejecución.`;$('copy').hidden=true}else{$('action').textContent='No hay acción humana obligatoria.';$('copy').hidden=true}
    $('generation').textContent=`snapshot ${feed.source_sha?feed.source_sha.slice(0,8):'—'} · ${Math.round(age)}s · refresco 3s`;
    $('frontier').textContent=feed.focus?.current_frontier||feed.head?.global_frontier||'—';
    $('diagnostic').textContent=`Live lee un snapshot estático generado por GitHub Actions; no consulta la API pública del navegador. Feed: ${feed.generated_at}.`;
    renderProjects(feed.projects); renderPlans(feed.plans); renderEvents(feed.events); renderFlow(feed);
  }
  async function load(){
    try{const r=await fetch(`${FEED}?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`feed ${r.status}`);render(await r.json(),false)}
    catch(err){console.warn(err);if(last){health(last,true);return}try{const c=JSON.parse(localStorage.getItem(CACHE)||'null');if(c){render(c,true);return}}catch{} $('pulse').className='pulse';$('clock').textContent='feed pendiente';$('diagnostic').textContent='Esperando el primer snapshot estático; los workers pueden seguir funcionando.'}
  }
  $('copy').addEventListener('click',async()=>{const t='PROMETEO → https://juanmanuelpm.github.io/prometeo/wc';try{await navigator.clipboard.writeText(t);$('copy').textContent='copiado';setTimeout(()=>$('copy').textContent='copiar worker',900)}catch{$('copy').textContent=t}});
  $('detailBtn').addEventListener('click',()=>{const open=$('drawer').classList.toggle('open');$('detailBtn').textContent=open?'ocultar detalle':'ver detalle'});
  load(); setInterval(load,REFRESH);
})();
