#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const repoRoot=path.resolve(process.argv[2]||'.');
const samplePath=path.resolve(repoRoot,process.argv[3]||'coordination/workers/EXTERNAL_CLOCK_SAMPLE_V1.json');
const sample=JSON.parse(fs.readFileSync(samplePath,'utf8'));

const CLOCK_PRECEDENCE=[
  {
    rank:1,
    source:'GITHUB_SERVER_EVENT_TIMESTAMP',
    examples:['workflow created_at/updated_at','issue/comment created_at'],
    confidence:'HIGH',
    rule:'Prefer when the exact lifecycle event is represented by a GitHub server event.'
  },
  {
    rank:2,
    source:'DURABLE_GIT_COMMIT_COMMITTER_TIMESTAMP',
    examples:['beacon file add commit','PIN file add commit','RETURN file add commit','exam file add commit'],
    confidence:'MEDIUM',
    rule:'Use as the primary clock when the lifecycle event is represented only by a durable commit. It is durable and externally inspectable, but generic Git committer dates are not assumed to be an independent server clock.'
  },
  {
    rank:3,
    source:'ARTIFACT_EMBEDDED_TIMESTAMP',
    examples:['launched_at','claimed_at','returned_at','closed_at inside JSON'],
    confidence:'DIAGNOSTIC_ONLY',
    rule:'Never use as the primary performance clock when rank 1 or 2 exists; never fill missing external clocks from model-authored timestamps.'
  }
];

function creationCommit(rel){
  if(!rel) return null;
  const abs=path.join(repoRoot,rel);
  if(!fs.existsSync(abs)) return {state:'UNKNOWN_MISSING_REF',ref:rel};
  let out='';
  try{
    out=execFileSync('git',[
      '-C',repoRoot,'log','--diff-filter=A','-1',
      '--format=%H%x09%cI%x09%aI','--',rel
    ],{encoding:'utf8'}).trim();
  }catch(error){
    return {state:'UNKNOWN_GIT_HISTORY_ERROR',ref:rel,error:String(error?.message||error)};
  }
  if(!out) return {state:'UNKNOWN_NO_ADD_COMMIT',ref:rel};
  const [sha,committer_at,author_at]=out.split('\t');
  return {
    state:'KNOWN',
    ref:rel,
    sha,
    committer_at:committer_at||null,
    author_at:author_at||null,
    clock_source:'DURABLE_GIT_COMMIT_COMMITTER_TIMESTAMP',
    confidence:'MEDIUM'
  };
}

function secondsBetween(start,end,metric){
  if(!start||start.state!=='KNOWN'||!end||end.state!=='KNOWN'){
    return {
      metric,
      state:'UNKNOWN',
      seconds:null,
      reason:!start||start.state!=='KNOWN'?'START_CLOCK_MISSING_OR_UNKNOWN':'END_CLOCK_MISSING_OR_UNKNOWN',
      confidence:null
    };
  }
  const a=Date.parse(start.committer_at);
  const b=Date.parse(end.committer_at);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<a){
    return {metric,state:'UNKNOWN',seconds:null,reason:'INCONSISTENT_CLOCK_ORDER',confidence:null};
  }
  return {
    metric,
    state:'KNOWN',
    seconds:Math.round((b-a)/1000),
    start_ref:start.ref,
    end_ref:end.ref,
    start_at:start.committer_at,
    end_at:end.committer_at,
    confidence:'MEDIUM_DURABLE_GIT_COMMIT_CLOCK'
  };
}

function median(values){
  const xs=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!xs.length) return null;
  const i=Math.floor(xs.length/2);
  return xs.length%2?xs[i]:(xs[i-1]+xs[i])/2;
}

assert.equal(sample.schema,'prometeo.worker-external-clock-sample/v1');
assert.ok(Array.isArray(sample.workers)&&sample.workers.length>=3,'sample must contain at least three workers');

const workers=sample.workers.map(row=>{
  const clocks={
    beacon:creationCommit(row.beacon_ref),
    claim:creationCommit(row.claim_ref),
    return:creationCommit(row.return_ref),
    close:creationCommit(row.close_ref)
  };
  const metrics={
    beacon_to_claim:secondsBetween(clocks.beacon,clocks.claim,'BEACON_TO_CLAIM'),
    claim_to_return:secondsBetween(clocks.claim,clocks.return,'CLAIM_TO_RETURN'),
    beacon_to_close:row.close_ref
      ? secondsBetween(clocks.beacon,clocks.close,'BEACON_TO_CLOSE')
      : {metric:'BEACON_TO_CLOSE',state:'UNKNOWN',seconds:null,reason:'NO_DURABLE_CLOSE_REF',confidence:null}
  };
  return {
    worker_id:row.worker_id,
    clocks,
    metrics,
    interpretation:{
      beacon_to_claim:'Observed allocation/claim latency. It may include transport and allocator waiting; it is not pure scheduler compute.',
      claim_to_return:'Observed owned interval from authority commit to durable return commit. It includes tool/CI/network waits and is not active model compute time.',
      beacon_to_close:'Observed lifecycle interval only when a durable close/exam clock exists.',
      internal_waiting:'NOT_OBSERVABLE_FROM_BOUNDARY_CLOCKS'
    }
  };
});

const known=(name)=>workers.map(w=>w.metrics[name]).filter(m=>m.state==='KNOWN').map(m=>m.seconds);
const report={
  schema:'prometeo.worker-external-clock-report/v1',
  sample_id:sample.sample_id,
  sample_size:workers.length,
  generated_from:'durable git history only; no model-authored timestamps used as primary clocks',
  clock_precedence:CLOCK_PRECEDENCE,
  workers,
  summary:{
    beacon_to_claim:{
      known_count:known('beacon_to_claim').length,
      unknown_count:workers.length-known('beacon_to_claim').length,
      median_seconds:median(known('beacon_to_claim'))
    },
    claim_to_return:{
      known_count:known('claim_to_return').length,
      unknown_count:workers.length-known('claim_to_return').length,
      median_seconds:median(known('claim_to_return'))
    },
    beacon_to_close:{
      known_count:known('beacon_to_close').length,
      unknown_count:workers.length-known('beacon_to_close').length,
      median_seconds:median(known('beacon_to_close'))
    }
  },
  comparison_limitations:[
    'Workers launched sequentially and workers launched concurrently experience different allocator and repository contention; do not compare these intervals as if launch conditions were identical.',
    'Claim-to-return is an observed wall interval, not active compute time. Network, CI, branch-head races and external waits are included.',
    'Missing close evidence remains UNKNOWN; it is never imputed as zero or inferred from silence.',
    'Commit timestamps are durable and inspectable but generic Git commit metadata is weaker than GitHub server event timestamps. A future reporter may substitute rank-1 clocks when exact event IDs are available.'
  ],
  authority:'CANDIDATE_OBSERVABILITY_ONLY_NO_TELEMETRY_AUTHORITY'
};

console.log(JSON.stringify(report,null,2));
