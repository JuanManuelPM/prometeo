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
for(const spec of bootstrap.required)documents[spec.role]=spec.role==='ledger'?jsonl(spec.path):json(spec.path);
const packet={schema:'prometeo.fresh-agent-input/v1',bootstrap,documents};
const child=fileURLToPath(new URL('./p3-02-fresh-agent-child.mjs',import.meta.url));
function invoke(input){
  const run=spawnSync(process.execPath,[child],{input:JSON.stringify(input),encoding:'utf8',cwd:'/tmp',env:{PROMETEO_FRESH_AGENT:'1',TZ:'UTC',LANG:'C.UTF-8'},maxBuffer:16*1024*1024});
  if(run.status!==0)throw new Error(`fresh-agent failed: ${run.stderr||run.stdout}`);
  return JSON.parse(run.stdout);
}
const answer=invoke(packet);
const current=documents.current_graph,head=documents.head,dot=documents.dot_state,parent=documents.parent,catalog=documents.catalog,op=documents.operator_contract;
const truth={visible:current.pointers.visible_frontend_current.artifact_id,candidate:current.pointers.candidate_current.artifact_id,head:head.artifact_id,phase:dot.phase,parent:parent.parent,served:current.pointers.served_current,human:Object.entries(current.pointers).filter(([k])=>k.startsWith('human_accepted')).map(([scope,p])=>({scope,artifact_id:p.artifact_id})),pageCount:(catalog.pages||[]).length,catalogIdentity:catalog.source_contract.identity,pending:documents.pending.items||[],howToChange:op.HOW_TO_CHANGE,howToTest:op.HOW_TO_TEST,howToRelease:op.HOW_TO_RELEASE};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const comparisons={visible_frontend:answer.ACTIVE_FRONTEND===truth.visible,candidate:answer.CURRENT.candidate===truth.candidate,head:answer.CURRENT.head===truth.head,phase:answer.CURRENT.phase===truth.phase,parent:answer.CURRENT.parent===truth.parent,served:same(answer.SERVED_INHERITED,truth.served),human_accepted:same(answer.HUMAN_ACCEPTED_SCOPES,truth.human),pages:answer.PAGES.count===truth.pageCount&&answer.PAGES.identity===truth.catalogIdentity,pending:same(answer.PENDING,truth.pending),how_to_change:answer.HOW_TO_CHANGE===truth.howToChange,how_to_test:answer.HOW_TO_TEST===truth.howToTest,how_to_release:answer.HOW_TO_RELEASE===truth.howToRelease,no_chat:answer.provenance.chat_history_received===false&&answer.provenance.worker_memory_received===false&&answer.provenance.highest_version_guess_used===false};
if(Object.values(comparisons).some(v=>v!==true))throw new Error('Fresh-agent machine-truth mismatch '+JSON.stringify(comparisons));
const mutated=structuredClone(packet);
mutated.documents.dot_state.phase='P3_02_SYNTHETIC_PHASE';
mutated.documents.current_graph.active_workstream.phase='P3_02_SYNTHETIC_PHASE';
mutated.documents.pending.items[0].title='SYNTHETIC_PENDING_PROBE';
mutated.documents.operator_contract.HOW_TO_CHANGE='SYNTHETIC_CHANGE_PROBE';
mutated.documents.current_graph.pointers.served_current.evidence_state='SYNTHETIC_SERVED_PROBE';
const probe=invoke(mutated);
const mutationProbes={phase:probe.CURRENT.phase==='P3_02_SYNTHETIC_PHASE',pending:probe.PENDING[0]?.title==='SYNTHETIC_PENDING_PROBE',operator_workflow:probe.HOW_TO_CHANGE==='SYNTHETIC_CHANGE_PROBE',served_state:probe.SERVED_INHERITED?.evidence_state==='SYNTHETIC_SERVED_PROBE'};
if(Object.values(mutationProbes).some(v=>v!==true))throw new Error('Fresh-agent source-dependence probe failed '+JSON.stringify(mutationProbes));
const source=read('scripts/p3-02-fresh-agent-child.mjs');
const isolation={no_fs_import:!source.includes('node:fs'),no_child_process_import:!source.includes('node:child_process'),no_fetch_call:!source.includes('fetch('),stdin_transport:true,minimal_environment:true};
if(Object.values(isolation).some(v=>v!==true))throw new Error('Fresh-agent isolation contract failed '+JSON.stringify(isolation));
let commit='UNKNOWN';try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim()}catch{}
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const evidence={schema:'prometeo.p3-02-fresh-agent-evidence/v1',gate:'P3-02',commit,agent_kind:'fresh deterministic process',external_llm:false,input_contract:{transport:'stdin',bootstrap_roles:bootstrap.required.map(x=>x.role),role_count:bootstrap.required.length,chat_history:false,worker_memory:false,repo_context_to_child:false},answer_digest:digest(answer),comparisons,mutation_probes:mutationProbes,isolation,recovered:{current:answer.CURRENT,human_accepted:answer.HUMAN_ACCEPTED_SCOPES,served:answer.SERVED_INHERITED,pending_count:answer.PENDING.length,active_frontend:answer.ACTIVE_FRONTEND,pages:answer.PAGES},truth_ceiling:{fresh_process_reincarnation_pass:true,source_dependence_pass:true,external_llm_fresh_chat_not_claimed:true,human_accepted:false,new_served_verification:false,production_changed:false}};
const art=new URL('../artifacts/p3-02/',import.meta.url);fs.mkdirSync(art,{recursive:true});fs.writeFileSync(new URL('agent-answer.json',art),JSON.stringify(answer,null,2)+'\n');fs.writeFileSync(new URL('evidence.json',art),JSON.stringify(evidence,null,2)+'\n');
process.stdout.write(JSON.stringify({ok:true,gate:'P3-02',commit,roles:bootstrap.required.length,comparisons:Object.keys(comparisons).length,mutationProbes:Object.keys(mutationProbes).length,answerDigest:evidence.answer_digest})+'\n');
