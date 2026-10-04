import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {compileActivityTimeline} from '../scripts/build-activity-timeline.mjs';

const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const node=process.execPath;
const runA='PROMETEO-525-20261003-1900-A';
const runB='PROMETEO-525-20261003-2200-B';
const packetPath=path.join(sourceRoot,'coordination','launch-packets',runB,'PACKET.json');
const packet=JSON.parse(fs.readFileSync(packetPath,'utf8'));

assert.ok(['PREPARED','ARMED'].includes(packet.status));
assert.equal(packet.expected_workers,5);
assert.equal(packet.expected_human_launches,5);
assert.equal(packet.authority_mode,'SYNTHETIC_BENCHMARK_SLOT_CLAIM');
assert.deepEqual(packet.preclaim_gate.order,['VALIDATE_STATUS','VALIDATE_RUN_ID','VALIDATE_AUTHORITY_MODE','CREATE_CLAIM']);
assert.equal(packet.preclaim_gate.required_status,'ARMED');
assert.equal(packet.preclaim_gate.required_authority_mode,'SYNTHETIC_BENCHMARK_SLOT_CLAIM');
assert.equal(packet.preclaim_gate.invalid_gate_claim_attempted,false);
assert.equal(packet.preclaim_gate.invalid_gate_counts_occupancy,false);
assert.equal(packet.slots.length,5);
assert.equal(new Set(packet.slots.map(x=>x.slot_id)).size,5,'five slots unique');
assert.deepEqual(packet.slots.map(x=>x.title),['FANIN / KERNEL SHADOW','PREPARED WORK MASS LEDGER','CYCLE PACKER SHADOW','PLAN / RECORDER / TIMELINE','CYCLE CLOSER / INTEGRATION']);
for(const slot of packet.slots){
  assert.ok(Array.isArray(slot.dependencies),'dependencies required');
  assert.ok(Array.isArray(slot.consumer)&&slot.consumer.length>0,'consumer required');
  assert.ok(Array.isArray(slot.verifier)&&slot.verifier.length>0,'verifier required');
  assert.ok(Array.isArray(slot.integrator)&&slot.integrator.length>0,'integrator required');
  assert.ok(slot.done&&typeof slot.done==='object','DONE condition required');
  assert.ok(Array.isArray(slot.evidence_refs)&&slot.evidence_refs.length>0,'evidence refs required');
  assert.ok(String(slot.authority_boundary||'').length>0,'authority boundary required');
  assert.ok(Number(slot?.bounded_successor?.max_count)<=1,'at most one bounded successor');
  assert.ok(String(slot.claim_path).includes('/'+runB+'/claims/'),'B claim namespace required');
}
assert.equal(packet.safety_contract.raw_private_prompt_public,false);
assert.equal(packet.safety_contract.old_active_implies_working,false);
assert.equal(packet.safety_contract.observation_boundary_terminates_worker,false);
assert.equal(packet.historical_recovery.source_is_immutable,true);
assert.equal(packet.historical_recovery.no_claim_or_slot_reuse,true);

const aPath=path.join(sourceRoot,'coordination','launch-packets',runA,'PACKET.json');
const aHash=spawnSync('git',['hash-object',aPath],{cwd:sourceRoot,encoding:'utf8'});
assert.equal(aHash.status,0,aHash.stderr);
assert.equal(aHash.stdout.trim(),'8b9188534958148d4ddd084da9e2620d457c59af','A packet must remain byte-identical historical evidence');

const wc=fs.readFileSync(path.join(sourceRoot,'wc'),'utf8');
const requireIdx=wc.indexOf('Require packet');
const hardIdx=wc.indexOf('PRECLAIM HARD GATE',requireIdx);
const createIdx=wc.indexOf('Atomically CREATE the exact packet',requireIdx);
assert.ok(requireIdx>=0&&hardIdx>requireIdx&&createIdx>hardIdx,'authority_mode must validate before claim write');

function copyBase(root){
  const rels=['coordination/workers/LAUNCH_PACKET_PROTOCOL_V1.json','coordination/workers/WORKER_PIPELINE_V1.json','coordination/workers/WORKER_EVOLUTION_LAB_V1.json','coordination/workers/WORKER_BENCHMARK_RECEIPT_V1.json','coordination/launch-packets/'+runB+'/PACKET.json'];
  for(const rel of rels){
    const src=path.join(sourceRoot,rel);
    const dst=path.join(root,rel);
    fs.mkdirSync(path.dirname(dst),{recursive:true});
    fs.copyFileSync(src,dst);
  }
}

