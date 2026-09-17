import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const ALLOWED_VALUE_SIGNALS = new Set([
  'goal_relevance',
  'unblock_value',
  'information_gain',
  'reuse_value',
  'incident_repair',
  'human_friction_reduction',
  'regression_prevention'
]);

const FORBIDDEN_AUTHORITY = new Set([
  'READY', 'CURRENT', 'HUMAN_ACCEPTED', 'SERVED', 'PROMOTED', 'APPROVED'
]);

export const sha256 = value => crypto
  .createHash('sha256')
  .update(typeof value === 'string' ? value : JSON.stringify(value))
  .digest('hex');

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\\/g, '/')
    .replace(/[^a-z0-9/_:.+\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalList(value) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map(normalizeText).filter(Boolean))].sort();
}

function requiredText(value, field) {
  const normalized = normalizeText(value);
  if (!normalized) throw new Error(`DISCOVERY_INVALID:${field}_required`);
  return normalized;
}

export function canonicalDiscoveryIdentity(candidate = {}) {
  const root = requiredText(candidate.root ?? candidate.root_id ?? candidate.project_id, 'root');
  const target = requiredText(candidate.target ?? candidate.semantic_target, 'target');
  const problem = requiredText(candidate.problem ?? candidate.problem_class ?? candidate.problem_or_opportunity, 'problem');
  const acceptance = canonicalList(candidate.acceptance ?? candidate.acceptance_outcome ?? candidate.acceptance_criteria);
  if (!acceptance.length) throw new Error('DISCOVERY_INVALID:acceptance_required');
  return {root, target, problem, acceptance};
}

export function discoveryFingerprint(candidate = {}) {
  const identity = canonicalDiscoveryIdentity(candidate);
  return `pdf-${sha256(JSON.stringify(identity)).slice(0, 32)}`;
}

function assertNoSecretShapes(value) {
  const text = JSON.stringify(value ?? {}).toLowerCase();
  const forbidden = [
    '"password"', '"access_token"', '"refresh_token"', '"service_role"',
    '"service_role_key"', '"authorization":"bearer ', '"authorization": "bearer '
  ];
  const hit = forbidden.find(shape => text.includes(shape));
  if (hit) throw new Error(`DISCOVERY_PRIVATE_PAYLOAD:${hit}`);
}

function normalizeEvidenceRefs(refs) {
  const values = Array.isArray(refs) ? refs : [];
  const out = [...new Set(values.map(v => String(v ?? '').trim()).filter(Boolean))].sort();
  if (!out.length) throw new Error('DISCOVERY_NO_FILLER:evidence_ref_required');
  return out;
}

function normalizeValueSignals(signals) {
  if (!signals || typeof signals !== 'object' || Array.isArray(signals)) {
    throw new Error('DISCOVERY_NO_FILLER:value_signal_required');
  }
  const out = {};
  for (const [key, raw] of Object.entries(signals)) {
    if (!ALLOWED_VALUE_SIGNALS.has(key)) continue;
    const reason = typeof raw === 'string' ? raw.trim() : String(raw?.reason ?? '').trim();
    const evidence_ref = typeof raw === 'object' && raw ? String(raw.evidence_ref ?? '').trim() || null : null;
    if (reason) out[key] = {reason, evidence_ref};
  }
  if (!Object.keys(out).length) throw new Error('DISCOVERY_NO_FILLER:value_signal_required');
  return out;
}

export function validateDiscoveryCandidate(candidate = {}) {
  assertNoSecretShapes(candidate);
  const identity = canonicalDiscoveryIdentity(candidate);
  const evidence_refs = normalizeEvidenceRefs(candidate.evidence_refs);
  const value_signals = normalizeValueSignals(candidate.value_signals ?? candidate.expected_value);
  const title = String(candidate.title ?? '').trim();
  const mission = String(candidate.mission ?? '').trim();
  if (!title) throw new Error('DISCOVERY_INVALID:title_required');
  if (!mission) throw new Error('DISCOVERY_INVALID:mission_required');
  if (candidate.status && FORBIDDEN_AUTHORITY.has(String(candidate.status).toUpperCase())) {
    throw new Error('DISCOVERY_AUTHORITY:proposal_cannot_self_promote');
  }
  if (candidate.authority && FORBIDDEN_AUTHORITY.has(String(candidate.authority).toUpperCase())) {
    throw new Error('DISCOVERY_AUTHORITY:proposal_cannot_self_promote');
  }
  return {identity, evidence_refs, value_signals, title, mission};
}

