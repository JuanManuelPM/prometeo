/* Student World Runtime v2 — compact durable progress + separate evidence. */
((global)=>{
 'use strict';if(global.PrometeoStudentWorldRuntimeV2)return;
 function fail(code,msg){const e=new Error(msg);e.code=code;throw e}
 function create(config,{studentId=config.studentId||'anonymous',privacy='LOCAL'}={}){
  const W=global.PrometeoStudentWorld,P=global.PrometeoPersistence,E=global.PrometeoPersistentEvidence;if(!W||!P||!E)fail('PROMETEO_WORLD_V2_DEPS','World, Persistence and Evidence required');
  const key=`${studentId}:${config.id}`,stateNs='student-world-state-v2',evidenceNs='student-world-evidence-v1';
  const stateRec=P.readRecord(stateNs,key,{version:'2',defaultValue:null});const evidence=E.create(evidenceNs,key,{privacy});let revision=stateRec?.revision||0;
  const seed=stateRec?.data?{...structuredClone(stateRec.data),events:evidence.list()}:{studentId};const engine=W.create(config,seed);
  function compact(s){const x=structuredClone(s);delete x.events;x.schema='prometeo.student-world-state/v2';x.evidence_cursor=evidence.list().length;return x}
  if(!stateRec){const r=P.write(stateNs,key,compact(engine.getState()),{version:'2',privacy,baseRevision:0,meta:{worldId:config.id,studentId}});revision=r.revision}
  function dispatch(action){const before=engine.getState(),n=before.events?.length||0,after=engine.dispatch(action),newEvents=(after.events||[]).slice(n);try{if(newEvents.length)evidence.append(newEvents);const c=compact(after);c.evidence_cursor=evidence.list().length;const r=P.write(stateNs,key,c,{version:'2',privacy,baseRevision:revision,meta:{worldId:config.id,studentId}});revision=r.revision;return after}catch(e){e.runtime_state_uncertain=true;e.code=e.code||'PROMETEO_WORLD_V2_PERSISTENCE_CONFLICT';throw e}}
  return Object.freeze({key,getState:engine.getState,dispatch,evidence:()=>evidence.list(),status:()=>({key,revision,evidence:evidence.status()})});
 }
 global.PrometeoStudentWorldRuntimeV2=Object.freeze({version:'2.0.0-candidate',create});
})(typeof globalThis!=='undefined'?globalThis:window);
