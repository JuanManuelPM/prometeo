import fs from 'node:fs';
import path from 'node:path';
import { classifyPoolResidency, poolResidencyFailure } from './worker-residency-integrity.mjs';

const root=process.argv[2]||'.';
const outPath=process.argv[3]||path.join(root,'worker-scoreboard.json');

function walk(dir){
  if(!fs.existsSync(dir)) return [];
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
function readJson(p){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}}
function repoRef(p){return path.relative(root,p).split(path.sep).join('/');}
const arr=v=>Array.isArray(v)?v:[];
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const timeOf=d=>d?.closed_at||d?.returned_at||d?.completed_at||d?.updated_at||d?.observed_at||d?.launched_at||d?.created_at||d?.claimed_at||null;
const median=vals=>{
  const a=vals.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length) return null;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
};
const ratio=(a,b)=>b?Number((a/b).toFixed(3)):null;

const spec=readJson(path.join(root,'coordination','workers','WORKER_PRODUCTIVITY_EXAM_V1.json'))||{};
const growthPolicy=readJson(path.join(root,'coordination','workers','WORKER_GROWTH_POLICY_V1.json'))||{};
const strategyRef=spec?.strategy_measurement?.active_experiment_ref||'coordination/workers/WORKER_STRATEGY_EXPERIMENT_V1.json';
const strategyExperiment=readJson(path.join(root,strategyRef))||null;

const examFiles=walk(path.join(root,'coordination','workers','exams')).filter(p=>p.endsWith('.json'));
const rows=[];
const examByWorker=new Map();
for(const p of examFiles){
  const d=readJson(p); if(!d?.worker_id) continue;
  const slots=arr(d.slots);
  const valid=slots.filter(s=>s && s.evidence_ref && ['MUTATION','VERIFICATION','INTEGRATION','GUIDE_FRONTIER'].includes(String(s.kind||'')));
  const productive=Math.min(6,valid.length);
  const experimentalValid=valid.filter(s=>s.experimental_slot===true);
  const experimentalProjects=[...new Set(experimentalValid.map(s=>s.project_id).filter(Boolean))];
  const visible=valid.some(s=>s.visible_change===true)?1:0;
  const reproduction=valid.some(s=>n(s.successors_created)>0)?1:0;
  const productProjects=[...new Set(arr(d.projects_touched).filter(Boolean).filter(x=>!['prometeo-live','prometeo-autonomous-growth'].includes(x)))];
  const breadth=productProjects.length>=2?1:0;
  const lowWaste=n(d.no_allocation_count)===0 && n(d.collisions)<=1 ? 1:0;
  const score=productive+visible+reproduction+breadth+lowWaste;
  const row={
    worker_id:d.worker_id,
    batch_id:d.batch_id||null,
    pool_id:d.pool_id||null,
    protocol_version:d.protocol_version||null,
    launch_nonce:d.launch_nonce||null,
    pattern_id:d.pattern_id||null,
    experiment_id:d.experiment_id||null,
    experiment_enrolled:d.experiment_enrolled===true,
    job_class:d.job_class||null,
    strategy_variant:d.strategy_variant||null,
    strategy_assignment_basis:d.strategy_assignment_basis||null,
    closed_at:d.closed_at||null,
    score,
    productive_slots:productive,
    visible_change:!!visible,
    reproduction:!!reproduction,
    product_project_breadth:productProjects.length,
    low_waste:!!lowWaste,
    collisions:n(d.collisions),
    no_allocation_count:n(d.no_allocation_count),
    changed_paths_total:valid.reduce((a,s)=>a+n(s.changed_paths_count),0),
    tests_total:valid.reduce((a,s)=>a+n(s.tests_count),0),
    successors_total:valid.reduce((a,s)=>a+n(s.successors_created),0),
    experimental_productive_slots:experimentalValid.length,
    experimental_visible_change:experimentalValid.some(s=>s.visible_change===true),
    experimental_reproduction:experimentalValid.some(s=>n(s.successors_created)>0),
    experimental_project_breadth:experimentalProjects.length,
    summary_word_count:n(d.summary_word_count),
    wall_clock_seconds:n(d.wall_clock_seconds)||null,
    run_id:d.run_id||null,
    slot_id:d.slot_id||null,
    evolution_variant:d.evolution_variant||null,
    pipeline_first_non_pass_stage:d.pipeline_first_non_pass_stage||null,
    close_reason:d.close_reason||null,
    close_evidence_refs:arr(d.close_evidence_refs).filter(Boolean),
    exam_ref:repoRef(p)
  };
  rows.push(row);
  examByWorker.set(d.worker_id,row);
}
rows.sort((a,b)=>b.score-a.score || (b.productive_slots-a.productive_slots) || String(a.closed_at||'').localeCompare(String(b.closed_at||'')));
const latest=[...rows].sort((a,b)=>Date.parse(b.closed_at||0)-Date.parse(a.closed_at||0)).slice(0,20);

