/* Prometeo AI Work Metabolism v1 — explicit state machine; never mutates Current directly. */
((global)=>{
 'use strict';if(global.PrometeoWorkflow)return;
 const allowed={
  SEED:['WORK_ITEM','ARCHIVED'],
  WORK_ITEM:['CONTEXT_PACK','BLOCKED','ARCHIVED'],
  CONTEXT_PACK:['EXECUTION','BLOCKED','NEEDS_REPAIR'],
  EXECUTION:['ARTIFACT_RETURNED','BLOCKED','NEEDS_REPAIR'],
  ARTIFACT_RETURNED:['VERIFIED','NEEDS_REPAIR','REJECTED'],
  VERIFIED:['CANDIDATE','NEEDS_REPAIR','REJECTED'],
  CANDIDATE:['HUMAN_ACCEPTED','REJECTED','NEEDS_REPAIR','SUPERSEDED'],
  HUMAN_ACCEPTED:['INTEGRATED','SUPERSEDED'],
  NEEDS_REPAIR:['CONTEXT_PACK','EXECUTION','ARCHIVED'],
  BLOCKED:['WORK_ITEM','CONTEXT_PACK','ARCHIVED'],
  REJECTED:['ARCHIVED'],
  SUPERSEDED:['ARCHIVED'],
  INTEGRATED:['ARCHIVED'],
  ARCHIVED:[]
 };
 function fail(code,msg,detail={}){const e=new Error(msg);e.code=code;e.detail=detail;throw e}
 async function makeId(prefix,body){return `${prefix}-${(await global.PrometeoDurable.digest(body)).slice(0,20)}`}
 async function seed({request,privacy='LOCAL',source_refs=[]}){
  if(!request?.trim())fail('PROMETEO_SEED_REQUEST','Seed request required');
  const base={schema:'prometeo.seed/v1',request:request.trim(),privacy,source_refs:[...source_refs]};
  return Object.freeze({...base,id:await makeId('SEED',base),created_at:new Date().toISOString()});
 }
 async function workItem(seed,{target,owner='unassigned',dependencies=[]}={}){
  if(!seed?.id)fail('PROMETEO_WORK_SEED','Seed required');if(!target)fail('PROMETEO_WORK_TARGET','Work target required');
  const base={schema:'prometeo.work-item/v1',seed_id:seed.id,request:seed.request,privacy:seed.privacy,target:structuredClone(target),owner,dependencies:[...dependencies],state:'WORK_ITEM'};
  return Object.freeze({...base,id:await makeId('WORK',base),created_at:new Date().toISOString(),history:[{from:'SEED',to:'WORK_ITEM',at:new Date().toISOString()}]});
 }
 function transition(item,to,{receipt_id=null,evidence=null}={}){
  const from=item.state;if(!(allowed[from]||[]).includes(to))fail('PROMETEO_WORK_TRANSITION',`Illegal workflow transition ${from} -> ${to}`);
  if(['VERIFIED','CANDIDATE','HUMAN_ACCEPTED','INTEGRATED'].includes(to)&&!receipt_id)fail('PROMETEO_WORK_RECEIPT_REQUIRED',`${to} requires receipt`);
  if(to==='HUMAN_ACCEPTED'&&!evidence?.human_acceptance_id)fail('PROMETEO_WORK_HUMAN_EVIDENCE','Human Accepted requires exact acceptance evidence');
  if(to==='INTEGRATED'&&!evidence?.current_transition_request_id)fail('PROMETEO_WORK_INTEGRATION_REQUEST','Integrated requires Current transition request, not direct mutation');
  const next=structuredClone(item);next.state=to;next.updated_at=new Date().toISOString();next.history=[...(next.history||[]),{from,to,receipt_id,at:next.updated_at,evidence:structuredClone(evidence)}];return next;
 }
 function currentTransitionRequest(item,{pointer,artifact_id,acceptance_id=null}={}){
  if(item.state!=='HUMAN_ACCEPTED')fail('PROMETEO_WORK_NOT_ACCEPTED','Only Human Accepted work may request Current transition');
  return Object.freeze({schema:'prometeo.current-transition-request/v1',id:`CTR-${item.id}`,work_item_id:item.id,pointer,artifact_id,acceptance_id,state:'REQUESTED'});
 }
 global.PrometeoWorkflow=Object.freeze({version:'1.0.0-candidate',allowed:Object.freeze(allowed),seed,workItem,transition,currentTransitionRequest});
})(typeof globalThis!=='undefined'?globalThis:window);
