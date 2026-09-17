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
  function fmt(t){if(!t)return'—';const d=new Date(t);if(Number.isNaN(d.getTime()))return'—';return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d)}
  function terminal(ret){return terminalOutcomes.has(lower(first(ret?.outcome,ret?.status,ret?.result)))}
  function activeClaim(claim){if(!claim)return false;const exp=claim.expires_at?new Date(claim.expires_at).getTime():0;return exp?exp>Date.now():true}
  function stateLabel(s){return ({ready:'listo',working:'trabajando',done:'hecho',partial:'parcial',blocked:'bloqueado'})[s]||s}

  async function inspectJob(project, job, paths){
    const claimPrefix=`coordination/portfolio/claims/${job.job_id}/`;
    const returnPrefix=`coordination/portfolio/returns/${job.job_id}/`;
    const claimPaths=paths.filter(p=>p.startsWith(claimPrefix)&&p.endsWith('.json'));
    const returnPaths=paths.filter(p=>p.startsWith(returnPrefix)&&p.endsWith('.json'));
    const [claimRows,returnRows]=await Promise.all([readMany(claimPaths),readMany(returnPaths)]);
    const claims=claimRows.filter(x=>x.doc).sort((a,b)=>millis(a.doc)-millis(b.doc));
    const returns=returnRows.filter(x=>x.doc).sort((a,b)=>millis(a.doc)-millis(b.doc));
    const terminalReturn=[...returns].reverse().find(x=>terminal(x.doc));
    const latestReturn=returns.at(-1)||null;
    const active=[...claims].reverse().find(x=>activeClaim(x.doc));
    let state='ready';
    if(terminalReturn)state='done';
    else if(active)state='working';
    else if(latestReturn&&['partial','boundary'].includes(lower(latestReturn.doc?.outcome)))state='partial';
    else if(lower(job.seed_status).includes('block'))state='blocked';
    const spawn=returns.flatMap(x=>Array.isArray(x.doc?.spawn_candidates)?x.doc.spawn_candidates:[]);
    return {...job,project_id:project.project_id,project_label:project.label,state,active_claim:active?.doc||null,latest_return:latestReturn?.doc||null,terminal_return:terminalReturn?.doc||null,spawn_candidates:spawn};
  }

  function render(projects){
    const jobs=projects.flatMap(p=>p.jobs||[]);
    const done=jobs.filter(j=>j.state==='done').length;
    const working=jobs.filter(j=>j.state==='working').length;
    const ready=jobs.filter(j=>j.state==='ready'||j.state==='partial').length;
    const blocked=jobs.filter(j=>j.state==='blocked').length;
    const spawns=jobs.reduce((n,j)=>n+(j.spawn_candidates?.length||0),0);
    const finishedReturns=jobs.filter(j=>j.terminal_return).length;
    const reproduction=finishedReturns?spawns/finishedReturns:0;

    if($('portfolioProjects'))$('portfolioProjects').textContent=projects.length;
    if($('portfolioReady'))$('portfolioReady').textContent=ready;
    if($('portfolioWorking'))$('portfolioWorking').textContent=working;
    if($('portfolioDone'))$('portfolioDone').textContent=done;
    if($('portfolioReproduction'))$('portfolioReproduction').textContent=`×${reproduction.toFixed(1)}`;
    if($('portfolioSummary'))$('portfolioSummary').textContent=`${jobs.length} trabajos · ${ready} listos · ${working} trabajando · ${done} hechos · ${blocked} bloqueados · ${spawns} sucesores candidatos`;

    const html=projects.sort((a,b)=>(b.priority||0)-(a.priority||0)).map(p=>{
      const pj=p.jobs||[];
      const pd=pj.filter(j=>j.state==='done').length;
      const pw=pj.filter(j=>j.state==='working').length;
      const pr=pj.filter(j=>j.state==='ready'||j.state==='partial').length;
      const next=pj.filter(j=>j.state==='working'||j.state==='ready'||j.state==='partial').sort((a,b)=>(b.priority||0)-(a.priority||0))[0];
      const pct=pj.length?Math.round(pd/pj.length*100):0;
      const dots=pj.map(j=>`<i class="pjobdot ${j.state}" title="${esc(stateLabel(j.state)+' · '+j.title)}"></i>`).join('');
      const items=pj.slice().sort((a,b)=>(b.priority||0)-(a.priority||0)).slice(0,4).map(j=>{
        const worker=j.active_claim?first(j.active_claim.worker_id,j.active_claim.worker,j.active_claim.claim_id):'';
        const ret=j.latest_return?first(j.latest_return.summary,j.latest_return.outcome):'';
        return `<div class="pjob ${j.state}"><span class="pstate">${esc(stateLabel(j.state))}</span><span class="pjobtitle">${esc(j.title)}</span>${worker?`<span class="pworker">${esc(worker)}</span>`:''}${ret&&!worker?`<span class="pworker">${esc(String(ret).slice(0,64))}</span>`:''}</div>`;
      }).join('');
      const surface=p.surface?.public_url?`<a class="plink" href="${esc(p.surface.public_url)}" target="_blank" rel="noreferrer">abrir</a>`:'';
      const nextLine=next?`${stateLabel(next.state)} · ${next.title}`:'sin trabajo abierto';
      return `<article class="projectrow" data-project="${esc(p.project_id)}">
        <div class="pidentity"><div class="pname">${esc(p.label)}</div><div class="pmeta">P${esc(p.priority??'—')} · ${esc(p.status||'')}</div>${surface}</div>
        <div class="pbody"><div class="pgoal">${esc(p.goal||'')}</div><div class="pnext">${esc(nextLine)}</div><div class="pjoblist">${items}</div></div>
        <div class="pprogress"><div class="pdots">${dots||'<i class="pjobdot blocked"></i>'}</div><div class="pcount"><strong>${pd}/${pj.length}</strong><span>cerrados</span></div><div class="psmall">${pw} trabajando · ${pr} listos</div><div class="pbar"><i style="width:${pct}%"></i></div></div>
      </article>`;
    }).join('');
    if($('projectMap'))$('projectMap').innerHTML=html||'<div class="portfolioempty">Portfolio durable vacío.</div>';
  }

  async function loadPortfolio(){
    const map=$('projectMap');if(!map)return;
    try{
      const [portfolio,paths]=await Promise.all([raw('coordination/portfolio/PORTFOLIO.json'),tree()]);
      const projects=await Promise.all((portfolio.projects||[]).map(async p=>({...p,jobs:await Promise.all((p.jobs||[]).map(j=>inspectJob(p,j,paths)))})));
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
