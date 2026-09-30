import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

export const EXPERIMENT_ID = 'LOCAL-BATCH-E5-01';
export const JOBS = [
  ['portfolio-worker-local-batch-e5-lb0-direct-r1-v1','LB0_DIRECT',1],
  ['portfolio-worker-local-batch-e5-lb0-direct-r2-v1','LB0_DIRECT',2],
  ['portfolio-worker-local-batch-e5-lb1-block-audit-r1-v1','LB1_BLOCK_AUDIT',1],
  ['portfolio-worker-local-batch-e5-lb1-block-audit-r2-v1','LB1_BLOCK_AUDIT',2],
  ['portfolio-worker-local-batch-e5-lb2-fill-template-r1-v1','LB2_FILL_TEMPLATE',1],
  ['portfolio-worker-local-batch-e5-lb2-fill-template-r2-v1','LB2_FILL_TEMPLATE',2],
].map(([job_id,variant,replica])=>({job_id,variant,replica}));

export function artifactPaths(jobId){
  const root=`coordination/workers/local-batch-results/${EXPERIMENT_ID}`;
  return {start:`${root}/${jobId}.START.json`,result:`${root}/${jobId}.RESULT.json`};
}

export function validateResultBundle(bundle, job){
  const errors=[];
  if (!bundle || typeof bundle !== 'object') return ['RESULT_NOT_OBJECT'];
  for(const key of ['experiment_id','variant','replica','worker_id','start_ref','result_ref']) if(bundle[key]===undefined||bundle[key]===null||bundle[key]==='') errors.push(`MISSING_${key.toUpperCase()}`);
  if(bundle.experiment_id!==undefined && bundle.experiment_id!==EXPERIMENT_ID) errors.push('EXPERIMENT_ID_MISMATCH');
  if(bundle.variant!==undefined && bundle.variant!==job.variant) errors.push('VARIANT_MISMATCH');
  if(bundle.replica!==undefined && Number(bundle.replica)!==job.replica) errors.push('REPLICA_MISMATCH');
  return errors;
}

export function resultComparisonBoundary(bundle){
  const reasons=[];
  if(bundle?.valid_for_local_batch_comparison===false) reasons.push('RESULT_DECLARES_NOT_VALID_FOR_LOCAL_BATCH_COMPARISON');
  for(const key of ['comparison_validity','validity']){
    const value=bundle?.[key];
    if(typeof value==='string'&&value.startsWith('INVALID')) reasons.push(key.toUpperCase()+':'+value);
  }
  return [...new Set(reasons)];
}

export function compileReplica({job,startArtifact,resultArtifact,git}){
  const paths=artifactPaths(job.job_id);
  if(!startArtifact) return {job_id:job.job_id,variant:job.variant,replica:job.replica,status:'NOT_READY',reason:'MISSING_START',start_ref:paths.start,result_ref:paths.result,start_present:false,result_present:Boolean(resultArtifact),timing_eligible:false,elapsed_external_ms:null,observable_writes_between_start_and_result:null,ambient_repo_commits_between:null,violations:[],comparison_boundary:[]};
  if(!resultArtifact) return {job_id:job.job_id,variant:job.variant,replica:job.replica,status:'NOT_READY',reason:'MISSING_RESULT',start_ref:paths.start,result_ref:paths.result,start_present:true,result_present:false,timing_eligible:false,elapsed_external_ms:null,observable_writes_between_start_and_result:null,ambient_repo_commits_between:null,violations:[],comparison_boundary:[]};
  const malformed=validateResultBundle(resultArtifact,job);
  if(malformed.length) return {job_id:job.job_id,variant:job.variant,replica:job.replica,status:'MALFORMED',reason:'RESULT_SCHEMA',start_ref:paths.start,result_ref:paths.result,start_present:true,result_present:true,timing_eligible:false,elapsed_external_ms:null,observable_writes_between_start_and_result:null,ambient_repo_commits_between:null,violations:malformed,comparison_boundary:[]};
  const comparison_boundary=resultComparisonBoundary(resultArtifact);
  if(!git?.start_commit || !git?.result_commit) return {job_id:job.job_id,variant:job.variant,replica:job.replica,worker_id:resultArtifact.worker_id,status:'NOT_READY',reason:'MISSING_GIT_MARKER_HISTORY',start_ref:paths.start,result_ref:paths.result,start_present:true,result_present:true,timing_eligible:false,elapsed_external_ms:null,observable_writes_between_start_and_result:null,ambient_repo_commits_between:null,violations:[],comparison_boundary};
  const st=Date.parse(git.start_commit.committed_at),rt=Date.parse(git.result_commit.committed_at),violations=[];
  if(!Number.isFinite(st)||!Number.isFinite(rt)||rt<st) violations.push('INVALID_DURABLE_COMMIT_TIME_ORDER');
  const intermediate=Array.isArray(git.intermediate_commits)?git.intermediate_commits:[],attributable=[];
  for(const commit of intermediate){const changed=Array.isArray(commit.changed_paths)?commit.changed_paths:[];const owned=changed.filter(p=>p.includes(job.job_id)||p.includes(resultArtifact.worker_id));if(owned.length) attributable.push({sha:commit.sha,changed_paths:owned});}
  if(attributable.length) violations.push('ATTRIBUTABLE_INTERMEDIATE_DURABLE_WRITE');
  const observedElapsed=Number.isFinite(st)&&Number.isFinite(rt)&&rt>=st?rt-st:null;
  const timing_eligible=violations.length===0&&comparison_boundary.length===0;
  const status=violations.length?'INVALID_CONTRACT':comparison_boundary.length?'INVALID_COMPARISON':'COMPLETE';
  const reason=violations.length?'CONTRACT_VIOLATION':comparison_boundary.length?'RESULT_COMPARISON_BOUNDARY':null;
  return {job_id:job.job_id,variant:job.variant,replica:job.replica,worker_id:resultArtifact.worker_id,status,reason,start_ref:paths.start,result_ref:paths.result,start_present:true,result_present:true,start_commit:git.start_commit.sha,result_commit:git.result_commit.sha,timing_eligible,elapsed_external_ms:timing_eligible?observedElapsed:null,observed_elapsed_external_ms:observedElapsed,observable_writes_between_start_and_result:attributable.length,attributable_intermediate_writes:attributable,ambient_repo_commits_between:intermediate.length,model_authored_duration_used_as_wall_clock:false,violations,comparison_boundary};
}

