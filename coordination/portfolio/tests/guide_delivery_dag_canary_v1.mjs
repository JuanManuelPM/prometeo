import fs from 'node:fs';
import assert from 'node:assert/strict';

const fixturePath = new URL('../evidence/prometeo-autonomous-growth/GUIDE_DELIVERY_DAG_CANARY_FIXTURE_V1.json', import.meta.url);
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const origin = Date.parse(fixture.time_origin);
const nodes = new Map(fixture.dag.map((node) => [node.id, node]));
const offset = (iso) => Date.parse(iso) - origin;

for (const node of fixture.dag) {
  assert.equal(offset(node.finish_at) - offset(node.start_at), node.duration_ms, `${node.id}: timestamp duration mismatch`);
  for (const depId of node.depends_on ?? []) {
    const dep = nodes.get(depId);
    assert.ok(dep, `${node.id}: missing dependency ${depId}`);
    assert.ok(Date.parse(node.start_at) >= Date.parse(dep.finish_at), `${node.id}: starts before ${depId} finishes`);
  }
}

const producer = nodes.get('producer');
const qaPrecompile = nodes.get('qa_precompile');
const advisory = nodes.get('visual_advisory');
const blockers = fixture.candidate_policy.promotion_blockers.map((id) => nodes.get(id));

assert.equal(offset(producer.finish_at), fixture.expected.candidate_usable_at_offset_ms);
assert.equal(offset(qaPrecompile.start_at), 0, 'QA precompile must start with producer, not after it');
assert.equal(offset(nodes.get('judge').start_at), Math.max(...blockers.map((node) => offset(node.finish_at))));
assert.equal(offset(nodes.get('judge').finish_at), fixture.expected.dag_promotion_ready_at_offset_ms);
assert.equal(Math.max(...fixture.dag.filter((node) => node.id !== 'judge').map((node) => offset(node.finish_at))), fixture.expected.dag_all_qa_done_at_offset_ms);
assert.equal(offset(advisory.finish_at) - offset(producer.finish_at), fixture.expected.advisory_tail_after_candidate_usable_ms);
assert.equal(fixture.expected.candidate_blocked_by_advisory, false);

const durationById = Object.fromEntries(fixture.dag.map((node) => [node.id, node.duration_ms]));
let serialElapsed = 0;
let serialPromotionReady = null;
for (const id of fixture.serial_equivalent_order) {
  serialElapsed += durationById[id];
  if (id === 'security_gate') serialPromotionReady = serialElapsed;
}
assert.equal(serialPromotionReady, fixture.expected.serial_promotion_ready_at_offset_ms);
assert.equal(serialElapsed, fixture.expected.serial_all_qa_done_at_offset_ms);
assert.equal(serialPromotionReady - fixture.expected.dag_promotion_ready_at_offset_ms, fixture.expected.promotion_critical_path_saved_ms);
assert.equal(serialElapsed - fixture.expected.dag_all_qa_done_at_offset_ms, fixture.expected.all_qa_wall_clock_saved_ms);

function projectionState(results) {
  const candidateUsable = fixture.candidate_policy.pre_usable_blockers.length === 0;
  const blockingResults = fixture.candidate_policy.promotion_blockers.map((id) => results[id]);
  const promotionReady = blockingResults.every((result) => result === 'PASS');
  return { candidateUsable, promotionReady };
}

const passState = projectionState({ contract_verify: 'PASS', security_gate: 'PASS', visual_advisory: 'PENDING' });
assert.deepEqual(passState, { candidateUsable: true, promotionReady: true }, 'slow advisory must not block usable candidate or promotion gate');

const blockerFailure = projectionState({ contract_verify: 'PASS', security_gate: 'FAIL', visual_advisory: 'PENDING' });
assert.deepEqual(blockerFailure, { candidateUsable: true, promotionReady: false }, 'real promotion blocker must prevent promotion while candidate remains usable');

console.log(JSON.stringify({
  test: 'guide_delivery_dag_canary_v1',
  status: 'PASS',
  dag: {
    candidate_usable_ms: fixture.expected.candidate_usable_at_offset_ms,
    promotion_ready_ms: fixture.expected.dag_promotion_ready_at_offset_ms,
    all_qa_done_ms: fixture.expected.dag_all_qa_done_at_offset_ms
  },
  serial: {
    promotion_ready_ms: serialPromotionReady,
    all_qa_done_ms: serialElapsed
  },
  saved: {
    promotion_critical_path_ms: fixture.expected.promotion_critical_path_saved_ms,
    all_qa_wall_clock_ms: fixture.expected.all_qa_wall_clock_saved_ms
  },
  advisory_non_blocking: true,
  blocker_failure_holds_promotion: true
}));
