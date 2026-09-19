export const POOL_RESIDENCY_CHECKPOINT=3;
export const POOL_RESIDENCY_TARGET=6;
export const POOL_RESIDENCY_HARD_CAP=8;

export const EARLY_CLOSE_REASONS=new Set([
  'SAFETY_BOUNDARY',
  'AUTHORITY_BOUNDARY',
  'CAPABILITY_BOUNDARY',
  'TRANSPORT_BOUNDARY',
  'EXHAUSTED_COMPATIBLE_FRONTIER',
  'DUPLICATE_OWNERSHIP_RISK',
  'RUNTIME_BOUNDARY'
]);

const arr=v=>Array.isArray(v)?v:[];

export function classifyPoolResidency({
  protocol_version=null,
  pool_id=null,
  explicit_exam=false,
  productive_units=0,
  close_reason=null,
  close_evidence_refs=[]
}={}){
  const units=Math.max(0,Number(productive_units)||0);
  const applicable=String(protocol_version||'')==='v3.30' && !!pool_id;
  const reason=String(close_reason||'').trim().toUpperCase()||null;
  const evidence=arr(close_evidence_refs).filter(Boolean);
  if(!applicable) return {
    applicable:false,status:'NOT_APPLICABLE',productive_units:units,
    checkpoint:POOL_RESIDENCY_CHECKPOINT,target:POOL_RESIDENCY_TARGET,hard_cap:POOL_RESIDENCY_HARD_CAP,
    close_reason:reason,close_evidence_count:evidence.length
  };
  if(!explicit_exam) return {
    applicable:true,status:'OPEN_OR_DERIVED',productive_units:units,
    checkpoint:POOL_RESIDENCY_CHECKPOINT,target:POOL_RESIDENCY_TARGET,hard_cap:POOL_RESIDENCY_HARD_CAP,
    close_reason:reason,close_evidence_count:evidence.length
  };
  if(units>=POOL_RESIDENCY_HARD_CAP) return {
    applicable:true,status:'HARD_CAP_MET',productive_units:units,
    checkpoint:POOL_RESIDENCY_CHECKPOINT,target:POOL_RESIDENCY_TARGET,hard_cap:POOL_RESIDENCY_HARD_CAP,
    close_reason:reason,close_evidence_count:evidence.length
  };
  if(units>=POOL_RESIDENCY_TARGET) return {
    applicable:true,status:'TARGET_MET',productive_units:units,
    checkpoint:POOL_RESIDENCY_CHECKPOINT,target:POOL_RESIDENCY_TARGET,hard_cap:POOL_RESIDENCY_HARD_CAP,
    close_reason:reason,close_evidence_count:evidence.length
  };
  const explained=EARLY_CLOSE_REASONS.has(reason) && evidence.length>0;
  return {
    applicable:true,
    status:explained?'EARLY_CLOSE_EXPLAINED':'EARLY_CLOSE_UNJUSTIFIED',
    productive_units:units,
    checkpoint:POOL_RESIDENCY_CHECKPOINT,target:POOL_RESIDENCY_TARGET,hard_cap:POOL_RESIDENCY_HARD_CAP,
    close_reason:reason,close_evidence_count:evidence.length
  };
}

export const poolResidencyFailure=row=>row?.applicable===true && row?.status==='EARLY_CLOSE_UNJUSTIFIED';
