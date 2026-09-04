import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const run=spawnSync(process.execPath,['scripts/p3-03-hop-runner.mjs'],{encoding:'utf8'});
if(run.status!==0){process.stderr.write(run.stderr||run.stdout);process.exit(run.status||1)}
const out=JSON.parse(run.stdout.trim());
assert.equal(out.ok,true);assert.equal(out.gate,'P3-03');assert.equal(out.hops,3);assert.equal(out.negativeProbes,4);
const e=JSON.parse(fs.readFileSync('artifacts/p3-03/process-evidence.json','utf8'));
assert.equal(e.process_hops,3);
assert.deepEqual(e.negative_probes,{stale_revision:true,forged_receipt_hash:true,next_gate_drift:true,missing_pending_frontier:true});
assert.equal(e.isolation.no_fs_import,true);assert.equal(e.isolation.no_child_process_import,true);assert.equal(e.isolation.no_fetch_call,true);assert.equal(e.isolation.no_env_dependency,true);assert.equal(e.isolation.stdin_transport,true);
assert.equal(e.recovered.revision,6);assert.equal(e.recovered.last_receipt,'R-P3-02-FRESH-0007');assert.equal(e.recovered.phase,'PART3_P3_02_COMPLETE');assert.equal(e.recovered.next_gate,'P3-03_HOP_CONTINUITY');assert.deepEqual(e.recovered.pending,['PENDING-PART3-001']);
assert.equal(e.truth_ceiling.clean_process_hops_pass,true);assert.equal(e.truth_ceiling.real_external_chat_restart_tested,false);assert.equal(e.truth_ceiling.browser_restart_tested,false);
console.log(JSON.stringify({ok:true,gate:'P3-03',kind:'process-test',truthDigest:e.truth_digest}));
