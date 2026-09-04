import assert from 'node:assert/strict';
import {context,load} from './part2-test-helpers.mjs';
const c=context();load('shared/evidence/v1/event-log.js',c);
const x=c.PrometeoEvidenceLog.compact({schema:'x',events:[{type:'A'},{type:'B'}],current:3});assert.equal(x.state.evidence_cursor,2);assert.equal(x.events.length,2);assert.equal('events' in x.state,false);
assert.throws(()=>c.PrometeoEvidenceLog.append([{evidence_seq:1}],[{type:'C'}],{baseCursor:0}),e=>e.code==='PROMETEO_EVIDENCE_STALE');
const scripts=['shared/evidence/v1/persistent-evidence.js','shared/classes/runtime/v2/class-runtime.js','shared/student-world/runtime/v2/student-world-runtime.js','shared/runtime/loader/v1/loader.js'];
for(const f of scripts)load(f,c);
assert.ok(c.PrometeoPersistentEvidence);assert.ok(c.PrometeoClassRuntimeV2);assert.ok(c.PrometeoStudentWorldRuntimeV2);assert.ok(c.PrometeoBackstageLoader);
console.log(JSON.stringify({ok:true,phase:'2.15',runtimeV2:true}));
