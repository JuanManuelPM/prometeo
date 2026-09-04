/* Prometeo Current Graph v1 — durable pointer rules, receipt-backed transitions. */
((global)=>{
  'use strict';
  if(global.PrometeoCurrentGraph) return;
  const STATES=['SOURCE','RECOVERED','RECONSTRUCTED','CANDIDATE','TESTED_CANDIDATE','HUMAN_ACCEPTED','SERVED','ARCHIVED'];
  const rank=new Map(STATES.map((s,i)=>[s,i]));
  function fail(code,msg,detail={}){const e=new Error(msg);e.code=code;e.detail=detail;throw e;}
  function validate(graph,{knownReceipts=new Set(),catalogIdentity=null}={}){
    if(graph?.schema!=='prometeo.current-graph/v1')fail('PROMETEO_CURRENT_SCHEMA','Invalid Current Graph schema');
    if(catalogIdentity&&graph.catalog_identity!==catalogIdentity)fail('PROMETEO_CURRENT_CATALOG_DRIFT','Current Graph catalog identity mismatch');
    const arts=graph.artifacts||{};
    for(const [id,a] of Object.entries(arts)){
      if(!rank.has(a.state))fail('PROMETEO_CURRENT_ARTIFACT_STATE',`Invalid state ${a.state}`,{id});
      if(!a.source)fail('PROMETEO_CURRENT_ARTIFACT_SOURCE',`Artifact ${id} missing source`);
    }
    for(const [name,p] of Object.entries(graph.pointers||{})){
      if(!arts[p.artifact_id])fail('PROMETEO_CURRENT_UNKNOWN_ARTIFACT',`Pointer ${name} references unknown artifact ${p.artifact_id}`);
      if(!p.receipt_id)fail('PROMETEO_CURRENT_RECEIPT_REQUIRED',`Pointer ${name} missing receipt`);
      if(knownReceipts.size&&!knownReceipts.has(p.receipt_id))fail('PROMETEO_CURRENT_UNKNOWN_RECEIPT',`Pointer ${name} references unknown receipt ${p.receipt_id}`);
      if(name.startsWith('human_accepted')&&arts[p.artifact_id].state!=='HUMAN_ACCEPTED')fail('PROMETEO_CURRENT_HUMAN_STATE',`Human Accepted pointer ${name} targets ${arts[p.artifact_id].state}`);
      if(name==='served_current'&&!['SERVED','TESTED_CANDIDATE','HUMAN_ACCEPTED'].includes(arts[p.artifact_id].state))fail('PROMETEO_CURRENT_SERVED_STATE','Served pointer targets impossible state');
    }
    if(graph.active_workstream?.parent_commit===graph.active_workstream?.branch)fail('PROMETEO_CURRENT_PARENT_CYCLE','Workstream parent cycle');
    return Object.freeze({ok:true,revision:graph.revision,pointerCount:Object.keys(graph.pointers||{}).length,artifactCount:Object.keys(arts).length});
  }
  function transition(graph,{pointer,artifactId,receipt,newArtifactState=null,evidence={}}){
    const next=structuredClone(graph),arts=next.artifacts||{};
    if(!arts[artifactId])fail('PROMETEO_CURRENT_UNKNOWN_ARTIFACT',`Unknown artifact ${artifactId}`);
    if(!receipt?.id)fail('PROMETEO_CURRENT_RECEIPT_REQUIRED','Transition requires durable receipt');
    if(receipt.type!=='CURRENT_POINTER_TRANSITION')fail('PROMETEO_CURRENT_RECEIPT_TYPE','Wrong receipt type');
    if(receipt.pointer!==pointer||receipt.to_artifact!==artifactId)fail('PROMETEO_CURRENT_RECEIPT_MISMATCH','Receipt does not authorize transition');
    if(pointer.startsWith('human_accepted')&&!receipt.human_accepted_evidence)fail('PROMETEO_CURRENT_HUMAN_EVIDENCE','Human Accepted pointer requires human evidence');
    if(pointer==='served_current'&&!receipt.served_evidence)fail('PROMETEO_CURRENT_SERVED_EVIDENCE','Served pointer requires served evidence');
    if(newArtifactState){
      if(!rank.has(newArtifactState))fail('PROMETEO_CURRENT_ARTIFACT_STATE','Invalid new artifact state');
      arts[artifactId].state=newArtifactState;
    }
    next.pointers[pointer]={artifact_id:artifactId,receipt_id:receipt.id,...structuredClone(evidence)};
    next.revision=(next.revision||0)+1;next.last_durable_receipt=receipt.id;
    return next;
  }
  function migrateV0ToV1(old){
    if(old.schema==='prometeo.current-graph/v1')return structuredClone(old);
    return {schema:'prometeo.current-graph/v1',revision:1,catalog_identity:old.catalog_identity||null,artifacts:old.artifacts||{},pointers:old.pointers||{},page_currents:old.page_currents||{},shared_component_currents:old.shared_component_currents||{},active_workstream:old.active_workstream||null,pending_work:old.pending_work||[],last_durable_receipt:old.last_durable_receipt||null};
  }
  global.PrometeoCurrentGraph=Object.freeze({version:'1.0.0-candidate',STATES:Object.freeze([...STATES]),validate,transition,migrateV0ToV1});
})(typeof globalThis!=='undefined'?globalThis:window);
