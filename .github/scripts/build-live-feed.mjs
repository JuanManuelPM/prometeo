import fs from 'node:fs';
import path from 'node:path';
import { buildGroundedReproductionMetric } from '../../scripts/live-reproduction-metric.mjs';

const root = path.resolve(process.argv[2] || '.');
const out = path.resolve(process.argv[3] || 'feed.json');
const now = Date.now();
const ACTIVE_MS = 6 * 60_000;
const REPLACE_MS = 10 * 60_000;
const ALLOCATING_MS = 3 * 60_000;
const terminalOutcomes = new Set(['done','verified','no_action_needed','superseded']);
const lower = v => String(v ?? '').toLowerCase();
const first = (...v) => v.find(x => x !== undefined && x !== null && x !== '');
const abs = rel => path.join(root, rel);
const read = rel => { try { return JSON.parse(fs.readFileSync(abs(rel), 'utf8')); } catch { return null; } };
const walk = rel => {
  const dir = abs(rel);
  if (!fs.existsSync(dir)) return [];
  let rows = [];
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    const child = path.posix.join(rel, ent.name);
    rows = ent.isDirectory() ? rows.concat(walk(child)) : rows.concat(child);
  }
  return rows;
};
const timeOf = d => first(d?.returned_at,d?.completed_at,d?.heartbeat_at,d?.observed_at,d?.started_at,d?.claimed_at,d?.launched_at,d?.created_at,d?.updated_at,d?.timestamp) || null;
const ms = d => Date.parse(timeOf(d) || '') || 0;
const docs = paths => paths.map(file => ({path:file, doc:read(file)})).filter(x => x.doc);
const latest = rows => rows.slice().sort((a,b)=>ms(a.doc)-ms(b.doc)||a.path.localeCompare(b.path)).at(-1) || null;
const terminal = d => terminalOutcomes.has(lower(first(d?.outcome,d?.status,d?.result)));
const problem = d => /fail|error|boundary|reject|conflict|invalid/.test(lower(first(d?.state,d?.status,d?.verdict,d?.result,d?.outcome)));
const generation = row => Number(row?.doc?.generation) || Number(String(row?.path || '').match(/\/G(\d+)\.json$/)?.[1] || 0);
const signalAge = iso => iso ? Math.max(0, now - Date.parse(iso)) : Number.POSITIVE_INFINITY;
const newestIso = values => values.filter(Boolean).sort((a,b)=>Date.parse(a)-Date.parse(b)).at(-1) || null;
const baDay = iso => {
  const d = new Date(iso || 0);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const obj = Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return `${obj.year}-${obj.month}-${obj.day}`;
};
const median = nums => {
  const a = nums.filter(Number.isFinite).sort((a,b)=>a-b);
  if (!a.length) return null;
  const m = Math.floor(a.length/2);
  return a.length % 2 ? a[m] : Math.round((a[m-1]+a[m])/2);
};

const portfolioFiles = walk('coordination/portfolio').filter(x=>x.endsWith('.json'));
const opportunityFiles = walk('coordination/opportunities').filter(x=>x.endsWith('.json'));
const workerFiles = walk('coordination/workers').filter(x=>x.endsWith('.json'));
const inboxFiles = walk('coordination/inbox/messages').filter(x=>x.endsWith('.json'));
const portfolio = read('coordination/portfolio/PORTFOLIO.json') || {projects:[]};

const heartbeatRows = docs(workerFiles.filter(x=>/coordination\/workers\/heartbeats\/.+\.json$/.test(x)));
const heartbeatsByWorker = new Map();
for (const row of heartbeatRows) {
  const wid = first(row.doc.worker_id,row.doc.session_id);
  if (!wid) continue;
  const arr = heartbeatsByWorker.get(wid) || [];
  arr.push(row);
  heartbeatsByWorker.set(wid, arr);
}
for (const arr of heartbeatsByWorker.values()) arr.sort((a,b)=>ms(a.doc)-ms(b.doc));

const derivedRows = docs(portfolioFiles.filter(x=>/^coordination\/portfolio\/derived\/[^/]+\/[^/]+\.json$/.test(x)));
const derivedByProject = new Map();
for (const row of derivedRows) {
  if (!row.doc.project_id || !row.doc.job_id) continue;
  const arr = derivedByProject.get(row.doc.project_id) || [];
  arr.push({...row.doc, origin:'derived', source_path:row.path});
  derivedByProject.set(row.doc.project_id, arr);
}
function mergeJobs(seed, derived) {
  const map = new Map();
  for (const job of [...seed.map(x=>({...x,origin:'seed'})), ...derived]) {
    const key = job.dedupe_key || job.job_id;
    if (!map.has(key) || job.origin === 'seed') map.set(key, job);
  }
  return [...map.values()];
}
function workerHeartbeatSignal(workerId, jobId) {
  const arr = heartbeatsByWorker.get(workerId) || [];
  const compatible = arr.filter(r => !r.doc.job_id || !jobId || r.doc.job_id === jobId);
  return latest(compatible);
}

