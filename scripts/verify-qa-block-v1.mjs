#!/usr/bin/env node
import crypto from 'node:crypto';

export const QA_DEPTHS = Object.freeze([
  'SOURCE_STATIC',
  'DETERMINISTIC_HARNESS',
  'INTEGRATION',
  'SERVED_BYTE_PARITY',
  'REPRESENTATIVE_INTERACTION',
  'VISUAL_SCREENSHOT',
  'FULL_E2E_ADVERSARIAL'
]);

export const QA_STATUSES = Object.freeze([
  'QA_PENDING',
  'QA_PASS',
  'QA_REPAIR_IN_PROGRESS',
  'QA_BLOCKED',
  'READY_TO_PROMOTE'
]);

const DEPTH_INDEX = new Map(QA_DEPTHS.map((name, index) => [name, index]));
const VECTOR_DEPTH = Object.freeze({
  source_static: 'SOURCE_STATIC',
  deterministic_harness: 'DETERMINISTIC_HARNESS',
  integration: 'INTEGRATION',
  served_byte_parity: 'SERVED_BYTE_PARITY',
  representative_interaction: 'REPRESENTATIVE_INTERACTION',
  visual_screenshot: 'VISUAL_SCREENSHOT',
  full_e2e_adversarial: 'FULL_E2E_ADVERSARIAL'
});

const normalizeDepth = value => {
  const depth = String(value || '').toUpperCase();
  if (!DEPTH_INDEX.has(depth)) throw new Error(`UNKNOWN_QA_DEPTH_${depth || 'EMPTY'}`);
  return depth;
};

export function acceptanceVectorDepth(vector = {}) {
  if (vector.depth) return normalizeDepth(vector.depth);
  const kind = String(vector.kind || '').toLowerCase();
  const depth = VECTOR_DEPTH[kind];
  if (!depth) throw new Error(`UNKNOWN_ACCEPTANCE_VECTOR_KIND_${kind || 'EMPTY'}`);
  return depth;
}

export function selectQaDepth({acceptance_vectors = [], risk = 'LOW'} = {}) {
  const vectors = Array.isArray(acceptance_vectors) ? acceptance_vectors : [];
  let selected = vectors.length ? 'SOURCE_STATIC' : 'DETERMINISTIC_HARNESS';
  for (const vector of vectors) {
    const depth = acceptanceVectorDepth(vector);
    if (DEPTH_INDEX.get(depth) > DEPTH_INDEX.get(selected)) selected = depth;
  }
  const normalizedRisk = String(risk || 'LOW').toUpperCase();
  const riskFloor = normalizedRisk === 'CRITICAL' ? 'INTEGRATION' : normalizedRisk === 'HIGH' ? 'DETERMINISTIC_HARNESS' : 'SOURCE_STATIC';
  if (DEPTH_INDEX.get(riskFloor) > DEPTH_INDEX.get(selected)) selected = riskFloor;
  return selected;
}

export function depthNeedsBrowser(depth) {
  return DEPTH_INDEX.get(normalizeDepth(depth)) >= DEPTH_INDEX.get('REPRESENTATIVE_INTERACTION');
}

export function compileVerifierPacket(input = {}) {
  const artifactRef = String(input.artifact_ref || '');
  const versionRef = String(input.version_ref || '');
  if (!artifactRef || !versionRef) throw new Error('ARTIFACT_AND_VERSION_REQUIRED');
  const acceptanceVectors = Array.isArray(input.acceptance_vectors) ? input.acceptance_vectors : [];
  if (!acceptanceVectors.length) throw new Error('ACCEPTANCE_VECTORS_REQUIRED');
  const selectedDepth = selectQaDepth({acceptance_vectors: acceptanceVectors, risk: input.risk});
  return Object.freeze({
    schema: 'prometeo.verify-qa-packet/v1',
    artifact_ref: artifactRef,
    version_ref: versionRef,
    candidate_ref: input.candidate_ref || null,
    risk: String(input.risk || 'LOW').toUpperCase(),
    selected_depth: selectedDepth,
    browser_required: depthNeedsBrowser(selectedDepth),
    acceptance_vectors: acceptanceVectors,
    expected_evidence: Array.isArray(input.expected_evidence) ? input.expected_evidence : [],
    policy_ref: input.policy_ref || null,
    repair_owner_ref: input.repair_owner_ref || 'coordination/guide/GUIDE_SWARM_PROTOCOL_V1.md',
    authority: 'EVIDENCE_ONLY_NO_ACCEPTANCE_OR_PROMOTION_AUTHORITY'
  });
}

