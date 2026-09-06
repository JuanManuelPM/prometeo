import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const read=rel=>fs.readFileSync(new URL(rel,new URL('../',import.meta.url)),'utf8');
const json=rel=>JSON.parse(read(rel));
const jsonl=rel=>read(rel).trim().split(/\n+/).filter(Boolean).map(JSON.parse);
const git=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();

const bootstrap=json('reincarnation/BOOTSTRAP.json');
const docs={};
for(const spec of bootstrap.required) docs[spec.role]=spec.role==='ledger'?jsonl(spec.path):json(spec.path);

const c={console,structuredClone,TextEncoder,TextDecoder,crypto:webcrypto,URL,Date,Math,JSON,setTimeout,clearTimeout,queueMicrotask};
c.globalThis=c;c.window=c;vm.createContext(c);
for(const rel of ['shared/core/v1/durable.js','shared/receipts/v1/ledger.js','shared/reincarnation/v1/reincarnate.js']) vm.runInContext(read(rel),c,{filename:rel});
const ledger=await c.PrometeoLedger.validate(docs.ledger);
assert.equal(ledger.ok,true);
assert.equal(docs.ledger.at(-1).id,'R-P3-20-FINAL-0018');
assert.equal(ledger.lastHash,'144479240672176a83149132ddf28cadc94ec132f4c6d01dd33dc52b56fef334');

const wake=c.PrometeoReincarnate.wake({
  bootstrap,
  currentGraph:docs.current_graph,
  head:docs.head,
  dotState:docs.dot_state,
  parent:docs.parent,
  pending:docs.pending,
  carry:docs.carry,
  watermarks:docs.watermarks,
  catalog:docs.catalog,
  lineage:docs.lineage,
  capabilities:docs.capabilities,
  hotBook:docs.hot_book,
  operatorContract:docs.operator_contract,
  ledgerReceipts:docs.ledger
});
assert.equal(wake.schema,'prometeo.wake-packet/v1');
assert.equal(wake.ACTIVE_FRONTEND,'navigator-v53-visible');
assert.equal(wake.CURRENT.candidate,'p3-final-candidate');
assert.equal(wake.CURRENT.phase,'P4_CAPTURE_INTEGRATION');
assert.equal(wake.PAGES.count,31);
assert.equal(wake.PAGES.identity,'catalog-v1:31cb2fefb32e2ccda67100ec7e872c3e3c2a5b61+4d471d2721b3ead0bf5b00c3896fdd5abc79b348');
assert.equal(docs.current_graph.revision,17);
assert.equal(docs.current_graph.artifacts['navigator-v53-visible'].source,'gitblob:7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418');
assert.equal(docs.current_graph.artifacts['navigator-v23-physics'].source,'sha256:f15f67240794b9d3224cc11f1899819485c08554b517b48ea6fca8458eb41398');
assert.equal(docs.pending.items.length,1);
assert.equal(docs.pending.items[0].id,'PENDING-P4-CAPTURE-001');
assert.equal(docs.dot_state.next_gate,'P4-01');

const titles=json('coordination/P4_CAPTURE_TITLE_INDEX.json');
const flat=titles.gates.flatMap(g=>g.items);
assert.equal(titles.count,100);
assert.equal(flat.length,100);
assert.deepEqual(flat.map(x=>x.n),Array.from({length:100},(_,i)=>i+1));
assert.equal(new Set(flat.map(x=>x.id)).size,100);
const plan=read('coordination/P4_CAPTURE_EXECUTION_PLAN.md');
for(let i=1;i<=100;i++) assert.ok(plan.includes(`### ${String(i).padStart(3,'0')} ·`),`execution plan missing ${i}`);

const v2Workflow=read('.github/workflows/inject-prometeo-shell.yml');
const v3Workflow=read('.github/workflows/inject-prometeo-shell-v3.yml');
assert.ok(v2Workflow.includes('prometeo-shell/v2/prometeo-shell.js?v=2'));
assert.ok(v3Workflow.includes('prometeo-shell/v3/prometeo-shell.js?v=3'));
assert.ok(v2Workflow.includes("'shared/prometeo-shell/**'"));
assert.ok(v3Workflow.includes("'shared/prometeo-shell/v3/**'"));

const branch=git('rev-parse','--abbrev-ref','HEAD');
assert.match(branch,/^candidate\/p4-capture-integration-/);

console.log(JSON.stringify({
  ok:true,
  gate:'P4-01-PREFLIGHT',
  branch,
  ledger_receipts:ledger.count,
  ledger_last_hash:ledger.lastHash,
  current_revision:docs.current_graph.revision,
  phase:docs.dot_state.phase,
  pending:docs.pending.items[0].id,
  title_count:flat.length,
  v53:docs.current_graph.artifacts['navigator-v53-visible'].source,
  v23:docs.current_graph.artifacts['navigator-v23-physics'].source,
  dual_injector_race_configured:true
},null,2));