function compactSourceDebtReturn(row) {
  if (!row || !Object.prototype.hasOwnProperty.call(row.doc || {}, 'source_debt')) return null;
  const raw = row.doc?.source_debt;
  const debt = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
  const status = debt && typeof debt.status === 'string' ? debt.status.trim().toUpperCase() : null;
  const history = row.doc?.search_coverage?.git_history;
  const searchResult = typeof history?.result === 'string' ? history.result.trim().toUpperCase() : null;
  const exactMatchesValue = Number(history?.exact_matches);
  const exactMatches = Number.isFinite(exactMatchesValue) ? exactMatchesValue : null;
  const exhaustiveNegative = (
    row.doc?.exact_source_found === false &&
    searchResult === 'NO_EXACT_MATCH' &&
    exactMatches === 0
  );
  const structurallyValid = Boolean(
    debt &&
    status === 'OPEN' &&
    typeof debt.missing === 'string' && debt.missing.trim() &&
    typeof debt.acceptable_future_source === 'string' && debt.acceptable_future_source.trim() &&
    exhaustiveNegative
  );
  return {
    path: row.path,
    returned_at: timeOf(row.doc),
    status,
    exhaustive_negative: exhaustiveNegative,
    structurally_valid: structurallyValid,
    search_result: searchResult,
    exact_matches: exactMatches
  };
}
function inspectPortfolioJob(project, job) {
  const id = job.job_id;
  const pins = docs(portfolioFiles.filter(x=>x.startsWith(`coordination/portfolio/pins/${id}/`))).sort((a,b)=>generation(a)-generation(b)||ms(a.doc)-ms(b.doc));
  const claims = docs(portfolioFiles.filter(x=>x.startsWith(`coordination/portfolio/claims/${id}/`))).sort((a,b)=>ms(a.doc)-ms(b.doc)||a.path.localeCompare(b.path));
  const collisions = docs(portfolioFiles.filter(x=>x.startsWith(`coordination/portfolio/collisions/${id}/`))).sort((a,b)=>ms(a.doc)-ms(b.doc)||a.path.localeCompare(b.path));
  const returns = docs(portfolioFiles.filter(x=>x.startsWith(`coordination/portfolio/returns/${id}/`))).sort((a,b)=>ms(a.doc)-ms(b.doc)||a.path.localeCompare(b.path));
  const terminalReturn = [...returns].reverse().find(x=>terminal(x.doc)) || null;
  const latestReturn = returns.at(-1) || null;
  const latestSourceDebtReturn = [...returns].reverse().find(x=>Object.prototype.hasOwnProperty.call(x.doc || {}, 'source_debt')) || null;
  const latestPin = pins.at(-1) || null;
  let authority = null;
  let authorityMode = 'none';
  if (latestPin) {
    authority = claims.find(x=>x.doc?.pin_ref===latestPin.path || (latestPin.doc?.pin_id && x.doc?.pin_id===latestPin.doc.pin_id)) || null;
    authorityMode = generation(latestPin) > 1 ? 'recovery-pin' : 'pin';
  } else if (claims.length) {
    authority = claims[0];
    authorityMode = 'legacy';
  }
  const owner = first(latestPin?.doc?.worker_id,authority?.doc?.worker_id,authority?.doc?.worker,authority?.doc?.claim_id) || null;
  const hb = owner ? workerHeartbeatSignal(owner,id) : null;
  const lastSignalAt = newestIso([timeOf(latestPin?.doc),timeOf(authority?.doc),timeOf(hb?.doc),timeOf(latestReturn?.doc)]);
  const age = signalAge(lastSignalAt);
  let state = 'ready';
  if (terminalReturn) state = 'done';
  else if (owner && age < ACTIVE_MS) state = generation(latestPin) > 1 ? 'recovery' : 'working';
  else if (owner && age < REPLACE_MS) state = 'suspect';
  else if (owner) state = 'replaceable';
  else if (latestReturn && ['partial','boundary'].includes(lower(latestReturn.doc?.outcome))) state = 'partial';
  else if (lower(job.seed_status).includes('block')) state = 'blocked';
  return {
    ...job,
    project_id:project.project_id,
    project_label:project.label,
    state,
    owner,
    authority_mode:authorityMode,
    pin_generation:latestPin ? generation(latestPin) : 0,
    claimed_at:first(latestPin?.doc?.claimed_at,authority?.doc?.claimed_at) || null,
    last_signal_at:lastSignalAt,
    replaceable_at:lastSignalAt ? new Date(Date.parse(lastSignalAt)+REPLACE_MS).toISOString() : null,
    collision_count:collisions.length + Math.max(0, claims.length-(authority?1:0)),
    latest_return:latestReturn ? {path:latestReturn.path,outcome:first(latestReturn.doc.outcome,latestReturn.doc.status),summary:latestReturn.doc.summary||null,returned_at:timeOf(latestReturn.doc),worker_id:latestReturn.doc.worker_id||null} : null,
    latest_source_debt_return:compactSourceDebtReturn(latestSourceDebtReturn),
    latest_pin_recovery_basis:latestPin?.doc?.recovery_basis_or_null || null,
    terminal_return:terminalReturn ? {path:terminalReturn.path,outcome:first(terminalReturn.doc.outcome,terminalReturn.doc.status),returned_at:timeOf(terminalReturn.doc),worker_id:terminalReturn.doc.worker_id||null} : null,
    recent_return_evidence:returns.slice(-3).map(r=>({path:r.path,outcome:first(r.doc.outcome,r.doc.status),returned_at:timeOf(r.doc)})),
    recent_collision_evidence:collisions.slice(-3).map(r=>({path:r.path,observed_at:timeOf(r.doc)})),
    returns:returns.map(r=>({path:r.path,...r.doc})),
    pins:pins.map(r=>({path:r.path,...r.doc})),
    claims:claims.map(r=>({path:r.path,...r.doc})),
    collisions:collisions.map(r=>({path:r.path,...r.doc}))
  };
}

