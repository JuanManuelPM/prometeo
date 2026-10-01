const arr=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();

export function validUsefulReserve(item={}){
  const r=item.useful_reserve||item.reserve_contract||item;
  return Boolean(r.evidence&&r.owner_current&&r.consumer&&r.done_when&&r.observable_change);
}

function sourceFor(candidate,jobsById){
  const id=candidate?.job_id||candidate?.guide_work_id||null;
  return id&&jobsById?.get(id) ? jobsById.get(id) : candidate;
}

export function usefulReserveClass(candidate={},jobsById=new Map()){
  const source=sourceFor(candidate,jobsById)||{};
  const reserve=source.useful_reserve||source.reserve_contract||null;
  if(reserve) return validUsefulReserve(reserve)?'USEFUL_RESERVE':'REJECTED_RESERVE';
  if(source.human_durable_intent===true||source.priority_class==='HUMAN_DURABLE_INTENT') return 'HUMAN_DURABLE_INTENT';
  const kind=text(source.kind).toLowerCase();
  const lane=text(candidate.lane).toLowerCase();
  if(['verification','verification_design','integration','recovery','critic','judge'].some(k=>kind.includes(k))||lane==='recovery'||lane==='role_ready') return 'INTEGRATION_VERIFICATION_RECOVERY';
  return 'CURRENT_PRODUCT_WORK';
}

export function applyUsefulReserveOrdering(candidates=[], {jobs=[], policy=null}={}){
  const rows=arr(candidates);
  if(!policy||policy.status!=='CANARY') return {ordered:rows.slice(),report:{enabled:false,reason:'POLICY_ABSENT_OR_NOT_CANARY'}};
  const jobsById=new Map(arr(jobs).filter(j=>j?.job_id).map(j=>[j.job_id,j]));
  const buckets={HUMAN_DURABLE_INTENT:[],CURRENT_PRODUCT_WORK:[],INTEGRATION_VERIFICATION_RECOVERY:[],USEFUL_RESERVE:[],REJECTED_RESERVE:[]};
  for(const row of rows) buckets[usefulReserveClass(row,jobsById)].push(row);
  const admitted=buckets.USEFUL_RESERVE;
  const rejected=buckets.REJECTED_RESERVE;
  const ordered=[...buckets.HUMAN_DURABLE_INTENT,...buckets.CURRENT_PRODUCT_WORK,...buckets.INTEGRATION_VERIFICATION_RECOVERY,...admitted];
  return {ordered,report:{enabled:true,policy_schema:policy.schema||null,higher_priority_claimable_before:rows.length-admitted.length-rejected.length,verified_reserve_candidates_before:admitted.length,reserve_admitted:admitted.length,rejected_reserve:rejected.length,reserve_floor:Number(policy?.reserve_target?.floor??0),started_exclusive_preemption_attempted:false}};
}
