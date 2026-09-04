/* Prometeo Student World Engine v1 — CANDIDATE
   World topology, unlocks and progress only. Visual map/theme are external.
*/
((global)=>{
  'use strict';
  if(global.PrometeoStudentWorld) return;
  const clone=v=>structuredClone(v),now=()=>new Date().toISOString();

  function normalize(input){
    if(!input?.id) throw new Error('World id required');
    const nodes=(input.nodes||[]).map((n,i)=>({id:n.id||`node-${i+1}`,kind:n.kind||'topic',requires:[...(n.requires||[])],...clone(n)}));
    const ids=new Set(nodes.map(n=>n.id));
    nodes.forEach(n=>n.requires.forEach(r=>{if(!ids.has(r))throw new Error(`Unknown prerequisite ${r} for ${n.id}`);}));
    return Object.freeze({...clone(input),nodes});
  }
  function initial(config,seed={}){
    const status={}; config.nodes.forEach(n=>status[n.id]={state:n.requires.length?'LOCKED':'AVAILABLE',progress:0,visits:0,updatedAt:null});
    Object.assign(status,clone(seed.status||{}));
    const s={schema:'prometeo.student-world-state/v1',worldId:config.id,studentId:seed.studentId||config.studentId||null,currentNodeId:seed.currentNodeId||config.nodes.find(n=>status[n.id]?.state!=='LOCKED')?.id||null,status,events:clone(seed.events||[]),updatedAt:seed.updatedAt||null};
    reconcile(config,s); return s;
  }
  function reconcile(config,state){
    for(const n of config.nodes){
      const s=state.status[n.id]; if(!s||s.state==='DONE')continue;
      const ready=n.requires.every(r=>state.status[r]?.state==='DONE');
      if(ready&&s.state==='LOCKED')s.state='AVAILABLE';
      if(!ready&&s.state==='AVAILABLE'&&n.requires.length)s.state='LOCKED';
    }
  }
  function event(state,type,payload={}){state.updatedAt=now();state.events.push({seq:state.events.length+1,type,at:state.updatedAt,...clone(payload)});}
  function reduce(config,state,action){
    const next=clone(state),s=next.status[action.nodeId||next.currentNodeId];
    switch(action.type){
      case 'ENTER': if(!s)throw new Error('Node not found'); if(s.state==='LOCKED')throw new Error('Node locked'); next.currentNodeId=action.nodeId; s.visits=(s.visits||0)+1;s.updatedAt=now();event(next,'WORLD_NODE_ENTERED',{nodeId:action.nodeId});break;
      case 'PROGRESS': if(!s)throw new Error('Node not found'); s.progress=Math.max(0,Math.min(1,Number(action.progress)||0));s.updatedAt=now();event(next,'WORLD_NODE_PROGRESS',{nodeId:action.nodeId||next.currentNodeId,progress:s.progress});break;
      case 'COMPLETE': if(!s)throw new Error('Node not found'); s.progress=1;s.state='DONE';s.updatedAt=now();event(next,'WORLD_NODE_COMPLETED',{nodeId:action.nodeId||next.currentNodeId});reconcile(config,next);break;
      case 'RESTORE_VIEW': next.currentNodeId=action.nodeId||next.currentNodeId;event(next,'WORLD_VIEW_RESTORED',{nodeId:next.currentNodeId});break;
      default: throw new Error(`Unknown world action ${action.type}`);
    }
    return next;
  }
  function create(configInput,seed={}){const config=normalize(configInput);let state=initial(config,seed);const listeners=new Set();return Object.freeze({config,getState:()=>clone(state),dispatch:a=>{state=reduce(config,state,a);listeners.forEach(fn=>fn(clone(state),a));return clone(state);},subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}});}
  global.PrometeoStudentWorld=Object.freeze({version:'1.0.0-candidate',create,normalize,initial,reduce});
})(typeof globalThis!=='undefined'?globalThis:window);
