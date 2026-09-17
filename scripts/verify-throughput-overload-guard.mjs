#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TERMINAL = new Set(['DONE','VERIFIED','NO_ACTION_NEEDED','SUPERSEDED']);
const PRESERVE = new Set(['EXECUTION','VERIFY','RECOVERY','INTEGRATOR','RESCATE','CRITIC']);

const asTime = (v) => { const t = Date.parse(v ?? ''); return Number.isFinite(t) ? t : null; };
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
async function readJson(file){ return JSON.parse(await fs.readFile(file,'utf8')); }
async function walk(dir){
  const out=[]; let entries;
  try { entries=await fs.readdir(dir,{withFileTypes:true}); } catch(e){ if(e?.code==='ENOENT') return out; throw e; }
  for(const ent of entries){ const p=path.join(dir,ent.name); if(ent.isDirectory()) out.push(...await walk(p)); else if(ent.isFile()&&ent.name.endsWith('.json')) out.push(p); }
  return out;
}
async function rows(dir,root){
  const out=[];
  for(const file of await walk(dir)){
    const rel=path.relative(root,file).replaceAll(path.sep,'/');
    try { out.push({source_path:rel,value:await readJson(file)}); }
    catch(e){ throw new Error(`Malformed JSON ${rel}: ${e.message}`); }
  }
  return out;
}
function latestTime(...values){ return values.map(asTime).filter((x)=>x!==null).reduce((a,b)=>Math.max(a,b),-Infinity); }

export function evaluateGuard({baseLimit,guard,launchEvidence,workClass='GUIDE_SELF_MATERIALIZE'}){
  if(!guard?.enabled) return {promotion_safe:true,overload:false,effective_new_guide_limit:baseLimit,work_class_allowed:true};
  const required=['distinct_recent_workers','young_active_pin_count','worker_window_minutes','active_pin_age_minutes'];
  const missing=required.filter((k)=>!Number.isFinite(Number(launchEvidence?.[k])));
  if(missing.length){
    return {promotion_safe:false,overload:null,effective_new_guide_limit:null,work_class_allowed:null,reason:`missing_or_malformed:${missing.join(',')}`};
  }
  if(Number(launchEvidence.worker_window_minutes)!==Number(guard.launch_burst_window_minutes) || Number(launchEvidence.active_pin_age_minutes)!==Number(guard.launch_burst_active_pin_age_minutes)){
    return {promotion_safe:false,overload:null,effective_new_guide_limit:null,work_class_allowed:null,reason:'window_mismatch'};
  }
  const overload = Number(launchEvidence.distinct_recent_workers)>=Number(guard.launch_burst_threshold) && Number(launchEvidence.young_active_pin_count)>=Number(guard.launch_burst_active_pin_threshold);
  const preserved=PRESERVE.has(String(workClass).toUpperCase());
  const effective=overload ? Math.min(Number(baseLimit),Number(guard.launch_burst_max_new_guide_jobs)) : Number(baseLimit);
  return {promotion_safe:true,overload,effective_new_guide_limit:effective,work_class_allowed:preserved ? true : true,throttle_applies:overload && !preserved && String(workClass).toUpperCase()==='GUIDE_SELF_MATERIALIZE'};
}

