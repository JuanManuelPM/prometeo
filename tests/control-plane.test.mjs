import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const json=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const now=json('coordination/NOW.json');
const feed=json('coordination/DELTA_FEED.json');
const entry=json('.well-known/prometeo.json');
assert.ok(['prometeo.agent-entry/v1','prometeo.agent-entry/v2'].includes(entry.schema));
if(entry.schema==='prometeo.agent-entry/v2')assert.ok(String(entry.runtime_manifest||'').includes('/agent-runtime/manifest.json'));
assert.equal(now.schema,'prometeo.control-plane-now/v1');
assert.ok(now.active_workstreams.length>=2);
assert.equal(feed.revision,Math.max(...feed.deltas.map(d=>d.revision)));
for(const ws of now.active_workstreams){assert.ok(fs.existsSync(path.join(ROOT,ws.pack)));assert.ok(fs.existsSync(path.join(ROOT,ws.last_return)));const p=json(ws.pack);assert.equal(p.id,ws.id);assert.ok(Array.isArray(p.write_scope)&&p.write_scope.length);}
function route(q){const r=spawnSync(process.execPath,['scripts/control-plane-resolve.mjs',q],{cwd:ROOT,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout)}
assert.equal(route('quiero grabar varias notas de voz y crear una patente').workstream.id,'p4-capture');
assert.equal(route('mejora los habitos y el calendario de esta pagina').workstream.id,'calendar-life-preview');
const p4=route('microfono whisper');assert.ok(p4.relevant_deltas.some(d=>d.id==='D-002-CAPTURE-OWNER-CANDIDATE'));
const cal=route('momentum calendario');assert.ok(cal.relevant_deltas.some(d=>d.id==='D-004-CALENDAR-HABITS-CONTRACT-V2'));
assert.equal(route('tema completamente desconocido xyz').route,null);
console.log(JSON.stringify({ok:true,entry_schema:entry.schema,workstreams:now.active_workstreams.map(x=>x.id),now_revision:now.revision,delta_revision:feed.revision}));