const projects = (portfolio.projects||[]).map(p=>({
  ...p,
  jobs:mergeJobs(p.jobs||[],derivedByProject.get(p.project_id)||[]).map(j=>inspectPortfolioJob(p,j))
}));
const jobMap = new Map(projects.flatMap(p=>p.jobs.map(j=>[j.job_id,j])));
const workerRows = [];

const beaconRows = docs(workerFiles.filter(x=>/coordination\/workers\/beacons\/.+\.json$/.test(x)));
for (const row of beaconRows) {
  const d=row.doc, wid=first(d.worker_id,d.session_id,path.posix.basename(row.path,'.json'));
  workerRows.push({key:`beacon:${wid}`,worker_id:wid,kind:'beacon',status:'allocating',task:'Buscando trabajo',project:null,job_id:null,pin_at:null,start_at:timeOf(d),end_at:null,result:null,source:row.path});
}

for (const job of jobMap.values()) {
  const returns = job.returns || [];
  for (const pin of job.pins || []) {
    const wid=first(pin.worker_id,pin.claim_id,pin.pin_id); if(!wid) continue;
    const ret=returns.filter(r=>!r.worker_id||r.worker_id===wid).filter(r=>ms(r)>=ms(pin)).sort((a,b)=>ms(a)-ms(b))[0]||null;
    workerRows.push({key:`pin:${pin.path}`,worker_id:wid,kind:'portfolio',status:ret?lower(first(ret.outcome,ret.status)):'working',task:job.title,project:job.project_label,job_id:job.job_id,pin_at:pin.claimed_at||timeOf(pin),start_at:pin.claimed_at||timeOf(pin),end_at:ret?timeOf(ret):null,result:ret?.summary||first(ret?.outcome,ret?.status)||null,source:pin.path});
  }
  if (!(job.pins||[]).length) {
    for (const claim of job.claims || []) {
      const wid=first(claim.worker_id,claim.worker,claim.claim_id); if(!wid) continue;
      const ret=returns.filter(r=>!r.worker_id||r.worker_id===wid).filter(r=>ms(r)>=ms(claim)).sort((a,b)=>ms(a)-ms(b))[0]||null;
      workerRows.push({key:`claim:${claim.path}`,worker_id:wid,kind:'portfolio',status:ret?lower(first(ret.outcome,ret.status)):'working',task:job.title,project:job.project_label,job_id:job.job_id,pin_at:claim.claimed_at||timeOf(claim),start_at:claim.claimed_at||timeOf(claim),end_at:ret?timeOf(ret):null,result:ret?.summary||first(ret?.outcome,ret?.status)||null,source:claim.path});
    }
  }
  for (const col of job.collisions || []) {
    const wid=first(col.worker_id,col.claim_id,col.collision_id); if(!wid) continue;
    workerRows.push({key:`collision:${col.path}`,worker_id:wid,kind:'collision',status:'collision',task:job.title,project:job.project_label,job_id:job.job_id,pin_at:col.observed_at||timeOf(col),start_at:col.observed_at||timeOf(col),end_at:col.observed_at||timeOf(col),result:'Perdió el PIN y reentró',source:col.path});
  }
}

