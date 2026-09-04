import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const run=spawnSync(process.execPath,['scripts/p3-02-fresh-agent-runner.mjs'],{cwd:ROOT,encoding:'utf8'});
if(run.status!==0){process.stderr.write(run.stderr||'');process.stderr.write(run.stdout||'');process.exit(run.status||1)}
const out=JSON.parse(run.stdout.trim());assert.equal(out.ok,true);assert.equal(out.gate,'P3-02');assert.equal(out.roles,13);assert.ok(out.comparisons>=12);assert.equal(out.mutationProbes,4);
const e=JSON.parse(fs.readFileSync(new URL('../artifacts/p3-02/evidence.json',import.meta.url),'utf8'));
assert.equal(e.schema,'prometeo.p3-02-fresh-agent-evidence/v1');assert.equal(e.agent_kind,'fresh deterministic process');assert.equal(e.external_llm,false);
assert.equal(e.input_contract.chat_history,false);assert.equal(e.input_contract.worker_memory,false);assert.equal(e.input_contract.repo_context_to_child,false);
for(const v of Object.values(e.comparisons))assert.equal(v,true);for(const v of Object.values(e.mutation_probes))assert.equal(v,true);for(const v of Object.values(e.isolation))assert.equal(v,true);
assert.equal(e.recovered.active_frontend,'navigator-v53-visible');assert.equal(e.recovered.pages.count,31);assert.equal(e.truth_ceiling.human_accepted,false);assert.equal(e.truth_ceiling.new_served_verification,false);assert.equal(e.truth_ceiling.production_changed,false);
console.log(JSON.stringify({ok:true,gate:'P3-02',roles:out.roles,answerDigest:out.answerDigest}));