const patternHealth={};
for(const r of latest){
  if(!r.pattern_id) continue;
  if(!patternHealth[r.pattern_id]) patternHealth[r.pattern_id]={
    pattern_id:r.pattern_id,tagged_exams:0,qualifying_ge_min_score:0,scores:[],productive_slots:[],
    collisions_total:0,no_allocation_workers:0,reproduced_successor_workers:0,visible_change_workers:0,low_waste_workers:0
  };
  const p=patternHealth[r.pattern_id];
  p.tagged_exams++; p.scores.push(r.score); p.productive_slots.push(r.productive_slots);
  if(r.score>=n(spec?.champion_policy?.champion_min_score||8)) p.qualifying_ge_min_score++;
  p.collisions_total+=r.collisions;
  if(r.no_allocation_count>0) p.no_allocation_workers++;
  if(r.reproduction) p.reproduced_successor_workers++;
  if(r.visible_change) p.visible_change_workers++;
  if(r.low_waste) p.low_waste_workers++;
}
for(const p of Object.values(patternHealth)){
  p.max_score=p.scores.length?Math.max(...p.scores):null;
  p.median_score=median(p.scores);
  p.median_productive_slots=median(p.productive_slots);
  p.avg_collisions=p.tagged_exams?Number((p.collisions_total/p.tagged_exams).toFixed(2)):null;
  p.no_allocation_rate=ratio(p.no_allocation_workers,p.tagged_exams);
  p.successor_reproduction_rate=ratio(p.reproduced_successor_workers,p.tagged_exams);
  p.visible_change_rate=ratio(p.visible_change_workers,p.tagged_exams);
  p.low_waste_rate=ratio(p.low_waste_workers,p.tagged_exams);
  p.status=p.tagged_exams<5?'SAMPLE_TOO_SMALL':p.qualifying_ge_min_score>=3?'REPRODUCIBLE':p.qualifying_ge_min_score>0?'PARTIAL_REPRODUCTION':'UNDERPERFORMING_SAMPLE';
  delete p.scores; delete p.productive_slots;
}

let activePatternId=null;
let patternCandidateId=null;
let patternCandidateStatus=null;
const patternCandidateRef=spec?.pattern_measurement?.historical_candidate_ref||spec?.pattern_measurement?.active_pattern_ref||null;
if(patternCandidateRef){
  const candidate=readJson(path.join(root,patternCandidateRef));
  patternCandidateId=candidate?.pattern_id||null;
  patternCandidateStatus=candidate?.status||null;
}
const activePatternRef=spec?.pattern_measurement?.active_pattern_ref||null;
if(activePatternRef){
  const active=readJson(path.join(root,activePatternRef));
  if(active?.status==='REPRODUCTION_ACTIVE_NOT_CHAMPION') activePatternId=active?.pattern_id||null;
}
const patternCandidateHealth=patternCandidateId?(patternHealth[patternCandidateId]||{pattern_id:patternCandidateId,tagged_exams:0,qualifying_ge_min_score:0,status:'NO_TAGGED_SAMPLE'}):null;
const activePatternHealth=activePatternId?(patternHealth[activePatternId]||{pattern_id:activePatternId,tagged_exams:0,qualifying_ge_min_score:0,status:'NO_TAGGED_SAMPLE'}):null;

const strategyExperimentId=strategyExperiment?.status==='ACTIVE_CANARY'?strategyExperiment?.experiment_id||null:null;
const strategyMinWorkers=n(strategyExperiment?.measurement?.min_independent_workers_per_variant||3);
const strategyWindow=[...rows]
  .filter(r=>strategyExperimentId&&r.experiment_id===strategyExperimentId&&r.experiment_enrolled===true)
  .sort((a,b)=>Date.parse(b.closed_at||0)-Date.parse(a.closed_at||0))
  .slice(0,60);
