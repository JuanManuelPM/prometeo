#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  CLAIM_READY_COMBINED_VALIDATOR_AUTHORITY,
  combineClaimReadyValidationResults,
  validateClaimReadyCompiledDispatch
} from '../../../scripts/compiled-dispatch-claim-ready-validator.mjs';

const ok = combineClaimReadyValidationResults(
  {pass:true,status:'PASS',errors:[]},
  {pass:true,status:'PASS',errors:[]}
);
assert.equal(ok.pass, true);
assert.equal(ok.status, 'PASS');
assert.equal(ok.authority, CLAIM_READY_COMBINED_VALIDATOR_AUTHORITY);
assert.deepEqual(ok.errors, []);

const structuralFail = combineClaimReadyValidationResults(
  {pass:false,status:'FAIL',errors:['SCHEMA_INVALID']},
  {pass:true,status:'PASS',errors:[]}
);
assert.equal(structuralFail.pass, false);
assert.deepEqual(structuralFail.structural_errors, ['SCHEMA_INVALID']);
assert.deepEqual(structuralFail.mechanical_errors, []);

const mechanicalFail = combineClaimReadyValidationResults(
  {pass:true,status:'PASS',errors:[]},
  {pass:false,status:'FAIL',errors:['MECHANICAL:RECORD_REQUIRED']}
);
assert.equal(mechanicalFail.pass, false);
assert.deepEqual(mechanicalFail.structural_errors, []);
assert.deepEqual(mechanicalFail.mechanical_errors, ['MECHANICAL:RECORD_REQUIRED']);

const emptyContract = validateClaimReadyCompiledDispatch({});
assert.equal(emptyContract.pass, false);
assert.equal(emptyContract.structural_pass, false);
assert.equal(emptyContract.mechanical_pass, false);
assert(emptyContract.structural_errors.length > 0);
assert(emptyContract.mechanical_errors.length > 0);

console.log('COMPILED_DISPATCH_CLAIM_READY_COMBINED_VALIDATOR_PASS');
