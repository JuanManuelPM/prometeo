#!/usr/bin/env node
/** A PURE eligibility gate: never runs skills, never claims work or writes. The host must authenticate & CAS separately. */
export function checkPreparedDot(x = {}) {
  const input = typeof x.message === "string" ? x.message : "";
  if(!x.humanAuthored || input.trim() !== ".") return {eligible:false,reason:"NOT_HUMAN_DOT"};
  const p=x.plan;
  if(!p || typeof p !== "object")return {eligible:false,reason:"PLAN_NOT_FOUND"};
  if(p.status==="CONSUMED"||p.status==="EXECUTING"||p.consumed_at)return {eligible:false,reason:"ALREADY_CONSUMED"};
  if(!["PREPARED_UNSAVED","PREPARED_DURABLE"].includes(p.status))return {eligible:false,reason:"PLAN_NOT_PREPARED"};
  if(!/^[a-zA-Z0-9_-]{8,100}$/.test(p.plan_id||"")||!p.plan_hash||!p.write_scope||!p.target_owner)return {eligible:false,reason:"PLAN_INCOMPLETE"};
  const expires=Date.parse(p.expires_at||"");
  if(!Number.isFinite(expires)||!Number.isFinite(x.nowMs)||x.nowMs>=expires)return {eligible:false,reason:"PLAN_EXPIRED_OR_UNDATED"};
  if(p.status==="PREPARED_UNSAVED"){
    if(!x.sameChat||!x.localPlanAttested)return {eligible:false,reason:"PLAN_NOT_DURABLE_CROSS_CHAT"};
  } else if(!p.persisted_ack_ref||!x.verifiedReadBack){
    return {eligible:false,reason:"PRIVATE_PLAN_ACK_NOT_VERIFIED"};
  }
  if(!x.actorAuthenticated||!x.ownerMatched||!x.sourceRevisionMatched||!x.scopeConfirmed||!x.permissionsConfirmed)
    return {eligible:false,reason:"REVALIDATION_FAILED"};
  if(x.protectedActionRequiresExtraApproval&&!x.protectedActionApproved)
    return {eligible:false,reason:"PROTECTED_ACTION_NEEDS_APPROVAL"};
  return {eligible:true,reason:"ELIGIBLE_NEEDS_ATOMIC_CLAIM",plan_id:p.plan_id,plan_hash:p.plan_hash,next:"OWNER_CAS_CLAIM_THEN_EXECUTE"};
}
