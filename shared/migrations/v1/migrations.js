((global)=>{
 'use strict';if(global.PrometeoMigrations)return;
 const registry=new Map();
 function fail(code,msg){const e=new Error(msg);e.code=code;throw e}
 function add(namespace,from,to,fn){const k=`${namespace}:${from}->${to}`;if(registry.has(k))fail('PROMETEO_MIGRATION_DUPLICATE',`Duplicate migration ${k}`);registry.set(k,fn)}
 function migrate(namespace,from,to,data){
  let version=from,out=structuredClone(data),guard=0;
  while(version!==to&&guard++<50){
    const prefix=`${namespace}:${version}->`;const edges=[...registry.entries()].filter(([k])=>k.startsWith(prefix));
    if(edges.length!==1)fail('PROMETEO_MIGRATION_PATH',`Expected one migration edge from ${namespace}:${version}`);
    const [k,fn]=edges[0],next=k.split('->')[1];out=fn(out);version=next;
  }
  if(version!==to)fail('PROMETEO_MIGRATION_TARGET',`Could not migrate ${namespace} ${from}->${to}`);
  return {version,data:out};
 }
 add('navigator','1','2',s=>({...s,schema:'prometeo.v53-semantic-return/v2',source_contract_id:s.source_contract_id||null,catalog_identity:s.catalog_identity||null}));
 add('class-state','1','2',s=>{const events=[...(s.events||[])];const x={...s,schema:'prometeo.class-state/v2',evidence_cursor:events.length};delete x.events;return {...x,_migrated_events:events}});
 add('student-world-state','1','2',s=>{const events=[...(s.events||[])];const x={...s,schema:'prometeo.student-world-state/v2',evidence_cursor:events.length};delete x.events;return {...x,_migrated_events:events}});
 add('current-graph','0','1',s=>({schema:'prometeo.current-graph/v1',revision:s.revision||1,catalog_identity:s.catalog_identity||null,artifacts:s.artifacts||{},pointers:s.pointers||{},page_currents:s.page_currents||{},shared_component_currents:s.shared_component_currents||{},active_workstream:s.active_workstream||null,pending_work:s.pending_work||[],last_durable_receipt:s.last_durable_receipt||null}));
 global.PrometeoMigrations=Object.freeze({version:'1.0.0-candidate',add,migrate,list:()=>[...registry.keys()]});
})(typeof globalThis!=='undefined'?globalThis:window);
