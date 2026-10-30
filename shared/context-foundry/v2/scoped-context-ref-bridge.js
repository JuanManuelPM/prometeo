/* Candidate MIG-20261029-002 CONTEXT: scoped read-only bridge over existing private owners.
 * Not a persistence owner, scheduler, /o/ entry, or authority for product promotion.
 * Call only AFTER the entry-mode-specific bootstrap and assignment authorization.
 */
((global)=>{
 'use strict';
 if(global.PrometeoScopedContextRefBridgeV0)return;
 const SCHEMA='prometeo.scoped-context-ref/v0';
 const MODES=new Set(['MANUAL_CHAT','OBEY_V2','PROMETEO_EXECUTE']);
 const HEX64=/^[a-f0-9]{64}$/i;
 function fail(code){const e=new Error(code);e.code=code;throw e}
 function required(x){return typeof x==='string'&&x.length>0&&x.length<=256}
 function captureIdentity(c){return c&&required(c.capture_id)&&Number.isSafeInteger(c.revision)&&c.revision>0&&HEX64.test(c.digest)&&required(c.ack_id)}
 function sameCaptures(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
  return a.every((v,i)=>captureIdentity(v)&&captureIdentity(b[i])&&['capture_id','revision','digest','ack_id'].every(k=>v[k]===b[i][k]));
 }
 function validateAssignment(a){
  if(!a||!MODES.has(a.entry_mode)||!required(a.work_item_id)||!Number.isSafeInteger(a.assignment_generation)||a.assignment_generation<1||!required(a.epoch)||!required(a.page_id)||!required(a.packet_ref)||!HEX64.test(a.packet_digest)||!required(a.context_pack_ref)||!HEX64.test(a.context_pack_digest))fail('CONTEXT_ASSIGNMENT_INVALID');
  if(a.target!=='internal')fail('CONTEXT_EXTERNAL_FORBIDDEN');
 }
 function validateOwner(owner){
  if(!owner||['loadPrivateWorkItem','verifyDurableAck','authorizeRead','reopenPrivateContext'].some(k=>typeof owner[k]!=='function'))fail('CONTEXT_PRIVATE_OWNER_REQUIRED');
 }
 function matchPrivate(a,p){
  if(!p||p.work_item_id!==a.work_item_id||p.assignment_generation!==a.assignment_generation||p.epoch!==a.epoch||p.page_id!==a.page_id||p.packet_ref!==a.packet_ref||p.packet_digest!==a.packet_digest||p.context_pack_ref!==a.context_pack_ref||p.context_pack_digest!==a.context_pack_digest)fail('CONTEXT_STALE_OR_MISMATCH');
  if(!Array.isArray(p.capture_refs)||!p.capture_refs.length||!p.capture_refs.every(captureIdentity))fail('CONTEXT_CAPTURE_ACK_MISSING');
  if(!['LOCAL','PROJECT','PUBLIC'].includes(p.privacy))fail('CONTEXT_PRIVACY_UNKNOWN');
 }
 async function attest(a,owner){
  const p=await owner.loadPrivateWorkItem({work_item_id:a.work_item_id});
  matchPrivate(a,p);
  // Results must come from existing private owners, NOT flags supplied in the prompt.
  const access=await owner.authorizeRead({work_item_id:a.work_item_id,page_id:a.page_id,entry_mode:a.entry_mode,privacy:p.privacy,assignment_generation:a.assignment_generation});
  if(access?.allowed!==true)fail('CONTEXT_ACCESS_DENIED');
  const ack=await owner.verifyDurableAck({work_item_id:a.work_item_id,page_id:a.page_id,capture_refs:p.capture_refs});
  if(ack?.verified!==true||!sameCaptures(ack.capture_refs,p.capture_refs))fail('CONTEXT_CAPTURE_ACK_UNVERIFIED');
  return p;
 }
 async function resolve({assignment,owner}={}){
  validateAssignment(assignment);validateOwner(owner);
  await attest(assignment,owner);
  // No raw Capture, transcript, token or workspace secret is returned as metadata.
  const metadata=Object.freeze({schema:SCHEMA,work_item_id:assignment.work_item_id,assignment_generation:assignment.assignment_generation,entry_mode:assignment.entry_mode,epoch:assignment.epoch,page_id:assignment.page_id,packet_ref:assignment.packet_ref,packet_digest:assignment.packet_digest,context_pack_ref:assignment.context_pack_ref,context_pack_digest:assignment.context_pack_digest,privacy:'PRIVATE_REFERENCE_ONLY'});
  async function openPrivate(){
   // Revalidate at point of use; revoked rights or superseded generation must fail closed.
   const current=await attest(assignment,owner);
   const result=await owner.reopenPrivateContext({work_item_id:assignment.work_item_id,page_id:assignment.page_id,context_pack_ref:assignment.context_pack_ref,capture_refs:current.capture_refs});
   if(!result||result.context_pack_ref!==current.context_pack_ref||result.context_pack_digest!==current.context_pack_digest||!sameCaptures(result.capture_refs,current.capture_refs))fail('CONTEXT_REOPEN_INTEGRITY');
   return result; // Private consumer only. NEVER serialize this to a public receipt.
  }
  return Object.freeze({...metadata,openPrivate});
 }
 global.PrometeoScopedContextRefBridgeV0=Object.freeze({schema:SCHEMA,version:'0.1.0-candidate',resolve});
})(typeof globalThis!=='undefined'?globalThis:window);
