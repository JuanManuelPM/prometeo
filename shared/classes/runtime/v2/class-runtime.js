/* Classes Runtime v2 — compact durable state + separate append-only evidence. */
((global)=>{
 'use strict';if(global.PrometeoClassRuntimeV2)return;
 function fail(code,msg){const e=new Error(msg);e.code=code;throw e}
 function create(config,{studentId=config.studentId||'anonymous',privacy='LOCAL',pageKitVersion='v37'}={}){
   const C=global.PrometeoClasses,P=global.PrometeoPersistence,E=global.PrometeoPersistentEvidence;
   if(!C||!P||!E)fail('PROMETEO_CLASS_V2_DEPS','Classes, Persistence and Evidence required');
   const key=`${studentId}:${config.id}`,stateNs='class-state-v2',evidenceNs='class-evidence-v1';
   const stateRec=P.readRecord(stateNs,key,{version:'2',defaultValue:null});
   const evidence=E.create(evidenceNs,key,{privacy});
   let revision=stateRec?.revision||0;
   const seed=stateRec?.data?{...structuredClone(stateRec.data),events:evidence.list()}:{studentId};
   const engine=C.create(config,seed);let host=null;
   function compact(s){const x=structuredClone(s);delete x.events;x.schema='prometeo.class-state/v2';x.evidence_cursor=evidence.list().length;return x}
   if(!stateRec){const r=P.write(stateNs,key,compact(engine.getState()),{version:'2',privacy,baseRevision:0,meta:{classId:config.id,studentId}});revision=r.revision}
   function dispatch(action){
     const before=engine.getState(),beforeEvents=before.events?.length||0;
     const after=engine.dispatch(action),newEvents=(after.events||[]).slice(beforeEvents);
     try{
       if(newEvents.length)evidence.append(newEvents);
       const compactAfter=compact(after);compactAfter.evidence_cursor=evidence.list().length;
       const r=P.write(stateNs,key,compactAfter,{version:'2',privacy,baseRevision:revision,meta:{classId:config.id,studentId}});revision=r.revision;return after;
     }catch(e){
       // Pure engine has no direct state setter; fail closed and require reload/new runtime.
       e.runtime_state_uncertain=true;e.code=e.code||'PROMETEO_CLASS_V2_PERSISTENCE_CONFLICT';throw e;
     }
   }
   function openPageKit(container,{version=pageKitVersion,mode='expanded'}={}){
     const H=global.PrometeoPageKitHostV2;if(!H)fail('PROMETEO_PAGEKIT_REQUIRED','PageKit host required');
     host=H.get(`class:${key}`)||H.create({container,version,stateKey:`class:${key}`,mode});host.attach?.(container);host.setMode(mode).open({restoreKey:`class:${key}`});return host;
   }
   return Object.freeze({key,getState:engine.getState,dispatch,progress:engine.progress,evidence:()=>evidence.list(),openPageKit,closePageKit:()=>host?.close()||{released:false},status:()=>({key,revision,evidence:evidence.status(),pageKit:host?.status||null}),dispose:()=>{try{host?.close()}catch{}}});
 }
 global.PrometeoClassRuntimeV2=Object.freeze({version:'2.0.0-candidate',create});
})(typeof globalThis!=='undefined'?globalThis:window);
