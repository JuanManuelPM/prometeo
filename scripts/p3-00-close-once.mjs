import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const ROOT=new URL('../',import.meta.url);
const p=rel=>new URL(rel,ROOT);
const read=rel=>fs.readFileSync(p(rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const writeJson=(rel,v)=>fs.writeFileSync(p(rel),JSON.stringify(v,null,2)+'\n');

function stable(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
}
const digest=v=>createHash('sha256').update(typeof v==='string'?v:stable(v)).digest('hex');
const receiptBody=r=>{const x=structuredClone(r);delete x.hash;return x};
function validateLedger(receipts){
  const ids=new Set();let prev='GENESIS';
  for(const r of receipts){
    if(r.schema!=='prometeo.receipt/v1'||!r.id)throw new Error('Invalid receipt schema');
    if(ids.has(r.id))throw new Error(`Duplicate receipt ${r.id}`);ids.add(r.id);
    if(r.prev_hash!==prev)throw new Error(`Broken chain at ${r.id}`);
    if(digest(receiptBody(r))!==r.hash)throw new Error(`Hash mismatch at ${r.id}`);
    prev=r.hash;
  }
  return {lastHash:prev,ids};
}

const pre=JSON.parse(execFileSync(process.execPath,['scripts/p3-00-rehydrate.mjs'],{cwd:p('.'),encoding:'utf8'}));
if(pre.gate!=='P3-00'||pre.generated_from_chat_memory!==false||pre.ledger.ok!==true)throw new Error('Clean rehydration evidence invalid');
if(pre.wake.PAGES.count!==31)throw new Error('Catalog page count drift');
if(pre.state_crosscheck.v53_source!=='gitblob:7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418')throw new Error('V53 source drift');
if(pre.wake.SERVED_INHERITED?.evidence_state!=='INHERITED_PREEXISTING_NOT_PART2_BROWSER_REVERIFIED')throw new Error('Served truth ceiling drift');

const ledger=read('receipts/ledger.jsonl').trim().split(/\n+/).filter(Boolean).map(JSON.parse);
const checked=validateLedger(ledger);
if(checked.ids.has('R-P3-00-WAKE-0005'))throw new Error('P3-00 receipt already exists');
if(checked.lastHash!=='c79f09b0d9991da2eb594ab56666e4b61a2e6aa7b459198ff6082a42386841bf')throw new Error('Unexpected pre-P3 ledger frontier');

const record={
  schema:'prometeo.receipt/v1',
  id:'R-P3-00-WAKE-0005',
  type:'PART3_P3_00_AUTHORITY_REHYDRATED',
  operation_id:'OP-P3-00-REHYDRATE',
  work_item_id:'PENDING-PART3-001',
  actor:'single-worker + GitHub Actions clean runner',
  model:null,
  base_artifact:'gitcommit:cb5dd70bc44470457b985bbdcbdbdcd970b14d1c',
  source_digests:[
    'gitcommit:f3f5d11c6a1287bc660860763309c2bc10dd685c',
    'gitblob:00997f0750d230f768ad430e8af4855e90d0b096',
    'gitblob:cdf1f00a27dbba1ec282e89100681d587e90f6cb',
    'gitblob:bce3d831262ee26de4ca324112d0f0bfb5974caf',
    'github-actions:33881028499:success',
    'github-actions:33881028261:success'
  ],
  files_changed:[
    'scripts/p3-00-rehydrate.mjs','tests/part3-p3-00-rehydrate.test.mjs','.github/workflows/part3-p3-00-ci.yml',
    'coordination/P3_00_WAKE_PACKET.json','coordination/P3_00_SOURCE_IDENTITIES.json','coordination/P3_00_REHYDRATION_REPORT.md',
    'coordination/PART3_EXECUTION_PLAN.md','coordination/PART3_GATE_MATRIX.json','state/CURRENT_GRAPH.json','state/DOT_STATE.json','state/PENDING.json','context/books/HOT.json','receipts/ledger.jsonl'
  ],
  output_digests:['github-actions:33881028499:success','github-actions:33881028261:success'],
  tests:['PART1_REGRESSION_PASS','PART2_SUITE_PASS','P3_00_CLEAN_PROCESS_WAKE_PASS','P3_00_LEDGER_CHAIN_PASS','P3_00_SOURCE_IDENTITY_PASS','P3_00_NO_CHAT_MEMORY_PASS','P3_00_NO_EMPIRICAL_OVERCLAIM_PASS'],
  privacy_decisions:['NO_CONTEXT_EXPORT','LOCAL_DEFAULT_PRESERVED','PROJECT_EXTERNAL_REMAINS_OPT_IN'],
  candidate_identity:'gitcommit:cb5dd70bc44470457b985bbdcbdbdcd970b14d1c',
  acceptance_identity:null,
  served_identity:null,
  rollback_refs:['gitcommit:cb5dd70bc44470457b985bbdcbdbdcd970b14d1c','gitcommit:936d4217cb9ce1e244722e76e5843d8aadbb31f6','sha256:f15f67240794b9d3224cc11f1899819485c08554b517b48ea6fca8458eb41398'],
  timestamp:new Date().toISOString(),
  claim:'P3-00 rehydrated Prometeo authority in a clean GitHub Actions process using only durable bootstrap sources, validated the receipt hash chain, regenerated the WAKE packet and source identities, and preserved Candidate != Human Accepted != Served. No browser/perceptual or fresh-agent claim was made.',
  prev_hash:checked.lastHash
};
record.hash=digest(receiptBody(record));
validateLedger([...ledger,record]);
fs.writeFileSync(p('receipts/ledger.jsonl'),[...ledger,record].map(JSON.stringify).join('\n')+'\n');

const current=json('state/CURRENT_GRAPH.json');
if(current.revision!==3)throw new Error(`Expected Current revision 3, got ${current.revision}`);
current.revision=4;
current.last_durable_receipt=record.id;
current.active_workstream.phase='PART3_P3_00_COMPLETE';
current.active_workstream.status='P3_00_PASS_READY_FOR_P3_01';
writeJson('state/CURRENT_GRAPH.json',current);

const dot=json('state/DOT_STATE.json');
dot.phase='PART3_P3_00_COMPLETE';
dot.state='READY';
dot.next_gate='P3-01_BROWSER_HARNESS';
dot.last_receipt=record.id;
writeJson('state/DOT_STATE.json',dot);

const pending=json('state/PENDING.json');
if(pending.items.length!==1||pending.items[0].id!=='PENDING-PART3-001')throw new Error('Unexpected PENDING frontier');
const item=pending.items[0];
item.state='READY';
item.dependencies=[record.id];
item.blocker=null;
item.next_action='On the next explicit execution signal, execute only P3-01 browser-harness from coordination/PART3_GATE_MATRIX.json. Do not start P3-02 or any Human Accepted/Served/release gate until P3-01 is durably PASS.';
item.source_frontier={...item.source_frontier,p3_00_input_commit:'f3f5d11c6a1287bc660860763309c2bc10dd685c',p3_00_ci_run:33881028499,p3_00_part2_regression_run:33881028261,p3_00_receipt:record.id,p3_00_receipt_hash:record.hash};
writeJson('state/PENDING.json',pending);

const matrix=json('coordination/PART3_GATE_MATRIX.json');
matrix.status='IN_PROGRESS';
const g0=matrix.gates.find(g=>g.id==='P3-00'),g1=matrix.gates.find(g=>g.id==='P3-01');
if(!g0||!g1)throw new Error('Missing P3-00/P3-01 gates');
g0.status='PASS';g0.receipt_id=record.id;g0.ci_run=33881028499;g0.input_commit='f3f5d11c6a1287bc660860763309c2bc10dd685c';
g1.status='READY';
writeJson('coordination/PART3_GATE_MATRIX.json',matrix);

let plan=read('coordination/PART3_EXECUTION_PLAN.md');
plan=plan.replace('Status: **PLANNED_NOT_STARTED**','Status: **IN_PROGRESS — P3-00 PASS — P3-01 READY**');
fs.writeFileSync(p('coordination/PART3_EXECUTION_PLAN.md'),plan);

const hot=json('context/books/HOT.json');
for(const x of [
  {id:'part3-plan',ref:'coordination/PART3_EXECUTION_PLAN.md',reason:'active empirical execution plan'},
  {id:'part3-gates',ref:'coordination/PART3_GATE_MATRIX.json',reason:'active dependency and gate frontier'}
])if(!hot.items.some(i=>i.id===x.id))hot.items.push(x);
writeJson('context/books/HOT.json',hot);

writeJson('coordination/P3_00_WAKE_PACKET.json',{schema:'prometeo.p3-00-wake-record/v1',gate:'P3-00',input_commit:'f3f5d11c6a1287bc660860763309c2bc10dd685c',ci_run:33881028499,wake:pre.wake});
writeJson('coordination/P3_00_SOURCE_IDENTITIES.json',{schema:'prometeo.p3-00-source-identities/v1',gate:'P3-00',input_commit:'f3f5d11c6a1287bc660860763309c2bc10dd685c',ci_run:33881028499,part2_regression_run:33881028261,source_identities:pre.source_identities,ledger_input:pre.ledger,receipt_output:{id:record.id,hash:record.hash}});

const report=`# PROMETEO — P3-00 Authority Rehydration\n\nStatus: **PASS**\n\nInput checkout: \`f3f5d11c6a1287bc660860763309c2bc10dd685c\`  \nClean-process CI: \`33881028499\` — PASS  \nPart 1 + Part 2 regression on the same input: \`33881028261\` — PASS  \nReceipt: \`${record.id}\` / \`${record.hash}\`\n\n## Recovered machine truth\n- HEAD/candidate: \`part2-workstream\` backed by repaired Part 2 candidate \`cb5dd70b…\`.\n- Visible frontend: \`navigator-v53-visible\`, exact blob \`7ca5f3e…\`.\n- Catalog: 31 pages, identity \`${pre.wake.PAGES.identity}\`.\n- Human Accepted scope recovered: only \`navigator-v23-physics\` for folder-stack physics.\n- Served pointer remains **inherited pre-existing and not browser-reverified in Part 2/P3-00**.\n- Ledger input: ${pre.ledger.count} receipts, valid hash chain ending \`${pre.ledger.last_hash}\`.\n- P3-00 did not use chat history or worker memory as authority.\n\n## Important non-highest-version distinction\n\`classes-runtime-v2\` and \`student-world-runtime-v2\` exist as TESTED_CANDIDATE artifacts, while \`shared_component_currents\` still points to the v1 class/world runtimes. P3-00 preserves that distinction instead of guessing that the highest version number is current.\n\n## Truth ceiling\nNo browser/perceptual PASS, no fresh-agent proof, no Human Accepted promotion, no new Served proof, no production move, no rollback rehearsal. Those remain later gates.\n\n## Next gate\nOnly \`P3-01 — browser-harness\` is READY. P3-02 and later remain blocked by dependency order.\n`;
fs.writeFileSync(p('coordination/P3_00_REHYDRATION_REPORT.md'),report);

for(const rel of ['scripts/p3-00-close-once.mjs','.github/workflows/p3-00-close-once.yml'])if(fs.existsSync(p(rel)))fs.unlinkSync(p(rel));
console.log(JSON.stringify({ok:true,gate:'P3-00',receipt_id:record.id,receipt_hash:record.hash,next_gate:'P3-01'}));
