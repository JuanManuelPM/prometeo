import fs from 'node:fs';
import path from 'node:path';

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
const spec=readJson(path.join(root,'coordination','workers','WORKER_PRODUCTIVITY_EXAM_V1.json'))||{};
const files=walk(path.join(root,'coordination','workers','exams')).filter(p=>p.endsWith('.json'));
const rows=[];
for(const p of files){
  const d=readJson(p); if(!d?.worker_id) continue;
  const slots=Array.isArray(d.slots)?d.slots:[];
  const valid=slots.filter(s=>s && s.evidence_ref && ['MUTATION','VERIFICATION','INTEGRATION','GUIDE_FRONTIER'].includes(String(s.kind||'')));
  const productive=Math.min(6,valid.length);
  const experimentalValid=valid.filter(s=>s.experimental_slot===true);
  const experimentalProjects=[...new Set(experimentalValid.map(s=>s.project_id).filter(Boolean))];
  const visible=valid.some(s=>s.visible_change===true)?1:0;
  const reproduction=valid.some(s=>Number(s.successors_created||0)>0)?1:0;
  const productProjects=[...new Set((Array.isArray(d.projects_touched)?d.projects_touched:[]).filter(Boolean).filter(x=>!['prometeo-live','prometeo-autonomous-growth'].includes(x)))];
  const breadth=productProjects.length>=2?1:0;
  const lowWaste=Number(d.no_allocation_count||0)===0 && Number(d.collisions||0)<=1 ? 1:0;
  const score=productive+visible+reproduction+breadth+lowWaste;
  rows.push({
    worker_id:d.worker_id,
    batch_id:d.batch_id||null,
    protocol_version:d.protocol_version||null,
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
    collisions:Number(d.collisions||0),
    no_allocation_count:Number(d.no_allocation_count||0),
    changed_paths_total:valid.reduce((a,s)=>a+Number(s.changed_paths_count||0),0),
    tests_total:valid.reduce((a,s)=>a+Number(s.tests_count||0),0),
    successors_total:valid.reduce((a,s)=>a+Number(s.successors_created||0),0),
    experimental_productive_slots:experimentalValid.length,
    experimental_visible_change:experimentalValid.some(s=>s.visible_change===true),
    experimental_reproduction:experimentalValid.some(s=>Number(s.successors_created||0)>0),
    experimental_project_breadth:experimentalProjects.length,
    summary_word_count:Number(d.summary_word_count||0),
    wall_clock_seconds:Number(d.wall_clock_seconds||0)||null,
    exam_ref:path.relative(root,p).split(path.sep).join('/')
  });
}
rows.sort((a,b)=>b.score-a.score || (b.productive_slots-a.productive_slots) || String(a.closed_at||'').localeCompare(String(b.closed_at||'')));
const latest=[...rows].sort((a,b)=>Date.parse(b.closed_at||0)-Date.parse(a.closed_at||0)).slice(0,20);
const median=vals=>{
  const a=vals.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length) return null;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
};
const patternHealth={};
for(const r of latest){
  if(!r.pattern_id) continue;
  if(!patternHealth[r.pattern_id]) patternHealth[r.pattern_id]={
    pattern_id:r.pattern_id,
    tagged_exams:0,
    qualifying_ge_min_score:0,
    scores:[],
    productive_slots:[],
    collisions_total:0,
    no_allocation_workers:0,
    reproduced_successor_workers:0,
    visible_change_workers:0,
    low_waste_workers:0
  };
  const p=patternHealth[r.pattern_id];
  p.tagged_exams++;
  p.scores.push(r.score);
  p.productive_slots.push(r.productive_slots);
  if(r.score>=Number(spec?.champion_policy?.champion_min_score||8)) p.qualifying_ge_min_score++;
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
  p.no_allocation_rate=p.tagged_exams?Number((p.no_allocation_workers/p.tagged_exams).toFixed(3)):null;
  p.successor_reproduction_rate=p.tagged_exams?Number((p.reproduced_successor_workers/p.tagged_exams).toFixed(3)):null;
  p.visible_change_rate=p.tagged_exams?Number((p.visible_change_workers/p.tagged_exams).toFixed(3)):null;
  p.low_waste_rate=p.tagged_exams?Number((p.low_waste_workers/p.tagged_exams).toFixed(3)):null;
  p.status=p.tagged_exams<5?'SAMPLE_TOO_SMALL'
    :p.qualifying_ge_min_score>=3?'REPRODUCIBLE'
    :p.qualifying_ge_min_score>0?'PARTIAL_REPRODUCTION'
    :'UNDERPERFORMING_SAMPLE';
  delete p.scores;
  delete p.productive_slots;
}
let activePatternId=null;
let patternCandidateId=null;
let patternCandidateStatus=null;
const patternCandidateRef=spec?.pattern_measurement?.historical_candidate_ref||spec?.pattern_measurement?.active_pattern_ref||null;
if(patternCandidateRef){const candidate=readJson(path.join(root,patternCandidateRef));patternCandidateId=candidate?.pattern_id||null;patternCandidateStatus=candidate?.status||null;}
const activePatternRef=spec?.pattern_measurement?.active_pattern_ref||null;
if(activePatternRef){const active=readJson(path.join(root,activePatternRef));if(active?.status==='REPRODUCTION_ACTIVE_NOT_CHAMPION')activePatternId=active?.pattern_id||null;}
const patternCandidateHealth=patternCandidateId?(patternHealth[patternCandidateId]||{pattern_id:patternCandidateId,tagged_exams:0,qualifying_ge_min_score:0,status:'NO_TAGGED_SAMPLE'}):null;
const activePatternHealth=activePatternId?(patternHealth[activePatternId]||{pattern_id:activePatternId,tagged_exams:0,qualifying_ge_min_score:0,status:'NO_TAGGED_SAMPLE'}):null;

