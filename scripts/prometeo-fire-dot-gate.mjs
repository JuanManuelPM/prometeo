#!/usr/bin/env node
/** A PURE eligibility gate: never runs skills, never claims work or writes. The host must authenticate & CAS separately. */
export function checkPreparedDot(x = {}) {
  const input = typeof x.message === "string" ? x.message : "";
  if(!x.humanAuthored || input.trim() !== ".") return {eligible:false,reason:"NOT_HUMAN_DOT"};
  const p=x.plan;
  if(!p || typeof p !== "object")return {eligible:false,reason:"PLAN_NOT_FOUND"};
  if(p.status==="CONSUMED"||p.status==="EXECUTING"||p.consumed_at)return {eligible:false,reason:"ALREADY_CONSUMED"};
  if(!["PREPARED_UNSAVED","PREPARED_DURABLE"].includes(p.status))return {eligible:false,reason:"PLAN_NOT_PREPARED"};
  const mustBePresent=["plan_id","plan_version","human_intent_ref","context_revision","plan_hash","target_owner","write_scope","source_refs","required_skill_refs","skill_ledger","acceptance","risk_tests","permissions"];
  if(!/^[a-zA-Z0-9_-]{8,100}$/.test(p.plan_id||"") ||
      mustBePresent.some(k=>p[k]===undefined||p[k]===null||(typeof p[k]==="string"&&!p[k].trim())) ||
      !Array.isArray(p.write_scope)||p.write_scope.length===0||
      !Array.isArray(p.source_refs)||!Array.isArray(p.required_skill_refs)||!Array.isArray(p.skill_ledger)||
      !Array.isArray(p.acceptance)||p.acceptance.length===0||!Array.isArray(p.risk_tests))
    return {eligible:false,reason:"PLAN_INCOMPLETE"};
  // Expected hash must be an independently resolved plan fingerprint, not just the plan's own assertion.
  if(!x.expectedPlanHash||x.expectedPlanHash!==p.plan_hash)return {eligible:false,reason:"PLAN_HASH_MISMATCH"};
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
