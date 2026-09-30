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
const chatFailure=readJson('coordination/workers/WORKER_CHAT_VISIBLE_FAILURE_ANALYSIS_RESIDENCY_MACROBATCH_01.json')||{};

function buildRun(runId){
  const packet=readJson(`coordination/launch-packets/${runId}/PACKET.json`);
  if(!packet) return null;

  const claims=listJson(`coordination/launch-packets/${runId}/claims`);
  const midpoints=listJson(`coordination/workers/benchmark-midpoints/${runId}`);
  const receipts=listJson(`coordination/workers/benchmark-receipts/${runId}`);
  const reallocClaims=listJson(`coordination/launch-packets/${runId}/reallocation-claims`);
  const exams=listJson('coordination/workers/exams').filter(x=>x.doc?.run_id===runId);

  const slots=Array.isArray(packet.slots)?packet.slots:[];
  const claimSlotIds=new Set(claims.map(x=>x.doc?.slot_id||x.doc?.primary_slot_id||path.basename(x.name,'.json')));
  const receiptByWorker=new Map(receipts.filter(x=>x.doc?.worker_id).map(x=>[x.doc.worker_id,x.doc]));
  const primaryWorkers=uniq(receipts.filter(x=>x.doc?.primary_complete===true).map(x=>x.doc.worker_id));
  const reallocWorkers=uniq(receipts.filter(x=>x.doc?.reallocation_complete===true).map(x=>x.doc.worker_id));
  const terminalWorkers=uniq(exams.map(x=>x.doc?.worker_id).filter(Boolean));

  const variants={};
  for(const s of slots){
    const key=s.benchmark_variant_id || (
      s.load_tier_id && s.continuation_condition_id
        ? s.load_tier_id+' × '+s.continuation_condition_id
        : s.evolution_variant||'UNSPECIFIED'
    );
    variants[key]??={slots_total:0,slots_claimed:0,primary_complete:0,reallocation_complete:0};
    variants[key].slots_total++;
    if(claimSlotIds.has(s.slot_id)) variants[key].slots_claimed++;
  }
  const slotById=new Map(slots.map(s=>[s.slot_id,s]));
  for(const row of receipts){
    const sid=row.doc?.slot_id||row.doc?.primary_slot_id||null;
    const slot=sid?slotById.get(sid):null;
    const key=row.doc?.benchmark_variant_id || (
      slot?.load_tier_id && slot?.continuation_condition_id
        ? slot.load_tier_id+' × '+slot.continuation_condition_id
        : row.doc?.evolution_variant||slot?.evolution_variant||'UNSPECIFIED'
    );
    variants[key]??={slots_total:0,slots_claimed:0,primary_complete:0,reallocation_complete:0};
    if(row.doc?.primary_complete===true) variants[key].primary_complete++;
    if(row.doc?.reallocation_complete===true) variants[key].reallocation_complete++;
  }

  const latestReceipts=receipts.map(x=>({
    worker_id:x.doc.worker_id||null,
    slot_id:x.doc.slot_id||x.doc.primary_slot_id||null,
    benchmark_variant_id:x.doc.benchmark_variant_id||null,
    load_tier_id:x.doc.load_tier_id||slotById.get(x.doc.slot_id||'')?.load_tier_id||null,
    continuation_condition_id:x.doc.continuation_condition_id||slotById.get(x.doc.slot_id||'')?.continuation_condition_id||null,
    primary_complete:x.doc.primary_complete===true,
    reallocation_complete:x.doc.reallocation_complete===true,
    useful_output_words:x.doc?.feature_evidence?.M02_PRIMARY?.useful_output_words
      ?? x.doc?.primary_bundle?.useful_output_words
      ?? x.doc?.useful_output_words
      ?? null,
    close_status:x.doc?.stage_trace?.E9_EXAM_CLOSE?.status||null
  }));

  return {
    run_id:packet.run_id||runId,
    packet_status:packet.status||'UNKNOWN',
    slots_total:slots.length,
    slots_claimed:claimSlotIds.size,
    slots_unclaimed:Math.max(0,slots.length-claimSlotIds.size),
    midpoints:midpoints.length,
    primary_complete:primaryWorkers.length,
    reallocation_claims:reallocClaims.length,
    reallocation_complete:reallocWorkers.length,
    terminal:terminalWorkers.length,
    variants,
    latest_receipts:latestReceipts,
    human_invocation:packet.human_invocation||null,
    truth_boundary:'Counts derive from main-branch claims/midpoints/receipts/exams at build time. Human launch attempts and chat-visible stop reasons are separate evidence.'
  };
}