export function buildProposalPin(candidate, source = {}, now = new Date().toISOString()) {
  const validated = validateDiscoveryCandidate(candidate);
  const fingerprint = discoveryFingerprint(candidate);
  const proposal_id = String(candidate.proposal_id || `P-${fingerprint.slice(4, 16)}-${sha256(`${source.worker_instance_id || 'worker'}:${now}`).slice(0, 8)}`);
  return {
    schema: 'prometeo.proposal-fingerprint-claim/v1',
    fingerprint,
    proposal_id,
    state: 'PINNED_CANDIDATE',
    created_at: now,
    source: {
      worker_instance_id: source.worker_instance_id ?? null,
      opportunity_id: source.opportunity_id ?? null,
      run_id: source.run_id ?? null
    },
    canonical_identity: validated.identity,
    authority: 'DEDUP_PIN_ONLY_NO_EXECUTION_OR_PROMOTION_AUTHORITY'
  };
}

export function buildWorkerProposal(candidate, source = {}, now = new Date().toISOString()) {
  const validated = validateDiscoveryCandidate(candidate);
  const pin = buildProposalPin(candidate, source, now);
  return {
    schema: 'prometeo.worker-proposal/v1',
    proposal_id: pin.proposal_id,
    fingerprint: pin.fingerprint,
    created_at: now,
    status: 'CANDIDATE',
    source: pin.source,
    root: validated.identity.root,
    target: validated.identity.target,
    problem: String(candidate.problem ?? candidate.problem_class ?? candidate.problem_or_opportunity).trim(),
    acceptance: Array.isArray(candidate.acceptance ?? candidate.acceptance_outcome ?? candidate.acceptance_criteria)
      ? (candidate.acceptance ?? candidate.acceptance_outcome ?? candidate.acceptance_criteria)
      : [candidate.acceptance ?? candidate.acceptance_outcome ?? candidate.acceptance_criteria],
    title: validated.title,
    mission: validated.mission,
    evidence_refs: validated.evidence_refs,
    value_signals: validated.value_signals,
    dependency_ids: [...new Set((candidate.dependency_ids || []).map(String))].sort(),
    candidate_read_scope: [...new Set((candidate.candidate_read_scope || []).map(String))].sort(),
    candidate_write_scope: [...new Set((candidate.candidate_write_scope || []).map(String))].sort(),
    privacy_class: candidate.privacy_class || 'PUBLIC_COORDINATION_ONLY',
    fresh_critic_required: Boolean(candidate.fresh_critic_required),
    falsification: candidate.falsification || null,
    authority_constraints: [
      'CANDIDATE_ONLY',
      'NO_CURRENT_HUMAN_ACCEPTED_SERVED_PROMOTION',
      'CANDIDATE_SCOPE_IS_NOT_EXECUTION_AUTHORITY'
    ]
  };
}

export async function pinProposalFingerprint({directory, candidate, source = {}, now = new Date().toISOString()}) {
  if (!directory) throw new Error('DISCOVERY_INVALID:directory_required');
  const pin = buildProposalPin(candidate, source, now);
  await fs.mkdir(directory, {recursive: true});
  const filePath = path.join(directory, `${pin.fingerprint}.json`);
  let handle;
  try {
    handle = await fs.open(filePath, 'wx');
    await handle.writeFile(`${JSON.stringify(pin, null, 2)}\n`, 'utf8');
    await handle.sync();
    return {won: true, collision: false, path: filePath, pin};
  } catch (error) {
    if (error?.code === 'EEXIST') {
      return {won: false, collision: true, path: filePath, fingerprint: pin.fingerprint};
    }
    throw error;
  } finally {
    await handle?.close();
  }
}
