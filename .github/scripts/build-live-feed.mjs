import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const out = path.resolve(process.argv[3] || 'feed.json');
const now = Date.now();
const terminalOutcomes = new Set(['done','verified','no_action_needed','superseded']);
const lower = v => String(v ?? '').toLowerCase();
const first = (...v) => v.find(x => x !== undefined && x !== null && x !== '');

function exists(rel){ return fs.existsSync(path.join(root, rel)); }
function readJson(rel){ try { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); } catch { return null; } }
function walk(rel){ const dir=path.join(root,rel); if(!fs.existsSync(dir)) return []; const out=[]; for(const ent of fs.readdirSync(dir,{withFileTypes:true})){ const r=path.posix.join(rel,ent.name); ent.isDirectory()?out.push(...walk(r)):out.push(r); } return out; }
function timeOf(d){ return first(d?.returned_at,d?.completed_at,d?.observed_at,d?.started_at,d?.claimed_at,d?.created_at,d?.updated_at,d?.timestamp) || null; }
function ms(d){ const n=Date.parse(timeOf(d)||''); return Number.isFinite(n)?n:0; }
function activeLease(d){ const x=Date.parse(d?.expires_at||''); return Number.isFinite(x) ? x > now : !!d; }
function terminalReturn(d){ return terminalOutcomes.has(lower(first(d?.outcome,d?.status,d?.result))); }
function explicitProblem(d){ return /fail|error|boundary|reject|conflict|invalid/.test(lower(first(d?.state,d?.status,d?.verdict,d?.result,d?.outcome))); }
function pinGeneration(rel,d){ const n=Number(d?.generation); if(Number.isFinite(n)&&n>0)return n; const m=rel.match(/\/G(\d+)\.json$/); return m?Number(m[1]):0; }
function docs(paths){ return paths.map(rel=>({path:rel,doc:readJson(rel)})).filter(x=>x.doc); }
function latestByTime(rows){ return rows.slice().sort((a,b)=>ms(a.doc)-ms(b.doc)||a.path.localeCompare(b.path)).at(-1)||null; }
function latestDocUnder(all,prefix){ return latestByTime(docs(all.filter(p=>p.startsWith(prefix)&&p.endsWith('.json')))); }

const portfolioFiles = walk('coordination/portfolio').filter(p=>p.endsWith('.json'));
const oppFiles = walk('coordination/opportunities').filter(p=>p.endsWith('.json'));
const portfolio = readJson('coordination/portfolio/PORTFOLIO.json') || {projects:[]};
const head = readJson('coordination/CONTINUITY_HEAD.json') || {};
const focus = readJson('coordination/workstreams/chat-native-control-plane-v1/FOCUS.json') || {};

