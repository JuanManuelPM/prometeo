(() => {
  const OWNER='JuanManuelPM', REPO='prometeo', BRANCH='main';
  const RAW=`https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
  const API=`https://api.github.com/repos/${OWNER}/${REPO}`;
  const GH=`https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/`;
  const WC='PROMETEO → https://juanmanuelpm.github.io/prometeo/wc';
  const REFRESH_MS=20000;
  const $=id=>document.getElementById(id);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const lower=v=>String(v||'').toLowerCase();
  const first=(...vals)=>vals.find(v=>v!==undefined&&v!==null&&v!=='');
  let knownPlanIds=null;

  async function raw(path, optional=false){
    const r=await fetch(RAW+path+'?v='+Date.now(),{cache:'no-store'});
    if(!r.ok){if(optional&&r.status===404)return null;throw new Error(`${path}: ${r.status}`)}
    return r.json();
  }
  async function tree(){
    const r=await fetch(`${API}/git/trees/${BRANCH}?recursive=1`,{headers:{'Accept':'application/vnd.github+json'},cache:'no-store'});
    if(!r.ok)throw new Error(`Git tree: ${r.status}`);
    const j=await r.json();
    return (j.tree||[]).map(x=>x.path);
  }
  async function readPath(path){try{return await raw(path,true)}catch(_){return null}}
  function latest(paths,prefix){return paths.filter(p=>p.startsWith(prefix)&&p.endsWith('.json')).sort().at(-1)||null}
  function timeOf(obj){return first(obj?.returned_at,obj?.completed_at,obj?.created_at,obj?.updated_at,obj?.started_at,obj?.claimed_at,obj?.timestamp)||null}
  function fmt(t){if(!t)return'—';const d=new Date(t);if(Number.isNaN(d.getTime()))return'—';return new Intl.DateTimeFormat('es-AR',{hour:'2-digit',minute:'2-digit'}).format(d)}
  function fmtDate(t){if(!t)return'fecha no declarada';const d=new Date(t);if(Number.isNaN(d.getTime()))return String(t);return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d)}
  function shortMission(s=''){const clean=String(s).replace(/\s+/g,' ').trim();return clean.length>128?clean.slice(0,125)+'…':clean}
  function explicitProblem(obj){const s=lower(first(obj?.state,obj?.status,obj?.verdict,obj?.result));return /fail|error|boundary|reject|stale|conflict|invalid/.test(s)}
  function terminal(op){return !!op.ret || /done|complete|closed|returned/.test(lower(op.status))}
  function planId(q,path){return first(q.generation_id,q.queue_id,path.split('/').pop().replace(/\.json$/,''))}
  function planLabel(q,path){return first(q.generation_id,q.queue_id,path.split('/').pop().replace(/\.json$/,''))}
  function queuePaths(paths){return paths.filter(p=>/^coordination\/opportunities\/[^/]*queue[^/]*\.json$/i.test(p)).sort()}

  async function inspectOpportunity(op, paths){
    const id=op.opportunity_id;
    const claimPath=`coordination/opportunities/claims/${id}.json`;
    const runPath=latest(paths,`coordination/opportunities/runs/${id}/`);
    const returnPath=latest(paths,`coordination/opportunities/returns/${id}/`);
    const [claim,run,ret]=await Promise.all([
      paths.includes(claimPath)?readPath(claimPath):null,
      runPath?readPath(runPath):null,
      returnPath?readPath(returnPath):null
    ]);
    let state='waiting';
    if(ret)state=explicitProblem(ret)?'problem':'returned';
    else if(run)state=explicitProblem(run)?'problem':'working';
    else if(claim)state='working';
    else if(lower(op.status).includes('ready'))state='ready';
    else if(lower(op.status).includes('blocked'))state='waiting';
    else if(lower(op.status).includes('fail'))state='problem';
    return {...op,claim,run,ret,runPath,returnPath,state};
  }

  function event(kind,label,t){return t?{kind,label,t,date:new Date(t)}:null}
  function renderTrace(events){
    const recent=events.filter(Boolean).sort((a,b)=>a.date-b.date).slice(-22);
    $('trace').innerHTML=recent.length?recent.map(e=>`<i class="${e.kind}" title="${esc(fmt(e.t)+' · '+e.label)}"></i>`).join(''):'<i></i>';
    $('events').innerHTML=recent.slice().reverse().slice(0,9).map(e=>`<div class="event"><time>${esc(fmt(e.t))}</time><span>${esc(e.label)}</span></div>`).join('')||'<div class="tiny">Todavía no hay eventos legibles.</div>';
  }

  function source(name,path){return `<a target="_blank" rel="noreferrer" href="${GH+path}">${esc(name)}</a>`}
  function workerName(x){return first(x.run?.worker_id,x.claim?.worker_id,x.run?.worker,x.claim?.worker,x.run?.session_id,x.claim?.session_id,x.opportunity_id)}

  function planStats(q,items,path){
    const total=items.length;
    const done=items.filter(terminal).length;
    const working=items.filter(x=>x.state==='working'&&!terminal(x)).length;
    const problems=items.filter(x=>x.state==='problem').length;
    const ready=items.filter(x=>x.state==='ready').length;
    const remaining=Math.max(0,total-done);
    const percent=total?Math.round(done/total*100):0;
    return {q,items,path,id:planId(q,path),label:planLabel(q,path),total,done,working,problems,ready,remaining,percent,created:first(q.created_at,q.generated_at,q.updated_at)};
  }

  function renderPlans(plans,newIds){
    const html=plans.map(p=>{
      const workers=p.items.filter(x=>x.state==='working'&&!terminal(x));
      const problemItems=p.items.filter(x=>x.state==='problem');
      const tickCount=Math.min(12,Math.max(0,p.total-1));
      const ticks=Array.from({length:tickCount},(_,i)=>`<i class="tick" style="bottom:${((i+1)/(tickCount+1)*100).toFixed(2)}%"></i>`).join('');
      const workerMarks=workers.slice(0,12).map((x,i)=>{
        const idx=Math.max(0,p.items.findIndex(y=>y.opportunity_id===x.opportunity_id));
        const pos=p.total?Math.min(96,Math.max(4,((idx+.5)/p.total)*100)):50;
        return `<i class="worker" style="bottom:${pos.toFixed(2)}%" title="${esc(workerName(x)+' · '+x.opportunity_id)}"></i>`;
      }).join('');
      const problemMarks=problemItems.slice(0,10).map(x=>{
        const idx=Math.max(0,p.items.findIndex(y=>y.opportunity_id===x.opportunity_id));
        const pos=p.total?Math.min(98,Math.max(2,((idx+.5)/p.total)*100)):50;
        return `<i class="problemmark" style="bottom:${pos.toFixed(2)}%" title="${esc(x.opportunity_id)}"></i>`;
      }).join('');
      const parent=p.q.parent_generation_id||p.q.parent_queue_id||'';
      const classes=['plan'];if(newIds.has(p.id))classes.push('new');if(p.percent===100&&p.total)classes.push('doneplan');
      return `<article class="${classes.join(' ')}" data-plan="${esc(p.id)}">
        <div class="planmeta"><div class="plantitle" title="${esc(p.label)}">${esc(p.label)}</div>${parent?`<span class="planparent">↳ ${esc(parent)}</span>`:''}<span class="plantime">creado ${esc(fmtDate(p.created))}</span></div>
        <div class="barzone"><div class="track" aria-label="${p.percent}% de ejecución"><div class="fill" style="height:${p.percent}%"></div><div class="ticks">${ticks}</div><div class="workers">${workerMarks}${problemMarks}</div></div><div class="percent">${p.percent}%<small>ejecución</small></div></div>
        <div class="planstats"><strong>${p.done}/${p.total}</strong> retornaron · faltan <strong>${p.remaining}</strong><br><span class="workingline">${p.working} trabajando</span> · ${p.ready} libres${p.problems?` · <span class="errorline">${p.problems} problema${p.problems===1?'':'s'}</span>`:''}</div>
      </article>`;
    }).join('');
    $('plans').innerHTML=html||'<div class="tiny" style="padding:24px 0">No encontré colas durables legibles.</div>';
  }

  function renderFlow(items){
    const order={problem:0,working:1,ready:2,returned:3,waiting:4};
    const visible=items.slice().sort((a,b)=>(order[a.state]-order[b.state])||((b.priority||0)-(a.priority||0)));
    $('flow').innerHTML=visible.map(x=>{
      const labels={working:'trabajando',returned:'volvió',ready:'libre',waiting:'esperando',problem:'problema'};
      return `<div class="row"><div class="state ${x.state}">${labels[x.state]}</div><div class="task">${esc(x.opportunity_id)}<small>${esc(shortMission(x.mission||x.type||''))}</small></div><div class="prio">${esc(x.priority??'')}</div></div>`;
    }).join('')||'<div class="tiny">Sin oportunidades activas.</div>';
  }

  function setAction(counts){
    $('copy').hidden=true;
    if(counts.ready>0){$('action').textContent=`Hay ${counts.ready} trabajos libres. Cualquier /wc puede tomar uno compatible.`;$('copy').hidden=false;return}
    if(counts.working>0){$('action').textContent=`Nada obligatorio: ${counts.working} ${counts.working===1?'trabajo está':'trabajos están'} en ejecución.`;return}
    if(counts.remaining>0){$('action').textContent='La frontera restante depende de desbloqueos, recovery o nueva planificación durable.';return}
    $('action').textContent='No hay acción humana obligatoria.';
  }

  async function load(){
    $('pulse').className='pulse';$('clock').textContent='actualizando…';
    try{
      const [head,focus,paths]=await Promise.all([
        raw('coordination/CONTINUITY_HEAD.json'),
        raw('coordination/workstreams/chat-native-control-plane-v1/FOCUS.json'),
        tree()
      ]);
      const qpaths=queuePaths(paths);
      const qdocs=(await Promise.all(qpaths.map(p=>raw(p,true)))).map((q,i)=>({q,path:qpaths[i]})).filter(x=>x.q&&Array.isArray(x.q.opportunities));
      const allIds=[...new Set(qdocs.flatMap(({q})=>(q.opportunities||[]).map(op=>op.opportunity_id).filter(Boolean)))];
      const inspected=await Promise.all(allIds.map(id=>{
        const op=qdocs.flatMap(x=>x.q.opportunities||[]).find(o=>o.opportunity_id===id);
        return inspectOpportunity(op,paths);
      }));
      const byId=new Map(inspected.map(x=>[x.opportunity_id,x]));
      const plans=qdocs.map(({q,path})=>planStats(q,(q.opportunities||[]).map(op=>({...op,...(byId.get(op.opportunity_id)||{})})),path)).sort((a,b)=>{
        const ad=a.created?new Date(a.created).getTime():0,bd=b.created?new Date(b.created).getTime():0;
        return ad-bd||a.label.localeCompare(b.label);
      });

      const ids=new Set(plans.map(p=>p.id));
      const firstLoad=knownPlanIds===null;
      const newIds=new Set();
      if(firstLoad){
        const cutoff=Date.now()-30*60*1000;
        plans.forEach(p=>{const t=p.created?new Date(p.created).getTime():0;if(t&&t>=cutoff)newIds.add(p.id)});
      }else{ids.forEach(id=>{if(!knownPlanIds.has(id))newIds.add(id)})}
      knownPlanIds=ids;
      renderPlans(plans,newIds);
      if(newIds.size&&!firstLoad)requestAnimationFrame(()=>$('planViewport').scrollTo({left:$('planViewport').scrollWidth,behavior:'smooth'}));

      const current=[...byId.values()].filter(x=>['ready','working','returned','waiting','problem'].includes(x.state));
      const counts={working:0,returned:0,waiting:0,problem:0,ready:0,remaining:0};
      current.forEach(x=>counts[x.state]++);
      counts.remaining=current.filter(x=>!terminal(x)).length;
      const terminalCount=current.filter(terminal).length;

      $('working').textContent=counts.working;
      $('remaining').textContent=counts.remaining;
      $('returned').textContent=terminalCount;
      $('planCount').textContent=plans.length;

      const active=current.filter(x=>x.state==='working').sort((a,b)=>(b.priority||0)-(a.priority||0))[0];
      const free=current.filter(x=>x.state==='ready').sort((a,b)=>(b.priority||0)-(a.priority||0))[0];
      const currentLine=active?`Ahora: ${shortMission(active.mission)}`:free?`Hay capacidad libre: ${shortMission(free.mission)}`:counts.remaining?`La red está esperando el próximo desbloqueo durable.`:`La ejecución preparada visible está completa.`;
      $('sentence').innerHTML=esc(currentLine).replace(/^Ahora:/,'<span class="dim">Ahora:</span>');
      setAction(counts);

      const latestPlan=plans.at(-1);
      $('generation').textContent=latestPlan?`${latestPlan.label} · ${plans.length} planes visibles · refresco ${Math.round(REFRESH_MS/1000)}s`:`${head.distributed_swarm?.status||'flujo actual'} · refresco ${Math.round(REFRESH_MS/1000)}s`;
      $('frontier').textContent=focus.current_frontier||head.global_frontier||'—';
      renderFlow(current);

      const events=[];
      current.forEach(x=>{
        const ct=timeOf(x.claim);if(ct)events.push(event('start',`${x.opportunity_id} · claim`,ct));
        const rt=timeOf(x.run);if(rt)events.push(event(explicitProblem(x.run)?'problem':'start',`${x.opportunity_id} · started`,rt));
        const tt=timeOf(x.ret);if(tt)events.push(event(explicitProblem(x.ret)?'problem':'return',`${x.opportunity_id} · return`,tt));
      });
      plans.forEach(p=>{if(p.created)events.push(event('start',`${p.label} · plan creado`,p.created))});
      if(head.updated_at)events.push(event('return','continuidad actualizada',head.updated_at));
      renderTrace(events);

      $('sources').innerHTML=[['continuidad','coordination/CONTINUITY_HEAD.json'],['foco','coordination/workstreams/chat-native-control-plane-v1/FOCUS.json'],...qdocs.slice(-4).map(({q,path})=>[q.generation_id||q.queue_id||'queue',path]),['worker','wc']].map(([n,p])=>source(n,p)).join('');
      $('diagnostic').textContent=`${plans.length} planes detectados automáticamente desde queues top-level · ${current.length} trabajos únicos · porcentaje = retornos terminales / total del plan · 100% ejecución no implica Current, Human Accepted ni Served.`;
      $('pulse').className='pulse ok';
      $('clock').textContent=`actualizado ${fmt(new Date().toISOString())}`;
    }catch(err){
      console.error(err);
      $('pulse').className='pulse bad';
      $('clock').textContent='sin lectura';
      $('sentence').innerHTML='<span class="errorline">No pude leer el estado durable.</span>';
      $('action').textContent='No se inventa estado cuando falta evidencia. La vista va a reintentar sola.';
      $('diagnostic').textContent=err.message;
    }
  }

  $('copy').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(WC);$('copy').textContent='copiado';setTimeout(()=>$('copy').textContent='copiar worker',1000)}
    catch(_){$('copy').textContent=WC}
  });
  $('detailBtn').addEventListener('click',()=>{
    const open=$('drawer').classList.toggle('open');
    $('detailBtn').textContent=open?'ocultar detalle':'ver detalle';
  });
  load();setInterval(load,REFRESH_MS);
})();