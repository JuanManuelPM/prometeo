import assert from 'node:assert/strict';
import fs from 'node:fs';
import {json,jsonl,context,load,read} from './part2-test-helpers.mjs';

const EXPECTED_V53='7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418';
const matrix=json('coordination/PART3_GATE_MATRIX.json');
const current=json('state/CURRENT_GRAPH.json');
const dot=json('state/DOT_STATE.json');
const diseases=json('tests/known-diseases.json').diseases;
assert.equal(current.revision,7);
assert.equal(dot.next_gate,'P3-04_MUTATION_FAILURE_CHAOS');
assert.equal(matrix.gates.find(g=>g.id==='P3-04')?.status,'READY');
assert.equal(new Set(diseases.map(d=>d.id)).size,diseases.length);
assert.ok(diseases.length>=26);

// P3-04: fail-closed receipt mutations.
{
  const c=context();load('shared/core/v1/durable.js',c);load('shared/receipts/v1/ledger.js',c);
  const receipts=jsonl('receipts/ledger.jsonl');
  const valid=await c.PrometeoLedger.validate(receipts);assert.equal(valid.ok,true);
  const tampered=structuredClone(receipts);tampered.at(-1).operation='forged-op';
  await assert.rejects(()=>c.PrometeoLedger.validate(tampered),e=>e.code==='PROMETEO_LEDGER_HASH');
  const broken=structuredClone(receipts);broken.at(-1).prev_hash='0'.repeat(64);
  await assert.rejects(()=>c.PrometeoLedger.validate(broken),e=>e.code==='PROMETEO_LEDGER_CHAIN');
  const dup=[...structuredClone(receipts),structuredClone(receipts.at(-1))];
  await assert.rejects(()=>c.PrometeoLedger.validate(dup),e=>e.code==='PROMETEO_LEDGER_DUPLICATE');
  assert.throws(()=>JSON.parse(read('state/CURRENT_GRAPH.json').slice(0,-11)));
}

// P3-04: fail-closed catalog mutations.
{
  const c=context();load('shared/core/v1/durable.js',c);load('shared/catalog/v1/catalog.js',c);
  const tree=json('catalog/tree.json'),pages=json('catalog/pages.json'),manifest=json('catalog/CATALOG_MANIFEST.json');
  assert.equal(c.PrometeoCatalog.validate({tree,pages,manifest}).ok,true);
  const missing=structuredClone(pages);missing.pages=missing.pages.slice(1);
  assert.throws(()=>c.PrometeoCatalog.validate({tree,pages:missing,manifest}),e=>e.code==='PROMETEO_CATALOG_MISSING_PAGE_REF'||e.code==='PROMETEO_CATALOG_MANIFEST_COUNT');
  const duplicate=structuredClone(pages);duplicate.pages.push(structuredClone(duplicate.pages[0]));
  assert.throws(()=>c.PrometeoCatalog.validate({tree,pages:duplicate,manifest}),e=>e.code==='PROMETEO_CATALOG_DUPLICATE_PAGE');
}

// P3-05/P3-10: visible identity rules remain opt-in and independent products are not homogenized.
{
  const material=read('shared/material/v2/material.css');
  const tokens=read('shared/design-kernel/v2/tokens.css');
  const calendar=read('pages/calendar/index.html');
  const arte=read('arte/index.html');
  assert.doesNotMatch(tokens,/box-shadow\s*:/i);
  assert.match(material,/inset/i);
  assert.match(calendar,/--accent:/);
  assert.match(calendar,/Calendario/);
  assert.match(arte,/Adriana/i);
  assert.notEqual(calendar,arte);
}

// P3-09: universal engines stay separated from product/theme data.
{
  const cls=read('shared/classes/runtime/v2/class-runtime.js');
  const world=read('shared/student-world/runtime/v2/student-world-runtime.js');
  const pk=read('shared/pagekit/host/v2/pagekit-host.js');
  assert.match(cls,/revision/i);assert.match(world,/revision/i);assert.match(pk,/iframe/i);
  assert.doesNotMatch(cls,/JOSE|SOFI|MUMI/i);assert.doesNotMatch(world,/JOSE|SOFI|MUMI/i);
}

// P3-12 precondition: candidate visible V53 bytes are still exact.
const cp=await import('node:child_process');
const navBlob=cp.execFileSync('git',['hash-object','navigator/index.html'],{encoding:'utf8'}).trim();
assert.equal(navBlob,EXPECTED_V53);

console.log(JSON.stringify({ok:true,gateRange:'P3-04..P3-12-static',knownDiseases:diseases.length,currentRevision:current.revision,navBlob}));