const strategyExperimentHealth=strategyExperimentId?{
  experiment_id:strategyExperimentId,status:'SAMPLE_BUILDING',applies_after:strategyExperiment?.applies_after||'OWNERSHIP',
  min_independent_workers_per_variant:strategyMinWorkers,enrolled_cards:strategyWindow.length,classes:{}
}:null;
if(strategyExperimentHealth){
  let anyReady=false;
  for(const [jobClass,def] of Object.entries(strategyExperiment?.classes||{})){
    const classOut={status:'SAMPLE_BUILDING',variants:{}};
    for(const variantDef of arr(def?.variants)){
      const variantId=variantDef?.id;
      const group=strategyWindow.filter(r=>r.job_class===jobClass&&r.strategy_variant===variantId);
      const eligible=group.filter(r=>r.experimental_productive_slots>0);
      const avg=fn=>eligible.length?Number((eligible.reduce((a,r)=>a+n(fn(r)),0)/eligible.length).toFixed(3)):null;
      classOut.variants[variantId]={
        enrolled_cards:group.length,
        independent_workers_with_experimental_slots:eligible.length,
        experimental_productive_slots_total:eligible.reduce((a,r)=>a+r.experimental_productive_slots,0),
        median_experimental_productive_slots:median(eligible.map(r=>r.experimental_productive_slots)),
        experimental_visible_change_worker_rate:ratio(eligible.filter(r=>r.experimental_visible_change).length,eligible.length),
        experimental_successor_worker_rate:ratio(eligible.filter(r=>r.experimental_reproduction).length,eligible.length),
        avg_experimental_project_breadth:avg(r=>r.experimental_project_breadth),
        end_to_end_score_median_context_only:median(eligible.map(r=>r.score)),
        preclaim_diagnostics:{
          avg_collisions:avg(r=>r.collisions),
          no_allocation_worker_rate:ratio(eligible.filter(r=>r.no_allocation_count>0).length,eligible.length),
          low_waste_worker_rate:ratio(eligible.filter(r=>r.low_waste).length,eligible.length),
          causal_for_variant:false
        },
        status:eligible.length>=strategyMinWorkers?'SAMPLE_READY':'SAMPLE_BUILDING'
      };
    }
    const variants=Object.entries(classOut.variants);
    const counts=Object.fromEntries(variants.map(([id,v])=>[id,v.independent_workers_with_experimental_slots]));
    const min=variants.length?Math.min(...variants.map(([,v])=>v.independent_workers_with_experimental_slots)):0;
    const under=variants.filter(([,v])=>v.independent_workers_with_experimental_slots===min).map(([id])=>id);
    classOut.assignment_hint={
      mode:'ADAPTIVE_MIN_SAMPLE_THEN_HASH_TIEBREAK',
      counts,
      underrepresented_variant:under.length===1?under[0]:null,
      tie:under.length!==1,
      causal_evidence_source:'EXPLICIT_EXAMS_WITH_EXPERIMENTAL_SLOTS_ONLY'
    };
    const vs=variants.map(([,v])=>v);
    classOut.status=vs.length>=2&&vs.every(v=>v.independent_workers_with_experimental_slots>=strategyMinWorkers)?'READY_FOR_GUIDE_COMPARISON':'SAMPLE_BUILDING';
    if(classOut.status==='READY_FOR_GUIDE_COMPARISON') anyReady=true;
    strategyExperimentHealth.classes[jobClass]=classOut;
  }
  strategyExperimentHealth.status=anyReady?'READY_FOR_GUIDE_COMPARISON':'SAMPLE_BUILDING';
  strategyExperimentHealth.causal_boundary='Post-ownership variant metrics use only explicit experimental slots. Derived launch measurements never become strategy causal evidence; preclaim diagnostics remain non-causal.';
}

const jobProject=new Map();
for(const p of walk(path.join(root,'coordination','portfolio','derived')).filter(x=>x.endsWith('.json'))){
  const d=readJson(p); if(d?.job_id) jobProject.set(d.job_id,d.project_id||null);
}
const portfolio=readJson(path.join(root,'coordination','portfolio','PORTFOLIO.json'))||{};
for(const project of arr(portfolio.projects)) for(const job of arr(project.jobs)) if(job?.job_id) jobProject.set(job.job_id,project.project_id||null);

const beaconByWorker=new Map();
for(const p of walk(path.join(root,'coordination','workers','beacons')).filter(x=>x.endsWith('.json'))){
  const d=readJson(p); if(!d?.worker_id) continue;
  beaconByWorker.set(d.worker_id,{doc:d,ref:repoRef(p)});
}
const launchClaimsByWorker=new Map();
const reallocationClaimsByWorker=new Map();
const runPackets=new Map();
for(const p of walk(path.join(root,'coordination','launch-packets')).filter(x=>x.endsWith('.json'))){
  const d=readJson(p); if(!d) continue;
  const ref=repoRef(p);
  if(path.basename(p)==='PACKET.json' && d.run_id){ runPackets.set(d.run_id,{doc:d,ref}); continue; }
  if(!d.worker_id||!d.run_id||!d.slot_id) continue;
  const row={doc:d,ref};
  if(ref.includes('/reallocation-claims/')) reallocationClaimsByWorker.set(d.worker_id,row);
  else if(ref.includes('/claims/')) launchClaimsByWorker.set(d.worker_id,row);
}
const benchmarkReceiptsByWorker=new Map();
for(const p of walk(path.join(root,'coordination','workers','benchmark-receipts')).filter(x=>x.endsWith('.json'))){
  const d=readJson(p); if(d?.worker_id) benchmarkReceiptsByWorker.set(d.worker_id,{doc:d,ref:repoRef(p)});
}
const noallocByWorker=new Map();
for(const p of walk(path.join(root,'coordination','workers','no-allocation')).filter(x=>x.endsWith('.json'))){
  const d=readJson(p); if(d?.worker_id) noallocByWorker.set(d.worker_id,{doc:d,ref:repoRef(p)});
}
const pinRefsByWorker=new Map();
for(const base of [path.join(root,'coordination','portfolio','pins'),path.join(root,'coordination','guide','pins')]){
  for(const p of walk(base).filter(x=>x.endsWith('.json'))){
    const d=readJson(p); if(!d?.worker_id) continue;
    const refs=pinRefsByWorker.get(d.worker_id)||[]; refs.push(repoRef(p)); pinRefsByWorker.set(d.worker_id,refs);
  }
}

