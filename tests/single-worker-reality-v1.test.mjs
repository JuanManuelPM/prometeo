import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const run='SINGLE-WORKER-REALITY-01';
const packet=JSON.parse(fs.readFileSync(path.join(root,'coordination/launch-packets',run,'PACKET.json'),'utf8'));
const events=JSON.parse(fs.readFileSync(path.join(root,'fixtures/worker-reality-01/input/events.json'),'utf8')).records;
const rules=JSON.parse(fs.readFileSync(path.join(root,'fixtures/worker-reality-01/input/rules.json'),'utf8'));
const continuation=JSON.parse(fs.readFileSync(path.join(root,'fixtures/worker-reality-01/input/continuation.json'),'utf8'));
const starter=fs.readFileSync(path.join(root,'fixtures/worker-reality-01/starter/processor.mjs'),'utf8');
const evaluator=path.join(root,'fixtures/worker-reality-01/evaluator.mjs');

assert.equal(packet.packet_profile,'GENERIC_SYNTHETIC_V1');
assert.equal(packet.status,'CANDIDATE','REALITY-01 must stay non-launchable until explicitly armed');
assert.equal(packet.expected_human_launches,1);
assert.equal(packet.slots.length,1);
assert.equal(packet.slots[0].slot_id,'S001');
assert.equal(packet.reallocation_slots.length,1);
assert.equal(packet.reallocation_slots[0].slot_id,'R001');
assert.equal(packet.reallocation_slots[0].paired_primary_slot_id,'S001');
assert.equal(packet.reallocation_pool.same_worker_required,true);
assert.equal(packet.reallocation_pool.human_recap_forbidden,true);
assert.equal(packet.common_capsule.semantic_midpoint.count,1);
assert.equal(packet.common_capsule.required_features.length,13);
assert.equal(packet.common_capsule.hard_gates.length,12);
assert.equal(packet.common_capsule.measurement_contract.no_fake_zero,true);

assert.ok(events.length>=80,'fixture should be materially nontrivial');
const ids=new Set();
let duplicateCount=0,ignored=0,taint=0;
for(const r of events){
  if(ids.has(r.event_id)) duplicateCount++; else ids.add(r.event_id);
  if(r.status==='IGNORED') ignored++;
  if(/TAINT_CANARY_/.test(JSON.stringify(r))) taint++;
}
assert.ok(duplicateCount>=6,'fixture needs duplicate updates');
assert.ok(ignored>=5,'fixture needs ignored rows');
assert.ok(taint>=8,'fixture needs taint markers');
assert.ok(continuation.extra_records.length>=12,'continuation must add material records');
assert.equal(continuation.overrides.severity_weights.P1,7);
assert.equal(continuation.overrides.breach_ms,90000);
assert.equal(rules.severity_weights.P0,8);

for(const defect of [
  "if (!byId.has(row.event_id))",
  "const retained = [...byId.values()]",
  "P0: 6",
  "s.notes.push(row.note)",
  "a.score - b.score"
]) assert.ok(starter.includes(defect),'starter lost planted defect: '+defect);

const outputChecks=[
  ['primary',path.join(root,'pages/bench/reality',run,'S001')],
  ['continuation',path.join(root,'pages/bench/reality',run,'R001')]
];
const evaluated=[];
for(const [mode,dir] of outputChecks){
  if(!fs.existsSync(path.join(dir,'processor.mjs'))) continue;
  const p=spawnSync(process.execPath,[evaluator,mode,dir],{encoding:'utf8'});
  assert.equal(p.status,0,mode+' evaluator failed: '+p.stderr+'\n'+p.stdout);
  evaluated.push({mode,stdout:p.stdout.trim()});
}

console.log(JSON.stringify({
  ok:true,run,status:packet.status,
  fixture:{records:events.length,unique_ids:ids.size,duplicate_updates:duplicateCount,ignored,taint_rows:taint,continuation_records:continuation.extra_records.length},
  evaluated
}));
