(function(g){
'use strict';
function nowIso(secAgo=0){return new Date(Date.now()-secAgo*1000).toISOString()}
function build(){
  const projects=[
    {project_key:'FIX_VISUAL',title:'Visual Runtime',guide_key:'VISUAL'},
    {project_key:'FIX_STUDY',title:'Study Pipeline',guide_key:'STUDY'},
    {project_key:'FIX_KERNEL',title:'Worker Kernel',guide_key:'KERNEL'}
  ];
  const specs=[
    ['FIX_VISUAL','V',[
      ['R1','World research','ROOT','SUCCESS',[]],['R2','Composition rules','ROOT','SUCCESS',[]],['R3','Scale tests','ROOT','ACTIVE',[]],
      ['D1','World reducer','REDUCER','READY',['R1','R2']],['S1','Runtime synthesis','SYNTHESIS','BLOCKED',['D1','R3']],
      ['Q1','Independent verify','VERIFY','BLOCKED',['S1']],['P1','Canonical result','PROMOTION','BLOCKED',['Q1']]
    ]],
    ['FIX_STUDY','S',[
      ['R1','Ingest','ROOT','SUCCESS',[]],['R2','Normalize','ROOT','SUCCESS',[]],['D1','Reader packet','REDUCER','ACTIVE',['R1','R2']],
      ['S1','Reader synthesis','SYNTHESIS','BLOCKED',['D1']],['Q1','Browser verify','VERIFY','BLOCKED',['S1']],['P1','Study current','PROMOTION','BLOCKED',['Q1']]
    ]],
    ['FIX_KERNEL','K',[
      ['R1','Lease semantics','ROOT','SUCCESS',[]],['R2','Recovery rules','ROOT','SUCCESS',[]],['D1','Kernel reducer','REDUCER','SUCCESS',['R1','R2']],
      ['S1','Kernel synthesis','SYNTHESIS','SUCCESS',['D1']],['Q1','Lease verifier','VERIFY','ACTIVE',['S1']],['P1','Kernel current','PROMOTION','BLOCKED',['Q1']]
    ]]
  ];
  const nodes=[];
  for(const [pk,prefix,rows] of specs){
    for(const [id,title,kind,state,deps] of rows){
      nodes.push({
        project_key:pk,objective_key:pk,guide_key:projects.find(p=>p.project_key===pk).guide_key,
        node_key:prefix+'-'+id,title,node_kind:kind,state,depends_on:deps.map(d=>prefix+'-'+d),
        progress_stage:state==='ACTIVE'?(kind==='VERIFY'?'VERIFY':kind==='REDUCER'?'WRITE':'BUILD'):null,priority:100
      });
    }
  }
  const workers=[
    {worker_id:'fixture-worker-01',display_code:'W01',project_key:'FIX_VISUAL',node_key:'V-R3',title:'Scale tests',progress_stage:'BUILD',liveness:'LIVE',freshness:.97,age_seconds:9,heartbeat_seconds:120,last_signal_at:nowIso(9),recovery_count:0,assignment_generation:3},
    {worker_id:'fixture-worker-02',display_code:'W02',project_key:'FIX_STUDY',node_key:'S-D1',title:'Reader packet',progress_stage:'WRITE',liveness:'AGING',freshness:.63,age_seconds:84,heartbeat_seconds:120,last_signal_at:nowIso(84),recovery_count:1,assignment_generation:5},
    {worker_id:'fixture-worker-03',display_code:'W03',project_key:'FIX_KERNEL',node_key:'K-Q1',title:'Lease verifier',progress_stage:'VERIFY',liveness:'SUSPECT',freshness:.31,age_seconds:238,heartbeat_seconds:120,last_signal_at:nowIso(238),recovery_count:0,assignment_generation:2}
  ];
  const counts={
    working:workers.length,live:workers.filter(w=>w.liveness==='LIVE').length,aging:workers.filter(w=>w.liveness==='AGING').length,
    suspect:workers.filter(w=>w.liveness==='SUSPECT').length,ready:nodes.filter(n=>n.state==='READY').length,
    blocked:nodes.filter(n=>n.state==='BLOCKED').length,active_jobs:nodes.filter(n=>n.state==='ACTIVE').length
  };
  return {schema:'prometeo.public_worker_world/v3',generated_at:new Date().toISOString(),revision:'COLISEO_SHARED_FIXTURE_V1',rule:'SYNTHETIC FIXTURE — never live',demo:true,projects,nodes,workers,counts};
}
g.PROMETEO_COLISEO_FIXTURE_V1={id:'COLISEO_SHARED_FIXTURE_V1',build};
})(window);
