import {
  validateCompiledDispatchContract
} from './compiled-dispatch-contract-lib.mjs';
import {
  validateMechanicalEnforcement
} from './compiled-dispatch-mechanical-enforcement-lib.mjs';

export const CLAIM_READY_COMBINED_VALIDATOR_AUTHORITY = 'EVIDENCE_GATE_ONLY_NO_SCHEDULING_EXECUTION_OR_PROMOTION_AUTHORITY';

export function combineClaimReadyValidationResults(structural = {}, mechanical = {}) {
  const structuralErrors = Array.isArray(structural.errors) ? structural.errors : ['CLAIM_READY:STRUCTURAL_RESULT_INVALID'];
  const mechanicalErrors = Array.isArray(mechanical.errors) ? mechanical.errors : ['CLAIM_READY:MECHANICAL_RESULT_INVALID'];
  const structuralPass = structural.pass === true && structuralErrors.length === 0;
  const mechanicalPass = mechanical.pass === true && mechanicalErrors.length === 0;
  return {
    pass: structuralPass && mechanicalPass,
    status: structuralPass && mechanicalPass ? 'PASS' : 'FAIL',
    authority: CLAIM_READY_COMBINED_VALIDATOR_AUTHORITY,
    structural_pass: structuralPass,
    mechanical_pass: mechanicalPass,
    structural_errors: structuralErrors,
    mechanical_errors: mechanicalErrors,
    errors: [...structuralErrors, ...mechanicalErrors]
  };
}

export function validateClaimReadyCompiledDispatch(contract = {}) {
  return combineClaimReadyValidationResults(
    validateCompiledDispatchContract(contract),
    validateMechanicalEnforcement(contract)
  );
}