const systemProjects=new Set(arr(growthPolicy?.value_budget?.system_multiplier_projects).filter(Boolean));
const productiveByWorker=new Map();
const NON_PRODUCTIVE=/(NO_ACTION|ROUTE_ABORTED|BOUNDARY|STALE|TRANSPORT|CANCELLED|CANCELED|CLAIM_LOST|CREATE_EXISTS|NO_ALLOCATION|BLOCKED)/;
function inferJobIdFromRef(ref){
  const m=String(ref||'').match(/coordination\/portfolio\/returns\/([^/]+)\//);
  return m?m[1]:null;
}
function unitValueClass(d,kind,ref){
  const explicit=String(d?.value_class||'').toUpperCase();
  if(['PRODUCT_VALUE','SYSTEM_MULTIPLIER','CONTROL_OVERHEAD','BOUNDARY'].includes(explicit)) return explicit;
  const jobId=d?.job_id||inferJobIdFromRef(ref);
  const projectId=d?.project_id||d?.scope_project_id||jobProject.get(jobId)||null;
  if(kind==='guide-receipt'){
    const reusable=arr(d?.created_jobs).filter(Boolean).length+arr(d?.spawn_candidates).filter(Boolean).length+arr(d?.consumed_returns).filter(Boolean).length>0;
    const outcome=String(d?.outcome||d?.status||d?.state||d?.summary||'').toUpperCase();
    return reusable || /(RATCHET|REPAIR|RESCUE|INTEGRAT|UNLOCK|FIX|FRONTIER)/.test(outcome) ? 'SYSTEM_MULTIPLIER' : 'CONTROL_OVERHEAD';
  }
  if(projectId && systemProjects.has(projectId)) return 'SYSTEM_MULTIPLIER';
  if(projectId) return 'PRODUCT_VALUE';
  return 'CONTROL_OVERHEAD';
}
function productiveUnit(d,kind,ref){
  if(!d?.worker_id || d.productive_unit_counted===false) return null;
  const outcome=String(d.outcome||d.status||d.state||'').toUpperCase();
  if(d.productive_unit_counted!==true && NON_PRODUCTIVE.test(outcome)) return null;
  const material=arr(d.changed_paths).filter(Boolean).length;
  const successors=arr(d.created_jobs).filter(Boolean).length+arr(d.spawn_candidates).filter(Boolean).length;
  const integrations=arr(d.consumed_returns).filter(Boolean).length;
  const tests=arr(d.tests).filter(Boolean).length;
  if(d.productive_unit_counted!==true && !material && !successors && !integrations && !tests) return null;
  return {
    ref,kind,at:timeOf(d),project_id:d.project_id||d.scope_project_id||jobProject.get(d.job_id||inferJobIdFromRef(ref))||null,
    value_class:unitValueClass(d,kind,ref),
    successor_count:successors,
    visible_change:d.visible_change===true
  };
}
for(const [base,kind] of [
  [path.join(root,'coordination','portfolio','returns'),'portfolio-return'],
  [path.join(root,'coordination','guide','receipts'),'guide-receipt']
]){
  for(const p of walk(base).filter(x=>x.endsWith('.json'))){
    const d=readJson(p); const unit=productiveUnit(d,kind,repoRef(p)); if(!unit) continue;
    const units=productiveByWorker.get(d.worker_id)||[]; units.push(unit); productiveByWorker.set(d.worker_id,units);
  }
}
for(const [workerId,row] of benchmarkReceiptsByWorker){
  const d=row.doc||{};
  const units=productiveByWorker.get(workerId)||[];
  if(d.primary_complete===true){
    units.push({ref:row.ref+'#primary',kind:'benchmark-primary',at:d.primary_completed_at||d.closed_at_or_null||d.updated_at||null,project_id:d.primary_project_id||'cat-lab',value_class:'PRODUCT_VALUE',successor_count:0,visible_change:true});
  }
  if(d.reallocation_complete===true){
    units.push({ref:row.ref+'#reallocation',kind:'benchmark-reallocation',at:d.reallocation_completed_at||d.closed_at_or_null||d.updated_at||null,project_id:d.reallocation_project_id||'dog-notes',value_class:'PRODUCT_VALUE',successor_count:0,visible_change:true});
  }
  productiveByWorker.set(workerId,units);
}
for(const units of productiveByWorker.values()) units.sort((a,b)=>Date.parse(a.at||0)-Date.parse(b.at||0)||a.ref.localeCompare(b.ref));

const launchMeasurements=[];
for(const [workerId,b] of beaconByWorker){
  const explicit=examByWorker.get(workerId)||null;
  const noalloc=noallocByWorker.get(workerId)||null;
  const pins=pinRefsByWorker.get(workerId)||[];
  const launchClaim=launchClaimsByWorker.get(workerId)||null;
  const reallocationClaim=reallocationClaimsByWorker.get(workerId)||null;
  const benchmarkReceipt=benchmarkReceiptsByWorker.get(workerId)||null;
  const units=productiveByWorker.get(workerId)||[];
  const authorityWon=pins.length>0 || noalloc?.doc?.authority_won===true || noalloc?.doc?.authority_acquired===true || !!launchClaim;
  let measurementState='BEACON_ONLY';
  if(explicit) measurementState='EXPLICIT_EXAM';
  else if(noalloc && authorityWon) measurementState='DERIVED_POSTCLAIM_BOUNDARY';
  else if(noalloc) measurementState='DERIVED_PRECLAIM_TERMINAL';
  else if(authorityWon || units.length || benchmarkReceipt) measurementState='DERIVED_DURABLE_ACTIVITY';
  const terminalClassified=!!explicit || !!noalloc || !!benchmarkReceipt?.doc?.closed_at_or_null;
  const protocolVersion=explicit?.protocol_version||b.doc?.canary_protocol||b.doc?.protocol_version||null;
  const poolId=explicit?.pool_id||b.doc?.pool_id||null;
  const poolResidency=classifyPoolResidency({
    protocol_version:protocolVersion,
    pool_id:poolId,
    explicit_exam:!!explicit,
    productive_units:units.length,
    close_reason:explicit?.close_reason||null,
    close_evidence_refs:explicit?.close_evidence_refs||[]
  });
  launchMeasurements.push({
    worker_id:workerId,
    batch_id:b.doc?.batch_id||null,
    run_id:launchClaim?.doc?.run_id||benchmarkReceipt?.doc?.run_id||b.doc?.run_id||null,
    slot_id:launchClaim?.doc?.slot_id||benchmarkReceipt?.doc?.slot_id||null,
    evolution_variant:launchClaim?.doc?.evolution_variant||benchmarkReceipt?.doc?.evolution_variant||null,
    reallocation_slot_id:reallocationClaim?.doc?.slot_id||benchmarkReceipt?.doc?.reallocation_slot_id||null,
    primary_complete:benchmarkReceipt?.doc?.primary_complete===true,
    reallocation_complete:benchmarkReceipt?.doc?.reallocation_complete===true,
    benchmark_receipt_ref:benchmarkReceipt?.ref||null,
    pool_id:poolId,
    protocol_version:protocolVersion,
    launched_at:b.doc?.launched_at||b.doc?.observed_at||b.doc?.created_at||null,
    fresh_launch:b.doc?.fresh_launch===true,
    beacon_launch_nonce:b.doc?.launch_nonce||null,
    exam_launch_nonce:explicit?.launch_nonce||null,
    fresh_launch_integrity:(String(explicit?.protocol_version||b.doc?.canary_protocol||b.doc?.protocol_version||'')==='v3.30') ? (b.doc?.fresh_launch===true && !!b.doc?.launch_nonce && (!explicit || explicit.launch_nonce===b.doc.launch_nonce)) : null,
    measurement_state:measurementState,
    terminal_classified:terminalClassified,
    explicit_exam:!!explicit,
    authority_won:authorityWon,
    no_allocation:!!noalloc,
    no_allocation_reason:noalloc?.doc?.reason||null,
    productive_units:units.length,
    pool_residency:poolResidency,
    product_value_units:units.filter(u=>u.value_class==='PRODUCT_VALUE').length,
    system_multiplier_units:units.filter(u=>u.value_class==='SYSTEM_MULTIPLIER').length,
    control_overhead_units:units.filter(u=>u.value_class==='CONTROL_OVERHEAD').length,
    boundary_units:units.filter(u=>u.value_class==='BOUNDARY').length,
    pin_count:pins.length,
    launch_slot_ref:launchClaim?.ref||null,
    reallocation_slot_ref:reallocationClaim?.ref||null,
    beacon_ref:b.ref,
    no_allocation_ref:noalloc?.ref||null,
    exam_ref:explicit?.exam_ref||null,
    causal_strategy_eligible:!!explicit && explicit.experiment_enrolled===true && explicit.experimental_productive_slots>0
  });
}
launchMeasurements.sort((a,b)=>Date.parse(b.launched_at||0)-Date.parse(a.launched_at||0)||a.worker_id.localeCompare(b.worker_id));
const launchWindowSize=n(growthPolicy?.automatic_launch_measurement?.window_launches||20)||20;
const latestLaunches=launchMeasurements.slice(0,launchWindowSize);
const latestWorkerIds=new Set(latestLaunches.map(x=>x.worker_id));
const latestUnits=[...productiveByWorker.entries()].filter(([wid])=>latestWorkerIds.has(wid)).flatMap(([,units])=>units);
const productUnits=latestUnits.filter(u=>u.value_class==='PRODUCT_VALUE').length;
const multiplierUnits=latestUnits.filter(u=>u.value_class==='SYSTEM_MULTIPLIER').length;
const overheadUnits=latestUnits.filter(u=>u.value_class==='CONTROL_OVERHEAD').length;
const boundaryUnits=latestUnits.filter(u=>u.value_class==='BOUNDARY').length;
const explicitLatest=latestLaunches.map(x=>examByWorker.get(x.worker_id)).filter(Boolean);
const growthHealth={
  window_launches:latestLaunches.length,
  launch_observation_coverage:latestLaunches.length?1:null,
  terminal_classification_rate:ratio(latestLaunches.filter(x=>x.terminal_classified).length,latestLaunches.length),
  explicit_exam_rate:ratio(latestLaunches.filter(x=>x.explicit_exam).length,latestLaunches.length),
  authority_rate:ratio(latestLaunches.filter(x=>x.authority_won).length,latestLaunches.length),
  productive_worker_rate:ratio(latestLaunches.filter(x=>x.productive_units>0).length,latestLaunches.length),
  productive_units_per_launch:latestLaunches.length?Number((latestUnits.length/latestLaunches.length).toFixed(3)):null,
  productive_units_total:latestUnits.length,
  capability_mismatch_rate:ratio(latestLaunches.filter(x=>String(x.no_allocation_reason||'').toUpperCase().startsWith('CAPABILITY_MISMATCH')).length,latestLaunches.length),
  product_value_units:productUnits,
  system_multiplier_units:multiplierUnits,
  control_overhead_units:overheadUnits,
  boundary_units:boundaryUnits,
  product_value_unit_share:ratio(productUnits,latestUnits.length),
  system_multiplier_unit_share:ratio(multiplierUnits,latestUnits.length),
  control_overhead_unit_share:ratio(overheadUnits,latestUnits.length),
  control_overhead_soft_max_share:n(growthPolicy?.value_budget?.control_overhead_soft_max_share||0.15),
  control_overhead_budget_state:latestUnits.length && ratio(overheadUnits,latestUnits.length)>n(growthPolicy?.value_budget?.control_overhead_soft_max_share||0.15)?'PRESSURE':'OK',
  visible_change_worker_rate_explicit_only:ratio(explicitLatest.filter(x=>x.visible_change).length,explicitLatest.length),
  successor_worker_rate_explicit_only:ratio(explicitLatest.filter(x=>x.reproduction).length,explicitLatest.length),
  causal_boundary:'Launch funnel/value metrics may use derived durable evidence; strategy A/B causal metrics remain explicit-exam-only.'
};
const v330Launches=launchMeasurements.filter(x=>x.protocol_version==='v3.30');
const v330DistinctWorkers=new Set(v330Launches.map(x=>x.worker_id)).size;
const v330NonceMismatch=v330Launches.filter(x=>x.explicit_exam && x.exam_launch_nonce!==x.beacon_launch_nonce).length;
const v330MissingFreshBeacon=v330Launches.filter(x=>x.fresh_launch!==true || !x.beacon_launch_nonce).length;
const v330PoolResidencyFailures=v330Launches.filter(x=>poolResidencyFailure(x.pool_residency));
const v330SmokeConforming=v330Launches.filter(x=>
  x.fresh_launch_integrity===true &&
  !poolResidencyFailure(x.pool_residency)
);
const v330ConformingDistinctWorkers=new Set(v330SmokeConforming.map(x=>x.worker_id)).size;
const poolResidencyIntegrity={
  policy_ref:'coordination/workers/WORKER_FRESH_LAUNCH_POLICY_V1.json#productive_smoke',
  protocol_version:'v3.30',
  checkpoint_productive_units:3,
  target_productive_units:6,
  hard_cap_productive_units:8,
  pooled_launches:v330Launches.filter(x=>x.pool_id).length,
  unjustified_early_terminal_count:v330PoolResidencyFailures.length,
  unjustified_early_terminal_workers:v330PoolResidencyFailures.map(x=>x.worker_id),
  rule:'Active/derived launches are not failures. An explicit v3.30 POOL exam below target 6 must name an allowed real close_reason and at least one durable close_evidence_ref.'
};
const freshLaunchIntegrity={
  policy_ref:'coordination/workers/WORKER_FRESH_LAUNCH_POLICY_V1.json',
  protocol_version:'v3.30',
  required_distinct_fresh_workers:3,
  observed_distinct_fresh_workers:v330DistinctWorkers,
  conforming_distinct_fresh_workers:v330ConformingDistinctWorkers,
  v330_launch_rows:v330Launches.length,
  explicit_exam_nonce_mismatches:v330NonceMismatch,
  missing_fresh_beacon_marker_or_nonce:v330MissingFreshBeacon,
  residency_integrity_failures:v330PoolResidencyFailures.length,
  status:(v330ConformingDistinctWorkers>=3)?'SMOKE_PASS':'SMOKE_BUILDING',
  replay_guard:'Historical terminal artifacts never substitute for a current launch; PASS requires three fresh v3.30 workers with nonce integrity and no unjustified early POOL terminal.'
};

const measurementCoverage={
  total_beacons:launchMeasurements.length,
  launch_rows:launchMeasurements.length,
  launch_observation_coverage:launchMeasurements.length?1:null,
  explicit_exams:launchMeasurements.filter(x=>x.explicit_exam).length,
  terminal_classified:launchMeasurements.filter(x=>x.terminal_classified).length,
  terminal_classification_rate:ratio(launchMeasurements.filter(x=>x.terminal_classified).length,launchMeasurements.length),
  derived_rows:launchMeasurements.filter(x=>!x.explicit_exam).length,
  truth_boundary:'Every durable beacon gets a launch row; derived rows never fabricate worker-authored exam or strategy evidence.'
};

const reproductionCounts={};
const minScore=n(spec?.champion_policy?.champion_min_score||8);
for(const r of latest){
  if(r.score<minScore) continue;
  const key=r.pattern_id?('pattern:'+r.pattern_id):r.protocol_version?('protocol:'+r.protocol_version):'legacy:UNKNOWN';
  reproductionCounts[key]=(reproductionCounts[key]||0)+1;
}
const leader=rows[0]||null;
const minRep=3;
const winningKey=Object.entries(reproductionCounts).filter(([key,count])=>key.startsWith('pattern:')&&count>=minRep).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]||null;
const champion=winningKey?rows.find(r=>r.pattern_id&&('pattern:'+r.pattern_id)===winningKey&&r.score>=minScore)||null:null;