const invalidRoot=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-b-invalid-authority-'));
copyBase(invalidRoot);
const invalidPath=path.join(invalidRoot,'coordination','launch-packets',runB,'PACKET.json');
const invalidPacket=JSON.parse(fs.readFileSync(invalidPath,'utf8'));
invalidPacket.authority_mode='FINITE_RUN_EXISTING_PACKET_ATOMIC_SLOT_CLAIM';
fs.writeFileSync(invalidPath,JSON.stringify(invalidPacket,null,2));
const invalidCheck=spawnSync(node,[path.join(sourceRoot,'scripts/check-launch-packet-v1.mjs'),invalidRoot],{encoding:'utf8'});
assert.notEqual(invalidCheck.status,0,'invalid authority packet must fail validation');
assert.match(invalidCheck.stderr,/preclaim authority_mode mismatch/);

const occRoot=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-b-invalid-occupancy-'));
copyBase(occRoot);
const claimDir=path.join(occRoot,'coordination','launch-packets',runB,'claims');
fs.mkdirSync(claimDir,{recursive:true});
fs.writeFileSync(path.join(claimDir,'S001.json'),JSON.stringify({run_id:runB,slot_id:'S001',worker_id:'wc-invalid'}));
const noAllocDir=path.join(occRoot,'coordination','workers','no-allocation');
fs.mkdirSync(noAllocDir,{recursive:true});
fs.writeFileSync(path.join(noAllocDir,'wc-invalid.json'),JSON.stringify({run_id:runB,worker_id:'wc-invalid',invalid_claim_ref:'coordination/launch-packets/'+runB+'/claims/S001.json'}));
const occOut=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-b-invalid-occupancy-out-'));
const occBuild=spawnSync(node,[path.join(sourceRoot,'scripts/build-launch-packets.mjs'),occRoot,occOut],{encoding:'utf8'});
assert.equal(occBuild.status,0,occBuild.stderr);
const occStatus=JSON.parse(fs.readFileSync(path.join(occOut,'launch',runB,'status.json'),'utf8'));
assert.equal(occStatus.slots_claimed,0,'invalid claim must not generate occupancy');
assert.equal(occStatus.invalid_primary_claim_artifacts,1);

const dupRoot=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-b-duplicate-worker-'));
copyBase(dupRoot);
const dupDir=path.join(dupRoot,'coordination','launch-packets',runB,'claims');
fs.mkdirSync(dupDir,{recursive:true});
fs.writeFileSync(path.join(dupDir,'S001.json'),JSON.stringify({run_id:runB,slot_id:'S001',worker_id:'wc-dup'}));
fs.writeFileSync(path.join(dupDir,'S002.json'),JSON.stringify({run_id:runB,slot_id:'S002',worker_id:'wc-dup'}));
const dupOut=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-b-duplicate-worker-out-'));
const dupBuild=spawnSync(node,[path.join(sourceRoot,'scripts/build-launch-packets.mjs'),dupRoot,dupOut],{encoding:'utf8'});
assert.notEqual(dupBuild.status,0,'worker must not own two primary slots');
assert.match(dupBuild.stderr,/worker claims multiple primary slots/);

const timeline=compileActivityTimeline({},sourceRoot,'2026-10-04T01:05:00Z',8);
assert.ok(timeline.spans.some(x=>x.actor_kind==='run_plan'&&x.actor_id===runB&&x.status==='PLANNED'),'B plan must project to existing cycle timeline');
assert.equal(timeline.events.filter(x=>x.actor_id===runB&&x.type==='PLANNED').length,5,'five B planned slots must be visible');

const activity=spawnSync(node,[path.join(sourceRoot,'tests/activity-timeline-v1.test.mjs')],{cwd:sourceRoot,encoding:'utf8'});
assert.equal(activity.status,0,'lifecycle/privacy/stale/consumer/boundary regression failed: '+activity.stderr);

console.log(JSON.stringify({ok:true,run_id:runB,slots:5,authority_mode:packet.authority_mode,preclaim_gate:'PASS',invalid_claim_occupancy:'PASS',duplicate_worker_claim:'PASS',timeline_plan_visible:'PASS',activity_lifecycle_regression:'PASS',a_immutable_hash:'PASS'}));
