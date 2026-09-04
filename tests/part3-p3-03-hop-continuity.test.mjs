import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const current=read('state/CURRENT_GRAPH.json'),dot=read('state/DOT_STATE.json'),pending=read('state/PENDING.json');
const run=spawnSync(process.execPath,['scripts/p3-03-hop-runner.mjs'],{encoding:'utf8'});
if(run.status!==0){process.stderr.write(run.stderr||run.stdout);process.exit(run.status||1)}
const out=JSON.parse(run.stdout.trim());assert.equal(out.ok,true);assert.equal(out.gate,'P3-03');assert.equal(out.hops,3);assert.equal(out.negativeProbes,4);
const e=read('artifacts/p3-03/process-evidence.json');assert.equal(e.process_hops,3);assert.deepEqual(e.negative_probes,{stale_revision:true,forged_receipt_hash:true,next_gate_drift:true,missing_pending_frontier:true});assert.equal(e.isolation.no_fs_import,true);assert.equal(e.isolation.no_child_process_import,true);assert.equal(e.isolation.no_fetch_call,true);assert.equal(e.isolation.no_env_dependency,true);assert.equal(e.isolation.stdin_transport,true);
assert.equal(e.recovered.revision,current.revision);assert.equal(e.recovered.last_receipt,current.last_durable_receipt);assert.equal(e.recovered.phase,dot.phase);assert.equal(e.recovered.next_gate,dot.next_gate);assert.deepEqual(e.recovered.pending,(pending.items||[]).map(x=>x.id));assert.equal(e.truth_ceiling.clean_process_hops_pass,true);assert.equal(e.truth_ceiling.real_external_chat_restart_tested,false);assert.equal(e.truth_ceiling.browser_restart_tested,false);
console.log(JSON.stringify({ok:true,gate:'P3-03',kind:'process-test',revision:current.revision,lastReceipt:current.last_durable_receipt,truthDigest:e.truth_digest}));