export function servedAssetCheck({source_bytes, served_bytes, asset_url, expected_version = null} = {}) {
  const source = Buffer.isBuffer(source_bytes) ? source_bytes : Buffer.from(String(source_bytes ?? ''));
  const served = Buffer.isBuffer(served_bytes) ? served_bytes : Buffer.from(String(served_bytes ?? ''));
  const sourceHash = crypto.createHash('sha256').update(source).digest('hex');
  const servedHash = crypto.createHash('sha256').update(served).digest('hex');
  const url = String(asset_url || '');
  const versionMatch = url.match(/[?&]v=([0-9a-f]{12})(?:&|$)/i);
  const version = expected_version || sourceHash.slice(0, 12);
  const byteParity = sourceHash === servedHash;
  const versioned = Boolean(versionMatch && versionMatch[1].toLowerCase() === String(version).toLowerCase());
  return Object.freeze({
    pass: byteParity && versioned,
    byte_parity: byteParity,
    versioned_reference: versioned,
    source_sha256: sourceHash,
    served_sha256: servedHash,
    expected_version: version,
    failure: !byteParity ? 'SERVED_BYTES_STALE' : !versioned ? 'STABLE_OR_WRONG_ASSET_VERSION' : null
  });
}

export function judgeQaResult({packet, checks = [], candidate_visible = true, policy = {promotion: 'HUMAN_APPROVAL_REQUIRED'}, repaired_from = null} = {}) {
  if (!packet || packet.schema !== 'prometeo.verify-qa-packet/v1') throw new Error('VERIFY_PACKET_REQUIRED');
  const rows = Array.isArray(checks) ? checks : [];
  const failed = rows.filter(row => row && row.status === 'FAIL');
  const blocked = rows.filter(row => row && row.status === 'BOUNDARY');
  const pending = rows.filter(row => row && row.status === 'PENDING');
  const selectedIndex = DEPTH_INDEX.get(packet.selected_depth);
  const checkedDepths = new Set(rows.filter(row => row && row.depth && row.status === 'PASS').map(row => normalizeDepth(row.depth)));
  const selectedPassed = [...checkedDepths].some(depth => DEPTH_INDEX.get(depth) >= selectedIndex);

  if (failed.length) {
    return Object.freeze({
      qa_status: 'QA_REPAIR_IN_PROGRESS',
      candidate_visible: Boolean(candidate_visible),
      disposition: 'FAIL_REPAIR_SUCCESSOR_REQUIRED',
      promotion_ready: false,
      repair_successor: {
        kind: 'bounded_repair',
        guide_role: 'GUIDE_INTEGRATOR',
        owner_ref: packet.repair_owner_ref,
        artifact_ref: packet.artifact_ref,
        failed_version_ref: packet.version_ref,
        acceptance_vectors: packet.acceptance_vectors,
        reverify_required: true,
        semantic_problem: 'qa_material_failure'
      },
      evidence: failed
    });
  }

  if (blocked.length) {
    return Object.freeze({qa_status: 'QA_BLOCKED', candidate_visible: Boolean(candidate_visible), disposition: 'BOUNDARY', promotion_ready: false, evidence: blocked});
  }

  if (pending.length || !selectedPassed) {
    return Object.freeze({
      qa_status: 'QA_PENDING',
      candidate_visible: Boolean(candidate_visible),
      disposition: repaired_from ? 'REVERIFY_PENDING' : 'VERIFY_PENDING',
      promotion_ready: false,
      evidence: rows
    });
  }

  const promotion = String(policy?.promotion || 'HUMAN_APPROVAL_REQUIRED').toUpperCase();
  const humanApproval = promotion === 'HUMAN_APPROVAL_REQUIRED';
  const autoPromotable = promotion === 'AUTO_PROMOTABLE_BY_EXISTING_AUTHORITY';
  if (!humanApproval && !autoPromotable) throw new Error(`UNKNOWN_PROMOTION_POLICY_${promotion}`);
  return Object.freeze({
    qa_status: humanApproval ? 'READY_TO_PROMOTE' : 'QA_PASS',
    candidate_visible: Boolean(candidate_visible),
    disposition: 'PASS',
    promotion_ready: true,
    promotion_signal: {
      mode: humanApproval ? 'HUMAN_APPROVAL_REQUIRED' : 'AUTO_PROMOTABLE_BY_EXISTING_AUTHORITY',
      action: humanApproval ? 'SHOW_READY_TO_PROMOTE_ACTION' : 'EMIT_TO_EXISTING_PROMOTION_AUTHORITY',
      auto_promoted_by_qa: false
    },
    evidence: rows
  });
}
