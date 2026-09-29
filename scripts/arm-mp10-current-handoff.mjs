#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
const run='PROMETEO-MP10-01';
const integrationRoot=path.join(root,'coordination/integration-runs',run);
const returnsRoot=path.join(integrationRoot,'returns');
const reallocRoot=path.join(integrationRoot,'reallocation');
const reallocClaimsRoot=path.join(root,'coordination/launch-packets',run,'reallocation-claims');
const jobRel='coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-mp10-integrate-into-current-v1.json';
const jobPath=path.join(root,jobRel);
const stateRel='coordination/integration-runs/PROMETEO-MP10-01/CURRENT_HANDOFF.json';
const statePath=path.join(root,stateRel);
const slot=n=>'S'+String(n).padStart(3,'0');
const rslot=n=>'R'+String(n).padStart(3,'0');
const exists=p=>fs.existsSync(p);
const rel=p=>path.relative(root,p).split(path.sep).join('/');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n')};
const comparable=v=>{const x=JSON.parse(JSON.stringify(v));delete x.checked_at;return JSON.stringify(x)};
const writeSemantic=(p,v)=>{
  if(exists(p)){
    try{
      const prior=read(p);
      if(comparable(prior)===comparable(v)) return false;
    }catch{}
  }
  write(p,v);return true;
};

const primary=[];
for(let i=1;i<=10;i++){
  const id=slot(i),p=path.join(returnsRoot,id+'.json');
  if(exists(p)) primary.push({slot_id:id,ref:rel(p),doc:read(p)});
}
const realloc=[];
for(let i=1;i<=10;i++){
  const id=rslot(i);
  const output=path.join(reallocRoot,id+'.json');
  const claim=path.join(reallocClaimsRoot,id+'.json');
  realloc.push({
    slot_id:id,
    output_ref:exists(output)?rel(output):null,
    claim_ref:exists(claim)?rel(claim):null,
    state:exists(output)?'RETURNED':exists(claim)?'CLAIMED':'UNCLAIMED'
  });
}
const ready=primary.length===10;
const now=process.env.PROMETEO_NOW || new Date().toISOString();
let created=false;
if(ready && !exists(jobPath)){
  const returnRefs=primary.map(x=>x.ref);
  const job={
    schema:'prometeo.portfolio-derived-job/v1',
    job_id:'portfolio-mp10-integrate-into-current-v1',
    dedupe_key:'prometeo:mp10:metabolize-into-current:v1',
    project_id:'prometeo-autonomous-growth',
    title:'Metabolizar MP10 dentro del Work Graph CURRENT',
    kind:'integration',
    guide_role:'GUIDE_INTEGRATOR',
    guide_trigger:'UNCONSUMED_RETURN',
    priority:250,
    seed_status:'ready',
    required_capabilities:[],
    mission:'Consumí los 10 RETURNS primarios de PROMETEO-MP10-01 y el estado más reciente de sus reallocations. No diseñes otro scheduler ni otro RUN. Reconciliá lo producido contra Work Graph/portfolio CURRENT y materializá sólo los sucesores no duplicados que todavía hagan falta para llegar a texto en V11 → trabajo durable → workers → resultado visible. Reusá EFF021 sharding, EFF024 resident productive chain, EFF030 rolling POOL, EFF043 capability pressure, successor relay, recovery generations y METABOLISM_POLICY_V1.',
    definition_of_done:[
      'Los 10 RETURNS primarios quedan clasificados como CONSUMED, SUPERSEDED, DUPLICATE o RESIDUAL con refs exactos.',
      'Se reabre el estado actual de R001–R010; una reallocation ya CLAIMED/RETURNED no se duplica.',
      'Cada residual ejecutable se materializa como 0–7 portfolio-derived jobs con dedupe_key estable, scope acotado, DoD y evidencia. Fewer is correct.',
      'El trabajo generado entra al allocator CURRENT; no se crea queue/scheduler/CURRENT/family paralela.',
      'Las integraciones prioritarias cubren, cuando sigan pendientes: ingress↔Page Change, V11 UI/preview, project context, stats, privacy/reincarnation y command→work.',
      'Si una pieza está incompleta por boundary real, queda un successor concreto; no se declara PASS narrativo.',
      'Después de RETURN, el worker reentra al compact frontier bajo resident semantics en vez de cerrar por haber hecho una sola integración.',
      'V10 sigue CURRENT_BASELINE y V11 CANDIDATE hasta gates independientes.'
    ],
    evidence:[
      ...returnRefs,
      ...realloc.filter(x=>x.output_ref).map(x=>x.output_ref),
      'coordination/workers/WORKER_PIPELINE_V1.json',
      'coordination/workers/WORKER_GROWTH_POLICY_V1.json',
      'coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md',
      'coordination/guide/METABOLISM_POLICY_V1.json',
      'coordination/portfolio/WORKER_CONTRACT_V1.md',
      'coordination/design-dna/REGRESSION_HARNESS_V1.json',
      'coordination/integration-runs/PROMETEO-MP10-01/PRESERVATION_CONTRACT.json'
    ],
    source_run:run,
    source_primary_returns:returnRefs,
    observed_reallocation_state:realloc,
    created_at:now,
    truth_boundary:'This job integrates candidate work into existing CURRENT mechanisms. It does not promote V11 or any persistence backend.'
  };
  write(jobPath,job);
  created=true;
}
const state={
  schema:'prometeo.mp10-current-handoff/v1',
  run_id:run,
  checked_at:now,
  primary_returns:{count:primary.length,required:10,refs:primary.map(x=>x.ref)},
  reallocation:realloc,
  handoff_gate:ready?'OPEN':'WAIT_PRIMARY_RETURNS',
  integrator_job_ref:exists(jobPath)?jobRel:null,
  integrator_job_present:exists(jobPath),
  next_worker_mode:ready?'POOL_CURRENT':'FINISH_MP10',
  current_reuse:{
    allocation:'FAST_ALLOCATION_PROTOCOL_V1 + claim-frontier + atomic PIN',
    batching:'EFF021 deterministic unified sharding',
    residency:'EFF024 3 checkpoint / 6 target / 8 hard cap',
    rolling_pool:'EFF030 no cohort completion barrier',
    capabilities:'EFF043 capability-aware frontier pressure',
    continuation:'WORKER_PIPELINE E7→E8 + WORKER_GROWTH successor relay',
    metabolism:'METABOLISM_POLICY_V1 guide integration/planning/rescate',
    recovery:'generation fencing / stale recovery / reincarnation'
  },
  forbidden:['new scheduler','new queue','new CURRENT','human routing of slots','Supabase required completion'],
  truth_boundary:'Handoff state is a compiler/projection into the existing portfolio. Atomic PIN remains execution authority.'
};
let stateChanged=false;
if(exists(statePath)){
  try{
    const prior=read(statePath);
    if(comparable(prior)===comparable(state)) state.checked_at=prior.checked_at||state.checked_at;
  }catch{}
}
stateChanged=writeSemantic(statePath,state);
console.log(JSON.stringify({ok:true,ready,primary_returns:primary.length,created,state_changed:stateChanged,job_ref:exists(jobPath)?jobRel:null,state_ref:stateRel},null,2));
