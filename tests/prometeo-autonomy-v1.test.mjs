import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deriveConvergence,isActiveWriter} from '../scripts/agent-network-lib.mjs';

const ws=(id,state,scope='shared/x/**')=>({id,repository:'JuanManuelPM/prometeo',write_scope:[scope],worker_states:state?[state]:[],provides:[],needs:[],depends_on:[],candidate_shared_owners:[],impacts:[]});

test('only overlapping active writers produce HARD_WRITE_COLLISION',()=>{
  const inactive=deriveConvergence([ws('a','COMPLETE'),ws('b','BOUNDARY')]);
  assert.equal(inactive.some(e=>e.type==='HARD_WRITE_COLLISION'),false);
  assert.equal(inactive.some(e=>e.type==='INACTIVE_SCOPE_OVERLAP'&&!e.blocking),true);
  const live=deriveConvergence([ws('a','EXECUTING'),ws('b','CLAIMED')]);
  assert.equal(live.some(e=>e.type==='HARD_WRITE_COLLISION'&&e.blocking),true);
});

test('writer state classification excludes completed and boundary states',()=>{
  assert.equal(isActiveWriter(ws('a','EXECUTING')),true);
  assert.equal(isActiveWriter(ws('a','WRITING')),true);
  assert.equal(isActiveWriter(ws('a','COMPLETE')),false);
  assert.equal(isActiveWriter(ws('a','BOUNDARY')),false);
});

test('mandatory constitution is wired through all public boot surfaces',()=>{
  const constitution=fs.readFileSync('coordination/GLOBAL_AGENT_CONSTITUTION_V1.md','utf8');
  const agents=fs.readFileSync('AGENTS.md','utf8');
  const short=fs.readFileSync('p.txt','utf8');
  const entry=JSON.parse(fs.readFileSync('.well-known/prometeo.json','utf8'));
  const execute=JSON.parse(fs.readFileSync('.well-known/prometeo-execute.json','utf8'));
  assert.match(constitution,/Preserve-first law/);
  assert.match(constitution,/Mandatory write preflight/);
  assert.match(agents,/Mandatory constitution/);
  assert.match(short,/global-constitution-v1\.md/);
  assert.equal(entry.mandatory_protocols.global_constitution.required_before_material_write,true);
  assert.equal(execute.constitution.required_before_material_write,true);
});
