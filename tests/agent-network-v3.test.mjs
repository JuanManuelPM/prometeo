import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {deriveConvergence, filterRelevantEvents, scopesOverlap, assertPublicSafe} from '../scripts/agent-network-lib.mjs';

const root=path.resolve(process.cwd());
const out=path.join(root,'dist/agent-runtime');
const read=rel=>JSON.parse(fs.readFileSync(path.join(out,rel),'utf8'));

const manifest=read('manifest.json');
const epoch=read('epoch.json');
const network=read('network.json');
const convergence=read('convergence.json');
const index=read('workstream-index.json');
const general=read('workstreams/prometeo-general.json');

assert.equal(manifest.schema,'prometeo.agent-runtime-manifest/v3');
assert.equal(manifest.runtime_revision,3);
assert.equal(epoch.schema,'prometeo.epoch/v1');
assert.ok(/^P3-[0-9a-f]{12}$/.test(epoch.epoch));
assert.ok(Buffer.byteLength(JSON.stringify(epoch)) < 1024,'EPOCH must stay tiny');
assert.equal(network.schema,'prometeo.agent-network/v1');
assert.equal(convergence.schema,'prometeo.convergence-view/v1');
assert.equal(general.schema,'prometeo.compiled-work-packet/v3');
assert.deepEqual(general.write_scope,[],'GENERAL must remain read-only');
assert.ok(index.workstreams.some(w=>w.id==='p4-capture'));
assert.ok(index.workstreams.some(w=>w.id==='calendar-life-preview'));
assert.ok(index.workstreams.some(w=>w.id==='agent-network-v3'));
assert.ok(manifest.epoch_url.endsWith('/agent-runtime/epoch.json'));
assert.ok(manifest.network_url.endsWith('/agent-runtime/network.json'));
assert.ok(manifest.packets.every(p=>p.url.includes('/agent-runtime/workstreams/')));
assertPublicSafe(network);
assertPublicSafe(manifest);

// Disjoint workers must not be blocked.
assert.equal(scopesOverlap(['pages/calendar/**'],['shared/capture/**']),false);
let events=deriveConvergence([
  {id:'calendar',repository:'R',write_scope:['pages/calendar/**'],needs:[],provides:[],depends_on:[],impacts:[],candidate_shared_owners:[]},
  {id:'capture',repository:'R',write_scope:['shared/capture/**'],needs:[],provides:[],depends_on:[],impacts:[],candidate_shared_owners:[]}
]);
assert.equal(events.some(e=>e.type==='HARD_WRITE_COLLISION'),false);

// Same owner scope must surface a hard collision.
events=deriveConvergence([
  {id:'a',repository:'R',write_scope:['shared/input/**'],needs:[],provides:[],depends_on:[],impacts:[],candidate_shared_owners:[]},
  {id:'b',repository:'R',write_scope:['shared/input/pointer/**'],needs:[],provides:[],depends_on:[],impacts:[],candidate_shared_owners:[]}
]);
assert.equal(events.filter(e=>e.type==='HARD_WRITE_COLLISION').length,1);
assert.equal(events.find(e=>e.type==='HARD_WRITE_COLLISION').blocking,true);

// Provider change should reach only the dependent consumer.
events=deriveConvergence([
  {id:'capture',repository:'R',write_scope:['shared/capture/**'],needs:[],provides:['capture.voice-intake'],depends_on:[],impacts:[],candidate_shared_owners:[],material_activity:true,last_useful_delta:'recorder contract changed'},
  {id:'calendar',repository:'R',write_scope:['pages/calendar/**'],needs:['capture.voice-intake'],provides:[],depends_on:[],impacts:[],candidate_shared_owners:[]},
  {id:'jose',repository:'R',write_scope:['pages/jose/**'],needs:[],provides:[],depends_on:[],impacts:[],candidate_shared_owners:[]}
]);
const dep=events.find(e=>e.type==='DEPENDENCY_CHANGED');
assert.ok(dep);
assert.deepEqual(dep.targets,['calendar']);
assert.ok(filterRelevantEvents(events,{id:'calendar',topics:['calendar'],needs:['capture.voice-intake'],depends_on:[]}).some(e=>e.type==='DEPENDENCY_CHANGED'));
assert.equal(filterRelevantEvents(events,{id:'jose',topics:['study'],needs:[],depends_on:[]}).some(e=>e.type==='DEPENDENCY_CHANGED'),false);

// Shared owner duplication should be surfaced, not silently duplicated.
events=deriveConvergence([
  {id:'jose',repository:'R',write_scope:['pages/jose/**'],candidate_shared_owners:['shared/input'],needs:[],provides:[],depends_on:[],impacts:[]},
  {id:'pagekit',repository:'R',write_scope:['shared/pagekit/**'],candidate_shared_owners:['shared/input'],needs:[],provides:[],depends_on:[],impacts:[]}
]);
assert.ok(events.some(e=>e.type==='SHARED_OWNER_CANDIDATE'));

// Public network must reject obvious secrets.
assert.throws(()=>assertPublicSafe({access_token:'secret'}),/PUBLIC_NETWORK_PRIVACY_VIOLATION/);

console.log(JSON.stringify({ok:true,runtime:manifest.runtime_revision,epoch:epoch.epoch,workstreams:index.workstreams.length,workers:network.workers.length,convergence:convergence.events.length},null,2));
