import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const arr=v=>Array.isArray(v)?v:[];
const isoMs=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:null;};
const ref=(root,p)=>path.relative(root,p).split(path.sep).join('/');
function walk(dir){
  if(!dir||!fs.existsSync(dir)) return [];
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}
function readJson(p){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}}
function jsonRows(root,parts){
  const base=path.join(root,...parts);
  return walk(base).filter(p=>p.endsWith('.json')).map(p=>({doc:readJson(p),ref:ref(root,p)})).filter(x=>x.doc);
}
function percentile(xs,p){
  const a=xs.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!a.length) return null;
  return a[Math.min(a.length-1,Math.max(0,Math.ceil(p*a.length)-1))];
}
function p50(xs){return percentile(xs,.5);}
function summary(xs){
  const a=xs.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!a.length) return {state:'unknown',sample_count:0,p50_ms:null,p95_ms:null,max_ms:null,outlier_count:null,outlier_threshold_ms:null};
  const enough=a.length>=3;
  const p95=enough?percentile(a,.95):null;
  return {
    state:'observed',
    sample_count:a.length,
    p50_ms:p50(a),
    p95_ms:p95,
    max_ms:Math.max(...a),
    outlier_count:enough?a.filter(v=>v>p95).length:null,
    outlier_threshold_ms:p95,
    sufficiency:enough?'P50_P95_OUTLIERS':'P50_ONLY_LT3_SAMPLES'
  };
}
function taskClass({role,trigger,kind,outcome,boundary_code}={}){
  const r=String(role||'').toUpperCase();
  const t=String(trigger||'').toUpperCase();
  const k=String(kind||'').toLowerCase();
  const o=String(outcome||'').toUpperCase();
  const b=String(boundary_code||'').toUpperCase();
  if(r.includes('INTEGRATOR')) return 'INTEGRATOR';
  if(r.includes('CRITIC')) return 'CRITIC';
  if(r.includes('RESCATE')||t.includes('RECOVERY')||t.includes('LOW_YIELD')) return 'RECOVERY';
  if(k.includes('verify')||k.includes('verification')||k.includes('audit')||r.includes('VERIFIER')) return 'VERIFIER';
  if(k.includes('recovery')||k.includes('repair')||k.includes('rescue')||o==='BOUNDARY'&&b.includes('RECOVERY')) return 'RECOVERY';
  return 'PRODUCER';
}
function stageSamples(){return {queue_wait:[],claim_to_start:[],execution:[],claim_to_complete:[],fan_in_wait:[]};}
function addSample(target,stage,value){if(Number.isFinite(value)&&value>=0) target[stage].push(value);}
function delta(a,b){const x=isoMs(a),y=isoMs(b);return x!==null&&y!==null&&y>=x?y-x:null;}
function pinKey(doc){
  const id=doc?.job_id||doc?.guide_work_id||null;
  return id&&doc?.worker_id?`${id}|${doc.worker_id}|${Number(doc.generation||1)}`:null;
}
function startedKey(doc){
  const id=doc?.job_id||doc?.work_id||doc?.guide_work_id||null;
  return id&&doc?.worker_id?`${id}|${doc.worker_id}|${Number(doc.generation||1)}`:null;
}
function returnKey(doc){
  const id=doc?.job_id||null;
  return id&&doc?.worker_id?`${id}|${doc.worker_id}|${Number(doc.generation||1)}`:null;
}
function guideReceiptKey(doc){
  const id=doc?.guide_work_id||null;
  return id&&doc?.worker_id?`${id}|${doc.worker_id}|${Number(doc.generation||1)}`:null;
}
function sourceKindIndex(root){
  const map=new Map();
  for(const row of jsonRows(root,['coordination','portfolio','derived'])){
    if(row.doc?.job_id) map.set(row.doc.job_id,{kind:row.doc.kind||null,created_at:row.doc.created_at||null,ref:row.ref});
  }
  const portfolio=readJson(path.join(root,'coordination','portfolio','PORTFOLIO.json'));
  for(const project of arr(portfolio?.projects)) for(const job of arr(project?.jobs)) if(job?.job_id&&!map.has(job.job_id)) map.set(job.job_id,{kind:job.kind||null,created_at:job.created_at||null,ref:'coordination/portfolio/PORTFOLIO.json'});
  return map;
}
function consumedRefs(doc){
  return [...new Set([
    ...arr(doc?.consumed_returns),
    ...arr(doc?.dispositions).map(x=>x?.return_ref).filter(Boolean)
  ].map(String))];
}
function codeOf(doc){return String(doc?.classification||doc?.reason||doc?.outcome||doc?.code||'UNKNOWN').toUpperCase();}

