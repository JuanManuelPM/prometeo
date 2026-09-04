import fs from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const base=new URL('../',import.meta.url);
const read=rel=>fs.readFileSync(new URL(rel,base),'utf8');
const json=rel=>JSON.parse(read(rel));
const jsonl=rel=>read(rel).trim().split(/\n+/).filter(Boolean).map(JSON.parse);
const bootstrap=json('reincarnation/BOOTSTRAP.json');
const documents={};
for(const spec of bootstrap.required){
  documents[spec.role]=spec.role==='ledger'?jsonl(spec.path):json(spec.path);
}
const child=fileURLToPath(new URL('./p3-03-hop-child.mjs',import.meta.url));
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function invoke(input,{expectFailure=false}={}){
  const run=spawnSync(process.execPath,[child],{
    input:JSON.stringify(input),encoding:'utf8',cwd:'/tmp',
    env:{PROMETEO_HOP:'1',TZ:'UTC',LANG:'C.UTF-8'},maxBuffer:16*1024*1024
  });
  if(expectFailure){
    if(run.status===0)throw new Error('Negative hop probe unexpectedly passed');
    return {failed:true,status:run.status,stderr:String(run.stderr||run.stdout).slice(0,4000)};
  }
  if(run.status!==0)throw new Error(`hop child failed: ${run.stderr||run.stdout}`);
  return JSON.parse(run.stdout);
}
const packet={schema:'prometeo.hop-input/v1',documents};
const A=invoke({...packet,hop_id:'PROCESS-A'});
const B=invoke({...packet,hop_id:'PROCESS-B',previous_capsule:A.capsule});
const C=invoke({...packet,hop_id:'PROCESS-C',previous_capsule:B.capsule});
if(new Set([A.capsule.truth_digest,B.capsule.truth_digest,C.capsule.truth_digest]).size!==1)throw new Error('Truth digest changed across clean process hops');
if(B.capsule.previous_truth_digest!==A.capsule.truth_digest||C.capsule.previous_truth_digest!==B.capsule.truth_digest)throw new Error('Hop chain linkage mismatch');
for(const ans of [A,B,C]){
  const p=ans.provenance||{};
  if(p.transport!=='stdin'||p.repo_access!==false||p.network_access!==false||p.chat_history_received!==false||p.worker_memory_received!==false||p.hidden_singleton_required!==false)throw new Error('Isolation provenance mismatch '+JSON.stringify(p));
}
const negative={};
{
  const prev=structuredClone(C.capsule);prev.current_revision-=1;
  negative.stale_revision=invoke({...packet,hop_id:'NEG-STALE',previous_capsule:prev},{expectFailure:true}).failed;
}
{
  const prev=structuredClone(C.capsule);prev.last_receipt_hash='0'.repeat(64);
  negative.forged_receipt_hash=invoke({...packet,hop_id:'NEG-FORGED',previous_capsule:prev},{expectFailure:true}).failed;
}
{
  const prev=structuredClone(C.capsule);prev.next_gate='P3-99_SYNTHETIC';
  negative.next_gate_drift=invoke({...packet,hop_id:'NEG-GATE',previous_capsule:prev},{expectFailure:true}).failed;
}
{
  const mutated=structuredClone(documents);mutated.pending.items=[];
  negative.missing_pending_frontier=invoke({schema:'prometeo.hop-input/v1',hop_id:'NEG-PENDING',documents:mutated},{expectFailure:true}).failed;
}
if(Object.values(negative).some(v=>v!==true))throw new Error('Negative hop probes incomplete '+JSON.stringify(negative));
const source=read('scripts/p3-03-hop-child.mjs');
const isolation={
  no_fs_import:!source.includes('node:fs'),
  no_child_process_import:!source.includes('node:child_process'),
  no_fetch_call:!source.includes('fetch('),
  no_env_dependency:!source.includes('process.env'),
  stdin_transport:source.includes('process.stdin')
};
if(Object.values(isolation).some(v=>v!==true))throw new Error('Hop child isolation contract failed '+JSON.stringify(isolation));
let commit='UNKNOWN';try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim()}catch{}
const art=new URL('../artifacts/p3-03/',import.meta.url);fs.mkdirSync(art,{recursive:true});
for(const [name,ans] of [['process-a',A],['process-b',B],['process-c',C]])fs.writeFileSync(new URL(`${name}.json`,art),JSON.stringify(ans,null,2)+'\n');
const evidence={
  schema:'prometeo.p3-03-process-hop-evidence/v1',gate:'P3-03',commit,
  process_hops:3,truth_digest:A.capsule.truth_digest,capsule_chain:[A.capsule,B.capsule,C.capsule],
  negative_probes:negative,isolation,
  recovered:{revision:C.summary.current_revision,last_receipt:C.summary.last_receipt_id,phase:C.summary.phase,next_gate:C.summary.next_gate,pending:C.summary.pending_frontier.map(x=>x.id),visible_frontend:C.summary.visible_frontend?.artifact_id,catalog_identity:C.summary.catalog_identity},
  truth_ceiling:{clean_process_hops_pass:true,conversationless_handoff_contract_pass:true,real_external_chat_restart_tested:false,browser_restart_tested:false,human_accepted:false,new_served_verification:false,production_changed:false}
};
fs.writeFileSync(new URL('process-evidence.json',art),JSON.stringify(evidence,null,2)+'\n');
process.stdout.write(JSON.stringify({ok:true,gate:'P3-03',kind:'process-hops',commit,hops:3,negativeProbes:Object.keys(negative).length,truthDigest:A.capsule.truth_digest,evidenceDigest:digest(evidence)})+'\n');
