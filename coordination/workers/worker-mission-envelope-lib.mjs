import fs from 'node:fs';

const CONTRACT = JSON.parse(fs.readFileSync(new URL('./WORKER_MISSION_ENVELOPE_V1.json', import.meta.url), 'utf8'));
const MODES = new Set(CONTRACT.mission_modes);
const HARD_BOUNDARIES = new Set(CONTRACT.hard_boundaries);
const bool = value => value === true;
const int = (value, fallback) => Number.isInteger(value) && value >= 0 ? value : fallback;

export const WORKER_MISSION_ENVELOPE_SCHEMA = 'prometeo.worker-mission-envelope/v1';

export function compileMissionEnvelope(workBlock = {}) {
  const raw = workBlock?.mission_envelope;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      schema: WORKER_MISSION_ENVELOPE_SCHEMA,
      mission_mode: CONTRACT.legacy_default.mission_mode,
      compatibility: CONTRACT.legacy_default.compatibility,
      permission_source: CONTRACT.legacy_default.permission_source,
      local_permissions: null,
      limits: null,
      scope_boundary: 'OWNED_WORKBLOCK_ONLY',
      authority_expansion_allowed: false,
      terminal_outcomes: [...CONTRACT.terminal_outcomes]
    };
  }

  const missionMode = MODES.has(raw.mission_mode) ? raw.mission_mode : null;
  if (!missionMode) throw new Error(`MISSION_MODE_INVALID:${String(raw.mission_mode ?? '')}`);

  const defaults = missionMode === 'AGENTIC_MISSION'
    ? CONTRACT.explicit_agentic_default.local_permissions
    : {
        inspect: true,
        local_plan: true,
        patch: false,
        test: true,
        bounded_retry: false,
        local_repair: false,
        alternate_safe_path: false,
        child_proposal: false
      };
  const requested = raw.local_permissions && typeof raw.local_permissions === 'object'
    ? raw.local_permissions
    : {};
  const localPermissions = Object.fromEntries(
    Object.keys(defaults).map(key => [key, Object.prototype.hasOwnProperty.call(requested, key) ? bool(requested[key]) && bool(defaults[key]) : bool(defaults[key])])
  );
  const defaultLimits = missionMode === 'AGENTIC_MISSION'
    ? CONTRACT.explicit_agentic_default.limits
    : {max_local_repairs: 0, max_alternate_safe_paths: 0, child_proposal_budget: 0};

  return {
    schema: WORKER_MISSION_ENVELOPE_SCHEMA,
    mission_mode: missionMode,
    compatibility: 'EXPLICIT_ENVELOPE',
    permission_source: 'MISSION_MODE_CAPPED_BY_CONTRACT',
    local_permissions: localPermissions,
    limits: {
      max_local_repairs: Math.min(int(raw?.limits?.max_local_repairs, defaultLimits.max_local_repairs), defaultLimits.max_local_repairs),
      max_alternate_safe_paths: Math.min(int(raw?.limits?.max_alternate_safe_paths, defaultLimits.max_alternate_safe_paths), defaultLimits.max_alternate_safe_paths),
      child_proposal_budget: Math.min(int(raw?.limits?.child_proposal_budget, defaultLimits.child_proposal_budget), defaultLimits.child_proposal_budget)
    },
    scope_boundary: 'OWNED_WORKBLOCK_ONLY',
    authority_expansion_allowed: false,
    terminal_outcomes: [...CONTRACT.terminal_outcomes]
  };
}

export function validateMissionEnvelope(envelope = {}) {
  const errors = [];
  if (envelope.schema !== WORKER_MISSION_ENVELOPE_SCHEMA) errors.push('SCHEMA_INVALID');
  if (!MODES.has(envelope.mission_mode)) errors.push('MISSION_MODE_INVALID');
  if (envelope.scope_boundary !== 'OWNED_WORKBLOCK_ONLY') errors.push('SCOPE_BOUNDARY_INVALID');
  if (envelope.authority_expansion_allowed !== false) errors.push('AUTHORITY_EXPANSION_FORBIDDEN');
  if (!Array.isArray(envelope.terminal_outcomes) || envelope.terminal_outcomes.join('|') !== CONTRACT.terminal_outcomes.join('|')) errors.push('TERMINAL_OUTCOMES_INVALID');
  if (envelope.compatibility === 'LEGACY_PASSTHROUGH') {
    if (envelope.local_permissions !== null || envelope.limits !== null) errors.push('LEGACY_BEHAVIOR_MUST_REMAIN_PASSTHROUGH');
  } else if (!envelope.local_permissions || !envelope.limits) {
    errors.push('EXPLICIT_PERMISSIONS_AND_LIMITS_REQUIRED');
  }
  return {pass: errors.length === 0, errors};
}

export function classifyMissionSignal(envelope, signal = {}) {
  const validation = validateMissionEnvelope(envelope);
  if (!validation.pass) return {action: 'RETURN_HARD_BOUNDARY', reason: 'INVALID_MISSION_ENVELOPE'};
  const boundary = String(signal.boundary ?? '').trim();
  if (HARD_BOUNDARIES.has(boundary)) return {action: 'RETURN_HARD_BOUNDARY', reason: boundary};
  if (signal.test_passed === true) return {action: 'VERIFY_AND_RETURN_DONE', reason: 'TEST_PASS'};
  const repairsUsed = int(signal.local_repairs_used, 0);
  if (
    signal.local_failure_repairable === true &&
    envelope.local_permissions?.local_repair === true &&
    repairsUsed < (envelope.limits?.max_local_repairs ?? 0)
  ) {
    return {action: 'LOCAL_REPAIR_AND_RETEST', reason: 'REPAIRABLE_WITHIN_BUDGET'};
  }
  if (
    signal.alternate_safe_path_available === true &&
    envelope.local_permissions?.alternate_safe_path === true &&
    int(signal.alternate_safe_paths_used, 0) < (envelope.limits?.max_alternate_safe_paths ?? 0)
  ) {
    return {action: 'TRY_ALTERNATE_SAFE_PATH', reason: 'ALTERNATE_PATH_WITHIN_BUDGET'};
  }
  return {action: 'RETURN_SAFE_PARTIAL_WITH_EVIDENCE', reason: 'LOCAL_BUDGET_OR_REPAIR_EXHAUSTED'};
}

export function missionEnvelopeContract() {
  return structuredClone(CONTRACT);
}
