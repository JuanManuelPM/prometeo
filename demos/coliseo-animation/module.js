(function(g){
'use strict';

const VERSION='1.0.0';
const FACT='FACT';
const AMBIENT='AMBIENT';
const EVENT_TYPES=new Set([
  'WORKER_CLAIMED','WORKER_PROGRESS','JOB_COMPLETED','OUTPUT_EMITTED',
  'DEPENDENCY_DELIVERED','NODE_READY','WORKER_RELEASED','WORKER_STALE','RECOVERY_STARTED'
]);

const PROFILES={
  precise:{
    id:'precise',label:'Precisa',walkSpeed:3.1,travelSpeed:4.3,settle:.28,progress:.50,
    complete:.34,emit:.24,impact:.32,ready:.42,releaseSpeed:3.6,stale:.48,recovery:.62,
    anticipation:.10,stagger:.055,localAmp:.075,particles:3,ease:'smooth'
  },
  expressive:{
    id:'expressive',label:'Expresiva',walkSpeed:2.55,travelSpeed:3.55,settle:.40,progress:.66,
    complete:.46,emit:.34,impact:.46,ready:.58,releaseSpeed:3.0,stale:.62,recovery:.82,
    anticipation:.16,stagger:.085,localAmp:.11,particles:5,ease:'spring'
  },
  compressed:{
    id:'compressed',label:'Comprimida',walkSpeed:4.7,travelSpeed:6.2,settle:.16,progress:.30,
    complete:.22,emit:.16,impact:.20,ready:.27,releaseSpeed:5.1,stale:.30,recovery:.42,
    anticipation:.04,stagger:.025,localAmp:.045,particles:1,ease:'smooth'
  }
};

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const copyPoint=p=>({x:num(p?.x),y:num(p?.y),z:num(p?.z)});
const distance=(a,b)=>Math.hypot(num(b?.x)-num(a?.x),num(b?.y)-num(a?.y),num(b?.z)-num(a?.z));
const mix=(a,b,t)=>({x:num(a?.x)+(num(b?.x)-num(a?.x))*t,y:num(a?.y)+(num(b?.y)-num(a?.y))*t,z:num(a?.z)+(num(b?.z)-num(a?.z))*t});
function hashString(s){let h=2166136261>>>0;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rand(seed,i=0){let x=(seed+Math.imul(i+1,2654435761))>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967295}
function easeSmooth(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
function easeOut(t){return 1-Math.pow(1-t,3)}
function easeSpring(t){const x=clamp(t);return clamp(1-Math.cos(x*Math.PI*1.05)*Math.exp(-x*4.4),0,1.06)}
function eased(t,name){return name==='spring'?easeSpring(t):easeSmooth(t)}

function pointFrom(value){
  if(Array.isArray(value))return {x:num(value[0]),y:num(value[1]),z:num(value[2])};
  if(value&&typeof value==='object'){
    if(value.position)return pointFrom(value.position);
    return copyPoint(value);
  }
  return {x:0,y:0,z:0};
}
function keyOfNode(n){return n?.node_key||n?.id||n?.key||n?.nodeId||null}
function keyOfWorker(w){return w?.worker_id||w?.id||w?.key||w?.workerId||null}
function normalizeLayout(layout){
  const L=layout||{},nodes=new Map(),workers=new Map(),paths=new Map();
  const nodeList=Array.isArray(L.nodes)?L.nodes:(L.nodePos instanceof Map?[...L.nodePos.values()]:[]);
  for(const n of nodeList){const k=keyOfNode(n?.node||n);if(k)nodes.set(k,pointFrom(n.position||n))}
  if(L.nodePos instanceof Map){for(const [k,v] of L.nodePos){const nk=keyOfNode(v?.node)||String(k).split('|').pop();nodes.set(nk,pointFrom(v))}}
  if(L.nodes&&!(Array.isArray(L.nodes))&&!(L.nodes instanceof Map)){for(const [k,v] of Object.entries(L.nodes))nodes.set(k,pointFrom(v))}
  if(L.nodes instanceof Map){for(const [k,v] of L.nodes)nodes.set(k,pointFrom(v))}

  const workerList=Array.isArray(L.workers)?L.workers:[];
  for(const w of workerList){const src=w?.worker||w,k=keyOfWorker(src);if(k)workers.set(k,pointFrom(w.position||w))}
  if(L.workers&&!(Array.isArray(L.workers))&&!(L.workers instanceof Map)){for(const [k,v] of Object.entries(L.workers))workers.set(k,pointFrom(v))}
  if(L.workers instanceof Map){for(const [k,v] of L.workers)workers.set(k,pointFrom(v))}

  const pathInput=L.paths||L.edges||[];
  if(pathInput instanceof Map){for(const [k,v] of pathInput)paths.set(k,(v||[]).map(pointFrom))}
  else if(Array.isArray(pathInput)){
    for(const p of pathInput){
      const from=p.from||p.source||p.from_node_key,to=p.to||p.target||p.to_node_key;
      const pts=(p.points||p.path||[]).map(pointFrom);
      if(from&&to&&pts.length)paths.set(from+'>'+to,pts);
    }
  } else if(pathInput&&typeof pathInput==='object'){
    for(const [k,v] of Object.entries(pathInput))paths.set(k,(v||[]).map(pointFrom));
  }
  return {
    nodes,workers,paths,
    entry:pointFrom(L.entry||L.workerEntry||{x:-7.6,y:0,z:0}),
    exit:pointFrom(L.exit||L.workerExit||{x:7.6,y:0,z:0}),
    recovery:pointFrom(L.recovery||L.recoveryBay||{x:0,y:0,z:4.2})
  };
}
function eventNode(e){return e.node_key||e.node_id||e.node||e.job_node_key||e.target_node_key||e.to_node_key||e.to||null}
function sourceNode(e){return e.source_node_key||e.from_node_key||e.from||e.source||e.node_key||e.node_id||null}
function targetNode(e){return e.target_node_key||e.to_node_key||e.to||e.destination||e.node_key||e.node_id||null}
function workerId(e){return e.worker_id||e.workerId||e.agent_id||e.agentId||null}
function outputId(e,index){return e.output_id||e.artifact_id||e.outputId||e.event_id||('output-'+index+'-'+sourceNode(e))}
function eventOffset(e,index,baseAt){
  if(Number.isFinite(Number(e.offset)))return Math.max(0,Number(e.offset));
  if(Number.isFinite(Number(e.t)))return Math.max(0,Number(e.t));
  if(typeof e.at==='string'){
    const ms=Date.parse(e.at);if(Number.isFinite(ms)&&Number.isFinite(baseAt))return Math.max(0,(ms-baseAt)/1000);
  }
  if(Number.isFinite(Number(e.at))){
    const n=Number(e.at);
    if(n>100000&&Number.isFinite(baseAt))return Math.max(0,(n-baseAt)/1000);
    return Math.max(0,n);
  }
  return index*.18;
}
function resolveProfile(env,count,span){
  const asked=env?.profile||env?.choreography||'precise';
  let base=PROFILES[asked]||PROFILES.precise;
  const density=count/Math.max(.6,span||1);
  if(env?.reducedMotion===true||env?.prefersReducedMotion===true)base=PROFILES.compressed;
  else if(density>6.5&&asked!=='compressed')base={...base,localAmp:Math.min(base.localAmp,.052),particles:Math.min(base.particles,1),stagger:Math.min(base.stagger,.03)};
  const motionScale=clamp(num(env?.motionScale,1),.2,2.5);
  return {...base,motionScale,density};
}
function nodePoint(L,key,fallback){return key&&L.nodes.has(key)?copyPoint(L.nodes.get(key)):copyPoint(fallback||{x:0,y:0,z:0})}
function workerPoint(L,key){return key&&L.workers.has(key)?copyPoint(L.workers.get(key)):copyPoint(L.entry)}
function pathLength(points){let d=0;for(let i=1;i<points.length;i++)d+=distance(points[i-1],points[i]);return d}
function normalizePath(points,from,to){
  const out=(points||[]).map(copyPoint);
  if(!out.length)return [copyPoint(from),copyPoint(to)];
  if(distance(out[0],from)>.01)out.unshift(copyPoint(from));
  if(distance(out[out.length-1],to)>.01)out.push(copyPoint(to));
  return out;
}
function pathFor(L,fromKey,toKey,from,to){
  const direct=L.paths.get(fromKey+'>'+toKey)||L.paths.get(toKey+'<'+fromKey);
  if(direct?.length)return {points:normalizePath(direct,from,to),derived:false};
  const dx=num(to.x)-num(from.x),dz=num(to.z)-num(from.z);
  const bend=Math.abs(dx)+Math.abs(dz)>.01?Math.min(1.25,Math.hypot(dx,dz)*.18):0;
  const mid={x:(num(from.x)+num(to.x))/2,y:(num(from.y)+num(to.y))/2,z:(num(from.z)+num(to.z))/2+bend};
  return {points:[copyPoint(from),mid,copyPoint(to)],derived:true};
}
function samplePath(points,t){
  if(!points?.length)return {x:0,y:0,z:0};
  if(points.length===1)return copyPoint(points[0]);
  const lens=[],total=pathLength(points);if(total<=.0001)return copyPoint(points[points.length-1]);
  let acc=0;for(let i=1;i<points.length;i++){const d=distance(points[i-1],points[i]);lens.push([acc,acc+d,d,i]);acc+=d}
  const target=clamp(t)*total;
  for(const [a,b,d,i] of lens){if(target<=b||i===points.length-1)return mix(points[i-1],points[i],d?clamp((target-a)/d):1)}
  return copyPoint(points[points.length-1]);
}
function addTrack(model,track){
  const id=track.id||('track-'+model.tracks.length);
  model.tracks.push({truth:FACT,ease:model.profile.ease,...track,id});
}
function trackDurationForPath(points,speed,min=.28,max=3.6){return clamp(pathLength(points)/Math.max(.1,speed),min,max)}

function deriveMotion(events,layout,env){
  const input=Array.isArray(events)?events.filter(Boolean):[];
  const L=normalizeLayout(layout);
  const known=input.filter(e=>EVENT_TYPES.has(String(e.type||e.event_type||'').toUpperCase()));
  const atValues=known.map(e=>typeof e.at==='string'?Date.parse(e.at):Number(e.at)).filter(Number.isFinite);
  const baseAt=atValues.length&&Math.max(...atValues)>100000?Math.min(...atValues):NaN;
  const offsets=known.map((e,i)=>eventOffset(e,i,baseAt));
  const span=(Math.max(0,...offsets)-Math.min(0,...offsets))||1;
  const profile=resolveProfile(env||{},known.length,span);
  const zoom=clamp(num(env?.zoom,1),.25,4);
  const zoomAmp=clamp(1/Math.sqrt(zoom),.58,1.18);
  const model={
    id:'COLISEO_ANIMATION_MOTION_V1',version:VERSION,time:num(env?.initialTime,0),done:false,
    profile:{...profile},zoom,density:profile.density,
    legend:{FACT:'Evento semántico confirmado',AMBIENT:'Ambientación no causal'},
    sourceEvents:known.map(e=>({...e})),tracks:[],warnings:[],
    layout:{nodes:Object.fromEntries([...L.nodes]),workers:Object.fromEntries([...L.workers])},
    base:{workers:new Map(),outputs:new Map(),nodes:new Map()},frame:{workers:[],outputs:[],nodes:[],particles:[]}
  };
  const workerPos=new Map(L.workers);
  const workerHome=new Map(L.workers);
  const emitted=new Map();
  let cursor=0;
  known.forEach((raw,index)=>{
    const e={...raw},type=String(e.type||e.event_type||'').toUpperCase(),wid=workerId(e),nk=eventNode(e);
    let start=eventOffset(e,index,baseAt)+Math.min(index*profile.stagger,.22);
    if(env?.strictEventTimes===true)start=eventOffset(e,index,baseAt);
    cursor=Math.max(cursor,start);
    const eventKey=e.event_id||e.id||type+'-'+index;
    if(wid&&!model.base.workers.has(wid))model.base.workers.set(wid,workerPoint(L,wid));
    if(nk&&!model.base.nodes.has(nk))model.base.nodes.set(nk,nodePoint(L,nk));

    if(type==='WORKER_CLAIMED'&&wid){
      const from=workerPos.get(wid)||workerPoint(L,wid),to=nodePoint(L,nk,from);
      const p=pathFor(L,e.from_node_key||'ENTRY',nk||'NODE',from,to);
      const duration=trackDurationForPath(p.points,profile.walkSpeed*profile.motionScale,.34,3.2);
      addTrack(model,{id:eventKey+'-walk',kind:'worker_walk',subject:wid,eventType:type,start,duration,path:p.points,pathDerived:p.derived,from,to,meta:{node_key:nk}});
      addTrack(model,{id:eventKey+'-settle',kind:'worker_settle',subject:wid,eventType:type,start:start+duration,duration:profile.settle/profile.motionScale,from:to,to,amplitude:.10*zoomAmp,meta:{node_key:nk}});
      workerPos.set(wid,to);
    }
    else if(type==='WORKER_PROGRESS'&&wid){
      const anchor=nodePoint(L,nk,workerPos.get(wid)||workerPoint(L,wid));
      workerPos.set(wid,anchor);
      addTrack(model,{id:eventKey+'-progress',kind:'worker_progress',subject:wid,eventType:type,start,duration:profile.progress/profile.motionScale,from:anchor,to:anchor,amplitude:profile.localAmp*zoomAmp,meta:{node_key:nk,stage:e.progress_stage||e.stage||null}});
    }
    else if(type==='JOB_COMPLETED'){
      const node=nk||sourceNode(e),pos=nodePoint(L,node);
      addTrack(model,{id:eventKey+'-complete',kind:'job_complete',subject:node,eventType:type,start,duration:profile.complete/profile.motionScale,from:pos,to:pos,amplitude:.16*zoomAmp,meta:{node_key:node}});
    }
    else if(type==='OUTPUT_EMITTED'){
      const node=sourceNode(e)||nk,oid=outputId(e,index),pos=nodePoint(L,node);
      if(emitted.has(oid))model.warnings.push('duplicate output ignored: '+oid);
      else{
        emitted.set(oid,{source:node,pos});model.base.outputs.set(oid,{position:pos,source:node,target:targetNode(e)||null});
        addTrack(model,{id:eventKey+'-emit',kind:'output_emit',subject:oid,eventType:type,start,duration:profile.emit/profile.motionScale,from:pos,to:pos,amplitude:.18*zoomAmp,meta:{output_id:oid,source_node_key:node}});
      }
    }
    else if(type==='DEPENDENCY_DELIVERED'){
      const fromKey=sourceNode(e),toKey=targetNode(e),oid=e.output_id||e.artifact_id||e.outputId||[...emitted.keys()].reverse().find(k=>emitted.get(k)?.source===fromKey)||outputId(e,index);
      const from=nodePoint(L,fromKey,emitted.get(oid)?.pos),to=nodePoint(L,toKey,from);
      if(!model.base.outputs.has(oid))model.base.outputs.set(oid,{position:from,source:fromKey,target:toKey,implicit:true});
      const p=pathFor(L,fromKey||'SOURCE',toKey||'TARGET',from,to);
      const duration=trackDurationForPath(p.points,profile.travelSpeed*profile.motionScale,.42,3.4);
      addTrack(model,{id:eventKey+'-travel',kind:'output_travel',subject:oid,eventType:type,start,duration,path:p.points,pathDerived:p.derived,from,to,meta:{output_id:oid,source_node_key:fromKey,target_node_key:toKey}});
      addTrack(model,{id:eventKey+'-impact',kind:'dependency_impact',subject:toKey,eventType:type,start:start+duration,duration:profile.impact/profile.motionScale,from:to,to,amplitude:.22*zoomAmp,meta:{output_id:oid,source_node_key:fromKey,target_node_key:toKey,particles:profile.particles}});
    }
    else if(type==='NODE_READY'){
      const node=nk||targetNode(e),pos=nodePoint(L,node);
      addTrack(model,{id:eventKey+'-ready',kind:'node_ready',subject:node,eventType:type,start,duration:profile.ready/profile.motionScale,from:pos,to:pos,amplitude:.24*zoomAmp,meta:{node_key:node}});
    }
    else if(type==='WORKER_RELEASED'&&wid){
      const from=workerPos.get(wid)||nodePoint(L,nk,workerPoint(L,wid));
      const home=workerHome.get(wid)||L.exit;
      const p=pathFor(L,nk||'NODE','EXIT',from,home);
      const duration=trackDurationForPath(p.points,profile.releaseSpeed*profile.motionScale,.32,2.8);
      addTrack(model,{id:eventKey+'-release',kind:'worker_release',subject:wid,eventType:type,start,duration,path:p.points,pathDerived:p.derived,from,to:home,meta:{node_key:nk}});
      workerPos.set(wid,home);
    }
    else if(type==='WORKER_STALE'&&wid){
      const pos=workerPos.get(wid)||workerPoint(L,wid);
      addTrack(model,{id:eventKey+'-stale',kind:'worker_stale',subject:wid,eventType:type,start,duration:profile.stale/profile.motionScale,from:pos,to:pos,amplitude:.08*zoomAmp,meta:{node_key:nk}});
    }
    else if(type==='RECOVERY_STARTED'&&wid){
      const from=workerPos.get(wid)||workerPoint(L,wid),to=pointFrom(e.recovery_position||L.recovery);
      const p=pathFor(L,nk||'STALE','RECOVERY',from,to);
      const duration=Math.max(profile.recovery/profile.motionScale,trackDurationForPath(p.points,profile.walkSpeed*1.25*profile.motionScale,.35,2.2));
      addTrack(model,{id:eventKey+'-recovery',kind:'worker_recovery',subject:wid,eventType:type,start,duration,path:p.points,pathDerived:p.derived,from,to,amplitude:.09*zoomAmp,meta:{node_key:nk}});
      workerPos.set(wid,to);
    }
  });

  if(env?.ambient===true){
    for(const [node,pos] of L.nodes){
      addTrack(model,{id:'ambient-'+node,truth:AMBIENT,kind:'ambient_node_breath',subject:node,eventType:null,start:0,duration:Infinity,from:pos,to:pos,amplitude:.012*zoomAmp,meta:{label:'AMBIENT'}});
    }
  }

  model.duration=model.tracks.reduce((m,t)=>Number.isFinite(t.duration)?Math.max(m,t.start+t.duration):m,0)+.12;
  return stepMotion(model,0);
}

function latestTrack(tracks,subject,kinds,time){
  let best=null;
  for(const t of tracks){if(t.subject!==subject||!kinds.has(t.kind)||time<t.start)continue;if(!best||t.start>best.start)best=t}
  return best;
}
function activeTracks(model,kind,time){return model.tracks.filter(t=>t.kind===kind&&time>=t.start&&time<=t.start+t.duration)}
function progressOf(track,time){return Number.isFinite(track.duration)&&track.duration>0?clamp((time-track.start)/track.duration):0}
function workerFrame(model,id,time){
  const base=copyPoint(model.base.workers.get(id)||{x:0,y:0,z:0});
  const moveKinds=new Set(['worker_walk','worker_release','worker_recovery']);
  const move=latestTrack(model.tracks,id,moveKinds,time);
  let position=base,phase='idle',truth=null,eventType=null,opacity=1,scale=1,accent=0;
  if(move){
    const p=progressOf(move,time);position=samplePath(move.path,eased(p,move.ease));
    if(time>move.start+move.duration)position=copyPoint(move.to);
    else {phase=move.kind;truth=move.truth;eventType=move.eventType;accent=Math.sin(clamp(p)*Math.PI)}
  }
  const locals=model.tracks.filter(t=>t.subject===id&&time>=t.start&&time<=t.start+t.duration&&['worker_settle','worker_progress','worker_stale'].includes(t.kind)).sort((a,b)=>a.start-b.start);
  const local=locals[locals.length-1];
  if(local){
    const p=progressOf(local,time),seed=hashString(local.id),a=(rand(seed,1)*Math.PI*2),amp=num(local.amplitude);
    truth=local.truth;eventType=local.eventType;phase=local.kind;
    if(local.kind==='worker_settle'){
      const q=Math.sin(p*Math.PI)*amp;position={...position,x:position.x+Math.cos(a)*q,z:position.z+Math.sin(a)*q};scale=1+.07*Math.sin(p*Math.PI);
    } else if(local.kind==='worker_progress'){
      const q=Math.sin(p*Math.PI*2)*amp*Math.sin(p*Math.PI);position={...position,x:position.x+Math.cos(a)*q,z:position.z+Math.sin(a)*q};scale=1+.045*Math.sin(p*Math.PI);
    } else if(local.kind==='worker_stale'){
      const q=easeOut(p);opacity=1-.52*q;scale=1-.08*q;accent=1-q;
    }
  }
  const stalePast=latestTrack(model.tracks,id,new Set(['worker_stale']),time);
  const recoveryPast=latestTrack(model.tracks,id,new Set(['worker_recovery']),time);
  if(stalePast&&time>stalePast.start+stalePast.duration&&(!recoveryPast||recoveryPast.start<stalePast.start)){opacity=.42;scale=.92;phase='stale_hold'}
  return {id,position,phase,truth,eventType,opacity,scale,accent};
}
function outputFrame(model,id,time){
  const base=model.base.outputs.get(id)||{},pos=copyPoint(base.position||{x:0,y:0,z:0});
  const emit=latestTrack(model.tracks,id,new Set(['output_emit']),time);
  const travel=latestTrack(model.tracks,id,new Set(['output_travel']),time);
  if(!emit&&!travel)return {id,visible:false,position:pos,scale:0,phase:'hidden',truth:null};
  let visible=false,position=pos,scale=1,phase='waiting',truth=FACT,eventType=emit?.eventType||travel?.eventType||null;
  if(emit&&time>=emit.start){
    visible=true;
    if(time<=emit.start+emit.duration){const p=progressOf(emit,time);scale=.15+.85*easeSpring(p);phase='emitting'}
  }
  if(travel&&time>=travel.start){
    const p=progressOf(travel,time);position=samplePath(travel.path,eased(p,travel.ease));phase='travelling';visible=time<=travel.start+travel.duration;scale=.86+.14*Math.sin(clamp(p)*Math.PI);
    if(time>travel.start+travel.duration){visible=false;phase='delivered';position=copyPoint(travel.to);scale=0}
  }
  return {id,visible,position,scale,phase,truth,eventType,source:base.source,target:base.target||travel?.meta?.target_node_key};
}
function nodeFrame(model,id,time){
  const position=copyPoint(model.base.nodes.get(id)||model.layout.nodes[id]||{x:0,y:0,z:0});
  const active=model.tracks.filter(t=>t.subject===id&&time>=t.start&&time<=t.start+t.duration&&['job_complete','dependency_impact','node_ready'].includes(t.kind)).sort((a,b)=>a.start-b.start).pop();
  if(!active)return {id,position,phase:'steady',pulse:0,truth:null,eventType:null};
  const p=progressOf(active,time),pulse=Math.sin(p*Math.PI);
  return {id,position,phase:active.kind,pulse,truth:active.truth,eventType:active.eventType};
}
function particleFrames(model,time){
  const out=[];
  for(const t of activeTracks(model,'dependency_impact',time)){
    const count=Math.max(0,Math.floor(num(t.meta?.particles,0))),p=progressOf(t,time),seed=hashString(t.id);
    for(let i=0;i<count;i++){
      const a=rand(seed,i)*Math.PI*2,rad=num(t.amplitude,.2)*(.25+.9*p)*(i+1)/Math.max(1,count);
      out.push({id:t.id+'-p'+i,position:{x:num(t.to?.x)+Math.cos(a)*rad,y:num(t.to?.y)+.04+Math.sin(p*Math.PI)*.12,z:num(t.to?.z)+Math.sin(a)*rad},alpha:(1-p)*.72,truth:FACT,eventType:t.eventType});
    }
  }
  return out;
}
function ambientNodeFrames(model,time){
  const out=[];
  for(const t of model.tracks){
    if(t.kind!=='ambient_node_breath')continue;
    const seed=hashString(t.subject),pulse=.5+.5*Math.sin(time*.75+(seed%628)/100);
    out.push({id:t.subject,position:copyPoint(t.from),phase:'ambient',pulse:pulse*num(t.amplitude),truth:AMBIENT,eventType:null});
  }
  return out;
}
function stepMotion(model,dt){
  if(!model||model.id!=='COLISEO_ANIMATION_MOTION_V1')return model;
  let seconds=num(dt,0);if(seconds>10)seconds/=1000;
  if(seconds<0)seconds=0;
  model.time=Math.max(0,num(model.time,0)+seconds);
  const workerIds=new Set([...model.base.workers.keys(),...model.tracks.filter(t=>String(t.kind).startsWith('worker_')).map(t=>t.subject)]);
  const outputIds=new Set([...model.base.outputs.keys(),...model.tracks.filter(t=>String(t.kind).startsWith('output_')).map(t=>t.subject)]);
  const nodeIds=new Set([...model.base.nodes.keys(),...model.tracks.filter(t=>['job_complete','dependency_impact','node_ready'].includes(t.kind)).map(t=>t.subject)]);
  model.frame={
    workers:[...workerIds].map(id=>workerFrame(model,id,model.time)),
    outputs:[...outputIds].map(id=>outputFrame(model,id,model.time)),
    nodes:[...nodeIds].map(id=>nodeFrame(model,id,model.time)),
    particles:particleFrames(model,model.time),
    ambient:ambientNodeFrames(model,model.time)
  };
  model.done=model.time>model.duration;
  return model;
}

const api={
  id:'animation',version:VERSION,deriveMotion,stepMotion,
  profiles:Object.freeze(Object.fromEntries(Object.entries(PROFILES).map(([k,v])=>[k,Object.freeze({...v})]))),
  truth:{FACT,AMBIENT},eventTypes:Object.freeze([...EVENT_TYPES])
};
g.COLISEO_LAB_MODULE=api;
g.PROMETEO_COLISEO_ANIMATION=api;
})(window);
