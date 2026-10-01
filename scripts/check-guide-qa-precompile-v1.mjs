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
  const v=validateCompiled(a);
  assert.equal(v.ok,true,`${f.name}: ${v.errors.join(',')}`);
  assert.ok(a.checks.some(c=>c.state==='PREPARED_NOW'),`${f.name}: at least one check must prepare before artifact`);
  out.push({name:f.name,producer_state:a.producer_state,counts:a.counts,checks:a.checks.map(c=>({id:c.check_id,state:c.state,blocking_scope:c.blocking_scope}))});
}
const first=precompileQA(data.fixtures[0].input);
assert.equal(first.checks.find(c=>c.kind==='contract').state,'PREPARED_NOW');
assert.equal(first.checks.find(c=>c.kind==='artifact-static').state,'WAITS_FOR_ARTIFACT');
assert.equal(first.checks.find(c=>c.kind==='served-browser-clicks').state,'WAITS_FOR_SERVED_RUNTIME');
assert.equal(first.checks.find(c=>c.kind==='visual-taste').state,'HUMAN_ONLY');
assert.equal(first.checks.find(c=>c.kind==='artifact-static').blocking_scope,'ASYNC_AFTER_CANDIDATE','artifact QA must not become implicit serial tax');
console.log(JSON.stringify({schema:'prometeo.qa-precompile-regression/v1',status:'PASS',fixture_count:out.length,results:out},null,2));
