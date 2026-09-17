import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const candidate=path.join(root,'candidate/calendar-habits-custom-trackers-v1');
const Model=require(path.join(candidate,'tracker-model-v1.js'));
const Adapter=require(path.join(candidate,'source-adapter-v1.js'));
const stamp='2026-09-17T20:40:00.000Z';

// A genuinely new user gets no fixed/personal tracker roster.
const fresh=Model.bootstrap(null,{},stamp).config;
assert.equal(fresh.trackers.length,0,'new user must start with no mandatory trackers');

// Existing history discovers only tracker ids that actually exist and preserves historical semantics.
const legacyHistory={youtube:{'2026-09-01':'lapse'},study:{'2026-09-02':'done'}};
const snapshot=JSON.stringify(legacyHistory);
const migrated=Model.bootstrap(null,legacyHistory,stamp).config;
assert.deepEqual(migrated.trackers.map(t=>t.id),['youtube','study']);
assert.equal(migrated.trackers[0].label,'YouTube');
assert.equal(migrated.trackers[0].group,'addictions');
assert.equal(migrated.trackers[0].kind,'avoid');
assert.equal(migrated.trackers[1].label,'Estudio');
assert.equal(migrated.trackers[1].group,'extras');
assert.equal(JSON.stringify(legacyHistory),snapshot,'roster migration must not mutate behavior history');

// Add, rename and classify without changing the stable tracker id.
let config=Model.add(migrated,{label:'Leer',kind:'positive',group:'routine'},{now:stamp,idFactory:()=> 'tracker-leer'});
assert.ok(config.trackers.some(t=>t.id==='tracker-leer'));
config=Model.update(config,'tracker-leer',{label:'Lectura',kind:'negative',group:'other'},'2026-09-17T20:41:00.000Z');
const edited=config.trackers.find(t=>t.id==='tracker-leer');
assert.equal(edited.label,'Lectura');
assert.equal(edited.kind,'negative');
assert.equal(edited.group,'other');

// Archive hides from live renderer but never deletes config/history; restore recovers it.
config=Model.archive(config,'tracker-leer',true,'2026-09-17T20:42:00.000Z');
assert.ok(!Model.activeTrackers(config).some(t=>t.id==='tracker-leer'));
const exported=Model.exportBundle(config,legacyHistory);
assert.ok(exported.config.trackers.some(t=>t.id==='tracker-leer'&&t.archived===true));
assert.deepEqual(exported.history,legacyHistory);
config=Model.archive(config,'tracker-leer',false,'2026-09-17T20:43:00.000Z');
assert.ok(Model.activeTrackers(config).some(t=>t.id==='tracker-leer'));

// Browser reload serialization is lossless for the configurable roster.
const reloaded=Model.normalizeConfig(JSON.parse(JSON.stringify(config)),stamp);
assert.deepEqual(reloaded.trackers,config.trackers);

// The traces adapter replaces both hardcoded roster and legacy sample seed.
const tracesFixture=`(()=>{\n  const GROUPS=[\n    {id:'addictions',label:'Adicciones'}\n  ];\n  const TRACKERS=[\n    {id:'weed',label:'Marihuana',group:'addictions',kind:'avoid'}\n  ];\n  function seed(){\n    const s={};TRACKERS.forEach(t=>s[t.id]={});\n    const put=(id,v)=>{s[id]=v};put('weed','lapse');\n    return s;\n  }\n})();`;
const patchedTraces=Adapter.patchTraces(tracesFixture,{groups:[],trackers:[]});
assert.ok(patchedTraces.includes('const GROUPS=[];'));
assert.ok(patchedTraces.includes('const TRACKERS=[];'));
assert.ok(patchedTraces.includes('function seed(){const s={};TRACKERS.forEach(t=>s[t.id]={});return s;}'));
assert.ok(!patchedTraces.includes("put('weed'"));

// The persistence adapter changes exactly the two renderer load sites, leaving v31 as data authority.
const persistenceFixture=`async function a(){await ${Adapter.TRACE_CALL};}\nfunction b(){return ${Adapter.TRACE_CALL}.then(()=>true);}`;
const patchedPersistence=Adapter.patchPersistence(persistenceFixture);
assert.equal(patchedPersistence.split(Adapter.TRACE_CALL).length-1,0);
assert.equal(patchedPersistence.split('window.PrometeoHabitTrackerConfig.loadRenderer(shadow)').length-1,2);

// Integration remains a preserve-first fork of the exact Calendar / Habits / Money shell.
const html=fs.readFileSync(path.join(candidate,'index.html'),'utf8');
for(const id of ['calendarSpace','habitsSpace','moneySpace'])assert.ok(html.includes(`id="${id}"`),`missing preserved shell surface ${id}`);
assert.ok(html.includes('/prometeo/pages/calendar/previews/habits-traces-v1/money-v15.js'));
assert.ok(html.includes('/prometeo/pages/calendar/previews/habits-traces-v1/romantic.js'));
assert.ok(html.includes('./source-adapter-v1.js'));
assert.ok(html.includes('./habits-persistence-v32-candidate.js'));
assert.ok(!html.includes('src="/prometeo/pages/calendar/previews/habits-traces-v1/habits-persistence-v31.js'), 'candidate must route v31 through the configurable renderer adapter');

const persistence=fs.readFileSync(path.join(candidate,'habits-persistence-v32-candidate.js'),'utf8');
assert.ok(persistence.includes('habits-persistence-v31.js'));
assert.ok(persistence.includes('PrometeoHabitSourceAdapter'));
assert.ok(persistence.includes('Adapter.patchPersistence(source)'));

console.log('calendar_habits_custom_trackers_v1: PASS');
