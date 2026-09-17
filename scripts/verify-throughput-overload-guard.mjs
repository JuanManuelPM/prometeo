#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TERMINAL=new Set(['DONE','VERIFIED','NO_ACTION_NEEDED','SUPERSEDED']);
const PRESERVED=['EXECUTION','VERIFY','RECOVERY','GUIDE_INTEGRATOR','GUIDE_RESCATE','GUIDE_CRITIC'];
const sha256=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const asTime=(v)=>{const t=Date.parse(v??'');return Number.isFinite(t)?t:null;};
async function walk(dir){const out=[];let es;try{es=await fs.readdir(dir,{withFileTypes:true});}catch(e){if(e?.code==='ENOENT')return out;throw e;}for(const x of es){const p=path.join(dir,x.name);if(x.isDirectory())out.push(...await walk(p));else if(x.isFile()&&x.name.endsWith('.json'))out.push(p);}return out;}
async function rows(dir,root){const out=[];for(const f of await walk(dir)){const rel=path.relative(root,f).replaceAll(path.sep,'/');try{out.push({source_path:rel,value:JSON.parse(await fs.readFile(f,'utf8'))});}catch(e){throw new Error(`Malformed JSON ${rel}: ${e.message}`);}}return out;}
function git(root,args){const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});if(r.status!==0)throw new Error(`git ${args.join(' ')} failed`);return r.stdout.trim();}
function patchValue(candidate,pointer){const op=(candidate?.exact_json_patch??[]).find((x)=>x?.op==='add'&&x?.path===pointer);if(!op)throw new Error(`Candidate missing patch ${pointer}`);return op.value;}

export function extractCandidateConfig(candidate){
  const minimum=Number(patchValue(candidate,'/signals/young_active_pin_guard_minimum'));
  const fraction=Number(patchValue(candidate,'/signals/young_active_pin_guard_fraction_of_recent_launches'));
  const ageMinutes=Number(patchValue(candidate,'/signals/young_active_pin_guard_age_minutes'));
  const overloadGuard=patchValue(candidate,'/overload_guard');
  const m=/distinct_recent_launches\s*>=\s*(\d+)/.exec(overloadGuard?.activation??'');
  const launchThreshold=m?Number(m[1]):NaN;
  if(![minimum,fraction,ageMinutes,launchThreshold].every(Number.isFinite))throw new Error('Candidate activation thresholds malformed');
  return {minimum,fraction,ageMinutes,launchThreshold,overloadGuard};
}

export function evaluateCandidate(config,evidence,action={kind:'SELF_MATERIALIZE',guide_role:'GUIDE_PLANNER'}){
  const keys=['distinct_recent_launches','young_active_pin_count','worker_window_minutes','active_pin_age_minutes'];
  const missing=keys.filter((k)=>!Number.isFinite(Number(evidence?.[k])));
  if(missing.length)return {verification_safe:false,active:null,selectable:null,planner_self_materialization_allowed:null,reason:`missing_or_malformed:${missing.join(',')}`};
  if(Number(evidence.active_pin_age_minutes)!==config.ageMinutes)return {verification_safe:false,active:null,selectable:null,planner_self_materialization_allowed:null,reason:'active_pin_age_window_mismatch'};
  const launches=Number(evidence.distinct_recent_launches), young=Number(evidence.young_active_pin_count);
  const requiredYoungPins=Math.max(config.minimum,Math.ceil(config.fraction*launches));
  const active=launches>=config.launchThreshold&&young>=requiredYoungPins;
  const suppressed=active&&action?.kind==='SELF_MATERIALIZE'&&action?.guide_role==='GUIDE_PLANNER';
  return {verification_safe:true,active,required_young_pins:requiredYoungPins,planner_self_materialization_allowed:!active,selectable:!suppressed,suppressed};
}

