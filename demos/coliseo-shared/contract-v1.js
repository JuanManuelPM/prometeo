(function(g){
'use strict';
const C={
  id:'COLISEO_VISUAL_CONTRACT_V1',
  snapshot_schema:'prometeo.public_worker_world/v3',
  node_states:['READY','ACTIVE','BLOCKED','SUCCESS','FAILED','CANCELLED'],
  liveness_states:['LIVE','AGING','SUSPECT','RECENT_IDLE','RECOVERING','STALE_MEMBERSHIP'],
  node_kinds:['ROOT','REDUCER','SYNTHESIS','VERIFY','PROMOTION'],
  progress_stages:['CLAIMED','READ','THINK','PLAN','WRITE','BUILD','IMPLEMENT','VERIFY','REVIEW','SUBMIT','WAIT'],
  visual_events:['WORKER_CLAIMED','WORKER_PROGRESS','JOB_COMPLETED','OUTPUT_EMITTED','DEPENDENCY_DELIVERED','NODE_READY','WORKER_RELEASED','WORKER_STALE','RECOVERY_STARTED'],
  invariants:[
    'ACTIVE is job state, not proof of worker liveness.',
    'Worker identity and job/node identity are separate.',
    'A completed job emits a bounded output event; completed nodes are not perpetual emitters.',
    'Dependency edges describe causal availability, not worker ownership.',
    'A downstream node becomes READY only after its required dependencies are satisfied.',
    'A downstream job may be claimed by a different worker.',
    'Demo/synthetic data must be visibly labelled and must never be presented as live.',
    'Liveness visuals derive from recent durable signal/progress, never decorative motion.'
  ],
  modules:{
    live:{owns:['semantic state projection','event derivation','causal rules','demo timelines'],export:['deriveVisualState(snapshot)','deriveEvents(previous,current)']},
    workers:{owns:['worker body','sprite/pose vocabulary','worker visual states'],export:['measureWorker(worker,env)','drawWorker(ctx,worker,pose,env)']},
    animation:{owns:['movement timing','transitions','artifact travel','state-change choreography'],export:['deriveMotion(events,layout,env)','stepMotion(model,dt)']},
    maps:{owns:['world geometry','camera','station placement','project territories','paths'],export:['layoutWorld(snapshot,env)','drawWorld(ctx,layout,env)']},
    materials:{owns:['materials','transparent primitives','lighting','outlines','particles','FX'],export:['tokens','drawPrimitive(ctx,primitive,env)']},
    hud:{owns:['labels','semantic zoom','detail panels','selection','collision avoidance'],export:['drawHud(ctx,snapshot,layout,selection,env)','hitTestHud(point)']},
    integration:{owns:['composition','live endpoint wiring','compatibility','verification','promotion'],export:['compose(modules,source,env)','verifyIntegration(report)']}
  }
};
function clone(x){return JSON.parse(JSON.stringify(x))}
function normalizeSnapshot(input){
  const s=clone(input||{});
  s.schema=s.schema||C.snapshot_schema;
  s.generated_at=s.generated_at||new Date().toISOString();
  s.projects=Array.isArray(s.projects)?s.projects:[];
  s.nodes=Array.isArray(s.nodes)?s.nodes:[];
  s.workers=Array.isArray(s.workers)?s.workers:[];
  s.counts=s.counts||{};
  return s;
}
function validateSnapshot(input){
  const s=normalizeSnapshot(input),errors=[],warnings=[];
  const nodeKeys=new Set(s.nodes.map(n=>n.node_key).filter(Boolean));
  const workerIds=new Set();
  for(const w of s.workers){
    if(!w.worker_id)errors.push('worker missing worker_id');
    if(w.worker_id&&workerIds.has(w.worker_id))errors.push('duplicate worker_id '+w.worker_id);
    workerIds.add(w.worker_id);
    if(w.node_key&&!nodeKeys.has(w.node_key))warnings.push('worker '+w.worker_id+' points to unknown node '+w.node_key);
    if(w.liveness&&!C.liveness_states.includes(w.liveness))warnings.push('unknown liveness '+w.liveness);
  }
  for(const n of s.nodes){
    if(!n.node_key)errors.push('node missing node_key');
    if(n.state&&!C.node_states.includes(n.state))warnings.push('unknown node state '+n.state);
    for(const d of (Array.isArray(n.depends_on)?n.depends_on:[])){
      if(!nodeKeys.has(d))warnings.push('node '+n.node_key+' depends on unknown '+d);
    }
  }
  return {ok:errors.length===0,errors,warnings,snapshot:s};
}
g.PROMETEO_COLISEO_CONTRACT_V1=Object.freeze({...C,normalizeSnapshot,validateSnapshot});
})(window);
