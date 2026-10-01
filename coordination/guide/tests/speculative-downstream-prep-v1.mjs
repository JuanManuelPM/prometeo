import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectedSavedIdleMs, shouldPrepare, reconcilePreparation, compareIdle } from '../tools/speculative-downstream-prep-v1.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const contract = JSON.parse(fs.readFileSync(path.resolve(here, '../SPECULATIVE_DOWNSTREAM_PREP_V1.json'), 'utf8'));
const fixtures = JSON.parse(fs.readFileSync(path.join(here, 'speculative-downstream-prep-v1.fixtures.json'), 'utf8'));

assert.equal(contract.derived_state.name, 'PREPARED_NOT_AUTHORIZED');
assert.equal(contract.derived_state.authority, 'NONE');
for (const forbidden of ['CURRENT','CLAIMED','AUTHORIZED','PROMOTED','HUMAN_ACCEPTED','SERVED']) assert.ok(contract.derived_state.forbidden_equivalences.includes(forbidden));
for (const branch of ['PASS','FAIL_REPAIR','BOUNDARY']) assert.ok(contract.branch_classes[branch]);
assert.equal(contract.invalidation.result_state, 'STALE_PREPARATION');
assert.match(contract.expected_value_rule.formula, /EV_saved_idle_ms/);
assert.match(contract.truth_boundary, /no queue, scheduler/);

for (const c of fixtures.cases) {
  const result = reconcilePreparation(c);
  assert.equal(result.state, c.expected.state, c.id);
  assert.equal(result.activate, c.expected.activate, c.id);
  if (c.timing) {
    const idle = compareIdle(c.timing);
    assert.equal(idle.serial_baseline_idle_ms, c.expected.serial_baseline_idle_ms, c.id);
    assert.equal(idle.prepared_path_idle_ms, c.expected.prepared_path_idle_ms, c.id);
    assert.equal(idle.idle_ms_saved, c.expected.idle_ms_saved, c.id);
    assert.ok(idle.prepared_next_claim_ms >= c.timing.upstream_return_ms, `${c.id}: claim before RETURN`);
  }
}

const pos = fixtures.expected_value.positive;
const neg = fixtures.expected_value.negative;
assert.equal(expectedSavedIdleMs(pos), pos.expected);
assert.equal(expectedSavedIdleMs(neg), neg.expected);
assert.equal(shouldPrepare(pos), true);
assert.equal(shouldPrepare(neg), false);
assert.equal(shouldPrepare({ ...pos, semantic_duplicate: true }), false);
assert.equal(shouldPrepare({ ...pos, requires_premature_authority: true }), false);
assert.equal(shouldPrepare({ ...pos, consumer_ref: '' }), false);

console.log(JSON.stringify({schema:'prometeo.speculative-downstream-prep-test-result/v1',status:'PASS',checks:25,idle_ms_saved:42000,serial_baseline_idle_ms:45000,prepared_path_idle_ms:3000,invalidation:'PASS',authority_separation:'PASS',expected_value_gate:'PASS'}));
