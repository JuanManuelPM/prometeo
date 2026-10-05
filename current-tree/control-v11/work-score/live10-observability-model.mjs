const BRANCHES=Object.freeze(['CHAT_VIVO','METRICAS_VIVAS','CRECIMIENTO']);
const ALIASES=Object.freeze({
  A:'CHAT_VIVO',CHAT:'CHAT_VIVO',CHAT_VIVO:'CHAT_VIVO',
  B:'METRICAS_VIVAS',METRICS:'METRICAS_VIVAS',METRICAS:'METRICAS_VIVAS',METRICAS_VIVAS:'METRICAS_VIVAS',
  C:'CRECIMIENTO',GROWTH:'CRECIMIENTO',CRECIMIENTO:'CRECIMIENTO'
});

const n=value=>Number.isFinite(Number(value))?Number(value):0;
const arr=value=>Array.isArray(value)?value:[];

export function classifyFrontierBranch(candidate={}){
  const probes=[
    ['observability_branch',candidate.observability_branch],
    ['campaign_branch',candidate.campaign_branch],
    ['metadata.observability_branch',candidate?.metadata?.observability_branch],
    ['metadata.campaign_branch',candidate?.metadata?.campaign_branch],
    ['lineage.observability_branch',candidate?.lineage?.observability_branch]
  ];
  for(const [field,value] of probes){
    const branch=ALIASES[String(value??'').toUpperCase()]||null;
    if(branch)return Object.freeze({branch,basis:'EXPLICIT_DURABLE_METADATA',field});
  }
  return Object.freeze({branch:'UNKNOWN',basis:'MISSING_EXPLICIT_BRANCH_METADATA',field:null});
}

export function frontierBranchDistribution(candidates=[]){
  const counts={CHAT_VIVO:0,METRICAS_VIVAS:0,CRECIMIENTO:0,UNKNOWN:0};
  const rows=arr(candidates).map(candidate=>{
    const classified=classifyFrontierBranch(candidate);
    counts[classified.branch]=(counts[classified.branch]||0)+1;
    return Object.freeze({
      id:candidate?.job_id||candidate?.guide_work_id||candidate?.role_id||null,
      ...classified
    });
  });
  return Object.freeze({counts:Object.freeze(counts),rows:Object.freeze(rows)});
}

export function deriveProductiveLineage(runtime={},batchId='PROMETEO-LIVE10-V1'){
  const batch=arr(runtime?.batches).find(row=>row?.batch_id===batchId)||null;
  const units=batch?arr(batch.workers).flatMap(worker=>arr(worker?.productive_lineage).map(unit=>({worker_id:worker?.worker_id||null,...unit}))):[];
  if(!units.length){
    return Object.freeze({
      status:'UNKNOWN',
      evidence_units:0,
      productive_branching:null,
      fan_in:null,
      block_jumps:null,
      project_jumps:null,
      branch_counts:null
    });
  }
  const branchCounts={CHAT_VIVO:0,METRICAS_VIVAS:0,CRECIMIENTO:0,UNKNOWN:0};
  let productiveBranching=0,fanIn=0,blockJumps=0,projectJumps=0;
  for(const unit of units){
    const branch=BRANCHES.includes(unit?.observability_branch)?unit.observability_branch:'UNKNOWN';
    branchCounts[branch]++;
    productiveBranching+=Math.max(0,n(unit?.created_jobs_count));
    fanIn+=Math.max(0,n(unit?.consumed_returns_count));
    for(const jump of arr(unit?.block_project_jumps)){
      if(jump?.crossed_block===true || (jump?.from!=null&&jump?.to!=null&&String(jump.from)!==String(jump.to)))blockJumps++;
      if(jump?.crossed_project===true)projectJumps++;
    }
  }
  return Object.freeze({
    status:'GROUNDED',
    evidence_units:units.length,
    productive_branching:productiveBranching,
    fan_in:fanIn,
    block_jumps:blockJumps,
    project_jumps:projectJumps,
    branch_counts:Object.freeze(branchCounts)
  });
}
