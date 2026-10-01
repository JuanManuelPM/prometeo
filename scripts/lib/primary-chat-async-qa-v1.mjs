export const QA_STATES = Object.freeze([
  'QA_PENDING',
  'QA_PASS',
  'QA_REPAIR_IN_PROGRESS',
  'QA_BLOCKED',
  'READY_TO_PROMOTE'
]);

export const QA_DEPTH_ORDER = Object.freeze([
  'SOURCE_STATIC',
  'DETERMINISTIC_HARNESS',
  'INTEGRATION',
  'SERVED_BYTE_PARITY',
  'REPRESENTATIVE_INTERACTION',
  'VISUAL_SCREENSHOT',
  'FULL_E2E_ADVERSARIAL'
]);

const uniq = values => [...new Set(values.filter(Boolean))];
const upper = value => String(value || '').toUpperCase();

export function selectQaDepth(input = {}) {
  const required = ['SOURCE_STATIC'];
  if (input.acceptance_vectors_present !== false) required.push('DETERMINISTIC_HARNESS');
  if (input.cross_component === true) required.push('INTEGRATION');
  if (input.public_ui === true || input.served_asset === true) required.push('SERVED_BYTE_PARITY');
  if (input.interaction_change === true) required.push('REPRESENTATIVE_INTERACTION');
  if (input.visual_risk === true) required.push('VISUAL_SCREENSHOT');
  if (['HIGH','CRITICAL'].includes(upper(input.risk)) || input.authority_sensitive === true || input.safety_sensitive === true) {
    required.push('FULL_E2E_ADVERSARIAL');
  }
  return Object.freeze(uniq(required));
}

export function servedAssetParity(input = {}) {
  const expectedVersion = String(input.expected_version || '').trim();
  const servedRef = String(input.served_reference || '').trim();
  const sourceSha = String(input.source_asset_sha256 || '').trim();
  const servedSha = String(input.served_asset_sha256 || '').trim();
  if (!expectedVersion || !servedRef) return Object.freeze({ pass:false, code:'SERVED_ASSET_EVIDENCE_MISSING' });
  if (!servedRef.includes(`?v=${expectedVersion}`)) return Object.freeze({ pass:false, code:'SERVED_ASSET_VERSION_STALE_OR_UNVERSIONED' });
  if (sourceSha && servedSha && sourceSha !== servedSha) return Object.freeze({ pass:false, code:'SERVED_ASSET_BYTES_DIVERGE' });
  return Object.freeze({ pass:true, code:'SERVED_ASSET_PARITY_PASS' });
}

export function compileQaDisposition(input = {}) {
  const failed = Array.isArray(input.failed_lanes) ? input.failed_lanes.filter(Boolean) : [];
  const blocked = Array.isArray(input.blocked_lanes) ? input.blocked_lanes.filter(Boolean) : [];
  const pending = Array.isArray(input.pending_lanes) ? input.pending_lanes.filter(Boolean) : [];

  if (input.repair_in_progress === true) {
    return Object.freeze({ state:'QA_REPAIR_IN_PROGRESS', candidate_visible:input.candidate_visible === true, promotion_signal:'NONE', repair_successor_required:true });
  }
  if (failed.length) {
    return Object.freeze({ state:'QA_REPAIR_IN_PROGRESS', candidate_visible:input.candidate_visible === true, promotion_signal:'NONE', repair_successor_required:true });
  }
  if (blocked.length) {
    return Object.freeze({ state:'QA_BLOCKED', candidate_visible:input.candidate_visible === true, promotion_signal:'NONE', repair_successor_required:false });
  }
  if (pending.length || input.all_required_passed !== true) {
    return Object.freeze({ state:'QA_PENDING', candidate_visible:input.candidate_visible === true, promotion_signal:'NONE', repair_successor_required:false });
  }
  if (input.human_approval_required === true) {
    return Object.freeze({ state:'READY_TO_PROMOTE', candidate_visible:true, promotion_signal:'HUMAN_ACCEPTANCE_REQUIRED', repair_successor_required:false });
  }
  if (input.auto_promotable === true) {
    return Object.freeze({ state:'QA_PASS', candidate_visible:true, promotion_signal:'AUTO_PROMOTION_PERMITTED_BY_EXISTING_POLICY', repair_successor_required:false });
  }
  return Object.freeze({ state:'QA_PASS', candidate_visible:true, promotion_signal:'PASS_EVIDENCE_ONLY', repair_successor_required:false });
}

export function primaryChatQaUiBlocks(qa) {
  if (!qa || typeof qa !== 'object') return [];
  const state = upper(qa.state);
  if (!QA_STATES.includes(state)) return [];
  const lines = [];
  if (qa.artifact_ref) lines.push(`artifact: ${qa.artifact_ref}`);
  if (qa.version_ref) lines.push(`version: ${qa.version_ref}`);
  if (Array.isArray(qa.pending_lanes) && qa.pending_lanes.length) lines.push(`pending: ${qa.pending_lanes.join(', ')}`);
  if (Array.isArray(qa.failed_lanes) && qa.failed_lanes.length) lines.push(`failed: ${qa.failed_lanes.join(', ')}`);
  if (qa.promotion_signal) lines.push(`promotion: ${qa.promotion_signal}`);
  if (qa.repair_ref) lines.push(`repair: ${qa.repair_ref}`);
  return [{ type:'details', label:`QA · ${state}`, body:lines.join('\n') || state }];
}
