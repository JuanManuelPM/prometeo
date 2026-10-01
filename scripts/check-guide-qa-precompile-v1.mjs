import fs from 'node:fs';
import assert from 'node:assert/strict';
import {precompileQA,validateCompiled} from './guide-qa-precompile-v1.mjs';

const data=JSON.parse(fs.readFileSync('coordination/guide/tests/qa-precompile-v1.fixtures.json','utf8'));
const out=[];
for(const f of data.fixtures){
  const a=precompileQA(f.input);
  const b=precompileQA(JSON.parse(JSON.stringify(f.input)));
  assert.deepEqual(a,b,`${f.name}: deterministic repeat`);
  assert.deepEqual(a.counts,f.expected_counts,`${f.name}: state counts`);
  assert.equal(a.producer_state,'IMPLEMENTING',`${f.name}: QA precompile must not mutate producer state`);
  assert.equal(a.delivery_unit_ref,f.expected_delivery_unit_ref,`${f.name}: stable delivery unit binding`);
  assert.ok(a.checks.every(c=>(c.delivery_unit_ref??null)===f.expected_delivery_unit_ref),`${f.name}: every compiled check must carry the same delivery_unit_ref`);
  const v=validateCompiled(a);
  assert.equal(v.ok,true,`${f.name}: ${v.errors.join(',')}`);
  assert.ok(a.checks.some(c=>c.state==='PREPARED_NOW'),`${f.name}: at least one check must prepare before artifact`);
  out.push({name:f.name,producer_state:a.producer_state,delivery_unit_ref:a.delivery_unit_ref,counts:a.counts,checks:a.checks.map(c=>({id:c.check_id,state:c.state,blocking_scope:c.blocking_scope,delivery_unit_ref:c.delivery_unit_ref}))});
}
const first=precompileQA(data.fixtures[0].input);
assert.equal(first.checks.find(c=>c.kind==='contract').state,'PREPARED_NOW');
assert.equal(first.checks.find(c=>c.kind==='artifact-static').state,'WAITS_FOR_ARTIFACT');
assert.equal(first.checks.find(c=>c.kind==='served-browser-clicks').state,'WAITS_FOR_SERVED_RUNTIME');
assert.equal(first.checks.find(c=>c.kind==='visual-taste').state,'HUMAN_ONLY');
assert.equal(first.checks.find(c=>c.kind==='artifact-static').blocking_scope,'ASYNC_AFTER_CANDIDATE','artifact QA must not become implicit serial tax');
assert.throws(()=>precompileQA({...data.fixtures[0].input,delivery_unit_ref:'not valid ref'}),/DELIVERY_UNIT_REF_INVALID/,'invalid relation tokens must fail closed');
console.log(JSON.stringify({schema:'prometeo.qa-precompile-regression/v1',status:'PASS',fixture_count:out.length,results:out},null,2));