const pipelineStageOrder=['E0_ENVELOPE','E1_IDENTITY','E2_ASSIGN','E3_CONTEXT','E4_PLAN_LOCK','E5_PRODUCE','E6_VERIFY','E7_RETURN','E8_REALLOCATE','E9_EXAM_CLOSE'];
const launchRuns=[...runPackets.entries()].map(([runId,p])=>{
  const primary=[...launchClaimsByWorker.values()].filter(x=>x.doc?.run_id===runId);
  const realloc=[...reallocationClaimsByWorker.values()].filter(x=>x.doc?.run_id===runId);
  const receipts=[...benchmarkReceiptsByWorker.values()].filter(x=>x.doc?.run_id===runId);
  const beacons=[...beaconByWorker.values()].filter(x=>x.doc?.run_id===runId);
  const slots=arr(p.doc?.slots);
  const slotOwnerIds=new Set(primary.map(x=>x.doc?.slot_id).filter(Boolean));
  const byWorker={};
  for(const x of primary){(byWorker[x.doc.worker_id]??=[]).push(x.doc.slot_id);}
  const firstNonPass=d=>{
    const trace=d?.stage_trace||{};
    for(const id of pipelineStageOrder){
      const st=String(trace?.[id]?.status||'NOT_REACHED');
      if(st!=='PASS') return {stage:id,status:st,failure_code:trace?.[id]?.failure_code||null};
    }
    return null;
  };
  const variants={};
  for(const slot of slots){
    const id=slot.evolution_variant||'UNSPECIFIED';
    variants[id]??={slots_total:0,slots_claimed:0,receipts:0,primary_complete:0,reallocation_complete:0,hard_gate_pass_counts:[],wall_clock_seconds:[],first_non_pass:{}};
    variants[id].slots_total++;
  }
  for(const x of primary){
    const id=x.doc?.evolution_variant||'UNSPECIFIED';
    variants[id]??={slots_total:0,slots_claimed:0,receipts:0,primary_complete:0,reallocation_complete:0,hard_gate_pass_counts:[],wall_clock_seconds:[],first_non_pass:{}};
    variants[id].slots_claimed++;
  }
  for(const x of receipts){
    const d=x.doc||{}; const id=d.evolution_variant||'UNSPECIFIED';
    variants[id]??={slots_total:0,slots_claimed:0,receipts:0,primary_complete:0,reallocation_complete:0,hard_gate_pass_counts:[],wall_clock_seconds:[],first_non_pass:{}};
    const v=variants[id]; v.receipts++;
    if(d.primary_complete===true) v.primary_complete++;
    if(d.reallocation_complete===true) v.reallocation_complete++;
    const gates=Object.values(d.hard_gates||{});
    v.hard_gate_pass_counts.push(gates.filter(x=>String(x?.status||x)==='PASS').length);
    if(Number.isFinite(Number(d.wall_clock_seconds))) v.wall_clock_seconds.push(Number(d.wall_clock_seconds));
    const np=firstNonPass(d); if(np){const key=np.stage+':'+np.status+(np.failure_code?':'+np.failure_code:'');v.first_non_pass[key]=(v.first_non_pass[key]||0)+1;}
  }
  for(const v of Object.values(variants)){
    v.primary_completion_rate=ratio(v.primary_complete,v.slots_total);
    v.reallocation_completion_rate=ratio(v.reallocation_complete,v.slots_total);
    v.median_hard_gate_pass_count=median(v.hard_gate_pass_counts);
    v.median_wall_clock_seconds=median(v.wall_clock_seconds);
    delete v.hard_gate_pass_counts; delete v.wall_clock_seconds;
  }
  return {
    run_id:runId,status:p.doc?.status||null,packet_ref:p.ref,
    slots_total:slots.length,slots_claimed:slotOwnerIds.size,slots_unclaimed:Math.max(0,slots.length-slotOwnerIds.size),
    workers_beaconed:new Set(beacons.map(x=>x.doc.worker_id)).size,
    primary_complete:new Set(receipts.filter(x=>x.doc?.primary_complete===true).map(x=>x.doc.worker_id)).size,
    reallocation_complete:new Set(receipts.filter(x=>x.doc?.reallocation_complete===true).map(x=>x.doc.worker_id)).size,
    workers_with_multiple_primary_slots:Object.entries(byWorker).filter(([,ids])=>ids.length>1).map(([wid])=>wid),
    variants,
    automatic_winner:false,
    truth_boundary:'Variant metrics are descriptive exploration evidence. n=2 per variant cannot auto-promote a pipeline law.'
  };
});

