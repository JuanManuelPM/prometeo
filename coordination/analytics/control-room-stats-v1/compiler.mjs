import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PRODUCTIVE_KINDS=new Set(['MUTATION','VERIFICATION','INTEGRATION','GUIDE_FRONTIER']);
const STAGES=['E0_ENVELOPE','E1_IDENTITY','E2_ASSIGN','E3_CONTEXT','E4_PLAN_LOCK','E5_PRODUCE','E6_VERIFY','E7_RETURN','E8_REALLOCATE','E9_EXAM_CLOSE'];

function walk(dir){
  if(!dir||!fs.existsSync(dir)) return [];
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
function readJson(p){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}}
function repoRef(root,p){return path.relative(root,p).split(path.sep).join('/');}
function arr(v){return Array.isArray(v)?v:[];}
function isoMs(v){const n=Date.parse(v||'');return Number.isFinite(n)?n:null;}
function firstAt(d,keys){for(const k of keys){const v=d?.[k];if(isoMs(v)!==null)return v;}return null;}
function median(xs){
  const a=xs.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length)return null;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function percentile(xs,p){
  const a=xs.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length)return null;
  return a[Math.min(a.length-1,Math.max(0,Math.ceil(p*a.length)-1))];
}
function sampleSummary(xs){
  const a=xs.filter(Number.isFinite);
  if(!a.length)return {state:'unknown',sample_count:0,median_ms:null,p95_ms:null,min_ms:null,max_ms:null};
  return {state:'observed',sample_count:a.length,median_ms:median(a),p95_ms:percentile(a,.95),min_ms:Math.min(...a),max_ms:Math.max(...a)};
}
function observed(value,coverage){return {state:'observed',value,coverage};}
function unknown(reason){return {state:'unknown',value:null,reason};}
function firstNonPass(receipt){
  const trace=receipt?.stage_trace||{};
  for(const id of STAGES){
    const row=trace?.[id];
    if(!row) continue;
    const status=String(row.status||'UNKNOWN');
    if(status!=='PASS') return {stage:id,status,failure_code:row.failure_code||null};
  }
  return null;
}
function sourceRows(root,base){
  return walk(path.join(root,...base)).filter(p=>p.endsWith('.json')).map(p=>({doc:readJson(p),ref:repoRef(root,p)})).filter(x=>x.doc);
}
function claimRows(root,kind){
  const base=path.join(root,'coordination','launch-packets');
  return walk(base).filter(p=>p.endsWith('.json')&&p.includes(kind==='reallocation'?'/reallocation-claims/':'/claims/')).map(p=>({doc:readJson(p),ref:repoRef(root,p)})).filter(x=>x.doc?.worker_id&&x.doc?.run_id&&x.doc?.slot_id);
}
function returnRows(root){
  const base=path.join(root,'coordination','integration-runs');
  return walk(base).filter(p=>p.endsWith('.json')&&p.includes('/returns/')).map(p=>({doc:readJson(p),ref:repoRef(root,p)})).filter(x=>x.doc);
}
function runPackets(root){
  return walk(path.join(root,'coordination','launch-packets')).filter(p=>path.basename(p)==='PACKET.json').map(p=>({doc:readJson(p),ref:repoRef(root,p)})).filter(x=>x.doc?.run_id);
}

