import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const runtime=read('coordination/AGENT_RUNTIME.json');
const profiles=read('coordination/EXECUTION_PROFILES.json');
const entry=read('.well-known/prometeo.json');
if(runtime.version!==2)throw new Error('runtime must be v2');
for(const p of ['FAST','DEEP','EXHAUSTIVE','CONTINUE'])if(!profiles.profiles[p])throw new Error(`missing ${p}`);
if(runtime.seal.active!=='🟣 P✓')throw new Error('active seal drift');
if(!String(entry.runtime_manifest||'').includes('/agent-runtime/manifest.json'))throw new Error('entry missing runtime manifest');
const out='tmp/agent-runtime-test';
execFileSync(process.execPath,['scripts/build-agent-runtime.mjs','--out',out],{cwd:ROOT,stdio:'inherit'});
const manifest=read(`${out}/manifest.json`);
const now=read('coordination/NOW.json');
if(manifest.packets.length!==now.active_workstreams.length)throw new Error('packet count mismatch');
for(const p of manifest.packets){
  const packet=read(`${out}/workstreams/${p.id}.json`);
  if(!packet.seal.active.startsWith('🟣 P✓'))throw new Error(`missing seal ${p.id}`);
  if(!packet.execution.profiles.profiles.CONTINUE)throw new Error(`missing execution profiles ${p.id}`);
  if(!packet.state.actual_branch_head)throw new Error(`unresolved branch ${p.id}`);
}
fs.rmSync(path.join(ROOT,'tmp'),{recursive:true,force:true});
console.log(JSON.stringify({ok:true,runtime:manifest.runtime_revision,packets:manifest.packets.map(p=>p.id)}));
