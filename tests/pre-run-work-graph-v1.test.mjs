import assert from 'node:assert/strict';
import fs from 'node:fs';
const graph=JSON.parse(fs.readFileSync('coordination/experiments/PROMETEO-10WC-PRE-RUN-V1/WORK_GRAPH.json','utf8'));
assert.equal(graph.schema,'prometeo.prepared-work-graph-shadow/v1');
assert.equal(graph.status,'SHADOW_PRE_RUN_NOT_AUTHORITY');
assert.equal(graph.worker_model.target_concurrent_wc,10);
assert.equal(graph.worker_model.workers_are_roles,false);
assert.equal(graph.worker_model.reserve_visible_to_workers,false);
assert.deepEqual(graph.worker_model.worker_loop,['CLAIM_READY_COMPATIBLE','WORK','RETURN','E8_SUBMIT_NEXT','CLAIM_READY_COMPATIBLE']);
assert.equal(graph.blocks.length,64);assert.equal(graph.blocks.filter(b=>!(b.dependencies||[]).length).length,24);assert.deepEqual(graph.block_model.final_serial_blocks,['B064']);
const ids=new Set(graph.blocks.map(b=>b.block_id));assert.equal(ids.size,64);
for(const b of graph.blocks){assert.equal(b.assignment,'ANY_FREE_COMPATIBLE_WC_ATOMIC_CLAIM');for(const dep of b.dependencies||[]){assert.ok(ids.has(dep),`${b.block_id} missing dependency ${dep}`);const parent=graph.blocks.find(x=>x.block_id===dep);assert.ok(parent.depth<b.depth,`${b.block_id} dependency ${dep} must be at lower causal depth`)}}
const final=graph.blocks.find(b=>b.block_id==='B064');assert.equal(final.kind,'FINAL_SERIAL');assert.equal(final.expected_minutes,2);
const prompt=fs.readFileSync('coordination/experiments/PROMETEO-10WC-PRE-RUN-V1/LAUNCH_PROMPT.txt','utf8');assert.match(prompt,/BATCH PROMETEO-10WC-PRE-RUN-V1 EXPECTED 10/);assert.doesNotMatch(prompt,/\breserva\b/i);
console.log('PASS PROMETEO-10WC-PRE-RUN-V1');