const derivedRows = docs(portfolioFiles.filter(p=>/^coordination\/portfolio\/derived\/[^/]+\/[^/]+\.json$/.test(p)));
const derivedByProject = new Map();
for(const row of derivedRows){ const d=row.doc; if(!d.project_id||!d.job_id) continue; const a=derivedByProject.get(d.project_id)||[]; a.push({...d,source_path:row.path,origin:'derived'}); derivedByProject.set(d.project_id,a); }
function mergeJobs(seed,derived){ const map=new Map(); for(const j of [...seed.map(x=>({...x,origin:'seed'})),...derived]){ const key=j.dedupe_key||j.job_id; if(!map.has(key)||j.origin==='seed') map.set(key,j); } return [...map.values()]; }
function inspectPortfolioJob(project,job){
  const id=job.job_id;
  const pins=docs(portfolioFiles.filter(p=>p.startsWith(`coordination/portfolio/pins/${id}/`))).sort((a,b)=>pinGeneration(a.path,a.doc)-pinGeneration(b.path,b.doc)||ms(a.doc)-ms(b.doc));
  const claims=docs(portfolioFiles.filter(p=>p.startsWith(`coordination/portfolio/claims/${id}/`))).sort((a,b)=>ms(a.doc)-ms(b.doc)||a.path.localeCompare(b.path));
  const collisions=docs(portfolioFiles.filter(p=>p.startsWith(`coordination/portfolio/collisions/${id}/`)));
  const returns=docs(portfolioFiles.filter(p=>p.startsWith(`coordination/portfolio/returns/${id}/`))).sort((a,b)=>ms(a.doc)-ms(b.doc)||a.path.localeCompare(b.path));
  const terminal=[...returns].reverse().find(x=>terminalReturn(x.doc))||null;
  const latestReturn=returns.at(-1)||null, latestPin=pins.at(-1)||null, livePin=latestPin&&activeLease(latestPin.doc)?latestPin:null, activeClaims=claims.filter(x=>activeLease(x.doc));
  let authority=null, mode='none';
  if(latestPin){ authority=claims.find(x=>x.doc?.pin_ref===latestPin.path || (latestPin.doc?.pin_id && x.doc?.pin_id===latestPin.doc.pin_id))||null; mode=livePin?(pinGeneration(livePin.path,livePin.doc)>1?'recovery-pin':'pin'):'stale-pin'; }
  else if(activeClaims.length){ authority=activeClaims[0]; mode='legacy'; }
  let state='ready';
  if(terminal) state='done'; else if(livePin) state=pinGeneration(livePin.path,livePin.doc)>1?'recovery':'working'; else if(latestPin) state='stale'; else if(authority) state='working'; else if(latestReturn&&['partial','boundary'].includes(lower(latestReturn.doc?.outcome))) state='partial'; else if(lower(job.seed_status).includes('block')) state='blocked';
  const owner=first(livePin?.doc?.worker_id,authority?.doc?.worker_id,authority?.doc?.worker,authority?.doc?.claim_id)||null;
  const spawns=returns.flatMap(x=>Array.isArray(x.doc?.spawn_candidates)?x.doc.spawn_candidates:[]);
  return {job_id:id,dedupe_key:job.dedupe_key||id,title:job.title||id,kind:job.kind||null,priority:job.priority||0,origin:job.origin||'seed',state,owner,authority_mode:mode,pin_generation:latestPin?pinGeneration(latestPin.path,latestPin.doc):0,expires_at:first(livePin?.doc?.expires_at,authority?.doc?.expires_at)||null,collision_count:collisions.length+Math.max(0,activeClaims.length-(authority?1:0)),latest_return:latestReturn?{outcome:latestReturn.doc.outcome||latestReturn.doc.status||null,summary:latestReturn.doc.summary||null,returned_at:timeOf(latestReturn.doc)}:null,terminal_return:terminal?{outcome:terminal.doc.outcome||terminal.doc.status||null,returned_at:timeOf(terminal.doc)}:null,spawn_count:spawns.length};
}

const projects=(portfolio.projects||[]).map(p=>({project_id:p.project_id,label:p.label,status:p.status,priority:p.priority||0,goal:p.goal||'',surface:p.surface||null,jobs:mergeJobs(p.jobs||[],derivedByProject.get(p.project_id)||[]).map(j=>inspectPortfolioJob(p,j))}));

