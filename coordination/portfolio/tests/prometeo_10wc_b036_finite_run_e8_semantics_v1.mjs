import assert from 'node:assert/strict';
import { resolveFiniteRunE8 } from '../../../scripts/finite-run-e8-semantics.mjs';

const historicalRunB = {
  common_capsule: { execution_rules: ['fresh identity', 'no POOL/manual routing/filler'] },
  reallocation_pool: null,
  reallocation_slots: []
};
const s004 = { status: 'DONE', primary_complete: true, productive_unit_counted: true };

const boundary = resolveFiniteRunE8(historicalRunB, s004);
assert.deepEqual(boundary, {
  action: 'E8_TERMINAL_BOUNDARY',
  terminal: true,
  preserve_primary_result: true,
  productive_unit_counted: true,
  failure_code: 'RUN_E8_NO_LEGAL_REALLOCATION_SURFACE',
  boundary_stage: 'E8_REALLOCATE',
  next_action: 'PERSIST_TERMINAL_BOUNDARY_THEN_E9',
  surface: 'NONE'
});

const withSlot = resolveFiniteRunE8({ reallocation_pool: null, reallocation_slots: [{ slot_id: 'R001' }] }, s004);
assert.equal(withSlot.action, 'E8_REALLOCATE');
assert.equal(withSlot.surface, 'REALLOCATION_SLOTS');
assert.equal(withSlot.terminal, false);

const withPool = resolveFiniteRunE8({
  reallocation_pool: { pool_id: 'P1' },
  reallocation_slots: [],
  common_capsule: { execution_rules: [] }
}, s004);
assert.equal(withPool.action, 'E8_REALLOCATE');
assert.equal(withPool.surface, 'REALLOCATION_POOL');

const incomplete = resolveFiniteRunE8(historicalRunB, { primary_complete: false, productive_unit_counted: false });
assert.equal(incomplete.action, 'E7_PRIMARY_INCOMPLETE');
assert.equal(incomplete.terminal, false);
console.log('B036_FINITE_RUN_E8_SEMANTICS_PASS');