export async function buildLaunchEvidence(root,guard,observedAt){
  const now=asTime(observedAt); if(now===null) throw new Error('Invalid observed_at');
  const workerWindow=Number(guard.launch_burst_window_minutes); const pinAge=Number(guard.launch_burst_active_pin_age_minutes);
  if(!Number.isFinite(workerWindow)||!Number.isFinite(pinAge)) throw new Error('Malformed guard windows');
  const beacons=await rows(path.join(root,'coordination/workers/beacons'),root);
  const pins=await rows(path.join(root,'coordination/portfolio/pins'),root);
  const heartbeats=await rows(path.join(root,'coordination/workers/heartbeats'),root);
  const returns=await rows(path.join(root,'coordination/portfolio/returns'),root);
  const recentCutoff=now-workerWindow*60000;
  const recentBeacons=beacons.filter(({value})=>{ const t=asTime(value.launched_at ?? value.observed_at ?? value.created_at); return t!==null&&t>=recentCutoff&&t<=now&&value.worker_id; });
  const workers=[...new Set(recentBeacons.map(({value})=>value.worker_id))].sort();
  const terminalJobs=new Set(returns.filter(({value})=>{ const t=asTime(value.returned_at ?? value.completed_at); return t!==null&&t<=now&&TERMINAL.has(String(value.outcome ?? value.state ?? value.status ?? '').toUpperCase()); }).map(({value})=>value.job_id ?? value.opportunity_id).filter(Boolean));
  const hbLatest=new Map();
  for(const {value} of heartbeats){ const job=value.job_id ?? value.opportunity_id; const worker=value.worker_id; const t=asTime(value.heartbeat_at ?? value.observed_at); if(!job||!worker||t===null||t>now) continue; const key=`${job}\0${worker}`; if(t>(hbLatest.get(key)??-Infinity)) hbLatest.set(key,t); }
  const byJob=new Map();
  for(const row of pins){ const v=row.value; const job=v.job_id; const gen=Number(v.generation); const claimed=asTime(v.claimed_at ?? v.pinned_at); if(!job||!Number.isInteger(gen)||!v.worker_id||claimed===null||claimed>now) continue; const arr=byJob.get(job)??[]; arr.push(row); byJob.set(job,arr); }
  const young=[];
  for(const [job,arr] of byJob){
    if(terminalJobs.has(job)) continue;
    const max=Math.max(...arr.map((r)=>Number(r.value.generation)));
    const highest=arr.filter((r)=>Number(r.value.generation)===max); if(highest.length!==1) continue;
    const row=highest[0]; const v=row.value; const latest=Math.max(asTime(v.claimed_at ?? v.pinned_at)??-Infinity,hbLatest.get(`${job}\0${v.worker_id}`)??-Infinity);
    if(latest===-Infinity) continue; const age=(now-latest)/60000;
    if(age>=0&&age<=pinAge) young.push({job_id:job,worker_id:v.worker_id,generation:max,age_minutes:Number(age.toFixed(3)),pin_ref:row.source_path});
  }
  young.sort((a,b)=>a.job_id.localeCompare(b.job_id));
  return {observed_at:new Date(now).toISOString(),worker_window_minutes:workerWindow,active_pin_age_minutes:pinAge,distinct_recent_workers:workers.length,recent_worker_ids:workers,young_active_pin_count:young.length,young_active_pins:young};
}

