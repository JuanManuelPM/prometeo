import fs from 'node:fs';
import assert from 'node:assert/strict';

const packet=JSON.parse(fs.readFileSync('coordination/launch-packets/MAXCAP-50-01/PACKET.json','utf8'));
const spec=JSON.parse(fs.readFileSync('coordination/workers/WORKER_MAXCAP_50_V1.json','utf8'));

assert.equal(packet.run_id,'MAXCAP-50-01');
assert.equal(packet.status,'ARMED');
assert.equal(packet.packet_profile,'GENERIC_SYNTHETIC_V1');
assert.equal(packet.expected_human_launches,50);
assert.equal(packet.same_prompt_for_every_worker,true);
assert.equal(packet.human_numbers_slots,false);
assert.equal(packet.slots.length,50);
assert.equal(packet.reallocation_slots.length,50);
assert.match(packet.human_invocation,/RUN MAXCAP-50-01/);
assert.match(packet.human_invocation,/NUEVO_WORKER=1/);
assert.match(packet.human_invocation,/RUN-slot claim/);

const loads=['L1_5K','L2_10K','L3_15K','L4_20K','L5_30K'];
const conds=['C0_CONTROL','C1_CONTINUATION_PRIMING'];
const cell=new Map();
for(const s of packet.slots){
  assert.match(s.slot_id,/^S\d{3}$/);
  assert.equal(s.evolution_variant,'V3_EVIDENCE_MAP');
  assert.ok(loads.includes(s.load_tier_id));
  assert.ok(conds.includes(s.continuation_condition_id));
  assert.ok(Number.isInteger(s.benchmark_replica) && s.benchmark_replica>=1 && s.benchmark_replica<=5);
  const key=s.load_tier_id+'|'+s.continuation_condition_id;
  cell.set(key,(cell.get(key)||0)+1);
  const ord=s.slot_id.slice(1);
  const r=packet.reallocation_slots.find(x=>x.slot_id==='R'+ord);
  assert.ok(r,'missing paired reallocation '+s.slot_id);
  assert.equal(r.paired_primary_slot_id,s.slot_id);
  assert.equal(r.load_tier_id,s.load_tier_id);
  assert.equal(r.continuation_condition_id,s.continuation_condition_id);
  assert.equal(r.benchmark_replica,s.benchmark_replica);
}
for(const load of loads) for(const cond of conds) assert.equal(cell.get(load+'|'+cond),5,'bad cell '+load+' '+cond);

const targets=new Map(packet.slots.filter(s=>s.continuation_condition_id==='C0_CONTROL').map(s=>[s.load_tier_id,[s.target_useful_output_words,s.primary_task_count]]));
assert.deepEqual(targets.get('L1_5K'),[5000,100]);
assert.deepEqual(targets.get('L2_10K'),[10000,200]);
assert.deepEqual(targets.get('L3_15K'),[15000,300]);
assert.deepEqual(targets.get('L4_20K'),[20000,400]);
assert.deepEqual(targets.get('L5_30K'),[30000,600]);

assert.equal(spec.design.primary_slots,50);
assert.equal(spec.design.factors.replicas_per_cell,5);
assert.equal(spec.workload_generator.primary_blocks,10);
assert.equal(spec.workload_generator.midpoint_after_block,5);
assert.equal(spec.io_contract.allowed_durable_boundaries.length,7);
assert.equal(spec.analysis_plan.capacity_frontier.includes('>=4/5'),true);

console.log('MAXCAP_50_RUN_V1_PASS');
