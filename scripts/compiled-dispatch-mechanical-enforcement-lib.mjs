export const MECHANICAL_ENFORCEMENT_SCHEMA = 'prometeo.compiled-dispatch-mechanical-enforcement/v1';

const arr = value => Array.isArray(value) ? value : [];
const str = value => String(value ?? '').trim();
const REQUIRED_GATE_IDS = Object.freeze(['SUCCESSOR_MATERIALIZATION']);

export function validateMechanicalEnforcement(contract = {}) {
  const errors = [];
  const record = contract?.autonomy_closure?.mechanical_enforcement;
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return {pass:false,status:'FAIL',errors:['MECHANICAL:RECORD_REQUIRED']};
  }
  if (record.schema !== MECHANICAL_ENFORCEMENT_SCHEMA) errors.push('MECHANICAL:SCHEMA_INVALID');
  const gates = arr(record.gates);
  if (!gates.length) errors.push('MECHANICAL:GATES_REQUIRED');
  const ids = new Set();
  for (const gate of gates) {
    const id = str(gate?.gate_id);
    if (!id) errors.push('MECHANICAL:GATE_ID_REQUIRED');
    if (id && ids.has(id)) errors.push(`MECHANICAL:DUPLICATE_GATE:${id}`);
    if (id) ids.add(id);
    if (!str(gate?.validator_ref)) errors.push(`MECHANICAL:${id || 'UNKNOWN'}:VALIDATOR_REF_REQUIRED`);
    if (gate?.fail_closed !== true) errors.push(`MECHANICAL:${id || 'UNKNOWN'}:FAIL_CLOSED_REQUIRED`);
    if (gate?.before_claim_ready !== true) errors.push(`MECHANICAL:${id || 'UNKNOWN'}:BEFORE_CLAIM_READY_REQUIRED`);
    if (!arr(gate?.failure_codes).map(str).filter(Boolean).length) errors.push(`MECHANICAL:${id || 'UNKNOWN'}:FAILURE_CODES_REQUIRED`);
  }
  for (const id of REQUIRED_GATE_IDS) if (!ids.has(id)) errors.push(`MECHANICAL:REQUIRED_GATE_MISSING:${id}`);
  return {pass:errors.length===0,status:errors.length?'FAIL':'PASS',errors};
}
