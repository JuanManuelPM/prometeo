import fs from 'node:fs';
import assert from 'node:assert/strict';
import { decompose, validateAtomicTask } from './guide-atomic-work-decomposer-v1.mjs';

const fixturePath = 'coordination/guide/tests/atomic-work-decomposer-v1.fixtures.json';
const data = JSON.parse(fs.readFileSync(fixturePath,'utf8'));
const results=[];
for (const f of data.fixtures) {
  const first=decompose(f.parent);
  const second=decompose(JSON.parse(JSON.stringify(f.parent)));
  assert.equal(first.decision.atomize,f.expect_atomize,`${f.name}: atomize decision`);
  assert.equal(first.atoms.length,f.expect_atoms,`${f.name}: atom count`);
  assert.deepEqual(second.atoms,first.atoms,`${f.name}: deterministic repeat`);
  for(const atom of first.atoms){
    const v=validateAtomicTask(atom);
    assert.equal(v.ok,true,`${f.name}: invalid atom ${atom.atomic_task_id}: ${v.missing.join(',')}`);
  }
  const ids=new Set(first.atoms.map(a=>a.atomic_task_id));
  assert.equal(ids.size,first.atoms.length,`${f.name}: duplicate ids`);
  const seen=new Set();
  for(const atom of first.atoms){
    for(const dep of atom.dependencies) assert.equal(seen.has(dep),true,`${f.name}: dependency must precede consumer`);
    seen.add(atom.atomic_task_id);
  }
  results.push({name:f.name,atomize:first.decision.atomize,atoms:first.atoms.map(a=>a.atomic_task_id)});
}

const tele=data.fixtures.find(f=>f.name==='tele-bootstrap-command-state').parent;
const reordered=JSON.parse(JSON.stringify(tele));
reordered.candidate_atoms.reverse();
for(const a of reordered.candidate_atoms){
  if(Array.isArray(a.input_refs)) a.input_refs.reverse();
  if(Array.isArray(a.required_capabilities)) a.required_capabilities.reverse();
}
assert.deepEqual(decompose(reordered).atoms,decompose(tele).atoms,'input ordering must not change decomposition');

console.log(JSON.stringify({schema:'prometeo.atomic-work-decomposer-regression/v1',status:'PASS',fixture_count:results.length,results},null,2));
