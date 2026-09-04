/* Classes Persistent Runtime v1.1 — transactional wrapper around pure Classes Engine. */
((global)=>{
  'use strict';if(global.PrometeoClassRuntime)return;
  function create(config,{studentId=config.studentId||'local-default',privacy='LOCAL',pageKitVersion='v37'}={}){
    const C=global.PrometeoClasses,P=global.PrometeoPersistence;if(!C)throw new Error('PrometeoClasses required');
    const key=`${studentId}:${config.id}`;
    const record=P?.readRecord?.('class-state',key,{version:'1',defaultValue:null})||null;
    let revision=record?.revision||0;
    let engine=C.create(config,record?.data||{studentId});
    let host=null,conflict=null,disposed=false;const listeners=new Set();
    function persistState(state){
      if(!P)return null;
      const receipt=P.write('class-state',key,state,{version:'1',privacy,baseRevision:revision,meta:{classId:config.id,studentId}});
      revision=receipt.revision;conflict=null;return receipt;
    }
    if(P&&!record)persistState(engine.getState());
    function dispatch(action){
      if(disposed)throw new Error('Class runtime disposed');
      const before=engine.getState();const next=engine.dispatch(action);
      try{persistState(next);}catch(error){engine=C.create(config,before);conflict={code:error.code||'PERSIST_FAILED',message:error.message,at:new Date().toISOString()};throw error;}
      const state=engine.getState();listeners.forEach(fn=>fn(structuredClone(state),action));return state;
    }
    function reload(){
      if(!P)return engine.getState();const fresh=P.readRecord('class-state',key,{version:'1',defaultValue:null});
      if(!fresh)return engine.getState();revision=fresh.revision;engine=C.create(config,fresh.data);conflict=null;return engine.getState();
    }
    function openPageKit(container,{version=pageKitVersion,mode='expanded'}={}){
      const H=global.PrometeoPageKitHostV2;if(!H)throw new Error('PrometeoPageKitHostV2 required');
      host=H.get(`class:${key}`)||H.create({container,version,stateKey:`class:${key}`,mode});host.attach?.(container);host.setMode(mode).open({restoreKey:`class:${key}`});return host;
    }
    return Object.freeze({key,getState:()=>engine.getState(),dispatch,progress:()=>engine.progress(),subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},reload,openPageKit,closePageKit:()=>host?.close()||{released:false},status:()=>({key,revision,progress:engine.progress(),pageKit:host?.status||null,conflict}),dispose:()=>{if(disposed)return;try{host?.close()}catch{}listeners.clear();disposed=true;}});
  }
  global.PrometeoClassRuntime=Object.freeze({version:'1.1.0-candidate',create});
})(typeof globalThis!=='undefined'?globalThis:window);
