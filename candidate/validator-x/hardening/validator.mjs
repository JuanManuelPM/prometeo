const FORBIDDEN_AUTHORITY = new Set(['CURRENT', 'HUMAN_ACCEPTED', 'SERVED']);
const ALLOWED_AUTHORITY = new Set(['CANDIDATE_ONLY']);

function normalizeAuthorityAlias(value) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

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

  if (value.authority_label !== undefined && value.authority_label !== null) {
    if (typeof value.authority_label !== 'string') {
      errors.push('INVALID_AUTHORITY_LABEL_TYPE');
    } else {
      const alias = normalizeAuthorityAlias(value.authority_label);
      if (FORBIDDEN_AUTHORITY.has(alias)) errors.push('FORBIDDEN_AUTHORITY_PROMOTION');
      if (!ALLOWED_AUTHORITY.has(value.authority_label)) errors.push('INVALID_AUTHORITY_LABEL');
    }
  }

  return {ok: errors.length === 0, errors};
}