function latestUnder(prefix) { return latest(docs(opportunityFiles.filter(x=>x.startsWith(prefix)&&x.endsWith('.json')))); }
function queueFiles() { return opportunityFiles.filter(x=>/queue/i.test(path.posix.basename(x)) && Array.isArray(read(x)?.opportunities)); }
function inspectOpportunity(op) {
  const id=op.opportunity_id;
  const claim=read(`coordination/opportunities/claims/${id}.json`);
  const run=latestUnder(`coordination/opportunities/runs/${id}/`);
  const ret=latestUnder(`coordination/opportunities/returns/${id}/`);
  let state='waiting';
  if(ret) state=problem(ret.doc)?'problem':'returned';
  else if(run) state=problem(run.doc)?'problem':'working';
  else if(claim) state='working';
  else if(lower(op.status).includes('ready')) state='ready';
  const owner=first(run?.doc?.worker_id,claim?.worker_id,claim?.worker)||null;
  if(owner) workerRows.push({key:`opp:${id}:${owner}`,worker_id:owner,kind:'queue',status:ret?(problem(ret.doc)?'boundary':'done'):'working',task:op.mission||op.type||id,project:'queue',job_id:id,pin_at:timeOf(claim),start_at:first(timeOf(run?.doc),timeOf(claim)),end_at:timeOf(ret?.doc),result:ret?.doc?.summary||first(ret?.doc?.outcome,ret?.doc?.status)||null,source:`coordination/opportunities/claims/${id}.json`});
  return {opportunity_id:id,mission:op.mission||op.type||'',priority:op.priority||0,state,owner,claimed_at:timeOf(claim),started_at:timeOf(run?.doc),returned_at:timeOf(ret?.doc)};
}
const plans=queueFiles().map(rel=>{
  const q=read(rel),items=(q.opportunities||[]).filter(x=>x?.opportunity_id).map(inspectOpportunity);
  const done=items.filter(x=>x.state==='returned').length,working=items.filter(x=>x.state==='working').length,ready=items.filter(x=>x.state==='ready').length,problems=items.filter(x=>x.state==='problem').length,total=items.length;
  return {id:first(q.generation_id,q.queue_id,path.posix.basename(rel,'.json')),label:first(q.generation_id,q.queue_id,path.posix.basename(rel,'.json')),created_at:first(q.created_at,q.generated_at,q.updated_at),total,done,working,ready,problems,remaining:Math.max(0,total-done),percent:total?Math.round(done/total*100):0,items};
}).sort((a,b)=>Date.parse(a.created_at||0)-Date.parse(b.created_at||0));

const grouped=new Map();
for(const row of workerRows){const arr=grouped.get(row.worker_id)||[];arr.push(row);grouped.set(row.worker_id,arr)}
const workers=[];
for(const [workerId,rows] of grouped){
  rows.sort((a,b)=>Date.parse(a.start_at||0)-Date.parse(b.start_at||0));
  const assignments=rows.filter(x=>x.kind!=='beacon');
  const last=assignments.at(-1)||rows.at(-1);
  const firstSeen=rows.map(x=>x.start_at).filter(Boolean).sort()[0]||null;
  const heartbeats=(heartbeatsByWorker.get(workerId)||[]).map(x=>timeOf(x.doc)).filter(Boolean);
  const lastSignalAt=newestIso([...rows.flatMap(x=>[x.start_at,x.pin_at,x.end_at]),...heartbeats]);
  const age=signalAge(lastSignalAt);
  let status=last.status;
  if(last.end_at){
    if(status==='done'||terminalOutcomes.has(status)) status='done';
  } else if(assignments.length===0){
    status = signalAge(firstSeen)>=ALLOCATING_MS ? 'silent' : 'allocating';
  } else if(age>=REPLACE_MS){
    status='replaceable';
  } else if(age>=ACTIVE_MS){
    status='suspect';
  } else if(status!=='recovery'){
    status='working';
  }
  const startAt=last.pin_at||last.start_at||firstSeen;
  const durationMs=startAt ? (last.end_at?Date.parse(last.end_at):now)-Date.parse(startAt) : null;
  workers.push({worker_id:workerId,first_seen:firstSeen,status,task:last.task,project:last.project,job_id:last.job_id,pin_at:last.pin_at,start_at:last.start_at,end_at:last.end_at,result:last.result,last_signal_at:lastSignalAt,recovery_at:(!last.end_at&&lastSignalAt)?new Date(Date.parse(lastSignalAt)+REPLACE_MS).toISOString():null,duration_ms:durationMs,assignment_count:assignments.filter(x=>x.kind!=='collision').length,collision_count:assignments.filter(x=>x.kind==='collision').length,assignments:rows});
}
workers.sort((a,b)=>Date.parse(b.first_seen||0)-Date.parse(a.first_seen||0));