export async function buildLaunchEvidence(root,config,observedAt){
  const now=asTime(observedAt);if(now===null)throw new Error('Invalid observed_at');
  const beacons=await rows(path.join(root,'coordination/workers/beacons'),root);
  const pins=await rows(path.join(root,'coordination/portfolio/pins'),root);
  const heartbeats=await rows(path.join(root,'coordination/workers/heartbeats'),root);
  const returns=await rows(path.join(root,'coordination/portfolio/returns'),root);
  const workerWindowMinutes=10, cutoff=now-workerWindowMinutes*60000;
  const recent=beacons.filter(({value})=>{const t=asTime(value.launched_at??value.observed_at??value.created_at);return t!==null&&t>=cutoff&&t<=now&&value.worker_id;});
  const workerIds=[...new Set(recent.map(({value})=>value.worker_id))].sort();
  const terminal=new Set(returns.filter(({value})=>{const t=asTime(value.returned_at??value.completed_at??value.created_at);return t!==null&&t<=now&&TERMINAL.has(String(value.outcome??value.state??value.status??'').toUpperCase());}).map(({value})=>value.job_id??value.opportunity_id).filter(Boolean));
  const hb=new Map();for(const {value} of heartbeats){const job=value.job_id??value.opportunity_id,w=value.worker_id,t=asTime(value.heartbeat_at??value.observed_at??value.created_at);if(!job||!w||t===null||t>now)continue;const k=`${job}\0${w}`;if(t>(hb.get(k)??-Infinity))hb.set(k,t);}
  const byJob=new Map();for(const row of pins){const v=row.value,job=v.job_id,g=Number(v.generation),t=asTime(v.claimed_at??v.pinned_at??v.created_at);if(!job||!Number.isInteger(g)||!v.worker_id||t===null||t>now)continue;const a=byJob.get(job)??[];a.push(row);byJob.set(job,a);}
  const young=[];for(const [job,a] of byJob){if(terminal.has(job))continue;const max=Math.max(...a.map((r)=>Number(r.value.generation))), highest=a.filter((r)=>Number(r.value.generation)===max);if(highest.length!==1)continue;const row=highest[0],v=row.value,claim=asTime(v.claimed_at??v.pinned_at??v.created_at)??-Infinity,latest=Math.max(claim,hb.get(`${job}\0${v.worker_id}`)??-Infinity);if(latest===-Infinity)continue;const age=(now-latest)/60000;if(age>=0&&age<=config.ageMinutes)young.push({job_id:job,worker_id:v.worker_id,generation:max,age_minutes:Number(age.toFixed(3)),pin_ref:row.source_path});}
  young.sort((a,b)=>a.job_id.localeCompare(b.job_id));
  return {observed_at:new Date(now).toISOString(),worker_window_minutes:workerWindowMinutes,active_pin_age_minutes:config.ageMinutes,distinct_recent_launches:workerIds.length,recent_worker_ids:workerIds,young_active_pin_count:young.length,young_active_pins:young};
}

async function ownershipDigest(root){const entries=[];for(const relRoot of ['coordination/portfolio/pins','coordination/portfolio/claims','coordination/portfolio/returns'])for(const f of await walk(path.join(root,relRoot))){entries.push([path.relative(root,f).replaceAll(path.sep,'/'),sha256(await fs.readFile(f))]);}entries.sort((a,b)=>a[0].localeCompare(b[0]));return {count:entries.length,sha256:sha256(Buffer.from(JSON.stringify(entries)))};}