function queueFiles(){ return oppFiles.filter(p=>{ const b=path.posix.basename(p); if(!/queue/i.test(b)) return false; const d=readJson(p); return Array.isArray(d?.opportunities); }); }
function inspectOpp(op){
  const id=op.opportunity_id, claimPath=`coordination/opportunities/claims/${id}.json`, claim=exists(claimPath)?readJson(claimPath):null, run=latestDocUnder(oppFiles,`coordination/opportunities/runs/${id}/`), ret=latestDocUnder(oppFiles,`coordination/opportunities/returns/${id}/`);
  let state='waiting'; if(ret) state=explicitProblem(ret.doc)?'problem':'returned'; else if(run) state=explicitProblem(run.doc)?'problem':'working'; else if(claim) state='working'; else if(lower(op.status).includes('ready')) state='ready'; else if(lower(op.status).includes('fail')) state='problem';
  return {opportunity_id:id,mission:op.mission||op.type||'',priority:op.priority||0,state,owner:first(run?.doc?.worker_id,claim?.worker_id,claim?.worker)||null,claimed_at:timeOf(claim),started_at:timeOf(run?.doc),returned_at:timeOf(ret?.doc)};
}
const plans=queueFiles().map(rel=>{ const q=readJson(rel), items=(q.opportunities||[]).filter(x=>x?.opportunity_id).map(inspectOpp); const done=items.filter(x=>x.state==='returned').length,working=items.filter(x=>x.state==='working').length,ready=items.filter(x=>x.state==='ready').length,problems=items.filter(x=>x.state==='problem').length,total=items.length; return {id:first(q.generation_id,q.queue_id,path.posix.basename(rel,'.json')),label:first(q.generation_id,q.queue_id,path.posix.basename(rel,'.json')),parent:first(q.parent_generation_id,q.parent_queue_id)||null,created_at:first(q.created_at,q.generated_at,q.updated_at)||null,path:rel,total,done,working,ready,problems,remaining:Math.max(0,total-done),percent:total?Math.round(done/total*100):0,items}; }).sort((a,b)=>Date.parse(a.created_at||0)-Date.parse(b.created_at||0)||a.label.localeCompare(b.label));

const events=[];
for(const rel of portfolioFiles.filter(p=>p.includes('/pins/')||p.includes('/collisions/')||p.includes('/returns/'))){ const d=readJson(rel); if(!d)continue; const at=first(d.claimed_at,d.observed_at,d.returned_at,d.completed_at); if(!at)continue; const kind=rel.includes('/collisions/')?'problem':rel.includes('/returns/')?'return':'start'; events.push({kind,at,label:kind==='start'?`${d.worker_id||'worker'} → ${d.job_id}`:kind==='problem'?`colisión · ${d.job_id}`:`${d.job_id} · ${d.outcome||'return'}`,job_id:d.job_id||null}); }
for(const plan of plans) for(const x of plan.items){ if(x.claimed_at) events.push({kind:'start',at:x.claimed_at,label:`${x.owner||'worker'} → ${x.opportunity_id}`,opportunity_id:x.opportunity_id}); if(x.returned_at) events.push({kind:x.state==='problem'?'problem':'return',at:x.returned_at,label:`${x.opportunity_id} · return`,opportunity_id:x.opportunity_id}); }
events.sort((a,b)=>Date.parse(a.at||0)-Date.parse(b.at||0));

const jobs=projects.flatMap(p=>p.jobs);
const summary={portfolio:{projects:projects.length,jobs:jobs.length,ready:jobs.filter(j=>['ready','partial'].includes(j.state)).length,working:jobs.filter(j=>['working','recovery'].includes(j.state)).length,done:jobs.filter(j=>j.state==='done').length,stale:jobs.filter(j=>j.state==='stale').length,collisions:jobs.reduce((n,j)=>n+j.collision_count,0),derived:jobs.filter(j=>j.origin==='derived').length,terminal_returns:jobs.filter(j=>j.terminal_return).length},queues:{plans:plans.length,working:plans.reduce((n,p)=>n+p.working,0),remaining:plans.reduce((n,p)=>n+p.remaining,0),returned:plans.reduce((n,p)=>n+p.done,0)}};
summary.portfolio.reproduction=summary.portfolio.terminal_returns?summary.portfolio.derived/summary.portfolio.terminal_returns:0;
const feed={schema:'prometeo.live-feed/v1',generated_at:new Date().toISOString(),source_sha:process.env.GITHUB_SHA||null,head:{global_frontier:head.global_frontier||null,distributed_swarm:head.distributed_swarm||null},focus:{current_frontier:focus.current_frontier||null},summary,projects,plans,events:events.slice(-80)};
fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,JSON.stringify(feed,null,2)+'\n');
console.log(`live feed: ${projects.length} projects, ${jobs.length} portfolio jobs, ${plans.length} plans, ${events.length} events`);
