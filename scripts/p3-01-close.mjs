import fs from 'node:fs';
import crypto from 'node:crypto';

const read = p => fs.readFileSync(p, 'utf8');
const writeJson = (p,v) => fs.writeFileSync(p, JSON.stringify(v,null,2)+'\n');
const stable = value => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+stable(value[k])).join(',') + '}';
};
const hashReceipt = receipt => {
  const body = structuredClone(receipt);
  delete body.hash;
  return crypto.createHash('sha256').update(stable(body)).digest('hex');
};
const ledgerPath='receipts/ledger.jsonl';
const ledger=read(ledgerPath).trim().split(/\n+/).filter(Boolean).map(JSON.parse);
let prev='GENESIS';
for(const r of ledger){
  if(r.prev_hash!==prev) throw new Error(`BROKEN_LEDGER_CHAIN ${r.id}`);
  const h=hashReceipt(r);
  if(h!==r.hash) throw new Error(`BROKEN_LEDGER_HASH ${r.id}`);
  prev=r.hash;
}
const receiptId='R-P3-01-BROWSER-0006';
const existing=ledger.find(r=>r.id===receiptId);
if(existing){
  if(existing.hash!==hashReceipt(existing)) throw new Error('EXISTING_P3_01_RECEIPT_HASH_INVALID');
  console.log(JSON.stringify({ok:true,idempotent:true,receipt:existing.id,hash:existing.hash}));
  process.exit(0);
}
if(ledger.at(-1)?.id!=='R-P3-00-WAKE-0005') throw new Error(`UNEXPECTED_LEDGER_FRONTIER ${ledger.at(-1)?.id}`);

const receipt={
  schema:'prometeo.receipt/v1',
  id:receiptId,
  type:'PART3_P3_01_BROWSER_HARNESS_PASS',
  operation_id:'OP-P3-01-BROWSER-HARNESS',
  work_item_id:'PENDING-PART3-001',
  actor:'single-worker + GitHub Actions + agent-browser',
  model:null,
  base_artifact:'gitcommit:c6b7d3fa776e268feb20162ca8bc8761ccb9482b',
  source_digests:[
    'gitblob:7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418',
    'gitblob:9296aae077d2f7eca5ab21ff85078381b937b4e7',
    'github-actions:33882820789:success',
    'github-actions-job:101055335181:success'
  ],
  files_changed:[
    'lab/p3-01-browser-harness/index.html',
    'lab/p3-01-browser-harness/MANIFEST.json',
    'scripts/p3-01-browser-gate.sh',
    '.github/workflows/part3-p3-01-browser-ci.yml'
  ],
  output_digests:[
    'github-actions:33882820789:success',
    'github-actions-artifact:9940580289',
    'sha256:ad298feb2e9be921e144d349225be84bcdd34a2c52aaa2db854c2202e138f614'
  ],
  tests:[
    'PART1_REGRESSION_PASS',
    'PART2_SUITE_PASS',
    'P3_00_REHYDRATION_REGRESSION_PASS',
    'P3_01_CHROME_REAL_BROWSER_PASS',
    'P3_01_SAME_ORIGIN_PASS',
    'P3_01_V53_BUILD_ID_PASS',
    'P3_01_MEANINGFUL_DOM_PASS',
    'P3_01_HAR_CAPTURE_PASS',
    'P3_01_LOCAL_REQUESTS_5_OF_5_PASS',
    'P3_01_PAGE_ERRORS_0_PASS',
    'P3_01_CONSOLE_ERRORS_0_PASS',
    'P3_01_SCREENSHOT_SNAPSHOT_PASS'
  ],
  privacy_decisions:['NO_CONTEXT_EXPORT','NO_PRODUCTION_POINTER_MOVE','NO_HUMAN_ACCEPTANCE_CLAIM'],
  candidate_identity:'gitcommit:c6b7d3fa776e268feb20162ca8bc8761ccb9482b',
  acceptance_identity:null,
  served_identity:null,
  rollback_refs:[
    'gitcommit:c6b7d3fa776e268feb20162ca8bc8761ccb9482b',
    'gitcommit:cb5dd70bc44470457b985bbdcbdbdcd970b14d1c',
    'gitcommit:936d4217cb9ce1e244722e76e5843d8aadbb31f6'
  ],
  timestamp:'2026-09-04T14:17:35Z',
  claim:'P3-01 empirically loaded the exact inherited V53 frontend in Chrome through a same-origin harness on GitHub Actions, captured screenshot/snapshot/HAR/console/page-error evidence, observed 5 local requests with zero failed local resources, zero page errors and zero console errors, and preserved Candidate != Human Accepted != Served. Browser candidate evidence only; no perceptual-human, acceptance, canary, production, or fresh-agent claim is made.',
  prev_hash:prev
};
receipt.hash=hashReceipt(receipt);
ledger.push(receipt);
fs.writeFileSync(ledgerPath, ledger.map(r=>JSON.stringify(r)).join('\n')+'\n');

