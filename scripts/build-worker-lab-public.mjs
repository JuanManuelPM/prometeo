import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const outPath=path.resolve(process.argv[3]||path.join(root,'current-tree','control-v11','worker-lab','data.json'));
const readJson=rel=>{
  try{return JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));}catch{return null;}
};
const listJson=rel=>{
  const dir=path.join(root,rel);
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort().map(name=>({
    name,
    doc:readJson(path.join(rel,name))
  })).filter(x=>x.doc);
};
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const uniq=xs=>[...new Set(xs.filter(Boolean))];

const history=readJson('coordination/workers/WORKER_LAB_HISTORY_V1.json')||{};
const playbook=readJson('coordination/workers/WORKER_PLAYBOOK_DISTILLATION_V1.json')||{};
const capacity=readJson('coordination/workers/WORKER_LOCAL_CAPACITY_V2_10X_CHECKPOINT.json')||{};
const evolution=readJson('coordination/workers/WORKER_EVOLUTION_LAB_V1.json')||{};
const io=readJson('coordination/workers/WORKER_IO_ACCOUNTING_CANDIDATE_V1.json')||{};
const packet=readJson('coordination/launch-packets/RESIDENCY-MACROBATCH-01/PACKET.json')||{};

const claims=listJson('coordination/launch-packets/RESIDENCY-MACROBATCH-01/claims');
const midpoints=listJson('coordination/workers/benchmark-midpoints/RESIDENCY-MACROBATCH-01');
const receipts=listJson('coordination/workers/benchmark-receipts/RESIDENCY-MACROBATCH-01');
const reallocClaims=listJson('coordination/launch-packets/RESIDENCY-MACROBATCH-01/reallocation-claims');
const exams=listJson('coordination/workers/exams').filter(x=>x.doc?.run_id==='RESIDENCY-MACROBATCH-01');

const slots=Array.isArray(packet.slots)?packet.slots:[];
const slotById=new Map(slots.map(s=>[s.slot_id,s]));
const claimSlotIds=new Set(claims.map(x=>x.doc?.slot_id||path.basename(x.name,'.json')));
const receiptByWorker=new Map(receipts.filter(x=>x.doc?.worker_id).map(x=>[x.doc.worker_id,x.doc]));
const primaryWorkers=uniq(receipts.filter(x=>x.doc?.primary_complete===true).map(x=>x.doc.worker_id));
const reallocWorkers=uniq(receipts.filter(x=>x.doc?.reallocation_complete===true).map(x=>x.doc.worker_id));
const terminalWorkers=uniq(exams.map(x=>x.doc?.worker_id).filter(id=>receiptByWorker.get(id)?.reallocation_complete===true));

const variantMap={};
for(const slot of slots){
  const id=slot.benchmark_variant_id||slot.evolution_variant||'UNSPECIFIED';
  variantMap[id]??={slots_total:0,slots_claimed:0,primary_complete:0,reallocation_complete:0};
  variantMap[id].slots_total++;
  if(claimSlotIds.has(slot.slot_id)) variantMap[id].slots_claimed++;
}
for(const row of receipts){
  const id=row.doc?.benchmark_variant_id||row.doc?.evolution_variant||'UNSPECIFIED';
  variantMap[id]??={slots_total:0,slots_claimed:0,primary_complete:0,reallocation_complete:0};
  if(row.doc?.primary_complete===true) variantMap[id].primary_complete++;
  if(row.doc?.reallocation_complete===true) variantMap[id].reallocation_complete++;
}

const currentRun={
  run_id:packet.run_id||'RESIDENCY-MACROBATCH-01',
  packet_status:packet.status||'UNKNOWN',
  slots_total:slots.length,
  slots_claimed:claimSlotIds.size,
  slots_unclaimed:Math.max(0,slots.length-claimSlotIds.size),
  midpoints:midpoints.length,
  primary_complete:primaryWorkers.length,
  reallocation_claims:reallocClaims.length,
  reallocation_complete:reallocWorkers.length,
  terminal:terminalWorkers.length,
  variants:variantMap,
  latest_receipts:receipts.map(x=>({
    worker_id:x.doc.worker_id||null,
    slot_id:x.doc.slot_id||null,
    benchmark_variant_id:x.doc.benchmark_variant_id||null,
    primary_complete:x.doc.primary_complete===true,
    reallocation_complete:x.doc.reallocation_complete===true,
    useful_output_words:x.doc?.feature_evidence?.M02_PRIMARY?.useful_output_words??x.doc?.primary_bundle?.useful_output_words??null
  })),
  human_invocation:packet.human_invocation||null,
  truth_boundary:'Counts derive from main-branch RUN claims/midpoints/receipts/exams at build time. Public status may become newer after this projection.'
};