const historyMap=new Map();
for(const worker of workers){
  const day=baDay(worker.first_seen); if(!day) continue;
  const h=historyMap.get(day)||{date:day,seen:0,finished:0,replaceable:0,collisions:0,durations:[],workers:[]};
  h.seen++; if(worker.end_at)h.finished++; if(worker.status==='replaceable'||worker.status==='silent')h.replaceable++; h.collisions+=worker.collision_count||0; if(worker.end_at&&Number.isFinite(worker.duration_ms))h.durations.push(worker.duration_ms); h.workers.push(worker.worker_id); historyMap.set(day,h);
}
const history=[...historyMap.values()].map(h=>({date:h.date,seen:h.seen,finished:h.finished,replaceable:h.replaceable,collisions:h.collisions,median_duration_ms:median(h.durations),worker_ids:h.workers})).sort((a,b)=>b.date.localeCompare(a.date));

const inbox=docs(inboxFiles).map(r=>({message_id:first(r.doc.message_id,path.posix.basename(r.path,'.json')),created_at:r.doc.created_at||timeOf(r.doc),author:r.doc.author||'guide',text:String(r.doc.text||'').slice(0,180),topic:r.doc.topic||null,refs:Array.isArray(r.doc.refs)?r.doc.refs:[]})).filter(x=>x.text).sort((a,b)=>Date.parse(b.created_at||0)-Date.parse(a.created_at||0)).slice(0,80);

const jobs=projects.flatMap(p=>p.jobs);
const reconciledNonterminalReturnRefs=docs(
  portfolioFiles.filter(x=>x.startsWith('coordination/portfolio/return-reconciliations/'))
).filter(r=>r.doc?.effect==='NONTERMINAL_ROUTE_ABORT'&&r.doc?.return_ref).map(r=>r.doc.return_ref);
const reproduction=buildGroundedReproductionMetric(jobs,{excluded_return_refs:reconciledNonterminalReturnRefs});
const summary={
  workers:{seen:workers.length,working:workers.filter(w=>['working','recovery'].includes(w.status)).length,suspect:workers.filter(w=>w.status==='suspect').length,replaceable:workers.filter(w=>['replaceable','silent'].includes(w.status)).length,allocating:workers.filter(w=>w.status==='allocating').length,finished:workers.filter(w=>!!w.end_at).length,collisions:workers.reduce((n,w)=>n+(w.collision_count||0),0)},
  portfolio:{projects:projects.length,jobs:jobs.length,ready:jobs.filter(j=>['ready','partial'].includes(j.state)).length,working:jobs.filter(j=>['working','recovery'].includes(j.state)).length,suspect:jobs.filter(j=>j.state==='suspect').length,replaceable:jobs.filter(j=>j.state==='replaceable').length,done:jobs.filter(j=>j.state==='done').length,collisions:jobs.reduce((n,j)=>n+j.collision_count,0),derived:jobs.filter(j=>j.origin==='derived').length,terminal_returns:jobs.filter(j=>j.terminal_return).length,reproduction},
  queues:{plans:plans.length,working:plans.reduce((n,p)=>n+p.working,0),remaining:plans.reduce((n,p)=>n+p.remaining,0),returned:plans.reduce((n,p)=>n+p.done,0)}
};

const feed={
  schema:'prometeo.live-feed/v3',
  generated_at:new Date().toISOString(),
  source_sha:process.env.GITHUB_SHA||null,
  thresholds:{heartbeat_target_minutes:3,stale_suspect_minutes:6,recovery_eligible_minutes:10,allocation_silent_minutes:3},
  summary,
  workers:workers.slice(0,300),
  history,
  inbox,
  projects:projects.map(p=>({...p,jobs:p.jobs.map(({returns,pins,claims,collisions,...j})=>j)})),
  plans
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(feed,null,2)+'\n');
console.log(`live v3: ${workers.length} workers, ${history.length} days, ${inbox.length} inbox, ${jobs.length} jobs`);
