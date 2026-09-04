import assert from 'node:assert/strict';
import {json,context,load} from './part2-test-helpers.mjs';
const c=context();load('shared/core/v1/durable.js',c);load('shared/privacy/v1/privacy.js',c);load('shared/context-foundry/v2/foundry.js',c);
assert.equal(c.PrometeoPrivacy.derive({sources:[{id:'a',privacy:'PROJECT'},{id:'b',privacy:'LOCAL'}]}),'LOCAL');
assert.throws(()=>c.PrometeoPrivacy.derive({sources:[{id:'secret',privacy:'LOCAL'}],requestedPrivacy:'PROJECT'}),e=>e.code==='PROMETEO_PRIVACY_DECLASS_RECEIPT');
const F=c.PrometeoContextFoundryV2.create({byteRegistry:json('context/bytes/BYTE_REGISTRY.json'),index:json('context/registry/CONTEXT_INDEX.json'),privacy:c.PrometeoPrivacy});
F.registerRecord({id:'LOCAL-SECRET',kind:'note',text:'calendar private secret',tags:['calendar'],roles:['all'],authority:'EXPLICIT_HUMAN_DECISION',privacy:'LOCAL',source_refs:[],currentness:'CURRENT'});
const explicit=F.select({ids:['LOCAL-SECRET'],target:'external'});assert.equal(explicit.selected.length,0);assert.equal(explicit.excluded[0].reason,'privacy-local');

F.registerRecord({id:'BYTES-LOCAL-REF',kind:'note',text:'local source context',tags:['private'],roles:['all'],authority:'SOURCE_REFERENCE',privacy:'LOCAL',source_refs:[],currentness:'CURRENT'});
F.registerRecord({id:'DERIVED-LOCAL',kind:'summary',text:'derived local summary',tags:['private'],roles:['all'],authority:'DERIVED_EVIDENCE',privacy:'LOCAL',lineage_ids:['BYTES-LOCAL-REF'],derived:true,source_refs:[],currentness:'CURRENT'});
assert.equal(F.getRecord('DERIVED-LOCAL').privacy,'LOCAL');
assert.throws(()=>F.registerRecord({id:'DERIVED-DOWNCLASS',kind:'summary',text:'bad declass',tags:['private'],roles:['all'],authority:'DERIVED_EVIDENCE',privacy:'PROJECT',lineage_ids:['BYTES-LOCAL-REF'],derived:true,source_refs:[],currentness:'CURRENT'}),e=>e.code==='PROMETEO_PRIVACY_DECLASS_RECEIPT');

F.registerRecord({id:'CONFLICT-A',kind:'note',text:'conflict demo',claim_key:'demo.key',value:'A',tags:['conflict'],roles:['all'],authority:'EXPLICIT_HUMAN_DECISION',privacy:'PROJECT',source_refs:[],currentness:'CURRENT'});
F.registerRecord({id:'CONFLICT-B',kind:'note',text:'conflict demo',claim_key:'demo.key',value:'B',tags:['conflict'],roles:['all'],authority:'HUMAN_ACCEPTED_EXACT_CHECKPOINT',privacy:'PROJECT',source_refs:[],currentness:'CURRENT'});
assert.throws(()=>F.select({query:'conflict demo',tags:['conflict']}),e=>e.code==='PROMETEO_CONTEXT_CONFLICT');
const s=F.select({query:'calendar button',tags:['calendar','button'],role:'implementer'});assert.ok(s.selected.some(x=>x.id==='CTX-CALENDAR-001'));assert.ok(s.selected.some(x=>x.id==='CTX-BUTTON-001'));
const receipt=await F.consume(s,{purpose:'test',workItemId:'W1'});assert.match(receipt.id,/^CTX-CONSUME-/);
console.log(JSON.stringify({ok:true,phases:['2.10','2.11'],selected:s.selected.map(x=>x.id)}));