const out={
  schema:'prometeo.worker-scoreboard/v1',
  generated_at:new Date().toISOString(),
  source_exam_count:rows.length,
  source_beacon_count:launchMeasurements.length,
  scoring:'WORKER_PRODUCTIVITY_EXAM_V1',
  leader,
  champion_candidate:leader,
  champion,
  champion_reproducible:!!champion,
  champion_pattern_id:champion?.pattern_id||null,
  top:rows.slice(0,20),
  latest20:latest,
  launch_measurements:latestLaunches,
  launch_runs:launchRuns,
  measurement_coverage:measurementCoverage,
  fresh_launch_integrity:freshLaunchIntegrity,
  pool_residency_integrity:poolResidencyIntegrity,
  growth_health:growthHealth,
  reproduction_counts:reproductionCounts,
  protocol_reproduction_counts:reproductionCounts,
  pattern_health:patternHealth,
  pattern_candidate_id:patternCandidateId,
  pattern_candidate_status:patternCandidateStatus,
  pattern_candidate_health:patternCandidateHealth,
  active_pattern_id:activePatternId,
  active_pattern_health:activePatternHealth,
  strategy_experiment_id:strategyExperimentId,
  strategy_experiment_status:strategyExperiment?.status||null,
  strategy_experiment_health:strategyExperimentHealth,
  note:'Observability only. Launch-packet RUN metrics expose exact slot denominators and stage-level benchmark evidence without granting authority. Every beacon receives a derived launch row; v3.30 fresh-launch and pooled-residency integrity are tracked separately, and only explicit worker exams can supply causal strategy evidence. Global score remains end-to-end; strategy_experiment_health is class-local post-ownership evidence. Product/system/control value classes are routing/measurement aids, not Human Acceptance or Served authority.'
};
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({
  ok:true,exams:rows.length,beacons:launchMeasurements.length,
  leader:leader?{worker_id:leader.worker_id,score:leader.score}:null,
  champion:champion?{worker_id:champion.worker_id,score:champion.score,pattern_id:champion.pattern_id}:null,
  growth_health:growthHealth
}));
