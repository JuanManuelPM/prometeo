const FORBIDDEN_AUTHORITY = new Set(['CURRENT', 'HUMAN_ACCEPTED', 'SERVED']);

export function validateValidatorCandidatePayload(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {ok: false, errors: ['PAYLOAD_NOT_OBJECT']};
  }
  if (value.schema !== 'canary.validator-x-payload/v1') errors.push('INVALID_SCHEMA');
  if (typeof value.candidate_id !== 'string' || value.candidate_id.trim() === '') errors.push('MISSING_CANDIDATE_ID');
  if (!Array.isArray(value.evidence_refs) || value.evidence_refs.length === 0 || value.evidence_refs.some(x => typeof x !== 'string' || x.trim() === '')) {
    errors.push('INVALID_EVIDENCE_REFS');
  }
  if (!['CANDIDATE', 'REJECTED'].includes(value.status)) errors.push('INVALID_STATUS');
  const authority = String(value.authority_label ?? 'CANDIDATE_ONLY').toUpperCase();
  if (FORBIDDEN_AUTHORITY.has(authority)) errors.push('FORBIDDEN_AUTHORITY_PROMOTION');
  return {ok: errors.length === 0, errors};
}
