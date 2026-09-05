/* Prometeo Living Lineage v1 — Part 2 candidate. */
((global)=>{
  'use strict';
  if(global.PrometeoLineage) return;
  const STATES=new Set(['SOURCE','RECOVERED','RECONSTRUCTED','CANDIDATE','TESTED_CANDIDATE','HUMAN_ACCEPTED','SERVED','ARCHIVED']);
  function fail(code,msg,detail={}){const e=new Error(msg);e.code=code;e.detail=detail;throw e;}
  function validate(graph,capabilities,{supersession=[]}={}){
    if(graph?.schema!=='prometeo.lineage-graph/v1')fail('PROMETEO_LINEAGE_SCHEMA','Invalid lineage schema');
    const nodes=new Map();
    for(const n of graph.nodes||[]){
      if(!n.id)fail('PROMETEO_LINEAGE_NODE_ID','Lineage node missing id');
      if(nodes.has(n.id))fail('PROMETEO_LINEAGE_DUPLICATE_NODE',`Duplicate lineage node ${n.id}`);
      if(!STATES.has(n.state))fail('PROMETEO_LINEAGE_STATE',`Invalid state ${n.state}`);
      nodes.set(n.id,n);
    }
    for(const n of nodes.values())for(const p of n.parents||[])if(!nodes.has(p))fail('PROMETEO_LINEAGE_UNKNOWN_PARENT',`Unknown parent ${p}`,{node:n.id});
    const visiting=new Set(),done=new Set();
    function visit(id){
      if(done.has(id))return;
      if(visiting.has(id))fail('PROMETEO_LINEAGE_CYCLE','Lineage parent cycle',{id});
      visiting.add(id); for(const p of nodes.get(id)?.parents||[])visit(p); visiting.delete(id);done.add(id);
    }
    for(const id of nodes.keys())visit(id);
    for(const e of graph.edges||[]){
      if(!nodes.has(e.from)||!nodes.has(e.to))fail('PROMETEO_LINEAGE_EDGE_NODE','Edge references unknown node',{edge:e});
      if(e.type==='SUPERSEDES'&&!e.scope)fail('PROMETEO_LINEAGE_SUPERSESSION_SCOPE','Supersession requires scope',{edge:e});
    }
    const capIds=new Set();
    for(const c of capabilities?.capabilities||[]){
      if(capIds.has(c.id))fail('PROMETEO_CAPABILITY_DUPLICATE',`Duplicate capability ${c.id}`);capIds.add(c.id);
      for(const k of ['best_known','second_best','human_accepted','latest_experiment','rollback_donor']){
        if(c[k]&&!nodes.has(c[k]))fail('PROMETEO_CAPABILITY_UNKNOWN_NODE',`Capability ${c.id} references unknown ${k} ${c[k]}`);
      }
    }
    const supIds=new Set();
    for(const s of supersession){
      if(supIds.has(s.id))fail('PROMETEO_SUPERSESSION_DUPLICATE',`Duplicate supersession ${s.id}`);supIds.add(s.id);
      if(!s.scope||!s.old||!s.new)fail('PROMETEO_SUPERSESSION_FIELDS','Invalid supersession record',{s});
    }
    return Object.freeze({ok:true,nodeCount:nodes.size,capabilityCount:capIds.size,supersessionCount:supIds.size});
  }
  function capabilityView(id,capabilities,graph){
    const c=(capabilities.capabilities||[]).find(x=>x.id===id);if(!c)return null;
    const nodes=new Map((graph.nodes||[]).map(n=>[n.id,n]));
    const map=k=>c[k]?structuredClone(nodes.get(c[k])):null;
    return Object.freeze({id:c.id,bestKnown:map('best_known'),secondBest:map('second_best'),humanAccepted:map('human_accepted'),latestExperiment:map('latest_experiment'),rollbackDonor:map('rollback_donor'),lostCapability:[...(c.lost_capability||[])]});
  }
  function resolveSupersession(value,scope,records){
    let current=value,guard=0,trail=[];
    while(guard++<100){
      const matches=records.filter(r=>r.scope===scope&&r.old===current);
      if(matches.length>1)fail('PROMETEO_SUPERSESSION_CONFLICT',`Multiple supersessions for ${current} in ${scope}`,{matches});
      if(!matches.length)break;
      const r=matches[0]; trail.push(r); current=r.new;
      if(trail.some((x,i)=>i<trail.length-1&&x.old===current))fail('PROMETEO_SUPERSESSION_CYCLE','Supersession cycle',{scope,current});
    }
    return Object.freeze({input:value,scope,current,trail:structuredClone(trail)});
  }
  global.PrometeoLineage=Object.freeze({version:'1.0.0-candidate',validate,capabilityView,resolveSupersession});
})(typeof globalThis!=='undefined'?globalThis:window);
