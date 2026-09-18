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
const activePatternRef=spec?.pattern_measurement?.active_pattern_ref;
if(activePatternRef){
  const ap=readJson(path.join(root,activePatternRef));
  activePatternId=ap?.pattern_id||null;
}
const activePatternHealth=activePatternId ? (patternHealth[activePatternId]||{
  pattern_id:activePatternId,tagged_exams:0,qualifying_ge_min_score:0,status:'NO_TAGGED_SAMPLE'
}) : null;
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
  active_pattern_id:activePatternId,
  active_pattern_health:activePatternHealth,
  note:'Observability only. leader/champion_candidate is the best observed card; champion stays null until a non-null pattern_id is independently reproduced by >=3 workers at score >=8. pattern_health makes failed/partial reproduction explicit instead of forcing Guide to infer it from raw cards. Verbosity never adds points.'
};
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,count:rows.length,leader:leader?{worker_id:leader.worker_id,score:leader.score}:null,champion:champion?{worker_id:champion.worker_id,score:champion.score,pattern_id:champion.pattern_id}:null}));