const current=JSON.parse(read('state/CURRENT_GRAPH.json'));
if(current.revision!==4 || current.last_durable_receipt!=='R-P3-00-WAKE-0005') throw new Error('CURRENT_GRAPH_FRONTIER_MISMATCH');
if(current.pointers?.served_current?.receipt_id!=='R-P2-BOOT-0001') throw new Error('SERVED_POINTER_DRIFT');
if(current.pointers?.human_accepted_physics?.receipt_id!=='R-P2-BOOT-0001') throw new Error('HUMAN_ACCEPTED_POINTER_DRIFT');
if(current.pointers?.candidate_current?.receipt_id!=='R-P2-AUDIT-0004') throw new Error('CANDIDATE_POINTER_DRIFT');
current.revision=5;
current.active_workstream.phase='PART3_P3_01_COMPLETE';
current.active_workstream.status='P3_01_PASS_READY_FOR_P3_02';
current.last_durable_receipt=receiptId;
writeJson('state/CURRENT_GRAPH.json',current);

const dot=JSON.parse(read('state/DOT_STATE.json'));
dot.phase='PART3_P3_01_COMPLETE';
dot.state='READY';
dot.next_gate='P3-02_FRESH_AGENT_REINCARNATION';
dot.last_receipt=receiptId;
writeJson('state/DOT_STATE.json',dot);

const pending=JSON.parse(read('state/PENDING.json'));
if(pending.items?.length!==1 || pending.items[0].id!=='PENDING-PART3-001') throw new Error('PENDING_FRONTIER_MISMATCH');
const item=pending.items[0];
item.state='READY';
item.dependencies=[receiptId];
item.blocker=null;
item.next_action='On the next explicit execution signal, execute only P3-02 fresh-agent-reincarnation from coordination/PART3_GATE_MATRIX.json. Do not start P3-03 or any later gate until P3-02 is durably PASS.';
item.source_frontier={
  ...item.source_frontier,
  p3_01_input_commit:'c6b7d3fa776e268feb20162ca8bc8761ccb9482b',
  p3_01_ci_run:33882820789,
  p3_01_ci_job:101055335181,
  p3_01_artifact_id:9940580289,
  p3_01_artifact_sha256:'ad298feb2e9be921e144d349225be84bcdd34a2c52aaa2db854c2202e138f614',
  p3_01_receipt:receiptId,
  p3_01_receipt_hash:receipt.hash,
  p3_01_closure_report:'coordination/P3_01_BROWSER_CLOSURE.json'
};
writeJson('state/PENDING.json',pending);

const matrix=JSON.parse(read('coordination/PART3_GATE_MATRIX.json'));
const p301=matrix.gates.find(g=>g.id==='P3-01');
const p302=matrix.gates.find(g=>g.id==='P3-02');
if(!p301||!p302||p301.status!=='READY'||p302.status!=='PLANNED') throw new Error('GATE_MATRIX_FRONTIER_MISMATCH');
Object.assign(p301,{status:'PASS',receipt_id:receiptId,ci_run:33882820789,ci_job:101055335181,input_commit:'c6b7d3fa776e268feb20162ca8bc8761ccb9482b',artifact_id:9940580289,artifact_sha256:'ad298feb2e9be921e144d349225be84bcdd34a2c52aaa2db854c2202e138f614'});
p302.status='READY';
writeJson('coordination/PART3_GATE_MATRIX.json',matrix);

