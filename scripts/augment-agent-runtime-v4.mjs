import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outArg=process.argv.indexOf('--out');
const OUT=path.resolve(ROOT,outArg>=0?process.argv[outArg+1]:'dist/agent-runtime');
const constitutionPath=path.join(ROOT,'coordination/GLOBAL_AGENT_CONSTITUTION_V1.md');
const constitution=fs.readFileSync(constitutionPath,'utf8');
const digest=crypto.createHash('sha256').update(constitution).digest('hex');
const ref={
  schema:'prometeo.global-agent-constitution/v1',
  url:'https://juanmanuelpm.github.io/prometeo/agent-runtime/protocols/global-constitution-v1.md',
  source:'coordination/GLOBAL_AGENT_CONSTITUTION_V1.md',
  sha256:digest,
  required_before_material_write:true,
};
const guard={
  default_mutation:'SURGICAL_PRESERVE_FIRST_DELTA',
  clean_slate_without_explicit_authority:'FORBIDDEN',
  prewrite_epoch_check:true,
  re_fetch_target_before_write:true,
  compare_and_swap:true,
  hard_collision_rule:'ONLY_OVERLAPPING_ACTIVE_WRITING_WORKERS',
  inactive_scope_overlap:'NON_BLOCKING_CONTEXT',
  release_worker_claim_on_completion:true,
};
function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8'))}
function writeJson(p,v){fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n')}
for(const name of fs.readdirSync(path.join(OUT,'workstreams')).filter(x=>x.endsWith('.json'))){
  const p=path.join(OUT,'workstreams',name);const packet=readJson(p);
  packet.mandatory_context={...(packet.mandatory_context||{}),global_constitution:ref};
  packet.write_guard=guard;
  packet.instructions=[
    'MANDATORY: load and obey the Global Agent Constitution before material writes.',
    'Treat normal change requests as preserve-first deltas against authoritative Current; never clean-slate rewrite by convenience.',
    'Before important writes/publication re-check EPOCH, reload this packet if changed, re-fetch target bytes and block only on overlapping active writers.',
    ...(packet.instructions||[]),
    'On completion/boundary release any active worker claim and return the human through the Universal Host/Page Change Feed when page-scoped.'
  ];
  writeJson(p,packet);
}
const manifestPath=path.join(OUT,'manifest.json');
const manifest=readJson(manifestPath);
manifest.mandatory_protocols={...(manifest.mandatory_protocols||{}),global_constitution:ref};
manifest.write_guard=guard;writeJson(manifestPath,manifest);
const epochPath=path.join(OUT,'epoch.json');
const epoch=readJson(epochPath);epoch.constitution=digest.slice(0,12);writeJson(epochPath,epoch);
console.log('Augmented runtime with constitution',digest);
