const MINUTE_MS = 60_000;

export const BINDING_CANARY_POLICY = Object.freeze({
  policy_id: 'chat-native-control-plane-v1/stale-recovery-v1',
  binding: true,
  suspect_after_minutes: 20,
  recovery_after_minutes: 30,
  target_signal_cadence_minutes: 10,
});

const SIGNAL_KINDS = new Set([
  'CLAIM',
  'STARTED',
  'HEARTBEAT',
  'CHECKPOINT',
  'RECOVERY_ATTEMPT',
  'RETURN',
  'DONE',
]);
const TERMINAL_KINDS = new Set(['RETURN', 'DONE']);

export function parseInstant(value, label = 'timestamp') {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(`INVALID_${label.toUpperCase()}`);
  return ms;
}

export function sortEvents(events = []) {
  return [...events].sort((a, b) => {
    const ta = safeInstant(a?.at ?? a?.timestamp ?? a?.heartbeat_at);
    const tb = safeInstant(b?.at ?? b?.timestamp ?? b?.heartbeat_at);
    return ta - tb;
  });
}

function safeInstant(value) {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
}

function eventTime(event) {
  return event?.at ?? event?.timestamp ?? event?.heartbeat_at ?? null;
}

export function latestSignal(events = []) {
  const candidates = events
    .filter((event) => SIGNAL_KINDS.has(event?.kind))
    .map((event) => ({event, ms: safeInstant(eventTime(event))}))
    .filter(({ms}) => Number.isFinite(ms) && ms !== Number.NEGATIVE_INFINITY)
    .sort((a, b) => a.ms - b.ms);
  return candidates.at(-1)?.event ?? null;
}

function latestKind(events, kind) {
  return sortEvents(events.filter((event) => event?.kind === kind)).at(-1) ?? null;
}

export function evaluateCas({mode = 'READ_ONLY_RECOVERY', expected_sha = null, observed_sha = null, refetched = false} = {}) {
  if (!refetched) return {state: 'RELOAD_REQUIRED', safe: false, reason: 'TARGET_NOT_REFETCHED'};
  if (mode !== 'CAS_CONTINUE') {
    return {state: 'SAFE_WITHOUT_OVERWRITE', safe: true, reason: 'NON_OVERWRITE_MODE'};
  }
  if (!expected_sha || !observed_sha) {
    return {state: 'RELOAD_REQUIRED', safe: false, reason: 'CAS_IDENTITY_MISSING'};
  }
  if (expected_sha !== observed_sha) {
    return {state: 'RELOAD_REQUIRED', safe: false, reason: 'CAS_MISMATCH'};
  }
  return {state: 'CAS_MATCH', safe: true, reason: 'EXPECTED_SHA_MATCHES'};
}

function policyCheck(policy) {
  if (!policy || policy.binding !== true) {
    return {ok: false, reason: 'STALE_POLICY_MISSING'};
  }
  const suspect = Number(policy.suspect_after_minutes);
  const recovery = Number(policy.recovery_after_minutes);
  if (!Number.isFinite(suspect) || !Number.isFinite(recovery) || suspect < 0 || recovery < suspect) {
    return {ok: false, reason: 'STALE_POLICY_INVALID'};
  }
  return {ok: true, suspect, recovery};
}