const report={
  schema:'prometeo.p3-01-browser-closure/v1',
  gate:'P3-01',
  status:'PASS',
  receipt_id:receiptId,
  receipt_hash:receipt.hash,
  tested_commit:'c6b7d3fa776e268feb20162ca8bc8761ccb9482b',
  target:{path:'navigator/index.html',git_blob_sha:'7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418',meta_build:'PROMETEO_V53_COMPLETE_EXAMPLE_ATLAS_20260901',mutated:false},
  environment:{runner:'agent-browser@0.34.0',browser:'Chrome for Testing 152.0.7977.82',ci_run:33882820789,ci_job:101055335181},
  empirical:{requests:5,local_requests:5,failed_local_resources:0,page_errors:0,console_errors:0,same_origin:true,meaningful_dom:true,screenshot:true,interactive_snapshot:true,har:true},
  artifact:{id:9940580289,sha256:'ad298feb2e9be921e144d349225be84bcdd34a2c52aaa2db854c2202e138f614',retention_days:30},
  harness_repairs:[
    {run:33882221957,result:'HARNESS_FAILURE',cause:'agent-browser@0.34.0 does not implement addinitscript; V53 was not navigated.'},
    {run:33882584387,result:'HARNESS_FAILURE',cause:'frame command did not retain iframe context; screenshot and diagnostics already showed V53 rendered without errors.'},
    {run:33882820789,result:'PASS',cause:'same-origin child DOM validated directly from wrapper; browser console/errors and HAR asserted.'}
  ],
  truth_ceiling:{browser_harness_pass_candidate:true,perceptual_human_pass:false,human_accepted:false,new_served_verification:false,production_changed:false,fresh_agent_reincarnation:false},
  next_gate:'P3-02'
};
writeJson('coordination/P3_01_BROWSER_CLOSURE.json',report);

const p300Test='tests/part3-p3-00-rehydrate.test.mjs';
let t=read(p300Test);
const old=`if(p300.status==='PASS'){\n  const dot=JSON.parse(fs.readFileSync(new URL('../state/DOT_STATE.json',import.meta.url),'utf8'));\n  assert.equal(dot.next_gate,'P3-01_BROWSER_HARNESS');\n  assert.equal(p301.status,'READY');\n}`;
const replacement=`if(p300.status==='PASS'){\n  const dot=JSON.parse(fs.readFileSync(new URL('../state/DOT_STATE.json',import.meta.url),'utf8'));\n  if(p301.status==='READY'){\n    assert.equal(dot.next_gate,'P3-01_BROWSER_HARNESS');\n  }else if(p301.status==='PASS'){\n    const p302=matrix.gates.find(g=>g.id==='P3-02');\n    assert.equal(p301.receipt_id,'R-P3-01-BROWSER-0006');\n    assert.equal(dot.phase,'PART3_P3_01_COMPLETE');\n    assert.equal(dot.next_gate,'P3-02_FRESH_AGENT_REINCARNATION');\n    assert.equal(p302?.status,'READY');\n  }else{\n    assert.fail('P3-01 must be READY or PASS after P3-00');\n  }\n}`;
if(!t.includes(old)) throw new Error('P3_00_TEST_PATCH_ANCHOR_MISSING');
t=t.replace(old,replacement);
fs.writeFileSync(p300Test,t);

const closureTest=`import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {spawnSync} from 'node:child_process';\n\nconst read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));\nconst current=read('state/CURRENT_GRAPH.json');\nconst dot=read('state/DOT_STATE.json');\nconst pending=read('state/PENDING.json');\nconst matrix=read('coordination/PART3_GATE_MATRIX.json');\nconst report=read('coordination/P3_01_BROWSER_CLOSURE.json');\nconst receipts=fs.readFileSync(new URL('../receipts/ledger.jsonl',import.meta.url),'utf8').trim().split(/\\n+/).map(JSON.parse);\nconst receipt=receipts.at(-1);\nassert.equal(receipt.id,'R-P3-01-BROWSER-0006');\nassert.equal(current.revision,5);\nassert.equal(current.last_durable_receipt,receipt.id);\nassert.equal(dot.last_receipt,receipt.id);\nassert.equal(current.active_workstream.phase,'PART3_P3_01_COMPLETE');\nassert.equal(dot.phase,'PART3_P3_01_COMPLETE');\nassert.equal(dot.next_gate,'P3-02_FRESH_AGENT_REINCARNATION');\nassert.equal(current.pointers.candidate_current.receipt_id,'R-P2-AUDIT-0004');\nassert.equal(current.pointers.served_current.receipt_id,'R-P2-BOOT-0001');\nassert.equal(current.pointers.served_current.evidence_state,'INHERITED_PREEXISTING_NOT_PART2_BROWSER_REVERIFIED');\nassert.equal(current.pointers.human_accepted_physics.receipt_id,'R-P2-BOOT-0001');\nconst p301=matrix.gates.find(g=>g.id==='P3-01');\nconst p302=matrix.gates.find(g=>g.id==='P3-02');\nassert.equal(p301.status,'PASS');\nassert.equal(p301.receipt_id,receipt.id);\nassert.equal(p301.ci_run,33882820789);\nassert.equal(p301.artifact_id,9940580289);\nassert.equal(p302.status,'READY');\nassert.deepEqual(matrix.gates.filter(g=>g.status==='READY').map(g=>g.id),['P3-02']);\nassert.deepEqual(pending.items[0].dependencies,[receipt.id]);\nassert.match(pending.items[0].next_action,/execute only P3-02/);\nassert.equal(pending.items[0].source_frontier.p3_01_receipt_hash,receipt.hash);\nassert.equal(report.status,'PASS');\nassert.equal(report.receipt_hash,receipt.hash);\nassert.equal(report.empirical.failed_local_resources,0);\nassert.equal(report.empirical.page_errors,0);\nassert.equal(report.empirical.console_errors,0);\nassert.equal(report.truth_ceiling.human_accepted,false);\nassert.equal(report.truth_ceiling.new_served_verification,false);\nassert.equal(report.truth_ceiling.fresh_agent_reincarnation,false);\nconst run=spawnSync(process.execPath,['scripts/p3-00-rehydrate.mjs'],{encoding:'utf8'});\nif(run.status!==0){process.stderr.write(run.stderr||'');process.exit(run.status||1)}\nconst wake=JSON.parse(run.stdout);\nassert.equal(wake.ledger.ok,true);\nassert.equal(wake.ledger.count,6);\nassert.equal(wake.ledger.last_receipt_id,receipt.id);\nassert.equal(wake.state_crosscheck.current_last_receipt,receipt.id);\nassert.equal(wake.state_crosscheck.dot_last_receipt,receipt.id);\nassert.equal(wake.wake.CURRENT.phase,'PART3_P3_01_COMPLETE');\nconsole.log(JSON.stringify({ok:true,gate:'P3-01',receipt:receipt.id,revision:current.revision,next_gate:p302.id}));\n`;
fs.writeFileSync('tests/part3-p3-01-closure.test.mjs',closureTest);

