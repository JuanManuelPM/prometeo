/* Universal Entry · candidate pure policy adapter. No network, no private text persistence. */
export const KINDS=Object.freeze(['execution','status','intellectual','idea','create','continue','correction','error_version','research','product','priority','ambiguous']);
export const STATUSES=Object.freeze(['verified','implemented','candidate','blocked','pending','legacy','simulated','unknown']);
export const WRITE_KINDS=new Set(['execution','create','continue','correction','product']);
export function normalizeName(v){
 return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g,' ').trim();
}
export function projectCandidates(name,projects=[]){
 const q=normalizeName(name);if(!q)return [];
 return projects.filter(p=>{
  const a=normalizeName(p.label||p.name||p.id);
  return a===q||a.includes(q)||q.includes(a)||normalizeName(p.id)===q;
 }).map(p=>p.id);
}
export function validateGraph(g){
 if(!g||g.schema!=='prometeo.universal-entry-graph/v1'||!Array.isArray(g.nodes)||!Array.isArray(g.edges)||!Array.isArray(g.routes))throw Error('GRAPH_SCHEMA');
 const ids=new Set();
 for(const n of g.nodes){
  if(!/^[a-z][a-z0-9_-]+$/.test(n.id||'')||ids.has(n.id)||!STATUSES.includes(n.status)||!/^\d+\.\d+\.\d+$/.test(n.version||'')||!Number.isFinite(n.x)||!Number.isFinite(n.y))throw Error('NODE_INVALID');
  ids.add(n.id);
 }
 for(const e of g.edges)if(!ids.has(e.from)||!ids.has(e.to))throw Error('EDGE_INVALID');
 for(const route of g.routes){
  if(!/^[a-z]$/.test(route.id)||!Array.isArray(route.path)||!route.path.length||route.path.some(id=>!ids.has(id)))throw Error('ROUTE_INVALID');
 }
 return true;
}
export function planSignal(signal,projectIndex=[]){
 if(!signal||!Array.isArray(signal.intents)||!Array.isArray(signal.entities))throw Error('STRUCTURED_SIGNAL_REQUIRED');
 const intents=new Set(signal.intents);
 const uncertainty=[...(signal.uncertainty||[])];
 const ambiguous=intents.has('ambiguous_reference')||uncertainty.some(v=>['referente','acción','owner'].includes(v));
 const response={kind:'conversation',mutates:false,needs_authorization:false,blocked:[],requires:['context'],priority_change:false,owner:null};
 const actionable=['execute','continue_project','create_product','correct_order','create_project','deep_research','explicit_global_priority'].some(x=>intents.has(x));
 if(!ambiguous&&actionable&&(intents.has('status_question')||intents.has('intellectual_conversation')||intents.has('idea_unapproved'))){
  const conversational=['status_question','intellectual_conversation','idea_unapproved'].filter(x=>intents.has(x));
  const remaining=signal.intents.filter(x=>!conversational.includes(x));
  const part=planSignal({...signal,intents:remaining},projectIndex);
  return {...part,kind:'compound',subroutes:[...conversational,part.kind],requires:[...new Set(['fresh_owner',...part.requires])]};
 }
 if(intents.has('status_question')&&!([...intents].some(x=>['execute','create_project','correct_order'].includes(x)))){
  response.kind='status';response.requires=['fresh_owner','head','evidence'];return response;
 }
 if(intents.has('intellectual_conversation')||intents.has('idea_unapproved')){
  response.kind=intents.has('idea_unapproved')?'idea':'intellectual';return response;
 }
 if(ambiguous){response.kind='ambiguous';response.blocked.push('REFERENT_OR_INTENT_UNRESOLVED');return response;}
 if(intents.has('explicit_global_priority')){
  response.priority_change=true;response.needs_authorization=true;response.kind='priority';return response;
 }
 if(intents.has('create_project')){
  response.kind='create';response.needs_authorization=true;
  const candidates=signal.entities.flatMap(x=>projectCandidates(x,projectIndex));
  if(candidates.length){response.blocked.push('DUPLICATE_REVIEW');response.owner=candidates[0];}
  response.requires=['registry','owner','authorization','readback'];
  return response;
 }
 if(['execute','continue_project','create_product','correct_order','deep_research'].some(x=>intents.has(x))){
  response.kind=intents.has('deep_research')&&!intents.has('execute')&&!intents.has('create_product')?'research':'work';
  response.requires=['scoped_owner','proof_plan','capabilities','permissions','tests'];
  if(response.kind==='work'){response.needs_authorization=true;}
  return response;
 }
 return response;
}
export function compatible(oldModule,nextModule){
 if(!oldModule||!nextModule||oldModule.id!==nextModule.id)return {ok:false,reason:'IDENTITY'};
 const a=String(oldModule.version||'').split('.').map(Number),b=String(nextModule.version||'').split('.').map(Number);
 if(a.length!==3||b.length!==3||a.some(Number.isNaN)||b.some(Number.isNaN))return {ok:false,reason:'SEMVER'};
 if(a[0]!==b[0])return {ok:false,reason:'MAJOR_MIGRATION_REQUIRED'};
 if(oldModule.output!==nextModule.output)return {ok:false,reason:'OUTPUT_MIGRATION_REQUIRED'};
 return {ok:true,reason:'COMPATIBLE_MINOR_OR_PATCH'};
}
