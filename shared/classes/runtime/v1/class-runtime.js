/* Classes Persistent Runtime v1 — binds pure Classes Engine to durable state and PageKit. */
((global)=>{
  'use strict';if(global.PrometeoClassRuntime)return;
  function create(config,{studentId=config.studentId||'anonymous',privacy='LOCAL',pageKitVersion='v37'}={}){
    const C=global.PrometeoClasses,P=global.PrometeoPersistence;if(!C)throw new Error('PrometeoClasses required');
    const key=`${studentId}:${config.id}`;
    const saved=P?.read('class-state',key,{version:'1',defaultValue:null})||null;
    const engine=C.create(config,saved||{studentId});
    if(P&&!saved)P.write('class-state',key,engine.getState(),{version:'1',privacy,meta:{classId:config.id,studentId}});
    let host=null;
    const unsub=engine.subscribe(state=>{P?.write('class-state',key,state,{version:'1',privacy,meta:{classId:config.id,studentId}});});
    function openPageKit(container,{version=pageKitVersion,mode='expanded'}={}){
      const H=global.PrometeoPageKitHostV2;if(!H)throw new Error('PrometeoPageKitHostV2 required');
      host=H.get(`class:${key}`)||H.create({container,version,stateKey:`class:${key}`,mode});host.setMode(mode).open({restoreKey:`class:${key}`});return host;
    }
    return Object.freeze({engine,key,getState:engine.getState,dispatch:engine.dispatch,progress:engine.progress,openPageKit,closePageKit:()=>host?.close()||{released:false},status:()=>({key,progress:engine.progress(),pageKit:host?.status||null}),dispose:()=>{try{host?.close()}catch{}unsub();}});
  }
  global.PrometeoClassRuntime=Object.freeze({version:'1.0.0-candidate',create});
})(typeof globalThis!=='undefined'?globalThis:window);