async function main(argv){
  const take=(flag,fallback)=>{const i=argv.indexOf(flag);return i<0?fallback:argv[i+1];};
  const root=path.resolve(take('--root','.')), out=path.resolve(take('--out',path.join(root,'artifacts/throughput-overload-guard-verification.json'))), observedAt=take('--observed-at',new Date().toISOString());
  const candidateRel='coordination/guide/candidates/THROUGHPUT_OVERLOAD_GUARD_CANDIDATE_V1.json', policyRel='coordination/guide/METABOLISM_POLICY_V1.json';let ev;
  try{
    const candidateBytes=await fs.readFile(path.join(root,candidateRel)), candidate=JSON.parse(candidateBytes), policyBytes=await fs.readFile(path.join(root,policyRel));JSON.parse(policyBytes);
    const candidateBlob=git(root,['hash-object',candidateRel]), policyBlob=git(root,['hash-object',policyRel]);if(policyBlob!==candidate?.target?.observed_blob_sha)throw new Error(`target_blob_mismatch:${policyBlob}:${candidate?.target?.observed_blob_sha??'missing'}`);
    const config=extractCandidateConfig(candidate), before=await ownershipDigest(root), live=await buildLaunchEvidence(root,config,observedAt), liveActual=evaluateCandidate(config,live);
    const liveRequired=Math.max(config.minimum,Math.ceil(config.fraction*live.distinct_recent_launches)), liveExpected=live.distinct_recent_launches>=config.launchThreshold&&live.young_active_pin_count>=liveRequired;
    const livePass=liveActual.verification_safe&&liveActual.active===liveExpected&&liveActual.planner_self_materialization_allowed===!liveExpected;
    const fixtures=[
      {name:'burst_active_10_launches_6_pins',input:{...live,distinct_recent_launches:10,young_active_pin_count:6},active:true,allowed:false},
      {name:'burst_inactive_10_launches_3_pins',input:{...live,distinct_recent_launches:10,young_active_pin_count:3},active:false,allowed:true},
      {name:'below_launch_threshold_7_launches_6_pins',input:{...live,distinct_recent_launches:7,young_active_pin_count:6},active:false,allowed:true}
    ].map((f)=>{const actual=evaluateCandidate(config,f.input);return {...f,actual,pass:actual.active===f.active&&actual.planner_self_materialization_allowed===f.allowed};});
    const activeFixture={...live,distinct_recent_launches:10,young_active_pin_count:6};
    const starvation=PRESERVED.map((work_class)=>{const actual=evaluateCandidate(config,activeFixture,{kind:'SELECT_EXISTING',guide_role:work_class});return {work_class,actual,pass:actual.verification_safe&&actual.selectable&&!actual.suppressed};});
    const existingPlanner=evaluateCandidate(config,activeFixture,{kind:'SELECT_EXISTING',guide_role:'GUIDE_PLANNER'}), malformed=evaluateCandidate(config,{distinct_recent_launches:10});
    const after=await ownershipDigest(root), ownershipUnchanged=before.count===after.count&&before.sha256===after.sha256;
    const pass=livePass&&fixtures.every((x)=>x.pass)&&starvation.every((x)=>x.pass)&&existingPlanner.selectable&&!existingPlanner.suppressed&&!malformed.verification_safe&&ownershipUnchanged;
    ev={schema:'prometeo.throughput-overload-guard-verification/v1',status:pass?'PASS':'FAIL',promotion_safe:pass,source_head:git(root,['rev-parse','HEAD']),observed_at:live.observed_at,exact_sources:{candidate_path:candidateRel,candidate_blob_sha:candidateBlob,candidate_sha256:sha256(candidateBytes),policy_path:policyRel,policy_blob_sha:policyBlob,policy_sha256:sha256(policyBytes),candidate_observed_target_blob_sha:candidate.target.observed_blob_sha},candidate_config:config,live_replay:{evidence:live,expected_required_young_pins:liveRequired,expected_active:liveExpected,actual:liveActual,pass:livePass},burst_fixtures:fixtures,starvation_fixtures:starvation,existing_planner_remains_selectable:{actual:existingPlanner,pass:existingPlanner.selectable&&!existingPlanner.suppressed},fail_closed_fixture:{actual:malformed,pass:!malformed.verification_safe},ownership_immutability:{before,after,pass:ownershipUnchanged},authority_boundary:'Independent verification only. Policy promotion requires separate CAS-safe integration of the exact candidate patch. No Current/Human Accepted/Served/product authority.'};
  }catch(e){ev={schema:'prometeo.throughput-overload-guard-verification/v1',status:'FAIL',promotion_safe:false,source_head:null,observed_at:observedAt,failure:e?.stack??String(e),authority_boundary:'Fail closed: no policy promotion.'};process.exitCode=1;}
  await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,`${JSON.stringify(ev,null,2)}\n`);if(ev.status!=='PASS')process.exitCode=1;else process.stdout.write(`${JSON.stringify({status:'PASS',source_head:ev.source_head,observed_at:ev.observed_at})}\n`);
}
const isCli=process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]);if(isCli)main(process.argv.slice(2));
