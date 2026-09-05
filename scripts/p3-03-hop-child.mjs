import {createHash} from 'node:crypto';

const chunks=[];
for await (const chunk of process.stdin) chunks.push(chunk);
const raw=Buffer.concat(chunks).toString('utf8');
const input=JSON.parse(raw);
const docs=input.documents||{};
const fail=(code,detail={})=>{const e=new Error(code);e.detail=detail;throw e};
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

for(const role of ['current_graph','dot_state','pending','carry','watermarks','catalog','ledger']){
  if(!(role in docs)) fail('HOP_MISSING_ROLE',{role});
}
if(docs.current_graph?.schema!=='prometeo.current-graph/v1') fail('HOP_CURRENT_SCHEMA');
if(docs.dot_state?.schema!=='prometeo.dot-state/v1') fail('HOP_DOT_SCHEMA');
if(docs.pending?.schema!=='prometeo.pending/v1') fail('HOP_PENDING_SCHEMA');
if(docs.carry?.schema!=='prometeo.carry/v1') fail('HOP_CARRY_SCHEMA');
if(docs.watermarks?.schema!=='prometeo.watermarks/v1') fail('HOP_WATERMARK_SCHEMA');
if(docs.catalog?.schema!=='prometeo.catalog-manifest/v1') fail('HOP_CATALOG_SCHEMA');
if(!Array.isArray(docs.ledger)||docs.ledger.length<1) fail('HOP_LEDGER_EMPTY');

for(let i=1;i<docs.ledger.length;i++){
  if(docs.ledger[i].prev_hash!==docs.ledger[i-1].hash) fail('HOP_LEDGER_CHAIN',{index:i});
}
const last=docs.ledger.at(-1);
const current=docs.current_graph;
const dot=docs.dot_state;
if(current.last_durable_receipt!==last.id) fail('HOP_CURRENT_RECEIPT_MISMATCH',{current:current.last_durable_receipt,last:last.id});
if(dot.last_receipt!==last.id) fail('HOP_DOT_RECEIPT_MISMATCH',{dot:dot.last_receipt,last:last.id});
if(current.active_workstream?.phase!==dot.phase) fail('HOP_PHASE_MISMATCH');
const pendingItems=docs.pending.items||[];
if(pendingItems.length<1) fail('HOP_PENDING_FRONTIER_EMPTY');
const firstPending=pendingItems[0];
if(!firstPending.next_action) fail('HOP_PENDING_NEXT_ACTION_MISSING');
const readyGate=String(dot.next_gate||'').replace(/_.*/, '');

const humanAccepted=Object.entries(current.pointers||{})
  .filter(([k])=>k.startsWith('human_accepted'))
  .map(([scope,p])=>({scope,artifact_id:p.artifact_id,receipt_id:p.receipt_id}));
const summary={
  current_revision:current.revision,
  last_receipt_id:last.id,
  last_receipt_hash:last.hash,
  phase:dot.phase,
  next_gate:dot.next_gate,
  pending_frontier:pendingItems.map(x=>({id:x.id,state:x.state,dependencies:x.dependencies||[],next_action:x.next_action})),
  carry_invariants:(docs.carry.items||[]).map(x=>({id:x.id,kind:x.kind,text:x.text})),
  watermarks:docs.watermarks.sources||{},
  catalog_identity:current.catalog_identity,
  visible_frontend:current.pointers?.visible_frontend_current,
  human_accepted_scopes:humanAccepted,
  served_pointer:current.pointers?.served_current
};
const truthDigest=digest(summary);

if(input.previous_capsule){
  const prev=input.previous_capsule;
  if(prev.truth_digest!==truthDigest) fail('HOP_STALE_OR_DRIFTED_TRUTH',{previous:prev.truth_digest,current:truthDigest});
  if(prev.current_revision!==summary.current_revision) fail('HOP_STALE_REVISION',{previous:prev.current_revision,current:summary.current_revision});
  if(prev.last_receipt_hash!==summary.last_receipt_hash) fail('HOP_FORGED_RECEIPT',{previous:prev.last_receipt_hash,current:summary.last_receipt_hash});
  if(prev.next_gate!==summary.next_gate) fail('HOP_NEXT_GATE_DRIFT',{previous:prev.next_gate,current:summary.next_gate});
  if(prev.pending_digest!==digest(summary.pending_frontier)) fail('HOP_PENDING_DRIFT');
}

const capsule={
  schema:'prometeo.hop-capsule/v1',
  hop_id:String(input.hop_id||'unknown'),
  current_revision:summary.current_revision,
  last_receipt_id:summary.last_receipt_id,
  last_receipt_hash:summary.last_receipt_hash,
  phase:summary.phase,
  next_gate:summary.next_gate,
  pending_digest:digest(summary.pending_frontier),
  truth_digest:truthDigest,
  previous_truth_digest:input.previous_capsule?.truth_digest||null
};

const answer={
  schema:'prometeo.hop-answer/v1',
  capsule,
  summary,
  provenance:{
    transport:'stdin',
    repo_access:false,
    network_access:false,
    chat_history_received:false,
    worker_memory_received:false,
    hidden_singleton_required:false
  },
  ready_gate_hint:readyGate
};
process.stdout.write(JSON.stringify(answer));