const workflow=`name: Part 3 P3-01 Browser Harness\n\non:\n  push:\n    branches: [candidate/part2-durable-metabolism-20260904]\n    paths:\n      - 'lab/p3-01-browser-harness/**'\n      - 'scripts/p3-01-browser-gate.sh'\n      - '.github/workflows/part3-p3-01-browser-ci.yml'\n      - 'state/CURRENT_GRAPH.json'\n      - 'state/DOT_STATE.json'\n      - 'state/PENDING.json'\n      - 'receipts/ledger.jsonl'\n      - 'coordination/PART3_GATE_MATRIX.json'\n      - 'coordination/P3_01_BROWSER_CLOSURE.json'\n      - 'coordination/P3_01_CLOSURE_RECHECK.txt'\n      - 'tests/part3-p3-00-rehydrate.test.mjs'\n      - 'tests/part3-p3-01-closure.test.mjs'\n  workflow_dispatch:\n\npermissions:\n  contents: read\n\njobs:\n  browser-harness:\n    runs-on: ubuntu-latest\n    timeout-minutes: 20\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '24'\n      - name: Regress durable truth before browser\n        shell: bash\n        run: |\n          set -euo pipefail\n          for f in tests/r1_candidate.test.mjs tests/runtime-ownership.test.mjs tests/platform-engines.test.mjs tests/part1-static.test.mjs tests/part1-contract.test.mjs tests/part1-runtime-services.test.mjs tests/part1-persistent-engines.test.mjs tests/part1-semantic-restore.test.mjs tests/part1-persistence-cas.test.mjs tests/part1-engine-invariants.test.mjs; do test -f \"$f\" && node \"$f\"; done\n          for f in tests/part2-*.test.mjs; do node \"$f\"; done\n          node tests/part3-p3-00-rehydrate.test.mjs\n          node tests/part3-p3-01-closure.test.mjs\n          test \"$(git hash-object navigator/index.html)\" = \"7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418\"\n      - name: Install pinned agent-browser\n        shell: bash\n        run: |\n          set -euo pipefail\n          npm install --global agent-browser@0.34.0\n          agent-browser install --with-deps\n          agent-browser doctor --offline --quick\n      - name: Run same-origin browser gate\n        shell: bash\n        run: |\n          set -euo pipefail\n          chmod +x scripts/p3-01-browser-gate.sh\n          scripts/p3-01-browser-gate.sh\n      - name: Upload empirical browser evidence\n        if: always()\n        uses: actions/upload-artifact@v4\n        with:\n          name: p3-01-browser-evidence-\${{ github.sha }}\n          path: artifacts/p3-01/\n          if-no-files-found: error\n          retention-days: 30\n`;
fs.writeFileSync('.github/workflows/part3-p3-01-browser-ci.yml',workflow);

console.log(JSON.stringify({ok:true,idempotent:false,receipt:receipt.id,hash:receipt.hash,next_gate:'P3-02'}));
