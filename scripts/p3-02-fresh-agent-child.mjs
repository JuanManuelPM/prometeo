import {createHash} from 'node:crypto';

const stable=value=>{
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
};
const sha=text=>createHash('sha256').update(String(text)).digest('hex');
const body=r=>{const x=structuredClone(r);delete x.hash;return x};
const fail=(code,message,detail={})=>{const e=new Error(message);e.code=code;e.detail=detail;throw e};
const readStdin=async()=>{let s='';for await(const chunk of process.stdin)s+=chunk;return s};

const packet=JSON.parse(await readStdin());
if(packet?.schema!=='prometeo.fresh-agent-input/v1')fail('P3_02_PACKET','Invalid fresh-agent packet');
const bootstrap=packet.bootstrap,docs=packet.documents||{};
if(bootstrap?.schema!=='prometeo.reincarnation-bootstrap/v1')fail('P3_02_BOOTSTRAP','Invalid bootstrap');
const specs=bootstrap.required||[];
const expectedRoles=specs.map(s=>s.role).sort();
const actualRoles=Object.keys(docs).sort();
if(JSON.stringify(expectedRoles)!==JSON.stringify(actualRoles))fail('P3_02_ROLE_SET','Fresh agent received missing or extra durable roles',{expectedRoles,actualRoles});
for(const spec of specs){
  const value=docs[spec.role];
  if(spec.role==='ledger'){
    if(!Array.isArray(value)||!value.length||value.some(r=>r.schema!==spec.schema))fail('P3_02_SCHEMA',`Invalid ledger ${spec.path}`);
  }else if(value?.schema!==spec.schema)fail('P3_02_SCHEMA',`Schema mismatch for ${spec.role}`);
}
const ledger=docs.ledger;let prev='GENESIS';const ids=new Set();
for(const r of ledger){
  if(ids.has(r.id))fail('P3_02_LEDGER_DUP','Duplicate receipt');ids.add(r.id);
  if(r.prev_hash!==prev)fail('P3_02_LEDGER_CHAIN','Broken ledger chain',{id:r.id,expected:prev,actual:r.prev_hash});
  const h=sha(stable(body(r)));if(h!==r.hash)fail('P3_02_LEDGER_HASH','Receipt hash mismatch',{id:r.id});prev=h;
}
const current=docs.current_graph,head=docs.head,dot=docs.dot_state,parent=docs.parent,catalog=docs.catalog,op=docs.operator_contract;
const candidate=current.pointers?.candidate_current;
if(!candidate||candidate.artifact_id!==head.artifact_id||candidate.receipt_id!==head.receipt_id)fail('P3_02_HEAD_DRIFT','HEAD drift');
if(parent.child!==head.artifact_id)fail('P3_02_PARENT_DRIFT','Parent drift');
if(dot.last_receipt!==current.last_durable_receipt)fail('P3_02_RECEIPT_DRIFT','Receipt drift');
if(dot.active_branch!==current.active_workstream?.branch)fail('P3_02_BRANCH_DRIFT','Branch drift');
if(catalog.source_contract?.identity!==current.catalog_identity)fail('P3_02_CATALOG_DRIFT','Catalog drift');
for(const [name,p] of Object.entries(current.pointers||{}))if(!ids.has(p.receipt_id))fail('P3_02_POINTER_RECEIPT','Pointer receipt absent',{name,receipt:p.receipt_id});
const visible=current.pointers?.visible_frontend_current?.artifact_id||null;
const human=Object.entries(current.pointers||{}).filter(([k])=>k.startsWith('human_accepted')).map(([scope,p])=>({scope,artifact_id:p.artifact_id}));
const answer={
  schema:'prometeo.fresh-agent-answer/v1',
  provenance:{transport:'stdin',chat_history_received:false,worker_memory_received:false,highest_version_guess_used:false,file_system_context_received:false,network_context_received:false,roles:expectedRoles},
  WHAT_IS_PROMETEO:op.WHAT_IS_PROMETEO,
  CURRENT:{head:head.artifact_id,visible_frontend:visible,candidate:candidate.artifact_id,phase:dot.phase,parent:parent.parent,active_branch:dot.active_branch,revision:current.revision},
  HUMAN_ACCEPTED_SCOPES:human,
  SERVED_INHERITED:current.pointers?.served_current||null,
  ACTIVE_FRONTEND:visible,
  PAGES:{count:(catalog.pages||[]).length,identity:catalog.source_contract?.identity||null},
  CAPABILITIES:(docs.capabilities.capabilities||[]).map(c=>({id:c.id,best_known:c.best_known,human_accepted:c.human_accepted,rollback_donor:c.rollback_donor})),
  PENDING:structuredClone(docs.pending.items||[]),
  RULES:(docs.carry.items||[]).map(x=>x.text),
  HOW_TO_CHANGE:op.HOW_TO_CHANGE,
  HOW_TO_TEST:op.HOW_TO_TEST,
  HOW_TO_RELEASE:op.HOW_TO_RELEASE
};
const required=bootstrap.wake_contract?.must_answer||[];
for(const key of required)if(!(key in answer))fail('P3_02_REQUIRED_ANSWER','Missing required answer',{key});
process.stdout.write(JSON.stringify(answer));