const selfDur=Array.isArray(capacity.self_reported_duration_seconds)?capacity.self_reported_duration_seconds.map(Number).filter(Number.isFinite):[];
const wordRange=Array.isArray(capacity.total_output_words_range)?capacity.total_output_words_range:[null,null];
const currentWordCounts=currentRun.latest_receipts.map(x=>Number(x.useful_output_words)).filter(Number.isFinite);

const projection={
  schema:'prometeo.worker-lab-public/v1',
  status:'NON_AUTHORITATIVE_PUBLIC_PROJECTION',
  generated_at:new Date().toISOString(),
  title:'Worker Lab',
  thesis:'Medir al worker completo: admisión, trabajo local, calidad, I/O, residencia, reallocation, recuperación y síntesis. Una métrica aislada no decide.',
  authority_boundary:'Observability/learning only. Binding contracts, atomic claims, Work Graph and Design DNA remain authority.',
  capacity:{
    local_capacity_v2:{
      requested_replicas:capacity.replicas_expected??null,
      recovered_complete:capacity.replicas_recovered_complete??null,
      output_words_range:wordRange,
      output_words_midpoint:(Number(wordRange[0])+Number(wordRange[1]))/2 || null,
      internal_corrections_range:capacity.internal_corrections_range||null,
      self_reported_duration_seconds_range:selfDur.length?[Math.min(...selfDur),Math.max(...selfDur)]:null,
      self_reported_duration_mean_seconds:selfDur.length?mean(selfDur):null,
      timing_authority:'MODEL_SELF_REPORT_DIAGNOSTIC_ONLY'
    },
    current_run_words:{
      observations:currentWordCounts.length,
      min:currentWordCounts.length?Math.min(...currentWordCounts):null,
      max:currentWordCounts.length?Math.max(...currentWordCounts):null,
      mean:currentWordCounts.length?mean(currentWordCounts):null
    }
  },
  evolution:{
    phase:evolution.phase||evolution.status||null,
    promoted_baseline:evolution?.graduation?.baseline_law||null,
    optional_confirmed:evolution?.graduation?.optional_confirmed_law||null,
    exploration:evolution.p2a_result||null,
    confirmation:evolution.p2b_confirmation||null
  },
  current_run:currentRun,
  rules:Array.isArray(playbook.rules)?playbook.rules:[],
  negative_knowledge:Array.isArray(playbook.negative_knowledge)?playbook.negative_knowledge:[],
  timeline:Array.isArray(history.entries)?history.entries:[],
  open_questions:uniq([
    ...(Array.isArray(history.open_questions)?history.open_questions:[]),
    ...(Array.isArray(playbook.open_questions)?playbook.open_questions.map(x=>x.question):[])
  ]),
  io_measurement:{
    law:io.measurement_law||null,
    coalescing:io.coalescing||null,
    false_zero_guard:io.false_zero_guard||null
  },
  recommended_measurements:[
    'fresh launch -> beacon',
    'beacon -> unique claim',
    'claim -> first durable checkpoint',
    'claim -> primary return',
    'primary return -> reallocation claim',
    'reallocation -> terminal close',
    'productive units per launch',
    'useful output per external read/write',
    'independent PASS / false-DONE / correction count',
    'first-vs-last-block degradation',
    'collision and lost-admission rate',
    'human interventions'
  ],
  next_program:[
    'Complete RESIDENCY-MACROBATCH-01 with the remaining frozen slots in parallel.',
    'Use replacement launches only for durable unclaimed slots / failed admission attempts.',
    'Compare five prompting variants with three independent replicas each.',
    'Compile external clocks and I/O from durable transport evidence.',
    'Run two independent worker analysts over final receipts, then reconcile only on material disagreement.',
    'Write validated lessons back into the playbook; keep failed ideas in negative knowledge.'
  ]
};

fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(projection,null,2)+'\n');
console.log(JSON.stringify({
  out:outPath,
  current_run:{
    slots_claimed:currentRun.slots_claimed,
    primary_complete:currentRun.primary_complete,
    reallocation_complete:currentRun.reallocation_complete,
    terminal:currentRun.terminal
  },
  timeline:projection.timeline.length,
  rules:projection.rules.length
}));