export function aggregate(replicas,minSamples=2){
  const variants={};
  for(const id of ['LB0_DIRECT','LB1_BLOCK_AUDIT','LB2_FILL_TEMPLATE']){const complete=replicas.filter(r=>r.variant===id&&r.status==='COMPLETE');variants[id]={sample_count:complete.length,status:complete.length>=minSamples?'READY':'INSUFFICIENT_SAMPLES',elapsed_external_ms:complete.map(r=>r.elapsed_external_ms),observable_writes:complete.map(r=>r.observable_writes_between_start_and_result)};}
  return {min_samples_per_variant:minSamples,variants,winner:null,automatic_promotion:false};
}

function readJson(path){try{return JSON.parse(fs.readFileSync(path,'utf8'));}catch(e){if(e?.code==='ENOENT')return null;return {__parse_error:String(e)}}}
function gitFirstAdd(path){try{const raw=execFileSync('git',['log','--diff-filter=A','--format=%H%x09%cI','--',path],{encoding:'utf8'}).trim();if(!raw)return null;const [sha,committed_at]=raw.split('\n').at(-1).split('\t');return {sha,committed_at};}catch{return null;}}
function gitIntermediate(startSha,resultSha){if(!startSha||!resultSha)return [];try{const raw=execFileSync('git',['rev-list','--reverse',`${startSha}..${resultSha}`],{encoding:'utf8'}).trim();if(!raw)return [];return raw.split('\n').filter(sha=>sha&&sha!==resultSha).map(sha=>{const paths=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',sha],{encoding:'utf8'}).trim();return {sha,changed_paths:paths?paths.split('\n'):[]};});}catch{return [];}}

export function compileRepository(){
  const replicas=JOBS.map(job=>{const paths=artifactPaths(job.job_id),startArtifact=readJson(paths.start),resultArtifact=readJson(paths.result);if(startArtifact?.__parse_error||resultArtifact?.__parse_error)return {job_id:job.job_id,variant:job.variant,replica:job.replica,status:'MALFORMED',reason:'JSON_PARSE',start_ref:paths.start,result_ref:paths.result,start_present:Boolean(startArtifact),result_present:Boolean(resultArtifact),timing_eligible:false,elapsed_external_ms:null,observable_writes_between_start_and_result:null,ambient_repo_commits_between:null,violations:['JSON_PARSE'],comparison_boundary:[]};const start_commit=gitFirstAdd(paths.start),result_commit=gitFirstAdd(paths.result),intermediate_commits=gitIntermediate(start_commit?.sha,result_commit?.sha);return compileReplica({job,startArtifact,resultArtifact,git:{start_commit,result_commit,intermediate_commits}});});
  let source_head=null;try{source_head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()||null;}catch{}
  return {schema:'prometeo.worker-local-batch-telemetry-report/v1',experiment_id:EXPERIMENT_ID,source_head,clock_source:'git commit timestamps only; model-authored durations excluded',replicas,aggregate:aggregate(replicas),truth_boundary:'Evidence-bound experiment summary only. Missing or comparison-invalid replicas are excluded from clean timing aggregates; no automatic winner or baseline promotion.'};
}
if(import.meta.url===`file://${process.argv[1]}`) process.stdout.write(JSON.stringify(compileRepository(),null,2)+'\n');
