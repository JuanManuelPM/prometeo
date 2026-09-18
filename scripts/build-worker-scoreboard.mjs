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
const reproducibleChampions={};
for(const r of latest){
  const v=r.protocol_version||'UNKNOWN';
  if(r.score>=Number(spec?.champion_policy?.champion_min_score||8)) reproducibleChampions[v]=(reproducibleChampions[v]||0)+1;
}
const champion=rows[0]||null;
const out={
  schema:'prometeo.worker-scoreboard/v1',
  generated_at:new Date().toISOString(),
  source_exam_count:rows.length,
  scoring:'WORKER_PRODUCTIVITY_EXAM_V1',
  champion,
  champion_reproducible:champion ? (reproducibleChampions[champion.protocol_version||'UNKNOWN']||0)>=3 : false,
  top:rows.slice(0,20),
  latest20:latest,
  protocol_reproduction_counts:reproducibleChampions,
  note:'Observability only. Scores compare evidence-backed useful work; verbosity is diagnostic and never adds points.'
};
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,count:rows.length,champion:champion?{worker_id:champion.worker_id,score:champion.score}:null}));
