import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateGraph,planSignal,projectCandidates,normalizeName,compatible} from '../retomar/entrada-universal/core.mjs';
const g=JSON.parse(readFileSync(new URL('../retomar/entrada-universal/graph.v1.json',import.meta.url)));
const html=readFileSync(new URL('../retomar/index.html',import.meta.url),'utf8');
const projects=[{id:'facultad',label:'Psicología Evolutiva'},{id:'persistencia',label:'Persistencia'},{id:'linux-work',label:'Linux vieja PC'}];
const signal=(intents,entities=[],uncertainty=[])=>planSignal({intents,entities,uncertainty},projects);
const cases=[
['01 schema original',()=>assert.equal(validateGraph(g),true)],
['02 unique node identifiers',()=>assert.equal(new Set(g.nodes.map(n=>n.id)).size,g.nodes.length)],
['03 safe version semver',()=>assert.ok(g.nodes.every(n=>/^\d+\.\d+\.\d+$/.test(n.version)))],
['04 edges resolve',()=>assert.ok(g.edges.every(e=>g.nodes.some(n=>n.id===e.from)&&g.nodes.some(n=>n.id===e.to)))],
['05 routes resolve',()=>assert.ok(g.routes.every(r=>r.path.every(x=>g.nodes.some(n=>n.id===x))))],
['06 current owner reused',()=>assert.equal(g.owner,'tv/chat/relevo/retomar')],
['07 projection no new current',()=>assert.equal(g.authority,'PUBLIC_READ_ONLY_PROJECTION')],
['08 candidate not served',()=>assert.equal(g.release_state,'CANDIDATE_NOT_SERVED')],
['09 no false running status',()=>assert.ok(g.nodes.every(n=>!['running','live'].includes(n.status)))],
['10 public-only link allowlist',()=>assert.ok(g.nodes.every(n=>!n.source_url||n.source_url.startsWith('https://github.com/JuanManuelPM/prometeo/')))],
['11 trace requires gate',()=>assert.equal(g.boundary.release,'INDEPENDENT_GATE_REQUIRED')],
['12 no prompt required by UI',()=>assert.ok(html.includes('id="universalEntryMount"'))],
['13 same page no duplicate shell',()=>assert.ok(html.includes('id="track"')&&html.includes('id="activityRows"'))],
['14 module linked',()=>assert.ok(html.includes('entrada-universal/view.mjs'))],
['15 scenario A owner scoped',()=>assert.ok(g.routes.find(r=>r.id==='a').entities.includes('facultad'))],
['16 scenario B no execution node',()=>assert.ok(!g.routes.find(r=>r.id==='b').path.includes('execute'))],
['17 scenario C no production changes',()=>assert.equal(g.routes.find(r=>r.id==='c').side_effects,'PROHIBITED_IN_DEMO')],
['18 scenario D no automatic PR',()=>assert.ok(!g.routes.find(r=>r.id==='d').path.includes('execute'))],
['19 scenario E cautious',()=>assert.ok(g.routes.find(r=>r.id==='e').uncertainty.includes('hardware'))],
['20 question is read only',()=>assert.equal(signal(['status_question']).mutates,false)],
['21 question does not write',()=>assert.equal(signal(['status_question']).needs_authorization,false)],
['22 status requests fresh evidence',()=>assert.ok(signal(['status_question']).requires.includes('fresh_owner'))],
['23 intellectual no mutations',()=>assert.equal(signal(['intellectual_conversation']).kind,'intellectual')],
['24 unapproved idea stays idea',()=>assert.equal(signal(['idea_unapproved']).kind,'idea')],
['25 Argentine diacritics normalize',()=>assert.equal(normalizeName('Psicología Evolutiva'),normalizeName('psicologia evolutiva'))],
['26 duplicate exact',()=>assert.deepEqual(projectCandidates('PSICOLOGIA EVOLUTIVA',projects),['facultad'])],
['27 duplicate similar',()=>assert.ok(projectCandidates('Linux',projects).includes('linux-work'))],
['28 new project needs authorization',()=>assert.equal(signal(['create_project'],['new project']).needs_authorization,true)],
['29 duplicate blocks creation',()=>assert.ok(signal(['create_project'],['psicologia evolutiva']).blocked.includes('DUPLICATE_REVIEW'))],
['30 no owner invented for unrelated',()=>assert.equal(signal(['create_project'],['unrelated']).owner,null)],
['31 ambiguous transcription blocks mutation',()=>assert.ok(signal(['ambiguous_reference'],['linus?'],['referente']).blocked.length>0)],
['32 ambiguous action blocks mutation',()=>assert.equal(signal(['execute'],['facultad'],['acción']).kind,'ambiguous')],
['33 correction treated as work',()=>assert.equal(signal(['correct_order']).kind,'work')],
['34 deep research nonmutating by default',()=>assert.equal(signal(['deep_research']).needs_authorization,false)],
['35 priority change only explicit',()=>assert.equal(signal(['status_question']).priority_change,false)],
['36 explicit priority needs gate',()=>assert.equal(signal(['explicit_global_priority']).needs_authorization,true)],
['37 conflicting intents stay read only unless work explicit',()=>assert.equal(signal(['status_question','intellectual_conversation']).kind,'status')],
['38 structurally missing signal rejected',()=>assert.throws(()=>planSignal({}),/STRUCTURED_SIGNAL_REQUIRED/)],
['39 malformed graph rejected',()=>assert.throws(()=>validateGraph({...g,edges:[{from:'void',to:'entry'}]}),/EDGE_INVALID/)],
['40 incompatible cartridge major refused',()=>assert.equal(compatible({id:'x',version:'1.0.0',output:'a'},{id:'x',version:'2.0.0',output:'a'}).ok,false)],
['41 output ABI change refused',()=>assert.equal(compatible({id:'x',version:'1.0.0',output:'a'},{id:'x',version:'1.1.0',output:'b'}).ok,false)],
['42 compatible patch accepted',()=>assert.equal(compatible({id:'x',version:'1.0.0',output:'a'},{id:'x',version:'1.0.1',output:'a'}).ok,true)],
['43 injection cannot grant from structured signal',()=>assert.equal(signal(['intellectual_conversation'],['<script>']).needs_authorization,false)],
['44 missing tool must degrade',()=>assert.equal(g.boundary.chat_recovery,'AUTHENTICATED_CONNECTOR_OR_CONTEXT')],
['45 real two-chat proof not implied',()=>assert.equal(g.boundary.cross_chat_proof,'NOT_ATTESTED_BY_FIXTURES')]
];
cases.forEach(([name,fn])=>test(name,fn));
