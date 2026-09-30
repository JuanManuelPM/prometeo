import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const runId='RESIDENCY-MACROBATCH-01';
const packetPath=path.join(root,'coordination/launch-packets',runId,'PACKET.json');
const specPath=path.join(root,'coordination/workers/RESIDENCY_MACROBATCH_15X_V1.json');
const packet=JSON.parse(fs.readFileSync(packetPath,'utf8'));
const specRaw=fs.readFileSync(specPath);
const spec=JSON.parse(specRaw.toString('utf8'));

const gitBlobSha=buf=>crypto.createHash('sha1').update(Buffer.from('blob '+buf.length+'\0')).update(buf).digest('hex');
const fnv64=s=>{
  let h=14695981039346656037n;
  const prime=1099511628211n;
  for(let i=0;i<s.length;i++){ h^=BigInt(s.charCodeAt(i)); h=(h*prime)&0xffffffffffffffffn; }
  return h.toString(16).padStart(16,'0');
};

assert.equal(packet.schema,'prometeo.launch-packet-instance/v1');
assert.equal(packet.packet_profile,'GENERIC_SYNTHETIC_V1');
assert.equal(packet.run_id,runId);
assert.equal(packet.status,'ARMED');
assert.equal(packet.expected_human_launches,15);
assert.equal(packet.same_prompt_for_every_worker,true);
assert.equal(packet.human_numbers_slots,false);
for(const marker of ['RUN '+runId,'NUEVO_WORKER=1','PRIMERA_ACCIÓN_DURABLE','RUN-slot claim','NO reutilices identidad/slot','https://juanmanuelpm.github.io/prometeo/wc/']){
  assert.ok(packet.human_invocation.includes(marker),'missing human invocation marker '+marker);
}

const specSha=gitBlobSha(specRaw);
assert.equal(packet.benchmark_spec_blob_sha,specSha,'packet must pin exact benchmark spec blob');
const commonHash='fnv1a64:'+fnv64(JSON.stringify(spec.common_capsule));
assert.equal(packet.common_capsule_hash,commonHash);
assert.equal(packet.common_capsule.source_freeze.benchmark_spec_blob_sha,specSha);
assert.equal(packet.common_capsule.source_freeze.common_capsule_hash,commonHash);

assert.equal(packet.slots.length,15);
assert.equal(packet.reallocation_slots.length,15);
assert.equal(new Set(packet.slots.map(x=>x.slot_id)).size,15);
assert.equal(new Set(packet.reallocation_slots.map(x=>x.slot_id)).size,15);
const specVariants=new Map(spec.variants.map(v=>[v.variant_id,v]));
const counts={};
for(let i=0;i<packet.slots.length;i++){
  const slot=packet.slots[i];
  const source=spec.slots[i];
  const variant=specVariants.get(source.variant_id);
  assert.equal(slot.slot_id,'S'+String(i+1).padStart(3,'0'));
  assert.equal(slot.evolution_variant,'V3_EVIDENCE_MAP','common baseline must not encode benchmark treatment');
  assert.equal(slot.benchmark_variant_id,source.variant_id);
  assert.equal(slot.benchmark_replica,source.replica);
  assert.equal(slot.benchmark_source_slot_id,source.slot_id);
  assert.equal(slot.prompt_delta,variant.prompt_delta);
  assert.equal(slot.causal_delta_key,variant.causal_delta_key);
  assert.equal(slot.prompt_delta_hash,'fnv1a64:'+fnv64(variant.prompt_delta||''));
  assert.equal(slot.spec_blob_sha,specSha);
  assert.equal(slot.common_capsule_hash,commonHash);
  counts[slot.benchmark_variant_id]=(counts[slot.benchmark_variant_id]||0)+1;

  const realloc=packet.reallocation_slots[i];
  assert.equal(realloc.slot_id,'R'+String(i+1).padStart(3,'0'));
  assert.equal(realloc.paired_primary_slot_id,slot.slot_id);
  assert.equal(realloc.benchmark_variant_id,slot.benchmark_variant_id);
  assert.equal(realloc.benchmark_replica,slot.benchmark_replica);
}
assert.deepEqual(Object.fromEntries([...specVariants.keys()].map(k=>[k,counts[k]||0])),{
  V0_MINIMAL_CONTROL:3,
  V1_EXPLICIT_ZERO_LEDGER:3,
  V2_BLOCK_REVIEW:3,
  V3_CONTINUATION_PRIMING:3,
  V4_FILL_QUESTIONS_PRE_GUIDE:3
});

assert.equal(packet.common_capsule.workload.local_workload.blocks.length,6);
assert.equal(packet.common_capsule.workload.local_workload.blocks.reduce((n,b)=>n+b.tasks.length,0),72);
assert.equal(packet.common_capsule.workload.reallocation_workload.tasks.length,30);
assert.equal(packet.reallocation_pool.local_task_count,30);
assert.equal(packet.reallocation_pool.same_worker_required,true);
assert.equal(packet.reallocation_pool.human_recap_forbidden,true);
assert.equal(packet.launch_gate.initial_launches_exactly,15);
assert.equal(packet.launch_gate.human_numbers_slots,false);
assert.match(packet.truth_boundary,/has not executed any slot/i);

console.log(JSON.stringify({
  ok:true,
  run_id:runId,
  primary_slots:packet.slots.length,
  reallocation_slots:packet.reallocation_slots.length,
  benchmark_variants:counts,
  spec_blob_sha:specSha,
  common_capsule_hash:commonHash
}));
