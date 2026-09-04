/* Student World Persistent Runtime v1 — topology/progress + durable state, no visual homogenization. */
((global)=>{
  'use strict';if(global.PrometeoStudentWorldRuntime)return;
  function create(config,{studentId=config.studentId||'anonymous',privacy='LOCAL'}={}){
    const W=global.PrometeoStudentWorld,P=global.PrometeoPersistence;if(!W)throw new Error('PrometeoStudentWorld required');
    const key=`${studentId}:${config.id}`;
    const saved=P?.read('student-world-state',key,{version:'1',defaultValue:null})||null;
    const engine=W.create(config,saved||{studentId});
    if(P&&!saved)P.write('student-world-state',key,engine.getState(),{version:'1',privacy,meta:{worldId:config.id,studentId}});
    const unsub=engine.subscribe(state=>{P?.write('student-world-state',key,state,{version:'1',privacy,meta:{worldId:config.id,studentId}});});
    return Object.freeze({engine,key,getState:engine.getState,dispatch:engine.dispatch,status:()=>({key,currentNodeId:engine.getState().currentNodeId}),dispose:()=>unsub()});
  }
  global.PrometeoStudentWorldRuntime=Object.freeze({version:'1.0.0-candidate',create});
})(typeof globalThis!=='undefined'?globalThis:window);
