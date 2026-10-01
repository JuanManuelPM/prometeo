export const PREPARED_STATE = 'PREPARED_NOT_AUTHORIZED';
export const STALE_STATE = 'STALE_PREPARATION';

export function expectedSavedIdleMs({ probability_branch, idle_ms_saved_if_hit, preparation_cost_ms, probability_invalidation, invalidation_rework_cost_ms }) {
  const vals = { probability_branch, idle_ms_saved_if_hit, preparation_cost_ms, probability_invalidation, invalidation_rework_cost_ms };
  for (const [k, v] of Object.entries(vals)) if (!Number.isFinite(v)) throw new TypeError(`${k} must be finite`);
  if (probability_branch < 0 || probability_branch > 1 || probability_invalidation < 0 || probability_invalidation > 1) throw new RangeError('probabilities must be in [0,1]');
  if (idle_ms_saved_if_hit < 0 || preparation_cost_ms < 0 || invalidation_rework_cost_ms < 0) throw new RangeError('durations/costs must be non-negative');
  return probability_branch * idle_ms_saved_if_hit - preparation_cost_ms - probability_invalidation * invalidation_rework_cost_ms;
}

export function shouldPrepare(input) {
  if (!input.consumer_ref || input.consumer_ref.length === 0) return false;
  if (input.semantic_duplicate === true || input.requires_premature_authority === true || input.irreversible === true) return false;
  if (input.probability_branch <= 0) return false;
  return expectedSavedIdleMs(input) > 0;
}

export function bindingMatches(prepared, observed) {
  if (!prepared || !observed) return false;
  if (prepared.artifact_ref && observed.artifact_ref && prepared.artifact_ref !== observed.artifact_ref) return false;
  if (prepared.version !== observed.version) return false;
  if (prepared.digest !== observed.digest) return false;
  return Boolean(prepared.version && prepared.digest);
}

export function preparedKind(outcome) {
  if (outcome === 'PASS') return 'PASS_SUCCESSOR';
  if (outcome === 'FAIL' || outcome === 'REPAIR_REQUIRED') return 'FAIL_REPAIR_SUCCESSOR';
  if (outcome === 'BOUNDARY') return 'BOUNDARY_PACKET';
  return null;
}

export function reconcilePreparation({ prepared_against, observed_upstream, prepared_branch, observed_outcome, normal_authority_ready }) {
  if (!bindingMatches(prepared_against, observed_upstream) || prepared_branch !== branchClass(observed_outcome)) {
    return { state: STALE_STATE, activate: false, prepared_kind: null };
  }
  const kind = preparedKind(observed_outcome);
  if (!kind || normal_authority_ready !== true) return { state: PREPARED_STATE, activate: false, prepared_kind: kind };
  return { state: 'ELIGIBLE_FOR_EXISTING_CLAIM_FLOW', activate: true, prepared_kind: kind };
}

function branchClass(outcome) {
  if (outcome === 'PASS') return 'PASS';
  if (outcome === 'FAIL' || outcome === 'REPAIR_REQUIRED') return 'FAIL_REPAIR';
  if (outcome === 'BOUNDARY') return 'BOUNDARY';
  return null;
}

export function compareIdle({ upstream_return_ms, serial_setup_ms, prepared_ready_ms, reconciliation_ms }) {
  const serialClaim = upstream_return_ms + serial_setup_ms;
  const preparedClaim = Math.max(upstream_return_ms, prepared_ready_ms) + reconciliation_ms;
  return {
    serial_next_claim_ms: serialClaim,
    prepared_next_claim_ms: preparedClaim,
    serial_baseline_idle_ms: serialClaim - upstream_return_ms,
    prepared_path_idle_ms: preparedClaim - upstream_return_ms,
    idle_ms_saved: serialClaim - preparedClaim
  };
}
