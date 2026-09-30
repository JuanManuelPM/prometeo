import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const out=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-generic-launch-'));
const node=process.execPath;

const build=spawnSync(node,[path.join(root,'scripts/build-launch-packets.mjs'),root,out],{encoding:'utf8'});
assert.equal(build.status,0,'build-launch-packets must compile legacy and generic packets: '+build.stderr);

const check=spawnSync(node,[path.join(root,'scripts/check-launch-packet-v1.mjs'),root,out],{encoding:'utf8'});
assert.equal(check.status,0,'check-launch-packet must validate legacy and generic packets: '+check.stderr);

const packet=JSON.parse(fs.readFileSync(path.join(root,'coordination/launch-packets/GENERIC-SMOKE-01/PACKET.json'),'utf8'));
assert.equal(packet.packet_profile,'GENERIC_SYNTHETIC_V1');
assert.equal(packet.slots.length,2);
assert.equal(packet.reallocation_slots.length,0);
assert.equal(packet.reallocation_pool,undefined);
assert.equal(packet.same_prompt_for_every_worker,true);
assert.equal(packet.human_numbers_slots,false);

const publicPacket=JSON.parse(fs.readFileSync(path.join(out,'launch/GENERIC-SMOKE-01/packet.json'),'utf8'));
assert.deepEqual(publicPacket,packet,'public packet must preserve canonical generic packet bytes semantically');

for(const slot of packet.slots){
  const cap=JSON.parse(fs.readFileSync(path.join(out,'launch/GENERIC-SMOKE-01/slots',slot.slot_id+'.json'),'utf8'));
  assert.equal(cap.run_id,'GENERIC-SMOKE-01');
  assert.equal(cap.slot.slot_id,slot.slot_id);
  assert.equal(cap.variant.id,'V3_EVIDENCE_MAP');
  assert.equal(cap.common_capsule.primary_objective,packet.common_capsule.primary_objective);
}

const status=JSON.parse(fs.readFileSync(path.join(out,'launch/GENERIC-SMOKE-01/status.json'),'utf8'));
assert.equal(status.slots_total,2);
assert.equal(status.reallocation_slots_total,0);
assert.equal(status.human_numbering_required,false);

for(const legacy of ['CATLAB-EVO-01','CATLAB-P2B-01']){
  const legacyPacket=JSON.parse(fs.readFileSync(path.join(root,'coordination/launch-packets',legacy,'PACKET.json'),'utf8'));
  const publicLegacy=JSON.parse(fs.readFileSync(path.join(out,'launch',legacy,'packet.json'),'utf8'));
  assert.deepEqual(publicLegacy,legacyPacket,legacy+' must remain semantically unchanged');
}

console.log(JSON.stringify({ok:true,run_id:packet.run_id,slots:packet.slots.length,reallocation_slots:packet.reallocation_slots.length,legacy:['CATLAB-EVO-01','CATLAB-P2B-01']}));