export function compileStats({root='.',projection=null,now=new Date().toISOString()}={}){
  const beacons=sourceRows(root,['coordination','workers','beacons']);
  const exams=sourceRows(root,['coordination','workers','exams']);
  const noalloc=sourceRows(root,['coordination','workers','no-allocation']);
  const receipts=sourceRows(root,['coordination','workers','benchmark-receipts']);
  const claims=claimRows(root,'primary');
  const reallocClaims=claimRows(root,'reallocation');
  const returns=returnRows(root);
  const packets=runPackets(root);

  const beaconByWorker=new Map(beacons.filter(x=>x.doc?.worker_id).map(x=>[x.doc.worker_id,x]));
  const examByWorker=new Map(exams.filter(x=>x.doc?.worker_id).map(x=>[x.doc.worker_id,x]));
  const receiptByWorker=new Map(receipts.filter(x=>x.doc?.worker_id).map(x=>[x.doc.worker_id,x]));
  const claimByWorker=new Map(claims.map(x=>[x.doc.worker_id,x]));
  const returnByRunSlot=new Map();
  for(const x of returns){
    const run=x.doc?.run_id||x.doc?.run||x.ref.match(/integration-runs\/([^/]+)\/returns\/(S\d+)\.json$/)?.[1]||null;
    const slot=x.doc?.slot_id||x.ref.match(/\/returns\/(S\d+)\.json$/)?.[1]||null;
    if(run&&slot) returnByRunSlot.set(run+':'+slot,x);
  }

  let productiveUnits=0,visibleWorkers=0,collisions=0,noAllocationCount=0;
  let explicitExamCoverage=0;
  for(const {doc} of exams){
    if(!doc?.worker_id)continue;
    explicitExamCoverage++;
    const valid=arr(doc.slots).filter(s=>s&&s.evidence_ref&&PRODUCTIVE_KINDS.has(String(s.kind||'')));
    productiveUnits+=valid.length;
    if(valid.some(s=>s.visible_change===true)) visibleWorkers++;
    collisions+=Number.isFinite(Number(doc.collisions))?Number(doc.collisions):0;
    noAllocationCount+=Number.isFinite(Number(doc.no_allocation_count))?Number(doc.no_allocation_count):0;
  }

  const beaconWithoutClaim=beacons.filter(x=>x.doc?.worker_id&&!claimByWorker.has(x.doc.worker_id));
  const openClaims=claims.filter(x=>!returnByRunSlot.has(x.doc.run_id+':'+x.doc.slot_id));

  const beaconToClaim=[];
  const claimToReturn=[];
  const launchToExam=[];
  for(const c of claims){
    const b=beaconByWorker.get(c.doc.worker_id)?.doc;
    const a=isoMs(b?.launched_at);
    const z=isoMs(c.doc?.claimed_at);
    if(a!==null&&z!==null&&z>=a) beaconToClaim.push(z-a);
    const rr=returnByRunSlot.get(c.doc.run_id+':'+c.doc.slot_id)?.doc;
    const rAt=isoMs(firstAt(rr,['completed_at','closed_at','updated_at','returned_at','created_at']));
    if(z!==null&&rAt!==null&&rAt>=z) claimToReturn.push(rAt-z);
  }
  for(const e of exams){
    const b=beaconByWorker.get(e.doc?.worker_id)?.doc;
    const a=isoMs(b?.launched_at);
    const z=isoMs(firstAt(e.doc,['closed_at','updated_at','created_at']));
    if(a!==null&&z!==null&&z>=a) launchToExam.push(z-a);
  }

  const firstNonPassByStage={};
  let primaryComplete=0,reallocationComplete=0;
  for(const {doc} of receipts){
    if(doc?.primary_complete===true) primaryComplete++;
    if(doc?.reallocation_complete===true) reallocationComplete++;
    const np=firstNonPass(doc);
    if(np){
      const k=np.stage+':'+np.status+(np.failure_code?':'+np.failure_code:'');
      firstNonPassByStage[k]=(firstNonPassByStage[k]||0)+1;
    }
  }

  const runRows=packets.map(p=>{
    const runId=p.doc.run_id;
    const slots=arr(p.doc.slots);
    const rc=claims.filter(x=>x.doc.run_id===runId);
    const rr=reallocClaims.filter(x=>x.doc.run_id===runId);
    const ret=returns.filter(x=>x.doc?.run_id===runId||x.ref.includes('/integration-runs/'+runId+'/returns/'));
    const runBeacons=beacons.filter(x=>x.doc?.run_id===runId);
    const claimedSlots=new Set(rc.map(x=>x.doc.slot_id));
    return {
      run_id:runId,
      status:p.doc.status||null,
      slots_total:slots.length,
      slots_claimed:claimedSlots.size,
      slots_unclaimed:slots.length?Math.max(0,slots.length-claimedSlots.size):null,
      workers_beaconed:new Set(runBeacons.map(x=>x.doc.worker_id)).size,
      workers_beaconed_without_primary_claim:runBeacons.filter(x=>!claimByWorker.has(x.doc.worker_id)).length,
      primary_returns:ret.length,
      reallocation_claims:rr.length,
      source_ref:p.ref
    };
  });

  const frontierPath=projection?path.join(projection,'live','claim-frontier.json'):null;
  const scoreboardPath=projection?path.join(projection,'live','worker-scoreboard.json'):null;
  const frontier=frontierPath?readJson(frontierPath):null;
  const scoreboard=scoreboardPath?readJson(scoreboardPath):null;

  const recoveryAttention=frontier&&Number.isFinite(Number(frontier.recovery_attention_total))
    ? observed(Number(frontier.recovery_attention_total),'gh-pages/live/claim-frontier.json')
    : unknown('claim-frontier projection unavailable or field absent');

  const scoreboardCoverage=scoreboard?.measurement_coverage||null;
  const projectionRun=arr(scoreboard?.launch_runs).find(x=>x?.run_id==='PROMETEO-MP10-01')||null;

  return {
    schema:'prometeo.control-room-stats/v1',
    generated_at:now,
    source_mode:'GITHUB_DURABLE_EVIDENCE_ONLY',
    authority:'OBSERVABILITY_ONLY',
    coverage:{
      beacons:{state:'observed',count:beacons.length},
      explicit_exams:{state:'observed',count:explicitExamCoverage},
      benchmark_receipts:{state:'observed',count:receipts.length},
      primary_run_claims:{state:'observed',count:claims.length},
      reallocation_claims:{state:'observed',count:reallocClaims.length},
      durable_run_returns:{state:'observed',count:returns.length},
      no_allocation_receipts:{state:'observed',count:noalloc.length},
      claim_frontier_projection:frontier?{state:'observed',generated_at:frontier.generated_at||null}:{state:'unknown',generated_at:null},
      worker_scoreboard_projection:scoreboard?{state:'observed',generated_at:scoreboard.generated_at||null}:{state:'unknown',generated_at:null}
    },
    useful_output:{
      evidence_backed_productive_exam_units:observed(productiveUnits,'explicit exams only'),
      workers_with_visible_change:observed(visibleWorkers,'explicit exams only'),
      durable_run_return_documents:observed(returns.length,'integration-run returns'),
      benchmark_primary_complete:observed(primaryComplete,'benchmark receipts only'),
      benchmark_reallocation_complete:observed(reallocationComplete,'benchmark receipts only')
    },
    wasted_time:{
      collisions_observed:observed(collisions,'explicit exams only'),
      no_allocation_observed:observed(noAllocationCount,'explicit exams only'),
      beacons_without_primary_claim:observed(beaconWithoutClaim.length,'durable beacons vs launch claims'),
      primary_claims_without_return:observed(openClaims.length,'durable run claims vs run returns'),
      first_non_pass_by_stage:{state:'observed',value:firstNonPassByStage,coverage:'benchmark receipts only'}
    },
    latency_proxies:{
      beacon_to_primary_claim:sampleSummary(beaconToClaim),
      primary_claim_to_return:sampleSummary(claimToReturn),
      beacon_to_exam_close:sampleSummary(launchToExam),
      note:'Latency is a proxy derived only when both durable timestamps exist; missing samples stay unknown.'
    },
    stale_work:{
      recovery_attention_total:recoveryAttention,
      open_primary_claims_without_return:observed(openClaims.length,'not labeled stale without an explicit lease/TTL rule'),
      frontier_generated_at:frontier?.generated_at||null,
      rule:'Never infer stale from wall-clock age alone. Prefer explicit recovery/replaceable evidence from claim-frontier.'
    },
    runs:runRows,
    projections:{
      scoreboard_measurement_coverage:scoreboardCoverage,
      mp10_launch_run:projectionRun
    },
    truth_boundaries:[
      'Missing evidence is unknown, never numeric zero.',
      'Compiled statistics are observability, not claim/scheduler/CURRENT authority.',
      'No heartbeat, polling write, Supabase call or private payload is required.',
      'Exam-only waste totals are partial coverage unless every worker has an explicit exam.',
      'Open claim without return is unresolved work, not automatically stale.'
    ]
  };
}

function parseArgs(argv){
  const out={root:'.',projection:null,out:null,now:new Date().toISOString()};
  for(let i=0;i<argv.length;i++){
    const a=argv[i],v=argv[i+1];
    if(a==='--root'){out.root=v;i++;}
    else if(a==='--projection'){out.projection=v;i++;}
    else if(a==='--out'){out.out=v;i++;}
    else if(a==='--now'){out.now=v;i++;}
  }
  return out;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const opts=parseArgs(process.argv.slice(2));
  if(!opts.out) throw new Error('--out is required');
  const result=compileStats(opts);
  fs.mkdirSync(path.dirname(opts.out),{recursive:true});
  fs.writeFileSync(opts.out,JSON.stringify(result,null,2)+'\n');
  process.stdout.write(JSON.stringify({ok:true,out:opts.out,beacons:result.coverage.beacons.count,claims:result.coverage.primary_run_claims.count,returns:result.coverage.durable_run_returns.count})+'\n');
}
