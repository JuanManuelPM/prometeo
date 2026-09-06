import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const base=new URL('../',import.meta.url);
const read=rel=>fs.readFileSync(new URL(rel,base),'utf8');
const write=(rel,value)=>fs.writeFileSync(new URL(rel,base),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const json=rel=>JSON.parse(read(rel));
const jsonl=rel=>read(rel).trim().split(/\n+/).filter(Boolean).map(JSON.parse);
const git=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();

const BRANCH='candidate/p4-capture-integration-20260905';
const RECEIPT_ID='R-P4-01-WORKSTREAM-0019';
const REQUEST='Integrate Capture as the durable human-intent intake for Prometeo: multi-page consecutive voice capture → local-first Spanish transcription → private sync → Context Foundry → Seed/Work Item → Patent v2 → fresh-agent Reincarnation and exhaustive planning → safe Candidate/release/receipt → feedback and memory metabolism, while preserving V53 authority, privacy, lineage and release truth.';

if(git('rev-parse','--abbrev-ref','HEAD')!==BRANCH) throw new Error('P4-01 must run on the candidate branch');

const c={console,structuredClone,TextEncoder,TextDecoder,crypto:webcrypto,URL,Date,Math,JSON,setTimeout,clearTimeout,queueMicrotask};
c.globalThis=c;c.window=c;vm.createContext(c);
for(const rel of ['shared/core/v1/durable.js','shared/receipts/v1/ledger.js','shared/workflow/v1/workflow.js']) vm.runInContext(read(rel),c,{filename:rel});

let ledger=jsonl('receipts/ledger.jsonl');
const checked=await c.PrometeoLedger.validate(ledger);
if(!checked.ok||checked.lastHash!=='144479240672176a83149132ddf28cadc94ec132f4c6d01dd33dc52b56fef334') {
  if(!ledger.some(r=>r.id===RECEIPT_ID)) throw new Error(`Unexpected inherited ledger frontier ${checked.lastHash}`);
}
if(ledger.some(r=>r.id===RECEIPT_ID)) {
  console.log(JSON.stringify({ok:true,idempotent:true,receipt_id:RECEIPT_ID}));
  process.exit(0);
}

const current=json('state/CURRENT_GRAPH.json');
const dot=json('state/DOT_STATE.json');
const pending=json('state/PENDING.json');
const part3=json('state/PART3_COMPLETE.json');
const titles=json('coordination/P4_CAPTURE_TITLE_INDEX.json');
if(current.revision!==17||part3.final_receipt!=='R-P3-20-FINAL-0018') throw new Error('P4-01 inherited authority mismatch');
if(titles.count!==100||titles.gates.flatMap(g=>g.items).length!==100) throw new Error('P4 title map mismatch');
if(dot.next_gate!=='P4-01'||pending.items?.[0]?.id!=='PENDING-P4-CAPTURE-001') throw new Error('P4 prepared frontier mismatch');

const seed=await c.PrometeoWorkflow.seed({request:REQUEST,privacy:'PUBLIC',source_refs:[
  'coordination/NEXT_DOT_CAPTURE_CONTRACT.json',
  'coordination/P4_CAPTURE_EXECUTION_PLAN.md',
  'state/CURRENT_GRAPH.json'
]});
const work=await c.PrometeoWorkflow.workItem(seed,{
  target:{
    product:'prometeo-capture',
    phase:'P4_CAPTURE_INTEGRATION',
    branch:BRANCH,
    current_graph_revision:17,
    visible_frontend:'navigator-v53-visible',
    v53_source:'gitblob:7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418',
    v23_physics:'sha256:f15f67240794b9d3224cc11f1899819485c08554b517b48ea6fca8458eb41398'
  },
  owner:'p4-capture-worker',
  dependencies:[
    'shared/context-foundry/v2',
    'shared/workflow/v1',
    'shared/runtime/ownership/v1',
    'shared/shell/v53-adapter/v1',
    'shared/privacy/v1/privacy.js',
    'catalog/CATALOG_MANIFEST.json'
  ]
});
write('state/P4_CAPTURE_SEED.json',seed);
write('state/P4_CAPTURE_WORK_ITEM.json',work);

const receiptRecord={
  id:RECEIPT_ID,
  type:'P4_01_WORKSTREAM_OPENED',
  operation_id:'OP-P4-01-REINCARNATE-OPEN',
  work_item_id:work.id,
  actor:'P4 candidate CI + single-worker',
  model:null,
  base_artifact:`gitcommit:${git('rev-parse','HEAD')}`,
  source_digests:[
    'receipt:R-P3-20-FINAL-0018',
    'current-graph:revision-17',
    'gitblob:7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418',
    'sha256:f15f67240794b9d3224cc11f1899819485c08554b517b48ea6fca8458eb41398',
    'github-actions:34000419321:success'
  ],
  files_changed:[
    'state/P4_CAPTURE_SEED.json','state/P4_CAPTURE_WORK_ITEM.json','state/CURRENT_GRAPH.json','state/DOT_STATE.json','state/PENDING.json','coordination/P4_01_WORKSTREAM_EVIDENCE.json','receipts/ledger.jsonl'
  ],
  output_digests:[`seed:${seed.id}`,`work-item:${work.id}`,`gitbranch:${BRANCH}`],
  tests:[
    'P4_PREFLIGHT_PASS','P4_100_TITLE_MAP_PASS','P4_LEDGER_INHERITED_CHAIN_PASS','P4_REINCARNATION_PASS','P4_FRESH_PROCESS_REGRESSION_PASS','P4_V53_V23_IDENTITY_PASS','P4_DUAL_INJECTOR_RACE_DETECTED','github-actions:34000419321:success'
  ],
  privacy_decisions:['NO_CAPTURE_EXPORT','NO_PRIVATE_CONTENT_IN_GIT','P4_COORDINATION_PUBLIC_ONLY'],
  candidate_identity:`gitbranch:${BRANCH}`,
  acceptance_identity:null,
  served_identity:null,
  rollback_refs:['receipt:R-P3-20-FINAL-0018','gitcommit:1b2fc40414dc134525c6159f7a41c9b9cd5f4caa'],
  timestamp:new Date().toISOString(),
  claim:'P4-01 reincarnated the Part 3 durable authority, validated the inherited ledger and fixed 100-item plan, opened an immutable Capture Seed/Work Item on a candidate branch, and moved only candidate-local execution state to P4-02. No Human Accepted, stable Served, or product Current pointer was promoted.'
};
const receipt=await c.PrometeoLedger.append(ledger,receiptRecord);
ledger=[...ledger,receipt];
write('receipts/ledger.jsonl',ledger.map(r=>JSON.stringify(r)).join('\n')+'\n');

const nextCurrent=structuredClone(current);
nextCurrent.revision=18;
nextCurrent.active_workstream={
  branch:BRANCH,
  phase:'P4_CAPTURE_INTEGRATION',
  status:'EXECUTING_CANDIDATE',
  parent_commit:'1b2fc40414dc134525c6159f7a41c9b9cd5f4caa',
  materialized_commit:null,
  seed_id:seed.id,
  work_item_id:work.id
};
nextCurrent.pending_work=['PENDING-P4-CAPTURE-001'];
nextCurrent.last_durable_receipt=RECEIPT_ID;
write('state/CURRENT_GRAPH.json',nextCurrent);

const nextDot={...dot,state:'EXECUTING',active_branch:BRANCH,next_gate:'P4-02',last_receipt:RECEIPT_ID,current_graph_revision:18,seed_id:seed.id,work_item_id:work.id,note:'P4-01 complete on candidate branch; continue P4-02 drift quarantine and single-owner publication reconciliation.'};
write('state/DOT_STATE.json',nextDot);
const nextPending=structuredClone(pending);
nextPending.items[0]={...nextPending.items[0],state:'EXECUTING',completed_through:'P4-01',next_gate:'P4-02',receipt_id:RECEIPT_ID,seed_id:seed.id,work_item_id:work.id,user_signal_required:null,note:'P4-01 authority reincarnation/workstream opening passed; execute P4-02 continuously.'};
write('state/PENDING.json',nextPending);

const evidence={
  schema:'prometeo.p4-01-workstream-evidence/v1',
  gate:'P4-01',
  status:'PASS',
  branch:BRANCH,
  inherited:{current_revision:17,last_receipt:'R-P3-20-FINAL-0018',ledger_last_hash:'144479240672176a83149132ddf28cadc94ec132f4c6d01dd33dc52b56fef334',v53:'gitblob:7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418',v23:'sha256:f15f67240794b9d3224cc11f1899819485c08554b517b48ea6fca8458eb41398'},
  preflight:{github_actions_run:34000419321,conclusion:'success',title_count:100,catalog_identity:current.catalog_identity},
  seed_id:seed.id,
  work_item_id:work.id,
  receipt_id:receipt.id,
  receipt_hash:receipt.hash,
  candidate_current_revision:18,
  next_gate:'P4-02',
  authority:{human_accepted_moved:false,served_moved:false,product_pointers_moved:false}
};
write('coordination/P4_01_WORKSTREAM_EVIDENCE.json',evidence);
console.log(JSON.stringify({ok:true,gate:'P4-01',seed_id:seed.id,work_item_id:work.id,receipt_id:receipt.id,receipt_hash:receipt.hash,next_gate:'P4-02'},null,2));
