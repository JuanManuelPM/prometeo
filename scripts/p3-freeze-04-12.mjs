import fs from 'node:fs';
import crypto from 'node:crypto';

const TESTED_COMMIT='b199b91f9cbac36df4f6ef5b75489c33737b89a4';
const RUN_ID=33904408761;
const ARTIFACT_ID=9948899837;
const ARTIFACT_SHA='58b025a892d0657d20a5e616cc01ff8256cd6e61ff2d0619a6330e495eb5c65b';
const NAV_BLOB='7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418';
const MAIN_BASE='dd8e46c5b71ebe610ca7b0d9fccfd1462754b8e2';
const RECEIPT_ID='R-P3-12-FREEZE-0009';

function stable(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(stable).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}'}
function digest(v){return crypto.createHash('sha256').update(typeof v==='string'?v:stable(v)).digest('hex')}
function json(p){return JSON.parse(fs.readFileSync(p,'utf8'))}
function write(p,v){fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n')}

const ledger=fs.readFileSync('receipts/ledger.jsonl','utf8').trim().split(/\n+/).filter(Boolean).map(JSON.parse);
if(ledger.some(r=>r.id===RECEIPT_ID))process.exit(0);
let prev='GENESIS';
for(const r of ledger){if(r.prev_hash!==prev)throw new Error(`broken ledger before ${r.id}`);const b=structuredClone(r);delete b.hash;const h=digest(b);if(h!==r.hash)throw new Error(`bad receipt hash ${r.id}`);prev=r.hash}

const closure={
  schema:'prometeo.p3-04-12-closure/v1',
  status:'PASS',
  tested_commit:TESTED_COMMIT,
  ci_run:RUN_ID,
  evidence_artifact:{id:ARTIFACT_ID,sha256:ARTIFACT_SHA},
  navigator:{blob:NAV_BLOB,build:'PROMETEO_V53_COMPLETE_EXAMPLE_ATLAS_20260901',visible_bytes_changed:false},
  calendar:{repair:'pages/calendar/app-04-finance.js: legacy baseRateLabel made optional',visual_redesign:false,human_acceptance_inherited:false},
  gates:{P3_04:'PASS',P3_05:'PASS_GROUPED_AUDIT_500',P3_06:'PASS',P3_07:'PASS_THREE_TIER_VIEWPORT_POLICY',P3_08:'PASS_SEMANTIC_EXACT_BACK_AFTER_RESIZE',P3_09:'PASS_RUNTIME_AND_STATIC',P3_10:'PASS',P3_11:'PASS_BASIC_BROWSER',P3_12:'PASS'},
  viewport_policy:{micro_survival_max_width:240,compact_physical_max_width:760,responsive_full_min_width:761},
  browser_diagnostics:{navigator_errors:0,calendar_errors:0,adriana_errors:0},
  acceptance_boundary:'P3-13 remains separate. Exact V53 visible bytes may reuse only their prior accepted scope; Calendar repair and release as a whole are not auto-accepted.',
  production_changed:false
};
write('coordination/P3_04_12_CLOSURE.json',closure);
write('coordination/P3_12_FINAL_CANDIDATE.json',{
  schema:'prometeo.final-candidate-freeze/v1',
  id:'PROMETEO_FINAL_CANDIDATE_20260904',
  status:'TESTED_CANDIDATE',
  source_commit:TESTED_COMMIT,
  base_main_commit:MAIN_BASE,
  navigator_blob:NAV_BLOB,
  evidence:{ci_run:RUN_ID,artifact_id:ARTIFACT_ID,artifact_sha256:ARTIFACT_SHA},
  human_acceptance:{navigator_exact_bytes:'REUSE_ELIGIBLE_PREVIOUS_SCOPE',calendar_repair:'PENDING',whole_release:'PENDING'},
  served:'NOT_YET_P3_15_VERIFIED',
  production:'UNCHANGED'
});

const receipt={
  schema:'prometeo.receipt/v1',id:RECEIPT_ID,type:'PART3_P3_04_12_TESTED_CANDIDATE_FREEZE',operation_id:'OP-P3-04-12-MACRO',work_item_id:'PENDING-PART3-001',actor:'single-worker + GitHub Actions + agent-browser',model:null,
  base_artifact:`gitcommit:${MAIN_BASE}`,
  source_digests:[`gitblob:${NAV_BLOB}`,`github-actions:${RUN_ID}:success`,`sha256:${ARTIFACT_SHA}`],
  files_changed:['scripts/p3-macro-*','.github/workflows/part3-macro-preaccept-ci.yml','pages/calendar/app-04-finance.js','coordination/P3_04_12_CLOSURE.json','coordination/P3_12_FINAL_CANDIDATE.json','state/CURRENT_GRAPH.json','state/PENDING.json','receipts/ledger.jsonl'],
  output_digests:[`gitcommit:${TESTED_COMMIT}`,`github-actions-artifact:${ARTIFACT_ID}`,`sha256:${ARTIFACT_SHA}`],
  tests:['PART1_REGRESSION_PASS','PART2_REGRESSION_PASS','KNOWN_DISEASES_26_PASS','MUTANTS_10_PASS','VIEWPORTS_9_PASS','MICRO_SURVIVAL_160_200_240_PASS','COMPACT_PHYSICAL_320_399_480_PASS','RESPONSIVE_FULL_768_1280_1440_PASS','EXACT_BACK_AFTER_RESIZE_PASS','CALENDAR_BROWSER_ERRORS_0_PASS','ADRIANA_BROWSER_ERRORS_0_PASS','NAVIGATOR_BROWSER_ERRORS_0_PASS','CHECKPOINTS_500_GROUPED_PASS','V53_EXACT_BLOB_PASS','GIT_DIFF_CHECK_PASS'],
  privacy_decisions:['NO_CONTEXT_EXPORT','NO_PRODUCTION_POINTER_MOVE','NO_WHOLE_RELEASE_HUMAN_ACCEPTANCE_CLAIM'],
  candidate_identity:`gitcommit:${TESTED_COMMIT}`,acceptance_identity:null,served_identity:null,
  rollback_refs:[`gitcommit:${MAIN_BASE}`,'sha256:f15f67240794b9d3224cc11f1899819485c08554b517b48ea6fca8458eb41398'],
  timestamp:new Date().toISOString(),
  claim:'P3-04 through P3-12 passed the full automated/static/runtime/browser macro on the tested candidate. V53 visible navigator bytes remain exact. A legacy Calendar DOM reference was repaired fail-soft and retested with zero browser/page errors. Candidate freeze only; P3-13 acceptance and Served/Production pointers are not claimed.',
  prev_hash:prev
};
receipt.hash=digest(receipt);
ledger.push(receipt);
fs.writeFileSync('receipts/ledger.jsonl',ledger.map(r=>JSON.stringify(r)).join('\n')+'\n');

const current=json('state/CURRENT_GRAPH.json');
if(current.revision!==7)throw new Error(`expected Current revision 7, got ${current.revision}`);
current.revision=8;
current.artifacts['p3-final-candidate']={state:'TESTED_CANDIDATE',source:`gitcommit:${TESTED_COMMIT}`,product:'prometeo-platform'};
current.pointers.candidate_current={artifact_id:'p3-final-candidate',receipt_id:RECEIPT_ID};
current.active_workstream={branch:'candidate/prometeo-final-20260904',phase:'PART3_P3_12_COMPLETE',status:'P3_12_PASS_READY_FOR_P3_13',parent_commit:MAIN_BASE,materialized_commit:TESTED_COMMIT};
current.last_durable_receipt=RECEIPT_ID;
write('state/CURRENT_GRAPH.json',current);

const pending=json('state/PENDING.json');
const item=pending.items.find(x=>x.id==='PENDING-PART3-001');
if(!item)throw new Error('PENDING-PART3-001 missing');
item.state='READY_FOR_P3_13';
if(!item.dependencies.includes(RECEIPT_ID))item.dependencies.push(RECEIPT_ID);
item.blocker=null;
item.next_action='Evaluate P3-13 acceptance by exact scope. V53 navigator may reuse only the prior human-selected exact-byte scope if its blob remains 7ca5f3e...; Calendar repair and the whole release remain unaccepted until explicitly accepted. Then attempt isolated canary, Served verification and real A→B→A rollback without touching stable production.';
item.source_frontier.p3_12_tested_commit=TESTED_COMMIT;
item.source_frontier.p3_12_ci_run=RUN_ID;
item.source_frontier.p3_12_artifact_id=ARTIFACT_ID;
item.source_frontier.p3_12_artifact_sha256=ARTIFACT_SHA;
item.source_frontier.p3_12_receipt=RECEIPT_ID;
item.source_frontier.p3_12_receipt_hash=receipt.hash;
write('state/PENDING.json',pending);

console.log(JSON.stringify({ok:true,receipt:RECEIPT_ID,hash:receipt.hash,current_revision:8,tested_commit:TESTED_COMMIT}));
