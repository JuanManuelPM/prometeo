#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  MECHANICAL_ENFORCEMENT_SCHEMA,
  validateMechanicalEnforcement
} from '../../../scripts/compiled-dispatch-mechanical-enforcement-lib.mjs';

const valid = {
  autonomy_closure: {
    mechanical_enforcement: {
      schema: MECHANICAL_ENFORCEMENT_SCHEMA,
      gates: [{
        gate_id: 'SUCCESSOR_MATERIALIZATION',
        validator_ref: 'scripts/guide-recursive-successor-lib.mjs',
        fail_closed: true,
        before_claim_ready: true,
        failure_codes: ['MECHANICAL_SUCCESSOR_GATE_MISSING']
      }]
    }
  }
};

assert.equal(validateMechanicalEnforcement(valid).pass, true, 'valid mechanical gate must pass');

const mutations = [
  contract => delete contract.autonomy_closure.mechanical_enforcement,
  contract => { contract.autonomy_closure.mechanical_enforcement.gates = []; },
  contract => { contract.autonomy_closure.mechanical_enforcement.gates[0].validator_ref = ''; },
  contract => { contract.autonomy_closure.mechanical_enforcement.gates[0].fail_closed = false; },
  contract => { contract.autonomy_closure.mechanical_enforcement.gates[0].before_claim_ready = false; }
];

for (const mutate of mutations) {
  const contract = structuredClone(valid);
  mutate(contract);
  assert.equal(validateMechanicalEnforcement(contract).pass, false, 'invalid mechanical gate must fail closed');
}

console.log('MECHANICAL_ENFORCEMENT_CONTRACT_PASS');
