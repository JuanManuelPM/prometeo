/* Student World Persistent Runtime v1.1 — transactional durable state, no visual homogenization. */
((global)=>{
  'use strict';if(global.PrometeoStudentWorldRuntime)return;
  function create(config,{studentId=config.studentId||'local-default',privacy='LOCAL'}={}){
    const W=global.PrometeoStudentWorld,P=global.PrometeoPersistence;if(!W)throw new Error('PrometeoStudentWorld required');
    const key=`${studentId}:${config.id}`;
    const record=P?.readRecord?.('student-world-state',key,{version:'1',defaultValue:null})||(()=>{const data=P?.read?.('student-world-state',key,{version:'1',defaultValue:null});return data?{data,revision:0}:null;})();
    let revision=record?.revision||0;let engine=W.create(config,record?.data||{studentId});let conflict=null,disposed=false;const listeners=new Set();
    function persistState(state){if(!P)return null;const receipt=P.write('student-world-state',key,state,{version:'1',privacy,baseRevision:revision,meta:{worldId:config.id,studentId}});revision=receipt?.revision??(revision+1);conflict=null;return receipt;}
    if(P&&!record)persistState(engine.getState());
    function dispatch(action){if(disposed)throw new Error('Student World runtime disposed');const before=engine.getState();const next=engine.dispatch(action);try{persistState(next);}catch(error){engine=W.create(config,before);conflict={code:error.code||'PERSIST_FAILED',message:error.message,at:new Date().toISOString()};throw error;}const state=engine.getState();listeners.forEach(fn=>fn(structuredClone(state),action));return state;}
    function reload(){if(!P)return engine.getState();const fresh=P.readRecord?.('student-world-state',key,{version:'1',defaultValue:null})||(()=>{const data=P.read?.('student-world-state',key,{version:'1',defaultValue:null});return data?{data,revision}:null;})();if(!fresh)return engine.getState();revision=fresh.revision??revision;engine=W.create(config,fresh.data);conflict=null;return engine.getState();}
    return Object.freeze({key,getState:()=>engine.getState(),dispatch,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},reload,status:()=>({key,revision,currentNodeId:engine.getState().currentNodeId,conflict}),dispose:()=>{listeners.clear();disposed=true;}});
  }
  global.PrometeoStudentWorldRuntime=Object.freeze({version:'1.1.0-candidate',create});
})(typeof globalThis!=='undefined'?globalThis:window);