export function compileAtomicWorkTelemetry({root='.',now=new Date().toISOString()}={}){
  root=path.resolve(root);
  const sourceIndex=sourceKindIndex(root);
  const portfolioPins=jsonRows(root,['coordination','portfolio','pins']);
  const guidePins=jsonRows(root,['coordination','guide','pins']);
  const started=jsonRows(root,['coordination','workers','started']);
  const portfolioReturns=jsonRows(root,['coordination','portfolio','returns']).filter(x=>x.doc?.job_id&&x.doc?.worker_id&&(x.doc?.returned_at||x.doc?.completed_at||x.doc?.created_at));
  const guideReceipts=jsonRows(root,['coordination','guide','receipts']).filter(x=>x.doc?.guide_work_id&&x.doc?.worker_id);
  const noalloc=jsonRows(root,['coordination','workers','no-allocation']);

  const pinByKey=new Map([...portfolioPins,...guidePins].map(x=>[pinKey(x.doc),x]).filter(([k])=>k));
  const startedByKey=new Map(started.map(x=>[startedKey(x.doc),x]).filter(([k])=>k));
  const returnByRef=new Map(portfolioReturns.map(x=>[x.ref,x]));
  const byClass={};
  const all=stageSamples();
  const units=[];

  const ensureClass=c=>byClass[c]||(byClass[c]={completed_units:0,stages:stageSamples(),outcomes:{},collisions:0,retries:0,transport_boundaries:0});

  for(const row of portfolioReturns){
    const d=row.doc;
    const source=sourceIndex.get(d.job_id)||{};
    const c=taskClass({kind:source.kind,outcome:d.outcome,boundary_code:d.boundary_code});
    const bucket=ensureClass(c);
    const key=returnKey(d);
    const pin=pinByKey.get(key)?.doc||null;
    const start=startedByKey.get(key)?.doc||null;
    const completeAt=d.returned_at||d.completed_at||d.created_at||null;
    const queue=delta(source.created_at,pin?.claimed_at);
    const claimStart=delta(pin?.claimed_at,start?.started_at);
    const execution=delta(start?.started_at,completeAt);
    const claimComplete=delta(pin?.claimed_at,completeAt);
    for(const [stage,value] of Object.entries({queue_wait:queue,claim_to_start:claimStart,execution,claim_to_complete:claimComplete})){
      addSample(bucket.stages,stage,value);addSample(all,stage,value);
    }
    bucket.completed_units++;
    bucket.outcomes[String(d.outcome||'UNKNOWN')]=(bucket.outcomes[String(d.outcome||'UNKNOWN')]||0)+1;
    if(String(d.boundary_code||'').toUpperCase().includes('TRANSPORT')) bucket.transport_boundaries++;
    units.push({unit_ref:row.ref,worker_id:d.worker_id,unit_id:d.job_id,generation:Number(d.generation||1),task_class:c,kind:source.kind||null,outcome:d.outcome||null,claimed_at:pin?.claimed_at||null,started_at:start?.started_at||null,completed_at:completeAt,stage_ms:{queue_wait:queue,claim_to_start:claimStart,execution,claim_to_complete:claimComplete,fan_in_wait:null}});
  }

  for(const row of guideReceipts){
    const d=row.doc;
    const c=taskClass({role:d.role,trigger:d.trigger,outcome:d.outcome});
    const bucket=ensureClass(c);
    const key=guideReceiptKey(d);
    const pin=pinByKey.get(key)?.doc||null;
    const start=startedByKey.get(key)?.doc||null;
    const completeAt=d.created_at||d.returned_at||null;
    const claimStart=delta(pin?.claimed_at,start?.started_at);
    const execution=delta(start?.started_at,completeAt);
    const claimComplete=delta(pin?.claimed_at,completeAt);
    for(const [stage,value] of Object.entries({claim_to_start:claimStart,execution,claim_to_complete:claimComplete})){
      addSample(bucket.stages,stage,value);addSample(all,stage,value);
    }
    const refs=consumedRefs(d);
    const fanSamples=[];
    for(const r of refs){
      const ret=returnByRef.get(r)?.doc;
      const wait=delta(ret?.returned_at||ret?.completed_at||ret?.created_at,completeAt);
      if(Number.isFinite(wait)){fanSamples.push(wait);addSample(bucket.stages,'fan_in_wait',wait);addSample(all,'fan_in_wait',wait);}
    }
    bucket.completed_units++;
    bucket.outcomes[String(d.productive_unit===true?'PRODUCTIVE':d.outcome||'RECEIPT')]=(bucket.outcomes[String(d.productive_unit===true?'PRODUCTIVE':d.outcome||'RECEIPT')]||0)+1;
    units.push({unit_ref:row.ref,worker_id:d.worker_id,unit_id:d.guide_work_id,generation:Number(d.generation||1),task_class:c,kind:d.role||null,outcome:d.productive_unit===true?'PRODUCTIVE':d.outcome||'RECEIPT',claimed_at:pin?.claimed_at||null,started_at:start?.started_at||null,completed_at:completeAt,consumed_returns:refs.length,stage_ms:{queue_wait:null,claim_to_start:claimStart,execution,claim_to_complete:claimComplete,fan_in_wait:fanSamples.length?Math.max(...fanSamples):null}});
  }

  for(const row of noalloc){
    const d=row.doc;
    const jobId=d.job_id||d.candidate_job_id||d.work_id||null;
    const source=sourceIndex.get(jobId)||{};
    const c=taskClass({role:d.role,trigger:d.trigger,kind:source.kind});
    const bucket=ensureClass(c);
    const code=codeOf(d);
    if(code.includes('CREATE_EXISTS')||code.includes('COLLISION')) bucket.collisions++;
    const retries=Number(d.retry_count??d.retries??0);
    if(Number.isFinite(retries)&&retries>0) bucket.retries+=retries;
    if(code.includes('TRANSPORT_BLOCKED')||code.includes('TRANSPORT_AMBIGUOUS')) bucket.transport_boundaries++;
  }

  const consumed=new Set();
  for(const row of guideReceipts) for(const r of consumedRefs(row.doc)) consumed.add(r);
  const completedUnits=portfolioReturns.length+guideReceipts.length;
  const ratio=completedUnits?consumed.size/completedUnits:null;

  const classProjection={};
  for(const [c,b] of Object.entries(byClass)) classProjection[c]={
    completed_units:b.completed_units,
    outcomes:b.outcomes,
    stage_latency:Object.fromEntries(Object.entries(b.stages).map(([k,v])=>[k,summary(v)])),
    collisions:b.collisions,
    retries:b.retries,
    transport_boundaries:b.transport_boundaries
  };

  const missing={
    units_without_claim_timestamp:units.filter(u=>!u.claimed_at).length,
    units_without_started_timestamp:units.filter(u=>!u.started_at).length,
    units_without_complete_timestamp:units.filter(u=>!u.completed_at).length,
    first_material_write_timing:'UNKNOWN_NOT_DURABLY_NORMALIZED',
    verification_stage_timing:'UNKNOWN_UNLESS_SEPARATE_DURABLE_STAGE_TIMESTAMP_EXISTS'
  };

  return {
    schema:'prometeo.atomic-work-telemetry/v1',
    generated_at:now,
    authority:'OBSERVABILITY_ONLY',
    owner:'coordination/analytics/control-room-stats-v1',
    source_mode:'EXISTING_DURABLE_EVENTS_ONLY',
    task_classes:['PRODUCER','VERIFIER','CRITIC','INTEGRATOR','RECOVERY'],
    stage_classes:['queue_wait','claim_to_start','execution','claim_to_complete','fan_in_wait'],
    coverage:{portfolio_pins:portfolioPins.length,guide_pins:guidePins.length,started:started.length,portfolio_returns:portfolioReturns.length,guide_receipts:guideReceipts.length,no_allocation_receipts:noalloc.length,completed_units:completedUnits},
    useful_yield:{state:completedUnits?'observed':'unknown',consumed_return_refs:consumed.size,executed_units:completedUnits,ratio,definition:'unique durable portfolio return refs consumed by Guide receipts / completed durable portfolio-return + guide-receipt units'},
    stage_latency:Object.fromEntries(Object.entries(all).map(([k,v])=>[k,summary(v)])),
    by_task_class:classProjection,
    missing_data:missing,
    units,
    truth_boundaries:[
      'Derived observability only; never claim, scheduler, Current, acceptance or liveness authority.',
      'P95/outliers are emitted only with at least three durable samples; smaller sets expose p50 only.',
      'Queue wait exists only when a durable job created_at and claim timestamp both exist.',
      'Execution time is STARTED to durable RETURN/guide receipt, not hidden model reasoning time.',
      'Fan-in wait is source RETURN timestamp to consuming Guide receipt timestamp when exact refs resolve.',
      'First material write and separate verification-stage duration remain unknown until those timestamps are durably normalized.',
      'Missing evidence is unknown, never zero.'
    ]
  };
}

function parseArgs(argv){
  const out={root:'.',out:null,now:new Date().toISOString()};
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--root'){out.root=argv[++i];}
    else if(argv[i]==='--out'){out.out=argv[++i];}
    else if(argv[i]==='--now'){out.now=argv[++i];}
  }
  return out;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const opts=parseArgs(process.argv.slice(2));
  if(!opts.out) throw new Error('--out is required');
  const result=compileAtomicWorkTelemetry(opts);
  fs.mkdirSync(path.dirname(opts.out),{recursive:true});
  fs.writeFileSync(opts.out,JSON.stringify(result,null,2)+'\n');
  process.stdout.write(JSON.stringify({ok:true,out:opts.out,completed_units:result.coverage.completed_units,useful_yield:result.useful_yield.ratio})+'\n');
}