export function evaluateRecovery({
  subject_id = null,
  events = [],
  now,
  policy,
  retryable = false,
  recovery_mode = 'READ_ONLY_RECOVERY',
  target_refetched = false,
  expected_sha = null,
  observed_sha = null,
  active_overlap = false,
  abandoned_evidence = false,
} = {}) {
  const checkedPolicy = policyCheck(policy);
  if (!checkedPolicy.ok) {
    return {
      subject_id,
      state: 'ACTIVE_OR_UNKNOWN',
      decision: 'HOLD',
      recovery_eligible: false,
      reasons: [checkedPolicy.reason],
    };
  }

  let nowMs;
  try {
    nowMs = parseInstant(now, 'now');
  } catch {
    return {
      subject_id,
      state: 'ACTIVE_OR_UNKNOWN',
      decision: 'HOLD',
      recovery_eligible: false,
      reasons: ['INVALID_NOW_TIMESTAMP'],
    };
  }

  const terminal = sortEvents(events.filter((event) => TERMINAL_KINDS.has(event?.kind))).at(-1) ?? null;
  if (terminal) {
    return {
      subject_id,
      state: 'TERMINAL',
      decision: 'NO_RETRY',
      recovery_eligible: false,
      terminal_kind: terminal.kind,
      terminal_ref: terminal.ref ?? null,
      reasons: ['DURABLE_TERMINAL_EVIDENCE_EXISTS'],
    };
  }

  const signal = latestSignal(events);
  if (!signal) {
    return {
      subject_id,
      state: 'ACTIVE_OR_UNKNOWN',
      decision: 'HOLD',
      recovery_eligible: false,
      reasons: ['NO_DURABLE_SIGNAL'],
    };
  }

  const signalMs = safeInstant(eventTime(signal));
  if (!Number.isFinite(signalMs) || signalMs === Number.NEGATIVE_INFINITY || signalMs > nowMs) {
    return {
      subject_id,
      state: 'ACTIVE_OR_UNKNOWN',
      decision: 'HOLD',
      recovery_eligible: false,
      reasons: [signalMs > nowMs ? 'LATEST_SIGNAL_IN_FUTURE' : 'INVALID_LATEST_SIGNAL_TIMESTAMP'],
    };
  }

  const ageMinutes = (nowMs - signalMs) / MINUTE_MS;
  const common = {
    subject_id,
    latest_signal: {
      kind: signal.kind,
      at: eventTime(signal),
      ref: signal.ref ?? null,
    },
    age_minutes: ageMinutes,
    policy_id: policy.policy_id ?? null,
  };

  if (ageMinutes < checkedPolicy.suspect) {
    return {...common, state: 'ACTIVE_OR_UNKNOWN', decision: 'NO_TAKEOVER', recovery_eligible: false, reasons: ['BELOW_STALE_SUSPECT_THRESHOLD']};
  }
  if (ageMinutes < checkedPolicy.recovery) {
    return {...common, state: 'STALE_SUSPECT', decision: 'OBSERVE_ONLY', recovery_eligible: false, reasons: ['BELOW_RECOVERY_THRESHOLD']};
  }

  const claim = latestKind(events, 'CLAIM');
  const started = latestKind(events, 'STARTED');
  const claimExclusive = Boolean(claim && (claim.exclusive === true || String(claim.claim_protocol ?? '').includes('EXCLUSIVE')));
  const reasons = [];
  if (!claim) reasons.push('ORIGINAL_CLAIM_MISSING');
  else if (!claimExclusive) reasons.push('ORIGINAL_CLAIM_NOT_EXCLUSIVE');
  if (!started && !abandoned_evidence) reasons.push('STARTED_OR_ABANDONED_EVIDENCE_MISSING');
  if (!(retryable || recovery_mode === 'ISOLATED_CANDIDATE' || recovery_mode === 'READ_ONLY_RECOVERY')) reasons.push('RETRY_SAFETY_UNPROVEN');
  if (active_overlap) reasons.push('ACTIVE_OVERLAPPING_WRITER');

  const cas = evaluateCas({mode: recovery_mode, expected_sha, observed_sha, refetched: target_refetched});
  if (!cas.safe) reasons.push(cas.reason);

  if (reasons.length) {
    return {
      ...common,
      state: 'STALE_SUSPECT',
      decision: cas.state === 'RELOAD_REQUIRED' ? 'RELOAD_REQUIRED' : 'PARK',
      recovery_eligible: false,
      recovery_mode,
      cas,
      reasons,
    };
  }

  return {
    ...common,
    state: 'RECOVERY_ELIGIBLE',
    decision: 'APPEND_RECOVERY_CLAIM',
    recovery_eligible: true,
    recovery_mode,
    cas,
    reasons: ['ALL_RECOVERY_GATES_PASSED'],
  };
}

export function buildHeartbeat({run_id, worker_instance_id, at, checkpoint = null, evidence_refs = []}) {
  parseInstant(at, 'heartbeat_at');
  if (!run_id || !worker_instance_id) throw new Error('HEARTBEAT_IDENTITY_REQUIRED');
  return {
    schema: 'prometeo.swarm-heartbeat/v1',
    kind: 'HEARTBEAT',
    run_id,
    worker_instance_id,
    heartbeat_at: at,
    checkpoint,
    evidence_refs: [...evidence_refs],
  };
}

