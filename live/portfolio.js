(() => {
  const OWNER='JuanManuelPM', REPO='prometeo', BRANCH='main';
  const RAW=`https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
  const API=`https://api.github.com/repos/${OWNER}/${REPO}`;
  const REFRESH_MS=20000;
  const $=id=>document.getElementById(id);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const lower=v=>String(v||'').toLowerCase();
  const first=(...vals)=>vals.find(v=>v!==undefined&&v!==null&&v!=='');
  const terminalOutcomes=new Set(['done','verified','no_action_needed','superseded']);

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
  async function readMany(paths){return Promise.all(paths.map(async path=>({path,doc:await raw(path,true)})))}
  function ts(doc){return first(doc?.returned_at,doc?.completed_at,doc?.claimed_at,doc?.created_at,doc?.updated_at,doc?.timestamp)||''}
  function millis(doc){const n=new Date(ts(doc)).getTime();return Number.isFinite(n)?n:0}
  function terminal(ret){return terminalOutcomes.has(lower(first(ret?.outcome,ret?.status,ret?.result)))}
  function activeLease(doc){if(!doc)return false;const exp=doc.expires_at?new Date(doc.expires_at).getTime():0;return exp?exp>Date.now():true}
  function pinGeneration(row){const n=Number(row?.doc?.generation);if(Number.isFinite(n)&&n>0)return n;const m=String(row?.path||'').match(/\/G(\d+)\.json$/);return m?Number(m[1]):0}
  function stateLabel(s){return ({ready:'listo',working:'trabajando',recovery:'recuperando',stale:'stale',done:'hecho',partial:'parcial',blocked:'bloqueado'})[s]||s}
  function uniqueJobs(seed,derived){
    const map=new Map();
    [...seed.map(j=>({...j,origin:'seed'})),...derived.map(j=>({...j,origin:'derived'}))].forEach(j=>{
      const key=j.dedupe_key||j.job_id;
      if(!map.has(key)||j.origin==='seed')map.set(key,j);
    });
    return [...map.values()];
  }
  function syncTop(ready,working){
    const action=$('action'),copy=$('copy'),sentence=$('sentence');
    const actionText=action?.textContent||'';
    const normalQueueReady=/Hay\s+\d+\s+trabajos\s+libres/i.test(actionText);
    if(!normalQueueReady&&ready>0&&action){
      action.textContent=`Hay ${ready} trabajos útiles del portfolio listos. Mandar /wc los asigna automáticamente.`;
      if(copy)copy.hidden=false;
    }else if(!normalQueueReady&&working>0&&action&&/No hay acción|depende de desbloqueos|Nada obligatorio/i.test(actionText)){
      action.textContent=`Nada obligatorio: ${working} ${working===1?'trabajo del portfolio está':'trabajos del portfolio están'} en ejecución.`;
    }
    const sentenceText=lower(sentence?.textContent||'');
    if(sentence&&ready>0&&(sentenceText.includes('completa')||sentenceText.includes('esperando'))){
      sentence.innerHTML=`<span class="dim">Portfolio:</span> ${ready} trabajos útiles listos para workers.`;
    }else if(sentence&&working>0&&sentenceText.includes('completa')){
      sentence.innerHTML=`<span class="dim">Portfolio:</span> ${working} ${working===1?'trabajo activo':'trabajos activos'}.`;
    }
  }

  async function inspectJob(project, job, paths){
    const pinPrefix=`coordination/portfolio/pins/${job.job_id}/`;
    const claimPrefix=`coordination/portfolio/claims/${job.job_id}/`;
    const returnPrefix=`coordination/portfolio/returns/${job.job_id}/`;
    const pinPaths=paths.filter(p=>p.startsWith(pinPrefix)&&p.endsWith('.json'));
    const claimPaths=paths.filter(p=>p.startsWith(claimPrefix)&&p.endsWith('.json'));
    const returnPaths=paths.filter(p=>p.startsWith(returnPrefix)&&p.endsWith('.json'));
    const [pinRows,claimRows,returnRows]=await Promise.all([readMany(pinPaths),readMany(claimPaths),readMany(returnPaths)]);
    const pins=pinRows.filter(x=>x.doc).sort((a,b)=>pinGeneration(a)-pinGeneration(b)||millis(a.doc)-millis(b.doc)||a.path.localeCompare(b.path));
    const claims=claimRows.filter(x=>x.doc).sort((a,b)=>millis(a.doc)-millis(b.doc)||a.path.localeCompare(b.path));
    const returns=returnRows.filter(x=>x.doc).sort((a,b)=>millis(a.doc)-millis(b.doc)||a.path.localeCompare(b.path));
    const terminalReturn=[...returns].reverse().find(x=>terminal(x.doc));
    const latestReturn=returns.at(-1)||null;
    const latestPin=pins.at(-1)||null;
    const livePin=latestPin&&activeLease(latestPin.doc)?latestPin:null;
    const activeClaims=claims.filter(x=>activeLease(x.doc));
    let authorityClaim=null, collisionCount=0, authorityMode='none';

    if(latestPin){
      authorityClaim=claims.find(x=>x.doc?.pin_ref===latestPin.path||(latestPin.doc?.pin_id&&x.doc?.pin_id===latestPin.doc.pin_id))||null;
      collisionCount=activeClaims.filter(x=>!authorityClaim||x.path!==authorityClaim.path).length;
      authorityMode=livePin?(pinGeneration(livePin)>1?'recovery-pin':'pin'):'stale-pin';
    }else if(activeClaims.length){
      authorityClaim=activeClaims[0];
      collisionCount=Math.max(0,activeClaims.length-1);
      authorityMode='legacy';
    }

    let state='ready';
    if(terminalReturn)state='done';
    else if(livePin)state=pinGeneration(livePin)>1?'recovery':'working';
    else if(latestPin)state='stale';
    else if(authorityClaim)state='working';
    else if(latestReturn&&['partial','boundary'].includes(lower(latestReturn.doc?.outcome)))state='partial';
    else if(lower(job.seed_status).includes('block'))state='blocked';

    const spawn=returns.flatMap(x=>Array.isArray(x.doc?.spawn_candidates)?x.doc.spawn_candidates:[]);
    return {
      ...job,project_id:project.project_id,project_label:project.label,state,
      active_pin:livePin,latest_pin:latestPin,pin_generation:latestPin?pinGeneration(latestPin):0,
      active_claim:authorityClaim?.doc||null,active_claim_path:authorityClaim?.path||null,
      authority_mode:authorityMode,collision_count:collisionCount,
      latest_return:latestReturn?.doc||null,terminal_return:terminalReturn?.doc||null,spawn_candidates:spawn
    };
  }

  function render(projects){
    const jobs=projects.flatMap(p=>p.jobs||[]);
    const done=jobs.filter(j=>j.state==='done').length;
    const working=jobs.filter(j=>j.state==='working'||j.state==='recovery').length;
    const ready=jobs.filter(j=>j.state==='ready'||j.state==='partial').length;
    const stale=jobs.filter(j=>j.state==='stale').length;
    const collisions=jobs.reduce((n,j)=>n+(j.collision_count||0),0);
    const derived=jobs.filter(j=>j.origin==='derived').length;
    const candidates=jobs.reduce((n,j)=>n+(j.spawn_candidates?.length||0),0);
    const finishedReturns=jobs.filter(j=>j.terminal_return).length;
    const reproduction=finishedReturns?derived/finishedReturns:0;

    if($('portfolioProjects'))$('portfolioProjects').textContent=projects.length;
    if($('portfolioReady'))$('portfolioReady').textContent=ready;
    if($('portfolioWorking'))$('portfolioWorking').textContent=working;
    if($('portfolioDone'))$('portfolioDone').textContent=done;
    if($('portfolioReproduction'))$('portfolioReproduction').textContent=`×${reproduction.toFixed(1)}`;
    if($('portfolioSummary'))$('portfolioSummary').textContent=`${jobs.length} trabajos · ${ready} listos · ${working} trabajando/recuperando · ${done} hechos · ${stale} stale · ${collisions} colisiones · ${derived} sucesores derivados · ${candidates} candidatos no materializados`;
    syncTop(ready,working);

    const html=projects.sort((a,b)=>(b.priority||0)-(a.priority||0)).map(p=>{
      const pj=p.jobs||[];
      const pd=pj.filter(j=>j.state==='done').length;
      const pw=pj.filter(j=>j.state==='working'||j.state==='recovery').length;
      const pr=pj.filter(j=>j.state==='ready'||j.state==='partial').length;
      const ps=pj.filter(j=>j.state==='stale').length;
      const next=pj.filter(j=>['working','recovery','stale','ready','partial'].includes(j.state)).sort((a,b)=>(b.priority||0)-(a.priority||0))[0];
      const pct=pj.length?Math.round(pd/pj.length*100):0;
      const dots=pj.map(j=>`<i class="pjobdot ${j.state}" title="${esc(stateLabel(j.state)+' · '+j.title)}"></i>`).join('');
      const items=pj.slice().sort((a,b)=>(b.priority||0)-(a.priority||0)).slice(0,5).map(j=>{
        const pinWorker=j.active_pin?.doc?first(j.active_pin.doc.worker_id,j.active_pin.doc.worker,j.active_pin.doc.pin_id):'';
        const claimWorker=j.active_claim?first(j.active_claim.worker_id,j.active_claim.worker,j.active_claim.claim_id):'';
        const worker=first(pinWorker,claimWorker);
        const authority=j.authority_mode==='pin'?`pin g${j.pin_generation}`:j.authority_mode==='recovery-pin'?`recovery g${j.pin_generation}`:j.authority_mode==='stale-pin'?`stale g${j.pin_generation}`:j.authority_mode==='legacy'?'legacy':'';
        const collision=j.collision_count?`${j.collision_count} ${j.collision_count===1?'colisión':'colisiones'}`:'';
        const workerMeta=[worker,authority,collision].filter(Boolean).join(' · ');
        const ret=j.latest_return?first(j.latest_return.summary,j.latest_return.outcome):'';
        const origin=j.origin==='derived'?' ↳':'';
        return `<div class="pjob ${j.state}"><span class="pstate">${esc(stateLabel(j.state))}${origin}</span><span class="pjobtitle">${esc(j.title)}</span>${workerMeta?`<span class="pworker">${esc(workerMeta)}</span>`:''}${ret&&!workerMeta?`<span class="pworker">${esc(String(ret).slice(0,64))}</span>`:''}</div>`;
      }).join('');
      const surface=p.surface?.public_url?`<a class="plink" href="${esc(p.surface.public_url)}" target="_blank" rel="noreferrer">abrir</a>`:'';
      const nextLine=next?`${stateLabel(next.state)} · ${next.title}`:'sin trabajo abierto';
      const derivedCount=pj.filter(j=>j.origin==='derived').length;
      return `<article class="projectrow" data-project="${esc(p.project_id)}">
        <div class="pidentity"><div class="pname">${esc(p.label)}</div><div class="pmeta">P${esc(p.priority??'—')} · ${esc(p.status||'')}${derivedCount?` · +${derivedCount} derivados`:''}</div>${surface}</div>
        <div class="pbody"><div class="pgoal">${esc(p.goal||'')}</div><div class="pnext">${esc(nextLine)}</div><div class="pjoblist">${items}</div></div>
        <div class="pprogress"><div class="pdots">${dots||'<i class="pjobdot blocked"></i>'}</div><div class="pcount"><strong>${pd}/${pj.length}</strong><span>cerrados</span></div><div class="psmall">${pw} trabajando · ${pr} listos${ps?` · ${ps} stale`:''}</div><div class="pbar"><i style="width:${pct}%"></i></div></div>
      </article>`;
    }).join('');
    if($('projectMap'))$('projectMap').innerHTML=html||'<div class="portfolioempty">Portfolio durable vacío.</div>';
  }

  async function loadPortfolio(){
    const map=$('projectMap');if(!map)return;
    try{
      const [portfolio,paths]=await Promise.all([raw('coordination/portfolio/PORTFOLIO.json'),tree()]);
      const derivedPaths=paths.filter(p=>/^coordination\/portfolio\/derived\/[^/]+\/[^/]+\.json$/.test(p));
      const derivedRows=(await readMany(derivedPaths)).filter(x=>x.doc);
      const derivedByProject=new Map();
      derivedRows.forEach(({doc,path})=>{
        if(!doc.project_id||!doc.job_id)return;
        const arr=derivedByProject.get(doc.project_id)||[];
        arr.push({...doc,source_path:path});
        derivedByProject.set(doc.project_id,arr);
      });
      const projects=await Promise.all((portfolio.projects||[]).map(async p=>{
        const merged=uniqueJobs(p.jobs||[],derivedByProject.get(p.project_id)||[]);
        return {...p,jobs:await Promise.all(merged.map(j=>inspectJob(p,j,paths)))};
      }));
      render(projects);
      map.dataset.state='ok';
    }catch(err){
      console.error(err);
      map.dataset.state='error';
      map.innerHTML=`<div class="portfolioempty">No pude leer portfolio durable: ${esc(err.message)}</div>`;
    }
  }

  loadPortfolio();
  setInterval(loadPortfolio,REFRESH_MS);
})();