const activeStrategyRef=spec?.strategy_measurement?.active_experiment_ref||null;
const strategyExperiment=activeStrategyRef?readJson(path.join(root,activeStrategyRef)):null;
const strategyExperimentId=strategyExperiment?.status==='ACTIVE_CANARY'?strategyExperiment?.experiment_id||null:null;
const strategyMinWorkers=Number(strategyExperiment?.measurement?.min_independent_workers_per_variant||3);
const strategyWindow=[...rows].filter(r=>strategyExperimentId&&r.experiment_id===strategyExperimentId&&r.experiment_enrolled===true).sort((a,b)=>Date.parse(b.closed_at||0)-Date.parse(a.closed_at||0)).slice(0,60);
const strategyExperimentHealth=strategyExperimentId?{experiment_id:strategyExperimentId,status:'SAMPLE_BUILDING',applies_after:strategyExperiment?.applies_after||'OWNERSHIP',min_independent_workers_per_variant:strategyMinWorkers,enrolled_cards:strategyWindow.length,classes:{}}:null;
if(strategyExperimentHealth){
 let anyReady=false;
 for(const [jobClass,def] of Object.entries(strategyExperiment?.classes||{})){
  const classOut={status:'SAMPLE_BUILDING',variants:{}};
  for(const variantDef of (def?.variants||[])){
   const variantId=variantDef?.id;
   const group=strategyWindow.filter(r=>r.job_class===jobClass&&r.strategy_variant===variantId);
   const eligible=group.filter(r=>r.experimental_productive_slots>0);
   const avg=fn=>eligible.length?Number((eligible.reduce((a,r)=>a+Number(fn(r)||0),0)/eligible.length).toFixed(3)):null;
   classOut.variants[variantId]={enrolled_cards:group.length,independent_workers_with_experimental_slots:eligible.length,experimental_productive_slots_total:eligible.reduce((a,r)=>a+r.experimental_productive_slots,0),median_experimental_productive_slots:median(eligible.map(r=>r.experimental_productive_slots)),experimental_visible_change_worker_rate:eligible.length?Number((eligible.filter(r=>r.experimental_visible_change).length/eligible.length).toFixed(3)):null,experimental_successor_worker_rate:eligible.length?Number((eligible.filter(r=>r.experimental_reproduction).length/eligible.length).toFixed(3)):null,avg_experimental_project_breadth:avg(r=>r.experimental_project_breadth),end_to_end_score_median_context_only:median(eligible.map(r=>r.score)),preclaim_diagnostics:{avg_collisions:avg(r=>r.collisions),no_allocation_worker_rate:eligible.length?Number((eligible.filter(r=>r.no_allocation_count>0).length/eligible.length).toFixed(3)):null,low_waste_worker_rate:eligible.length?Number((eligible.filter(r=>r.low_waste).length/eligible.length).toFixed(3)):null,causal_for_variant:false},status:eligible.length>=strategyMinWorkers?'SAMPLE_READY':'SAMPLE_BUILDING'};
  }
  const vs=Object.values(classOut.variants);classOut.status=vs.length>=2&&vs.every(v=>v.independent_workers_with_experimental_slots>=strategyMinWorkers)?'READY_FOR_GUIDE_COMPARISON':'SAMPLE_BUILDING';if(classOut.status==='READY_FOR_GUIDE_COMPARISON')anyReady=true;strategyExperimentHealth.classes[jobClass]=classOut;
 }
 strategyExperimentHealth.status=anyReady?'READY_FOR_GUIDE_COMPARISON':'SAMPLE_BUILDING';
 strategyExperimentHealth.causal_boundary='Post-ownership variant metrics are separated from preclaim collision/no-allocation diagnostics; no automatic cross-class winner.';
}
const reproductionCounts={};
const minScore=Number(spec?.champion_policy?.champion_min_score||8);
for(const r of latest){
  if(r.score<minScore) continue;
  const key=r.pattern_id ? `pattern:${r.pattern_id}` : r.protocol_version ? `protocol:${r.protocol_version}` : 'legacy:UNKNOWN';
  reproductionCounts[key]=(reproductionCounts[key]||0)+1;
}
const leader=rows[0]||null;
const minRep=3;
const winningKey=Object.entries(reproductionCounts)
  .filter(([key,count])=>key.startsWith('pattern:') && count>=minRep)
  .sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))[0]?.[0]||null;
const champion=winningKey
  ? rows.find(r=>r.pattern_id && `pattern:${r.pattern_id}`===winningKey && r.score>=minScore) || null
  : null;
const out={
  schema:'prometeo.worker-scoreboard/v1',
  generated_at:new Date().toISOString(),
  source_exam_count:rows.length,
  scoring:'WORKER_PRODUCTIVITY_EXAM_V1',
  leader,
  champion_candidate:leader,
  champion,
  champion_reproducible:!!champion,
  champion_pattern_id:champion?.pattern_id||null,
  top:rows.slice(0,20),
  latest20:latest,
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
  note:'Observability only. Global score is end-to-end; strategy_experiment_health compares only post-ownership experimental slots within job class and publishes collisions/no-allocation separately as non-causal preclaim diagnostics. Retired pattern evidence is preserved without making it active. Verbosity never adds points.'
};
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,count:rows.length,leader:leader?{worker_id:leader.worker_id,score:leader.score}:null,champion:champion?{worker_id:champion.worker_id,score:champion.score,pattern_id:champion.pattern_id}:null}));