const maxcap=buildRun('MAXCAP-50-01');
const residency=buildRun('RESIDENCY-MACROBATCH-01');
const currentRun=maxcap||residency||{
  run_id:'NONE',packet_status:'UNKNOWN',slots_total:0,slots_claimed:0,slots_unclaimed:0,
  midpoints:0,primary_complete:0,reallocation_claims:0,reallocation_complete:0,terminal:0,
  variants:{},latest_receipts:[],human_invocation:null
};
const previousRuns=[residency].filter(Boolean).filter(r=>r.run_id!==currentRun.run_id);

const selfDur=Array.isArray(capacity.self_reported_duration_seconds)?capacity.self_reported_duration_seconds.map(Number).filter(Number.isFinite):[];
const wordRange=Array.isArray(capacity.total_output_words_range)?capacity.total_output_words_range:[null,null];
const currentWordCounts=currentRun.latest_receipts.map(x=>Number(x.useful_output_words)).filter(Number.isFinite);

const failureRows=(Array.isArray(chatFailure.observed_failure_classes)?chatFailure.observed_failure_classes:[]).map(row=>({
  id:'CHAT_'+row.id,
  classification:'CHAT_VISIBLE_FAILURE_CLASS',
  consequence:(row.lesson||'')+' '+(row.examples?.[0]?.consequence||''),
  evidence:row.examples?.map(x=>x.worker_id).filter(Boolean)||[],
  confidence:'MEDIUM'
}));

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
  previous_runs:previousRuns,
  rules:Array.isArray(playbook.rules)?playbook.rules:[],
  negative_knowledge:[
    ...(Array.isArray(playbook.negative_knowledge)?playbook.negative_knowledge:[]),
    ...failureRows
  ],
  chat_visible_failure_analysis:{
    run_id:chatFailure.run_id||null,
    status:chatFailure.status||null,
    classes:Array.isArray(chatFailure.observed_failure_classes)?chatFailure.observed_failure_classes:[]
  },
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
    'human wake attempt -> durable beacon',
    'beacon -> unique claim',
    'claim -> midpoint',
    'claim -> primary return',
    'primary return -> reallocation claim',
    'reallocation -> terminal close',
    'useful output words/tasks per external write',
    'last completed task/block on failure',
    'independent PASS / false-DONE / correction count',
    'first-vs-last-quartile quality degradation',
    'tool/security/transport boundary class',
    'cross-slot contamination',
    'human interventions'
  ],
  next_program:[
    'Run MAXCAP-50-01: 5 load tiers × 2 continuation conditions × 5 replicas.',
    'Keep RESIDENCY-MACROBATCH-01 as moderate-load baseline and failure-class evidence.',
    'Reconcile durable stage failures with chat-visible final reasons.',
    'Estimate provisional sustainable load separately for control and continuation priming.',
    'If 30K passes, raise the ceiling rather than declaring 30K the maximum.',
    'Run independent analysts over final receipts and write validated lessons back into Worker Playbook.'
  ]
};

fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(projection,null,2)+'\n');
console.log(JSON.stringify({
  out:outPath,
  current_run:{run_id:currentRun.run_id,slots_claimed:currentRun.slots_claimed,primary_complete:currentRun.primary_complete,reallocation_complete:currentRun.reallocation_complete,terminal:currentRun.terminal},
  previous_runs:previousRuns.map(r=>r.run_id),
  timeline:projection.timeline.length,
  rules:projection.rules.length,
  failure_classes:failureRows.length
}));
