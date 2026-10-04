import assert from 'node:assert/strict';

const audit = {
  schema: 'prometeo.e8-reentry-contradiction-audit/v1',
  block_id: 'B020',
  job_id: 'portfolio-10wc-pre-run-b020',
  diagnosis: 'E8_REQUIRED_WITHOUT_LEGAL_REALLOCATION_SURFACE',
  source_shas: {
    launch_packet_protocol: '48862af5997c69acff2f8b88b92c653ba94780da',
    run_b_packet: 'b0e8ede40891054c57c3e5f07dba4458b85c2b34',
    run_b_s004_return: '539fad53b764f928633df911adbbce93d841eaa4',
    current_worker_reuse_contract: 'dd61c0379a520136a9357ad30ee34ad634a0b204'
  },
  facts: {
    current_submit_next_same_chat: true,
    protocol_primary_completion_is_not_terminal: true,
    protocol_requires_e8_or_explicit_terminal_boundary: true,
    run_b_reallocation_pool: null,
    run_b_reallocation_slots: [],
    run_b_forbids_pool: true,
    s004_status: 'DONE',
    s004_primary_complete: true,
    s004_productive_unit_counted: true
  },
  repair_owner: 'portfolio-10wc-pre-run-b036',
  scope: 'DIAGNOSTIC_ONLY_NO_FIX'
};

assert.equal(audit.facts.current_submit_next_same_chat, true);
assert.equal(audit.facts.protocol_primary_completion_is_not_terminal, true);
assert.equal(audit.facts.protocol_requires_e8_or_explicit_terminal_boundary, true);
assert.equal(audit.facts.run_b_reallocation_pool, null);
assert.deepEqual(audit.facts.run_b_reallocation_slots, []);
assert.equal(audit.facts.run_b_forbids_pool, true);
assert.equal(audit.facts.s004_status, 'DONE');
assert.equal(audit.facts.s004_primary_complete, true);
assert.equal(audit.facts.s004_productive_unit_counted, true);

const legalReentrySurfacePresent =
  audit.facts.run_b_reallocation_pool !== null || audit.facts.run_b_reallocation_slots.length > 0;
const contradiction =
  audit.facts.protocol_primary_completion_is_not_terminal &&
  audit.facts.protocol_requires_e8_or_explicit_terminal_boundary &&
  audit.facts.s004_primary_complete &&
  audit.facts.s004_productive_unit_counted &&
  audit.facts.run_b_forbids_pool &&
  !legalReentrySurfacePresent;

assert.equal(contradiction, true);
assert.equal(audit.repair_owner, 'portfolio-10wc-pre-run-b036');
console.log('B020_E8_REENTRY_CONTRADICTION_CONFIRMED');
console.log(JSON.stringify({ diagnosis: audit.diagnosis, repair_owner: audit.repair_owner }, null, 2));
