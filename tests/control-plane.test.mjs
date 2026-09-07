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
assert.ok(['prometeo.agent-entry/v1','prometeo.agent-entry/v2','prometeo.agent-entry/v3'].includes(entry.schema));
if(entry.schema!=='prometeo.agent-entry/v1')assert.ok(String(entry.runtime_manifest||'').includes('/agent-runtime/manifest.json'));
if(entry.schema==='prometeo.agent-entry/v3'){
  assert.ok(String(entry.fast_epoch||'').includes('/agent-runtime/epoch.json'));
  assert.ok(String(entry.network||'').includes('/agent-runtime/network.json'));
  assert.ok(String(entry.short_bootstrap||'').endsWith('/p.txt'));
}
assert.equal(now.schema,'prometeo.control-plane-now/v1');
assert.ok(now.active_workstreams.length>=2);
assert.equal(feed.revision,Math.max(...feed.deltas.map(d=>d.revision)));
for(const ws of now.active_workstreams){
  assert.ok(ws.pack && fs.existsSync(path.join(ROOT,ws.pack)),`missing pack for ${ws.id}`);
  if(ws.last_return)assert.ok(fs.existsSync(path.join(ROOT,ws.last_return)),`missing LAST_RETURN for ${ws.id}`);
  const p=json(ws.pack);assert.equal(p.id,ws.id);assert.ok(Array.isArray(p.write_scope)&&p.write_scope.length);
}
function route(q){const r=spawnSync(process.execPath,['scripts/control-plane-resolve.mjs',q],{cwd:ROOT,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout)}
const capture=route('quiero grabar varias notas de voz y crear una patente');
assert.equal(capture.workstream.id,'p4-capture');
assert.ok(capture.pack.already_decided.some(x=>/audio|capture|whisper/i.test(x)));
const calendar=route('mejora los habitos y el calendario de esta pagina');
assert.equal(calendar.workstream.id,'calendar-life-preview');
assert.ok(/calendar|habit/i.test(calendar.pack.human_intent));
const network=route('quiero mejorar el chat de chats y la convergencia entre workers');
assert.equal(network.workstream.id,'agent-network-v3');
for(const r of [capture,calendar,network]){
  const watermark=Math.max(Number(r.last_return?.global_revision_seen??0),Number(r.pack?.last_global_revision_seen??0));
  assert.ok(r.relevant_deltas.every(d=>d.revision>watermark),'resolver must not resend consumed deltas');
}
assert.equal(route('tema completamente desconocido xyz').route,null);
console.log(JSON.stringify({ok:true,entry_schema:entry.schema,workstreams:now.active_workstreams.map(x=>x.id),now_revision:now.revision,delta_revision:feed.revision}));