function gitHead(root){ const r=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}); if(r.status!==0) throw new Error('git rev-parse HEAD failed'); return r.stdout.trim(); }
async function main(argv){
  const take=(flag,fallback)=>{ const i=argv.indexOf(flag); return i<0?fallback:argv[i+1]; };
  const root=path.resolve(take('--root','.')); const out=path.resolve(take('--out',path.join(root,'artifacts/throughput-overload-guard-verification.json'))); const observedAt=take('--observed-at',new Date().toISOString());
  const candidatePath=path.join(root,'coordination/guide/candidates/THROUGHPUT_OVERLOAD_GUARD_CANDIDATE_V1.json'); const policyPath=path.join(root,'coordination/guide/METABOLISM_POLICY_V1.json');
  let evidence;
  try{
    const candidateBytes=await fs.readFile(candidatePath); const policyBytes=await fs.readFile(policyPath); const candidate=JSON.parse(candidateBytes); const policy=JSON.parse(policyBytes);
    const targetHash=sha256(policyBytes); if(targetHash!==candidate.observed_target_sha) throw new Error(`target_sha_mismatch:${targetHash}`);
    const guard=candidate.proposed_patch?.self_materializing_guide_jobs?.throughput_overload_guard; if(!guard) throw new Error('candidate guard missing');
    const baseLimit=Number(policy.self_materializing_guide_jobs?.max_self_materialized_jobs_per_cycle); if(!Number.isFinite(baseLimit)) throw new Error('base policy limit missing');
    const live=await buildLaunchEvidence(root,guard,observedAt); const liveResult=evaluateGuard({baseLimit,guard,launchEvidence:live});
    const fixtures=[
      {name:'below_worker_threshold',e:{...live,distinct_recent_workers:Number(guard.launch_burst_threshold)-1,young_active_pin_count:Number(guard.launch_burst_active_pin_threshold)},expect:{overload:false,limit:baseLimit}},
      {name:'below_active_pin_threshold',e:{...live,distinct_recent_workers:Number(guard.launch_burst_threshold),young_active_pin_count:Number(guard.launch_burst_active_pin_threshold)-1},expect:{overload:false,limit:baseLimit}},
      {name:'at_both_thresholds',e:{...live,distinct_recent_workers:Number(guard.launch_burst_threshold),young_active_pin_count:Number(guard.launch_burst_active_pin_threshold)},expect:{overload:true,limit:Number(guard.launch_burst_max_new_guide_jobs)}}
    ].map((f)=>{ const actual=evaluateGuard({baseLimit,guard,launchEvidence:f.e}); return {...f,actual,pass:actual.overload===f.expect.overload&&actual.effective_new_guide_limit===f.expect.limit}; });
    const starvation=[...PRESERVE].map((workClass)=>{ const actual=evaluateGuard({baseLimit,guard,launchEvidence:{...live,distinct_recent_workers:Number(guard.launch_burst_threshold),young_active_pin_count:Number(guard.launch_burst_active_pin_threshold)},workClass}); return {work_class:workClass,actual,pass:actual.promotion_safe&&actual.work_class_allowed===true&&actual.throttle_applies===false}; });
    const malformed=evaluateGuard({baseLimit,guard,launchEvidence:{distinct_recent_workers:null},workClass:'GUIDE_SELF_MATERIALIZE'});
    const pass=liveResult.promotion_safe&&liveResult.overload===true&&liveResult.effective_new_guide_limit===Number(guard.launch_burst_max_new_guide_jobs)&&fixtures.every((x)=>x.pass)&&starvation.every((x)=>x.pass)&&malformed.promotion_safe===false;
    evidence={schema:'prometeo.throughput-overload-guard-verification/v1',status:pass?'PASS':'FAIL',source_head:gitHead(root),observed_at:live.observed_at,hashes:{candidate_sha256:sha256(candidateBytes),policy_sha256:targetHash,expected_target_sha256:candidate.observed_target_sha},base_limit:baseLimit,guard,live_replay:{evidence:live,actual:liveResult,expected:{overload:true,effective_new_guide_limit:Number(guard.launch_burst_max_new_guide_jobs)}},negative_and_boundary_fixtures:fixtures,starvation_fixtures:starvation,fail_closed_fixture:{input:{distinct_recent_workers:null},actual:malformed,pass:malformed.promotion_safe===false},promotion_safe:pass,authority_boundary:'Verification only until an explicit CAS update integrates the candidate into METABOLISM_POLICY_V1.json. No Current/Human Accepted/Served/product authority.'};
  }catch(error){ evidence={schema:'prometeo.throughput-overload-guard-verification/v1',status:'FAIL',source_head:null,observed_at:observedAt,promotion_safe:false,failure:error?.stack??String(error),authority_boundary:'Fail closed: no policy promotion.'}; process.exitCode=1; }
  await fs.mkdir(path.dirname(out),{recursive:true}); await fs.writeFile(out,`${JSON.stringify(evidence,null,2)}\n`); if(evidence.status!=='PASS') process.exitCode=1; else process.stdout.write(`${JSON.stringify({status:'PASS',source_head:evidence.source_head,observed_at:evidence.observed_at})}\n`);
}
const isCli=process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]); if(isCli) main(process.argv.slice(2));
