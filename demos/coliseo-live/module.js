(function(g){
'use strict';

const VERSION='1.0.0';
const STAGES=new Set(['CLAIMED','READ','THINK','PLAN','WRITE','BUILD','IMPLEMENT','VERIFY','REVIEW','SUBMIT','WAIT']);
const PRODUCTIVE_LIVENESS=new Set(['LIVE','AGING']);
const STOPPED_LIVENESS=new Set(['SUSPECT','STALE_MEMBERSHIP']);

function clone(x){return JSON.parse(JSON.stringify(x||{}))}
function num(x,fallback=null){const n=Number(x);return Number.isFinite(n)?n:fallback}
function first(){for(const x of arguments){if(x!==undefined&&x!==null&&x!=='')return x}return null}
function mapBy(xs,key){const m=new Map();for(const x of xs||[]){const k=x&&x[key];if(k)m.set(k,x)}return m}
function isoMs(x){const t=Date.parse(x||'');return Number.isFinite(t)?t:null}
function clamp01(x){return Math.max(0,Math.min(1,x))}

function normalizeSnapshot(input){
  const C=g.PROMETEO_COLISEO_CONTRACT_V1;
  if(C&&typeof C.normalizeSnapshot==='function')return C.normalizeSnapshot(input);
  const s=clone(input);
  s.projects=Array.isArray(s.projects)?s.projects:[];
  s.nodes=Array.isArray(s.nodes)?s.nodes:[];
  s.workers=Array.isArray(s.workers)?s.workers:[];
  s.counts=s.counts||{};
  return s;
}

function signalProjection(worker,snapshot){
  const hb=Math.max(15,num(worker.heartbeat_seconds,120));
  const generated=isoMs(snapshot.generated_at)||Date.now();
  const signal=isoMs(worker.last_signal_at);
  let age=num(worker.age_seconds,null);
  if(signal!==null)age=Math.max(0,(generated-signal)/1000);
  const reported=worker.liveness||null;
  let liveness;
  let source='durable-signal';

  if(reported==='STALE_MEMBERSHIP')liveness='STALE_MEMBERSHIP';
  else if(reported==='RECOVERING')liveness='RECOVERING';
  else if(age===null){liveness=reported||'STALE_MEMBERSHIP';source=reported?'reported-fallback':'missing-signal'}
  else if(!worker.node_key&&age<=hb*1.5)liveness='RECENT_IDLE';
  else if(age<=hb*.5)liveness='LIVE';
  else if(age<=hb*1.5)liveness='AGING';
  else if(age<=hb*4)liveness='SUSPECT';
  else liveness='STALE_MEMBERSHIP';

  return {liveness,signal_age_seconds:age,heartbeat_seconds:hb,liveness_source:source};
}

function explicitProgress(worker,node,snapshot){
  const raw=first(worker.progress_ratio,worker.progress_fraction,worker.demo_progress,node&&node.demo_work_progress,snapshot.demo_progress);
  let n=num(raw,null);
  if(n===null){
    const pct=num(first(worker.progress_percent,node&&node.progress_percent),null);
    if(pct!==null)n=pct/100;
  }
  return n===null?null:clamp01(n);
}

function visualJobId(worker){
  const canonical=first(worker.job_ref,worker.job_id,worker.current_job_id,worker.lease_job_id);
  if(canonical)return {job_id:String(canonical),job_id_source:'snapshot'};
  if(worker.node_key){
    const gen=num(worker.assignment_generation,0);
    return {job_id:'visual-job:'+worker.node_key+':g'+gen,job_id_source:'derived-visual-fallback'};
  }
  return {job_id:null,job_id_source:'none'};
}

function deriveVisualState(input){
  const s=normalizeSnapshot(input);
  const nodeMap=mapBy(s.nodes,'node_key');
  const workers=[];
  const assignments=[];

  for(const raw of s.workers){
    const w=clone(raw);
    const sig=signalProjection(w,s);
    const node=w.node_key?nodeMap.get(w.node_key)||null:null;
    const job=visualJobId(w);
    const stage=STAGES.has(w.progress_stage)?w.progress_stage:(w.progress_stage||node&&node.progress_stage||null);
    let activity_mode='IDLE';
    if(sig.liveness==='RECOVERING')activity_mode='RECOVERING';
    else if(STOPPED_LIVENESS.has(sig.liveness))activity_mode='STALE';
    else if(!w.node_key)activity_mode='IDLE';
    else if(stage==='WAIT'||(node&&node.state==='BLOCKED'))activity_mode='WAIT';
    else if(node&&node.state==='ACTIVE'&&PRODUCTIVE_LIVENESS.has(sig.liveness))activity_mode='WORKING';
    else if(node&&node.state==='READY'&&PRODUCTIVE_LIVENESS.has(sig.liveness))activity_mode='CLAIMED';
    else activity_mode='HOLD';

    const projected={...w,...sig,...job,progress_stage:stage,activity_mode,local_progress:explicitProgress(w,node,s)};
    workers.push(projected);
    if(w.node_key){
      assignments.push({
        worker_id:w.worker_id,
        job_id:job.job_id,
        job_id_source:job.job_id_source,
        node_key:w.node_key,
        project_key:w.project_key||node&&node.project_key||null,
        assignment_generation:num(w.assignment_generation,0),
        activity_mode,
        liveness:sig.liveness,
        progress_stage:stage,
        local_progress:projected.local_progress
      });
    }
  }

  const assignmentsByNode=new Map();
  for(const a of assignments){
    if(!assignmentsByNode.has(a.node_key))assignmentsByNode.set(a.node_key,[]);
    assignmentsByNode.get(a.node_key).push(a);
  }

  const nodes=s.nodes.map(raw=>{
    const n=clone(raw);
    const deps=Array.isArray(n.depends_on)?n.depends_on.slice():[];
    const delivered=deps.filter(k=>nodeMap.get(k)&&nodeMap.get(k).state==='SUCCESS');
    const missing=deps.filter(k=>!delivered.includes(k));
    const assigned=assignmentsByNode.get(n.node_key)||[];
    return {
      ...n,
      input_buffer:{required:deps.length,delivered:delivered.length,ratio:deps.length?delivered.length/deps.length:1,delivered_keys:delivered,missing_keys:missing},
      ready_condition_met:deps.length>0&&missing.length===0,
      causal_state_consistent:!(n.state==='BLOCKED'&&deps.length>0&&missing.length===0),
      assignments:assigned,
      working_assignments:assigned.filter(a=>a.activity_mode==='WORKING').length,
      stalled_assignments:assigned.filter(a=>a.activity_mode==='STALE').length
    };
  });

  const projectedNodeMap=mapBy(nodes,'node_key');
  const projects=s.projects.map(p=>{
    const pn=nodes.filter(n=>n.project_key===p.project_key);
    const pw=workers.filter(w=>w.project_key===p.project_key);
    return {...clone(p),visual_counts:{
      nodes:pn.length,
      ready:pn.filter(n=>n.state==='READY').length,
      active:pn.filter(n=>n.state==='ACTIVE').length,
      blocked:pn.filter(n=>n.state==='BLOCKED').length,
      success:pn.filter(n=>n.state==='SUCCESS').length,
      productive_workers:pw.filter(w=>w.activity_mode==='WORKING').length,
      waiting_workers:pw.filter(w=>w.activity_mode==='WAIT').length,
      stale_workers:pw.filter(w=>w.activity_mode==='STALE').length
    }};
  });

  return {
    ...s,
    nodes,
    workers,
    projects,
    assignments,
    derived:{
      productive_workers:workers.filter(w=>w.activity_mode==='WORKING').length,
      waiting_workers:workers.filter(w=>w.activity_mode==='WAIT').length,
      stale_workers:workers.filter(w=>w.activity_mode==='STALE').length,
      ready_nodes:nodes.filter(n=>n.state==='READY').length,
      causal_inconsistencies:nodes.filter(n=>!n.causal_state_consistent).map(n=>n.node_key)
    },
    node_by_key:projectedNodeMap
  };
}

function event(type,data,current){
  return {type,at:current.generated_at||new Date().toISOString(),revision:current.revision||null,...data};
}
function assignmentKey(a){return [a&&a.node_key,a&&a.job_id,a&&a.assignment_generation].join('|')}
function completionOutputId(nodeKey,current){return 'output:'+nodeKey+':'+String(current.revision||current.generated_at||'transition')}
function progressFingerprint(w){return [w.progress_stage,w.progress_seq,w.local_progress].join('|')}

function deriveEvents(previousInput,currentInput){
  const previous=deriveVisualState(previousInput||{});
  const current=deriveVisualState(currentInput||{});
  const events=[];
  const pn=mapBy(previous.nodes,'node_key'),cn=mapBy(current.nodes,'node_key');
  const pw=mapBy(previous.workers,'worker_id'),cw=mapBy(current.workers,'worker_id');
  const paByWorker=new Map(previous.assignments.map(a=>[a.worker_id,a]));
  const caByWorker=new Map(current.assignments.map(a=>[a.worker_id,a]));

  for(const [workerId,cwkr] of cw){
    const pwkr=pw.get(workerId)||null;
    const pa=paByWorker.get(workerId)||null;
    const ca=caByWorker.get(workerId)||null;
    const changed=assignmentKey(pa)!==assignmentKey(ca);

    if(pa&&(!ca||changed))events.push(event('WORKER_RELEASED',{worker_id:workerId,job_id:pa.job_id,node_key:pa.node_key,project_key:pa.project_key},current));
    if(ca&&(!pa||changed))events.push(event('WORKER_CLAIMED',{worker_id:workerId,job_id:ca.job_id,node_key:ca.node_key,project_key:ca.project_key,assignment_generation:ca.assignment_generation},current));

    if(pwkr&&ca&&pa&&!changed&&progressFingerprint(pwkr)!==progressFingerprint(cwkr)){
      events.push(event('WORKER_PROGRESS',{worker_id:workerId,job_id:ca.job_id,node_key:ca.node_key,project_key:ca.project_key,progress_stage:cwkr.progress_stage,local_progress:cwkr.local_progress,signal_age_seconds:cwkr.signal_age_seconds},current));
    }

    if(pwkr&&!STOPPED_LIVENESS.has(pwkr.liveness)&&STOPPED_LIVENESS.has(cwkr.liveness)){
      events.push(event('WORKER_STALE',{worker_id:workerId,job_id:ca&&ca.job_id,node_key:ca&&ca.node_key,project_key:ca&&ca.project_key,liveness:cwkr.liveness,signal_age_seconds:cwkr.signal_age_seconds},current));
    }
    const prevRecovery=num(pwkr&&pwkr.recovery_count,0),curRecovery=num(cwkr.recovery_count,0);
    if((pwkr&&pwkr.liveness!=='RECOVERING'&&cwkr.liveness==='RECOVERING')||curRecovery>prevRecovery){
      events.push(event('RECOVERY_STARTED',{worker_id:workerId,job_id:ca&&ca.job_id,node_key:ca&&ca.node_key,project_key:ca&&ca.project_key,recovery_count:curRecovery,assignment_generation:ca&&ca.assignment_generation},current));
    }
  }

  for(const [workerId,pwkr] of pw){
    if(cw.has(workerId))continue;
    const pa=paByWorker.get(workerId)||null;
    if(pa)events.push(event('WORKER_RELEASED',{worker_id:workerId,job_id:pa.job_id,node_key:pa.node_key,project_key:pa.project_key},current));
  }

  for(const [nodeKey,node] of cn){
    const prev=pn.get(nodeKey)||null;
    const completed=prev&&prev.state!=='SUCCESS'&&node.state==='SUCCESS';
    if(completed){
      const priorAssignments=(prev.assignments||[]);
      const jobId=priorAssignments.length?priorAssignments[0].job_id:null;
      const workerId=priorAssignments.length?priorAssignments[0].worker_id:null;
      const outputId=completionOutputId(nodeKey,current);
      events.push(event('JOB_COMPLETED',{node_key:nodeKey,project_key:node.project_key,job_id:jobId,worker_id:workerId},current));
      events.push(event('OUTPUT_EMITTED',{node_key:nodeKey,project_key:node.project_key,job_id:jobId,worker_id:workerId,output_id:outputId},current));
    }
    if(prev&&prev.state!=='READY'&&node.state==='READY'){
      events.push(event('NODE_READY',{node_key:nodeKey,project_key:node.project_key,input_buffer:node.input_buffer},current));
    }
  }

  for(const downstream of current.nodes){
    for(const upstreamKey of downstream.depends_on||[]){
      const upPrev=pn.get(upstreamKey),upCur=cn.get(upstreamKey);
      if(upPrev&&upPrev.state!=='SUCCESS'&&upCur&&upCur.state==='SUCCESS'){
        events.push(event('DEPENDENCY_DELIVERED',{
          from_node_key:upstreamKey,
          to_node_key:downstream.node_key,
          project_key:downstream.project_key,
          output_id:completionOutputId(upstreamKey,current),
          input_buffer:downstream.input_buffer
        },current));
      }
    }
  }

  const rank={RECOVERY_STARTED:0,WORKER_STALE:1,WORKER_RELEASED:2,JOB_COMPLETED:3,OUTPUT_EMITTED:4,DEPENDENCY_DELIVERED:5,NODE_READY:6,WORKER_CLAIMED:7,WORKER_PROGRESS:8};
  events.sort((a,b)=>(rank[a.type]??99)-(rank[b.type]??99));
  return events;
}

g.COLISEO_LAB_MODULE={id:'live',version:VERSION,deriveVisualState,deriveEvents};
})(window);