export function buildStaleProbe({probe_id, opportunity_id, original_claim_ref, original_run_ref, observed_at, evaluation}) {
  parseInstant(observed_at, 'observed_at');
  if (!probe_id || !opportunity_id || !original_claim_ref) throw new Error('STALE_PROBE_IDENTITY_REQUIRED');
  return {
    schema: 'prometeo.stale-probe/v1',
    kind: 'STALE_PROBE',
    probe_id,
    opportunity_id,
    observed_at,
    original_claim_ref,
    original_run_ref: original_run_ref ?? null,
    state: evaluation?.state ?? 'ACTIVE_OR_UNKNOWN',
    decision: evaluation?.decision ?? 'HOLD',
    latest_signal: evaluation?.latest_signal ?? null,
    age_minutes: evaluation?.age_minutes ?? null,
    reasons: [...(evaluation?.reasons ?? ['EVALUATION_MISSING'])],
    authority: 'READ_ONLY_STALE_EVIDENCE_ONLY',
  };
}

export function buildRecoveryAttempt({
  recovery_attempt_id,
  opportunity_id,
  original_claim_ref,
  original_run_ref,
  recovery_worker_instance_id,
  created_at,
  source_head,
  epoch,
  mode,
  evaluation,
  intended_write_scope = [],
}) {
  parseInstant(created_at, 'created_at');
  if (!evaluation?.recovery_eligible) throw new Error('RECOVERY_NOT_ELIGIBLE');
  if (!recovery_attempt_id || !opportunity_id || !original_claim_ref || !recovery_worker_instance_id) {
    throw new Error('RECOVERY_IDENTITY_REQUIRED');
  }
  if (!['CAS_CONTINUE', 'ISOLATED_CANDIDATE', 'READ_ONLY_RECOVERY'].includes(mode)) throw new Error('INVALID_RECOVERY_MODE');

  const recoveryClaimPath = `coordination/opportunities/recovery-claims/${opportunity_id}/${recovery_attempt_id}.json`;
  const recoveryRunId = `RUN-RECOVERY-${recovery_attempt_id}`;
  return {
    recovery_claim_path: recoveryClaimPath,
    recovery_claim: {
      schema: 'prometeo.recovery-claim/v1',
      opportunity_id,
      recovery_attempt_id,
      created_at,
      original_claim_ref,
      original_run_ref: original_run_ref ?? null,
      last_durable_signal: evaluation.latest_signal ?? null,
      last_signal_age_minutes: evaluation.age_minutes ?? null,
      eligibility_checks: [...(evaluation.reasons ?? [])],
      source_head,
      epoch,
      intended_write_mode: mode,
      intended_write_scope: [...intended_write_scope],
      recovery_worker_instance_id,
      collision_check: 'NO_ACTIVE_OVERLAP_AT_EVALUATION',
      authority: 'SCOPED_RECOVERY_CANDIDATE_ONLY_NO_GLOBAL_PROMOTION',
      preservation_rule: 'ORIGINAL_CLAIM_RUN_AND_RETURNS_IMMUTABLE',
    },
    run_seed: {
      schema: 'prometeo.opportunity-run/v1',
      opportunity_id,
      run_id: recoveryRunId,
      worker_instance_id: recovery_worker_instance_id,
      state: 'STARTED',
      started_at: created_at,
      recovery_claim_ref: recoveryClaimPath,
      previous_run: original_run_ref ?? null,
      supersedes_attempt_candidate: original_run_ref ?? original_claim_ref,
      authority: 'SCOPED_RECOVERY_CANDIDATE_ONLY_NO_GLOBAL_PROMOTION',
    },
  };
}

export function reconcileLateReturn({original_return, recovery_return, compared_at, validator_id}) {
  parseInstant(compared_at, 'compared_at');
  if (!original_return || !recovery_return) throw new Error('BOTH_RETURNS_REQUIRED');
  return {
    schema: 'prometeo.recovery-reconciliation/v1',
    compared_at,
    validator_id: validator_id ?? null,
    original_return,
    recovery_return,
    disposition: 'REQUIRES_VALIDATION',
    allowed_dispositions: ['CONSUMED', 'PARTIAL', 'SUPERSEDED_WITH_REASON', 'CONFLICTED'],
    auto_promote: false,
    preserve_both: true,
    rule: 'PREFER_NEITHER_BY_RECENCY_ALONE',
  };
}
