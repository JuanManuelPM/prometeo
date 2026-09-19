#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const g = n => String(n).padStart(6, '0');
const arr = value => Array.isArray(value) ? value : [];
export function projectPlannerSuppressedBySourceDebt(stateDoc = {}, projectGuideMesh = {}) {
  const gate = projectGuideMesh?.source_debt_planner_gate || null;
  if (!gate?.enabled) return false;
  if (String(stateDoc?.status || '') !== String(gate.status || 'SOURCE_DEBT')) return false;
  if (gate.require_empty_frontier_refs === true && arr(stateDoc?.frontier_refs).length !== 0) return false;
  const prefix = String(gate.required_blocker_prefix || '');
  if (prefix && !arr(stateDoc?.blockers).some(value => String(value).startsWith(prefix))) return false;
  return true;
}

export function projectPlannerSuppressedByHumanDecision(stateDoc = {}, projectGuideMesh = {}) {
  const gate = projectGuideMesh?.human_decision_planner_gate || null;
  if (!gate?.enabled) return false;
  const statuses = arr(gate.statuses).length
    ? arr(gate.statuses).map(value => String(value))
    : [String(gate.status || 'VERIFIED_CANDIDATE_AWAITING_REVIEW')];
  if (!statuses.includes(String(stateDoc?.status || ''))) return false;
  if (gate.require_empty_frontier_refs === true && arr(stateDoc?.frontier_refs).length !== 0) return false;
  const prefix = String(gate.required_blocker_prefix || '');
  if (prefix && !arr(stateDoc?.blockers).some(value => String(value).startsWith(prefix))) return false;
  return true;
}
const finiteInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};
const parseTime = value => Date.parse(value || '') || 0;
const eventTime = doc => parseTime(doc?.returned_at || doc?.completed_at || doc?.heartbeat_at || doc?.observed_at || doc?.recorded_at || doc?.closed_at || doc?.started_at || doc?.claimed_at || doc?.launched_at || doc?.created_at || doc?.updated_at || doc?.timestamp);
const uniq = values => [...new Set(arr(values).filter(Boolean))].sort((a, b) => Buffer.from(String(a)).compare(Buffer.from(String(b))));
const LEGACY_CAPABILITY_ALIASES = Object.freeze({
  real_browser_execution: ['representative_javascript_browser']
});
const legacyCapabilityValues = job => {
  const raw = job?.capability_required;
  const values = raw == null ? [] : (Array.isArray(raw) ? raw : [raw]);
  return uniq(values.map(value => String(value).trim()).filter(Boolean));
};
export function classifyJobCapabilities(job = {}) {
  const required = [...arr(job?.required_capabilities), ...arr(job?.capability_requirements)];
  const unsupported = [];
  const normalizedLegacy = [];
  for (const value of legacyCapabilityValues(job)) {
    const mapped = LEGACY_CAPABILITY_ALIASES[value];
    if (!mapped) unsupported.push(value);
    else normalizedLegacy.push(...mapped);
  }
  return {
    required_capabilities: uniq([...required, ...normalizedLegacy]),
    legacy_capability_values: legacyCapabilityValues(job),
    unsupported_legacy_capabilities: uniq(unsupported)
  };
}
const jobRequiredCapabilities = job => classifyJobCapabilities(job).required_capabilities;
const jobCapabilityRouteable = job => classifyJobCapabilities(job).unsupported_legacy_capabilities.length === 0;

const DEFAULT_FRONTIER_CAPABILITY_PRESSURE = Object.freeze({
  generic_capabilities:['repository_test_runtime'],
  specialized_buckets:{
    browser_js:['representative_javascript_browser','browser_network_navigation_to_github_pages'],
    public_http:['unrestricted_public_http_origin_fetch'],
    mobile_touch:['mobile_touch_input'],
    target_host:['authorized_readonly_target_host_runtime'],
    cross_device:['cross_device_tv_phone_or_equivalent'],
    dispatch:['authorized_worker_dispatch']
  },
  max_specialized_buckets:8,
  max_unknown_capabilities:8
});
const frontierPressurePolicy = policy => {
  const raw = policy?.capability_pressure && typeof policy.capability_pressure === 'object'
    ? policy.capability_pressure
    : {};
  const generic = uniq(arr(raw.generic_capabilities).length ? raw.generic_capabilities : DEFAULT_FRONTIER_CAPABILITY_PRESSURE.generic_capabilities);
  const bucketSource = raw.specialized_buckets && typeof raw.specialized_buckets === 'object'
    ? raw.specialized_buckets
    : DEFAULT_FRONTIER_CAPABILITY_PRESSURE.specialized_buckets;
  const specialized = {};
  for (const [bucket, values] of Object.entries(bucketSource)) specialized[String(bucket)] = uniq(values.map(value => String(value).trim()).filter(Boolean));
  return {
    generic_capabilities:generic,
    specialized_buckets:specialized,
    max_specialized_buckets:Math.max(1, finiteInt(raw.max_specialized_buckets, DEFAULT_FRONTIER_CAPABILITY_PRESSURE.max_specialized_buckets)),
    max_unknown_capabilities:Math.max(1, finiteInt(raw.max_unknown_capabilities, DEFAULT_FRONTIER_CAPABILITY_PRESSURE.max_unknown_capabilities))
  };
};
export function classifyFrontierCapabilityPressure(candidates = [], policy = {}) {
  const rows = arr(candidates);
  const model = frontierPressurePolicy(policy);
  const generic = new Set(model.generic_capabilities);
  const capabilityToBucket = new Map();
  for (const [bucket, capabilities] of Object.entries(model.specialized_buckets)) {
    for (const capability of capabilities) capabilityToBucket.set(capability, bucket);
  }
  const bucketCounts = new Map(Object.keys(model.specialized_buckets).map(bucket => [bucket, 0]));
  const coarseBuckets = { browser:0, mobile:0, host:0, dispatch:0, unknown:0 };
  const unknown = new Set();
  let genericCompatible = 0;
  let specializedCandidates = 0;
  let unknownCandidates = 0;
  for (const candidate of rows) {
    const required = uniq(arr(candidate?.required_capabilities).map(value => String(value).trim()).filter(Boolean));
    const seenBuckets = new Set();
    let hasKnownSpecialized = false;
    let hasUnknown = false;
    const coarseSeen = new Set();
    for (const capability of required) {
      if (generic.has(capability)) continue;
      const bucket = capabilityToBucket.get(capability);
      if (bucket) {
        seenBuckets.add(bucket);
        hasKnownSpecialized = true;
        if (bucket.includes('browser') || bucket === 'public_http') coarseSeen.add('browser');
        else if (bucket.includes('mobile') || bucket.includes('touch')) coarseSeen.add('mobile');
        else if (bucket.includes('host') || bucket.includes('cross_device')) coarseSeen.add('host');
        else if (bucket.includes('dispatch')) coarseSeen.add('dispatch');
      } else {
        hasUnknown = true;
        unknown.add(capability);
        coarseSeen.add('unknown');
      }
    }
    if (!hasKnownSpecialized && !hasUnknown) genericCompatible += 1;
    if (hasKnownSpecialized) specializedCandidates += 1;
    if (hasUnknown) unknownCandidates += 1;
    for (const bucket of seenBuckets) bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
    for (const bucket of coarseSeen) coarseBuckets[bucket] += 1;
  }
  const specializedBuckets = [...bucketCounts.entries()]
    .filter(([, count]) => count > 0)
    .map(([bucket,count]) => ({bucket,count}))
    .sort((a,b)=>b.count-a.count || a.bucket.localeCompare(b.bucket))
    .slice(0, model.max_specialized_buckets);
  const unknownCapabilities = [...unknown]
    .sort((a,b)=>Buffer.from(a).compare(Buffer.from(b)))
    .slice(0, model.max_unknown_capabilities);
  return {
    basis:'candidate.required_capabilities',
    total_clean_frontier:rows.length,
    generic_compatible_count:genericCompatible,
    specialized_candidate_count:specializedCandidates,
    unknown_capability_candidate_count:unknownCandidates,
    specialized_buckets:specializedBuckets,
    unknown_capabilities:unknownCapabilities,
    // Compatibility aliases for already-published canary consumers.
    total:rows.length,
    generic_compatible:genericCompatible,
    specialized_total:specializedCandidates + unknownCandidates,
    buckets:coarseBuckets
  };
}

export function classifyProjectGuideFrontier(stateDoc = {}, jobs = [], projectGuideMesh = {}) {
  const baselineCapabilities = new Set(
    arr(projectGuideMesh?.project_frontier_baseline_capabilities || ['repository_test_runtime'])
      .map(value => String(value))
  );
  const bySource = new Map();
  const byJobId = new Map();
  for (const job of arr(jobs)) {
    if (job?.job_id) byJobId.set(job.job_id, job);
    if (job?.source_path) bySource.set(String(job.source_path), job);
  }
  const resolve = ref => {
    const raw = String(ref || '');
    const base = raw.split('#')[0];
    if (bySource.has(base)) return bySource.get(base);
    const explicitJob = raw.match(/#job:([^#]+)$/)?.[1] || null;
    if (explicitJob && byJobId.has(explicitJob)) return byJobId.get(explicitJob);
    const derivedJob = base.match(/coordination\/portfolio\/derived\/[^/]+\/([^/]+)\.json$/)?.[1] || null;
    if (derivedJob && byJobId.has(derivedJob)) return byJobId.get(derivedJob);
    return null;
  };
  const items = arr(stateDoc?.frontier_refs).map(ref => {
    const job = resolve(ref);
    if (!job) return { ref, classification:'missing', job_id:null, state:null, required_capabilities:[] };
    if (job.state === 'done') {
      return { ref, classification:'terminal', job_id:job.job_id, state:job.state, required_capabilities:jobRequiredCapabilities(job) };
    }
    const required = jobRequiredCapabilities(job);
    const specialized = required.filter(capability => !baselineCapabilities.has(capability));
    if (specialized.length) {
      return {
        ref,
        classification:'capability_requirement',
        job_id:job.job_id,
        state:job.state,
        required_capabilities:required,
        specialized_capabilities:specialized
      };
    }
    if (['working','suspect','recovery'].includes(job.state)) {
      return { ref, classification:'active', job_id:job.job_id, state:job.state, required_capabilities:required };
    }
    if (['ready','partial','replaceable'].includes(job.state)) {
      return { ref, classification:'executable', job_id:job.job_id, state:job.state, required_capabilities:required };
    }
    return { ref, classification:'missing', job_id:job.job_id, state:job.state, required_capabilities:required };
  });
  const counts = items.reduce((acc, item) => {
    acc[item.classification] = (acc[item.classification] || 0) + 1;
    return acc;
  }, { executable:0, active:0, capability_requirement:0, terminal:0, missing:0 });
  return {
    items,
    counts,
    effective_count: counts.executable + counts.active,
    planner_count: counts.executable + counts.active + counts.capability_requirement,
    capability_requirement_refs: items.filter(item => item.classification === 'capability_requirement').map(item => item.ref),
    terminal_refs: items.filter(item => item.classification === 'terminal').map(item => item.ref),
    missing_refs: items.filter(item => item.classification === 'missing').map(item => item.ref)
  };
}
const clamp = (min, value, max) => Math.max(min, Math.min(max, value));
const lower = value => String(value ?? '').toLowerCase();
const sha12 = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
const roleLower = role => String(role).replace(/^GUIDE_/, '').toLowerCase();
const returnEvidenceRows = job => {
  const compact = arr(job?.recent_return_evidence);
  return compact.length ? compact : arr(job?.returns);
};
const collisionEvidenceRows = job => {
  const compact = arr(job?.recent_collision_evidence);
  return compact.length ? compact : arr(job?.collisions);
};
const attentionOutcome = row => {
  const value = lower(row?.outcome || row?.status || row?.result);
  return ['partial', 'boundary', 'route_aborted'].includes(value) ? value : null;
};

function detectPartialLoop(jobs = [], threshold = 2) {
  const minimum = Math.max(2, finiteInt(threshold, 2));
  const attentionJobs = arr(jobs)
    .filter(job => job?.state !== 'done')
    .filter(job => {
      const latest = returnEvidenceRows(job).at(-1) || job?.latest_return || null;
      return ['partial', 'blocked'].includes(job?.state) || Boolean(attentionOutcome(latest));
    });

  const returnOwner = new Map();
  for (const job of attentionJobs) {
    for (const ret of returnEvidenceRows(job).filter(row => Boolean(attentionOutcome(row)))) {
      if (ret?.path) returnOwner.set(ret.path, job);
    }
  }

  const groups = [];
  for (const job of attentionJobs) {
    const rows = returnEvidenceRows(job).filter(row => Boolean(attentionOutcome(row)));

    if (rows.length >= minimum) {
      const selected = rows.slice(-minimum);
      groups.push({
        kind: 'SAME_JOB_RECURRENCE',
        return_count: selected.length,
        latest_at: Math.max(0, ...selected.map(eventTime)),
        evidence: uniq([...selected.map(row => row.path), roleEvidenceRef(job)])
      });
    }

    const parentRef = job?.derived_from_return || null;
    const parent = parentRef ? returnOwner.get(parentRef) : null;
    if (!parent || parent.job_id === job.job_id) continue;

    const parentRows = returnEvidenceRows(parent).filter(row => Boolean(attentionOutcome(row)));
    const parentReturn = parentRows.find(row => row?.path === parentRef) || parentRows.at(-1) || null;
    const childReturn = rows.at(-1) || null;
    const returnRefs = uniq([parentReturn?.path, childReturn?.path]);
    if (returnRefs.length < minimum) continue;

    groups.push({
      kind: 'DERIVED_NONTERMINAL_LINEAGE',
      return_count: returnRefs.length,
      latest_at: Math.max(eventTime(parentReturn), eventTime(childReturn)),
      evidence: uniq([
        parentReturn?.path,
        roleEvidenceRef(parent),
        childReturn?.path,
        roleEvidenceRef(job)
      ])
    });
  }

  groups.sort((a, b) =>
    b.return_count - a.return_count ||
    b.latest_at - a.latest_at ||
    a.evidence.join('\n').localeCompare(b.evidence.join('\n'))
  );
  return groups[0] || { kind: null, return_count: 0, latest_at: 0, evidence: [] };
}

export function normalizeRecoveryPolicy(job = {}, policy = null) {
  const source = policy && typeof policy === 'object' ? policy : {};
  if (source.mode === 'fixed_generation') {
    const fixedGeneration = finiteInt(source.fixed_generation, 0);
    if (fixedGeneration < 1) {
      return {
        mode: 'invalid_fixed_generation',
        ordinary_next_generation_eligible: false,
        fixed_generation: null,
        attention_route: source.attention_route || 'FIXED_GENERATION_RECONCILE',
        valid: false,
        reason: 'FIXED_GENERATION_POLICY_REQUIRES_POSITIVE_GENERATION'
      };
    }
    return {
      mode: 'fixed_generation',
      ordinary_next_generation_eligible: false,
      fixed_generation: fixedGeneration,
      attention_route: source.attention_route || 'FIXED_GENERATION_RECONCILE',
      attention_until: source.attention_until && typeof source.attention_until === 'object' ? source.attention_until : null,
      valid: true,
      reason: source.reason || 'JOB_CONTRACT_IS_GENERATION_FIXED'
    };
  }
  return {
    mode: 'next_generation_retry',
    ordinary_next_generation_eligible: true,
    fixed_generation: null,
    attention_route: null,
    attention_until: null,
    valid: true,
    reason: source.reason || 'DEFAULT_RETRY_SAFE_NEXT_GENERATION'
  };
}


function normalizedRecoveryBasis(job = {}) {
  const raw = job?.recovery_basis && typeof job.recovery_basis === 'object' ? job.recovery_basis : {};
  const revision = finiteInt(raw.revision ?? job?.recovery_basis_revision, 0);
  const dependency = job?.source_debt_dependency && typeof job.source_debt_dependency === 'object' && !Array.isArray(job.source_debt_dependency)
    ? job.source_debt_dependency
    : null;
  const dependencyReturnRef = typeof dependency?.return_ref === 'string' && dependency.return_ref.trim()
    ? dependency.return_ref.trim()
    : null;
  const dependencyJobId = typeof dependency?.job_id === 'string' && dependency.job_id.trim()
    ? dependency.job_id.trim()
    : null;
  const dependencyReturnedAt = dependency?.source_debt?.returned_at || null;
  const dependencyBasis = dependencyReturnRef ? {
    job_id: dependencyJobId,
    return_ref: dependencyReturnRef,
    structurally_valid: dependency?.structurally_valid === true,
    returned_at: dependencyReturnedAt
  } : null;
  const evidence = uniq([
    ...arr(job?.evidence),
    ...arr(raw.evidence),
    ...arr(raw.artifacts),
    ...(dependencyReturnRef ? [dependencyReturnRef] : [])
  ]);
  const explicitEvidence = uniq([
    ...arr(raw.evidence),
    ...arr(raw.artifacts),
    ...(dependencyReturnRef ? [dependencyReturnRef] : [])
  ]);
  const requiredCapabilities = jobRequiredCapabilities(job);
  const explicitCapabilities = uniq(arr(raw.required_capabilities));
  const retryTrigger = raw.retry_safe_trigger || job?.recovery_retry_trigger || null;
  const updatedAt = [
    raw.updated_at,
    job?.recovery_basis_updated_at,
    job?.updated_at,
    job?.created_at,
    dependencyReturnedAt
  ]
    .filter(Boolean)
    .sort((a, b) => (parseTime(a) || 0) - (parseTime(b) || 0))
    .at(-1) || null;
  const fingerprint = sha12(JSON.stringify({
    revision,
    evidence,
    required_capabilities: requiredCapabilities,
    retry_trigger: retryTrigger
  }));
  return {
    revision,
    evidence,
    explicit_evidence: explicitEvidence,
    required_capabilities: requiredCapabilities,
    explicit_capabilities: explicitCapabilities,
    retry_trigger: retryTrigger,
    updated_at: updatedAt,
    updated_at_ms: parseTime(updatedAt),
    fingerprint,
    capability_fingerprint: sha12(JSON.stringify(requiredCapabilities)),
    source_debt_dependency: dependencyBasis,
    explicit: Boolean(
      job?.recovery_basis ||
      finiteInt(job?.recovery_basis_revision, 0) > 0 ||
      job?.recovery_retry_trigger ||
      dependencyReturnRef
    )
  };
}

function structuredSourceDebtState(job = {}) {
  const row = job?.latest_source_debt_return;
  if (row && typeof row === 'object' && !Array.isArray(row)) {
    const status = typeof row.status === 'string' ? row.status.trim().toUpperCase() : null;
    const exhaustiveNegative = row.exhaustive_negative === true;
    const structurallyValid = row.structurally_valid === true;
    return {
      present: true,
      valid: status === 'OPEN' && exhaustiveNegative && structurallyValid,
      status,
      exhaustive_negative: exhaustiveNegative,
      structurally_valid: structurallyValid,
      path: row.path || null,
      returned_at: row.returned_at || null,
      dependency_job_id: null,
      dependency_return_ref: null
    };
  }

  const dependency = job?.source_debt_dependency;
  if (!dependency || typeof dependency !== 'object' || Array.isArray(dependency)) {
    return { present: false, valid: false, status: null, exhaustive_negative: false };
  }
  const dependentRow = dependency.source_debt;
  const status = typeof dependentRow?.status === 'string' ? dependentRow.status.trim().toUpperCase() : null;
  const exhaustiveNegative = dependentRow?.exhaustive_negative === true;
  const structurallyValid = Boolean(
    dependency.structurally_valid === true &&
    dependentRow &&
    typeof dependentRow === 'object' &&
    !Array.isArray(dependentRow) &&
    dependentRow.structurally_valid === true
  );
  return {
    present: true,
    valid: status === 'OPEN' && exhaustiveNegative && structurallyValid,
    status,
    exhaustive_negative: exhaustiveNegative,
    structurally_valid: structurallyValid,
    path: dependentRow?.path || dependency.return_ref || null,
    returned_at: dependentRow?.returned_at || null,
    dependency_job_id: dependency.job_id || null,
    dependency_return_ref: dependency.return_ref || null
  };
}

function evidenceBoundSourceDebt(job = {}) {
  const structured = structuredSourceDebtState(job);
  if (structured.present) return true;
  const ret = job?.latest_return || null;
  const outcome = lower(ret?.outcome || ret?.status);
  if (!['boundary', 'route_aborted', 'partial'].includes(outcome)) return false;
  const summary = lower(ret?.summary || '');
  return (
    summary.includes('source_debt') ||
    summary.includes('source debt') ||
    summary.includes('requires a new external') ||
    summary.includes('requires an authentic external') ||
    summary.includes('authentic external preserved') ||
    summary.includes('new external preserved artifact')
  );
}

export function recoveryBasisGate(job = {}) {
  const basis = normalizedRecoveryBasis(job);
  const structuredDebt = structuredSourceDebtState(job);
  if (structuredDebt.present && !structuredDebt.valid) {
    return {
      eligible: false,
      evidence_bound: true,
      reason: 'SOURCE_DEBT_MALFORMED_FAIL_CLOSED',
      basis,
      source_debt: structuredDebt
    };
  }
  if (!evidenceBoundSourceDebt(job)) {
    return {
      eligible: true,
      evidence_bound: false,
      reason: 'NOT_EVIDENCE_BOUND_SOURCE_DEBT',
      basis
    };
  }

  const returnedAt = parseTime(job?.latest_return?.returned_at);
  const claimedAt = parseTime(job?.claimed_at);
  const latestReturnGeneration = finiteInt(job?.latest_return?.generation, 0);
  const latestPinGeneration = finiteInt(job?.pin_generation, 0);
  const prior = job?.latest_pin_recovery_basis && typeof job.latest_pin_recovery_basis === 'object'
    ? job.latest_pin_recovery_basis
    : {};
  const priorFingerprint = prior.basis_fingerprint || null;
  const priorRevision = finiteInt(prior.basis_revision, 0);

  // A silent owner after the latest completed SOURCE_DEBT return gets one
  // ordinary liveness retry. Do not let repeated silent owners reopen the
  // exact same stamped basis forever: once two post-return generations have
  // been materialized without a newer return/basis, fail closed into attention.
  if (claimedAt && (!returnedAt || claimedAt > returnedAt)) {
    const silentOwnersSinceReturn = latestReturnGeneration > 0
      ? Math.max(0, latestPinGeneration - latestReturnGeneration)
      : 0;
    const repeatedSameStampedBasis = (
      silentOwnersSinceReturn >= 2 &&
      Boolean(priorFingerprint) &&
      priorFingerprint === basis.fingerprint
    );
    if (repeatedSameStampedBasis) {
      return {
        eligible: false,
        evidence_bound: true,
        reason: 'SOURCE_DEBT_SILENT_OWNER_RETRY_EXHAUSTED',
        basis,
        source_debt: structuredDebt,
        silent_owner_retry: {
          latest_return_generation: latestReturnGeneration,
          latest_pin_generation: latestPinGeneration,
          silent_owners_since_return: silentOwnersSinceReturn
        }
      };
    }
    return {
      eligible: true,
      evidence_bound: true,
      reason: 'SILENT_OWNER_STALE_AFTER_LAST_RETURN',
      basis,
      source_debt: structuredDebt
    };
  }
  const updatedAfterReturn = Boolean(returnedAt && basis.updated_at_ms > returnedAt);

  const legacyMaterialBasis = (
    !priorFingerprint &&
    updatedAfterReturn &&
    basis.explicit &&
    (
      basis.revision > priorRevision ||
      Boolean(basis.retry_trigger) ||
      basis.explicit_evidence.length > 0 ||
      basis.explicit_capabilities.length > 0
    )
  );
  const stampedMaterialBasis = (
    Boolean(priorFingerprint) &&
    updatedAfterReturn &&
    basis.fingerprint !== priorFingerprint
  );

  if (legacyMaterialBasis || stampedMaterialBasis) {
    return {
      eligible: true,
      evidence_bound: true,
      reason: 'SOURCE_DEBT_BASIS_CHANGED',
      basis,
      source_debt: structuredDebt
    };
  }

  return {
    eligible: false,
    evidence_bound: true,
    reason: 'SOURCE_DEBT_BASIS_UNCHANGED',
    basis,
    source_debt: structuredDebt
  };
}

export function authorityBoundaryGate(job = {}) {
  const raw = job?.authority_gate;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { present: false, eligible: true, valid: true, reason: 'NO_AUTHORITY_GATE' };
  }
  const schema = String(raw.schema || '');
  const gate = String(raw.gate || '').toUpperCase();
  const status = String(raw.status || '').toUpperCase();
  const boundaryReturnRef = typeof raw.boundary_return_ref === 'string' && raw.boundary_return_ref.trim() ? raw.boundary_return_ref.trim() : null;
  const boundaryReturnedAt = raw.boundary_returned_at || null;
  const openedAt = raw.opened_at || null;
  const requiredKind = typeof raw.required_authority?.kind === 'string' && raw.required_authority.kind.trim()
    ? raw.required_authority.kind.trim()
    : null;
  const satisfiedRef = typeof raw.satisfied_by_evidence_ref_or_null === 'string' && raw.satisfied_by_evidence_ref_or_null.trim()
    ? raw.satisfied_by_evidence_ref_or_null.trim()
    : null;
  const satisfiedAt = raw.satisfied_at_or_null || null;
  const base = {
    present: true,
    path: raw.path || null,
    schema,
    gate,
    status,
    boundary_return_ref: boundaryReturnRef,
    boundary_returned_at: boundaryReturnedAt,
    opened_at: openedAt,
    required_authority: raw.required_authority || null,
    satisfied_by_evidence_ref_or_null: satisfiedRef,
    satisfied_at_or_null: satisfiedAt,
    satisfied_ref_exists: raw.satisfied_ref_exists === true
  };
  const structurallyValid = (
    schema === 'prometeo.portfolio-authority-gate/v1' &&
    gate === 'NEW_AUTHORITY_GATE' &&
    Boolean(boundaryReturnRef) &&
    Boolean(requiredKind) &&
    parseTime(openedAt) > 0
  );
  if (!structurallyValid) {
    return { ...base, valid: false, eligible: false, reason: 'AUTHORITY_GATE_MALFORMED_FAIL_CLOSED' };
  }
  if (status === 'OPEN') {
    return { ...base, valid: true, eligible: false, reason: 'AUTHORITY_DEBT_UNSATISFIED' };
  }
  if (status !== 'SATISFIED') {
    return { ...base, valid: false, eligible: false, reason: 'AUTHORITY_GATE_MALFORMED_FAIL_CLOSED' };
  }
  const satisfiedMs = parseTime(satisfiedAt);
  const boundaryMs = parseTime(boundaryReturnedAt);
  const openedMs = parseTime(openedAt);
  const satisfactionValid = Boolean(
    satisfiedRef &&
    raw.satisfied_ref_exists === true &&
    satisfiedMs > 0 &&
    satisfiedMs > openedMs &&
    (!boundaryMs || satisfiedMs > boundaryMs)
  );
  if (!satisfactionValid) {
    return { ...base, valid: false, eligible: false, reason: 'AUTHORITY_GATE_SATISFACTION_INVALID_FAIL_CLOSED' };
  }
  return { ...base, valid: true, eligible: true, reason: 'NEW_AUTHORITY_GATE_SATISFIED' };
}

function combinedRecoveryGate(job = {}) {
  const authority = authorityBoundaryGate(job);
  if (!authority.eligible) return { ...authority, gate_kind: 'authority' };
  const sourceDebt = recoveryBasisGate(job);
  return {
    ...sourceDebt,
    gate_kind: sourceDebt.eligible ? 'none' : 'source_debt',
    authority_gate: authority.present ? authority : null
  };
}

function candidateValueClass(item = {}, lane = 'portfolio', growthPolicy = {}) {
  const projectId = item.project_id || item.scope_project_id || null;
  const systemProjects = new Set(arr(growthPolicy?.value_budget?.system_multiplier_projects || ['prometeo-autonomous-growth','prometeo-live']));
  if (lane === 'guide' || lane === 'queue') return 'SYSTEM_MULTIPLIER';
  if (projectId && systemProjects.has(projectId)) return 'SYSTEM_MULTIPLIER';
  if (projectId) return 'PRODUCT_VALUE';
  return 'CONTROL_OVERHEAD';
}

function compactPortfolio(feed, semantic, job, targetGeneration = null, growthPolicy = {}) {
  const current = finiteInt(job.pin_generation, 0);
  const recovery = semantic(job);
  const basisGate = recoveryBasisGate(job);
  const authorityGate = authorityBoundaryGate(job);
  const recoveryGate = combinedRecoveryGate(job);
  const next = targetGeneration ?? current + 1;
  const predecessor = current ? `coordination/portfolio/pins/${job.job_id}/G${g(current)}.json` : null;
  return {
    job_id: job.job_id,
    dedupe_key: job.dedupe_key || null,
    project_id: job.project_id || null,
    project_label: job.project_label || null,
    title: job.title || job.job_id,
    kind: job.kind || null,
    value_class: candidateValueClass(job, 'portfolio', growthPolicy),
    source_path: job.source_path || null,
    required_capabilities: jobRequiredCapabilities(job),
    priority: job.priority || 0,
    state: job.state,
    authority_mode: job.authority_mode || null,
    pin_generation: current,
    next_generation: next,
    claim_generation_mode: recovery.mode === 'fixed_generation' ? 'FIXED' : 'NEXT',
    recovery_semantics: recovery,
    recovery_basis_gate: basisGate,
    authority_gate: authorityGate.present ? authorityGate : null,
    recovery_gate: recoveryGate,
    claim_mode: 'PORTFOLIO_PIN_CREATE',
    claim_path: `coordination/portfolio/pins/${job.job_id}/G${g(next)}.json`,
    claim_payload_shape: {
      schema: 'prometeo.portfolio-pin/v1',
      pin_id: `pin-${job.job_id}-G${g(next)}-<worker_id>`,
      job_id: job.job_id,
      dedupe_key: job.dedupe_key || null,
      project_id: job.project_id || null,
      generation: next,
      worker_id: '<worker_id>',
      claim_id: `claim-${job.job_id}-G${g(next)}-<worker_id>`,
      claimed_at: '<now_iso>',
      expires_at: '<now_plus_10m_iso>',
      source_head: feed.source_sha || '<allocator_source_sha>',
      predecessor_pin_ref_or_null: predecessor,
      predecessor_claim_ref_or_null: null,
      recovery_basis_or_null: current ? {
        allocator_generated_at: feed.generated_at,
        predecessor_last_signal_at: job.last_signal_at || null,
        allocator_state: job.state,
        ...(basisGate.evidence_bound || basisGate.basis.explicit ? {
          basis_revision: basisGate.basis.revision,
          basis_fingerprint: basisGate.basis.fingerprint,
          capability_fingerprint: basisGate.basis.capability_fingerprint,
          basis_updated_at: basisGate.basis.updated_at,
          retry_trigger: basisGate.basis.retry_trigger,
          ...(basisGate.source_debt?.dependency_return_ref ? {
            source_debt_dependency_job_id: basisGate.source_debt.dependency_job_id,
            source_debt_dependency_return_ref: basisGate.source_debt.dependency_return_ref
          } : {})
        } : {}),
        ...(authorityGate.present ? {
          authority_gate_ref: authorityGate.path,
          authority_boundary_return_ref: authorityGate.boundary_return_ref,
          authority_satisfied_by_evidence_ref: authorityGate.satisfied_by_evidence_ref_or_null,
          authority_satisfied_at: authorityGate.satisfied_at_or_null
        } : {})
      } : null
    },
    predecessor_pin_ref: predecessor,
    last_signal_at: job.last_signal_at || null,
    post_claim_validate: true
  };
}

function roleEvidenceRef(job) {
  return job?.source_path || `coordination/portfolio/PORTFOLIO.json#job:${job?.job_id || 'unknown'}`;
}

export function compileRoleFrontier(feed = {}, efficiency = {}, jobs = [], ready = [], queueReady = [], recovery = [], roleContext = null) {
  if (!roleContext?.metabolism) return { role_ready: [], metabolism: null };
  const { metabolism, guideReceipts, guidePins, heartbeats, beacons, noAlloc, projectGuideMesh, projectGuideStates, portfolio, growthPolicy } = roleContext;
  const now = Date.now();
  const signals = metabolism.signals || {};

  const receiptByWork = new Map();
  const consumedReturns = new Set();
  for (const row of arr(guideReceipts)) {
    const id = row.doc?.guide_work_id;
    if (id) {
      const values = receiptByWork.get(id) || [];
      values.push(row);
      receiptByWork.set(id, values);
    }
    for (const ref of arr(row.doc?.consumed_returns)) consumedReturns.add(ref);
  }

  const hbByWorker = new Map();
  for (const row of arr(heartbeats)) {
    const wid = row.doc?.worker_id || row.doc?.session_id || row.worker_id;
    if (!wid) continue;
    const values = hbByWorker.get(wid) || [];
    values.push(row);
    hbByWorker.set(wid, values);
  }

  const recentWindow = Number(signals.recent_launch_window_minutes || 10) * 60_000;
  const recentBeacons = arr(beacons).filter(row => now - eventTime(row.doc) <= recentWindow);
  const recentNoAlloc = arr(noAlloc).filter(row => now - eventTime(row.doc) <= recentWindow);
  const explicitTransportBlockedNoAlloc = recentNoAlloc.filter(row => {
    const doc = row?.doc || {};
    return [doc.reason, doc.outcome]
      .map(value => String(value || '').trim().toUpperCase())
      .includes('CLAIM_TRANSPORT_BLOCKED');
  });
  const rescueEligibleNoAlloc = recentNoAlloc.filter(row => !explicitTransportBlockedNoAlloc.includes(row));
  const floor = Number(signals.frontier_floor_absolute || 8);
  const perLaunch = Number(signals.frontier_per_recent_launch || 1.5);
  const ceiling = Number(signals.frontier_ceiling || 40);
  const targetClaimable = clamp(floor, Math.ceil(perLaunch * recentBeacons.length), ceiling);
  const capabilityPressure = classifyFrontierCapabilityPressure([...ready, ...queueReady], metabolism);
  const cleanFrontier = capabilityPressure.total_clean_frontier;
  const generic_compatible_frontier = capabilityPressure.generic_compatible_count;
  const genericCompatibleFrontier = generic_compatible_frontier;
  const pressureEvidenceRef = 'gh-pages:live/allocator.json#metabolism.capability_pressure';
  const capabilityPressureEvidenceRef = pressureEvidenceRef;
  const recoveryCapabilityPressure = classifyFrontierCapabilityPressure(recovery, metabolism);
  const genericRecoveryPressure = recoveryCapabilityPressure.generic_compatible_count;
  const recoveryCapabilityPressureEvidenceRef = 'gh-pages:live/allocator.json#metabolism.recovery_capability_pressure';

  const recentReturnWindow = 6 * 60 * 60_000;
  const collisionPressureWindow = Number(signals.collision_pressure_window_minutes || 30) * 60_000;
  const materialReturns = [];
  for (const job of jobs) {
    for (const ret of returnEvidenceRows(job)) {
      const ref = ret.path || null;
      const when = eventTime(ret);
      const outcome = lower(ret.outcome || ret.status || ret.result);
      if (!ref || !when || now - when > recentReturnWindow || consumedReturns.has(ref)) continue;
      if (!['done', 'verified', 'no_action_needed', 'superseded', 'partial', 'boundary', 'route_aborted'].some(value => outcome.includes(value))) continue;
      materialReturns.push({ path: ref, when, outcome, job_id: job.job_id });
    }
  }
  materialReturns.sort((a, b) => b.when - a.when || a.path.localeCompare(b.path));
  const unconsumedReturnRefs = uniq(materialReturns.slice(0, 12).map(row => row.path));

  const genericRecovery = recovery.filter(item => classifyFrontierCapabilityPressure([item], metabolism).generic_compatible_count === 1);
  const recoveryEvidence = uniq(genericRecovery.slice(0, 8).map(item => item.predecessor_pin_ref || item.source_path || `coordination/portfolio/PORTFOLIO.json#job:${item.job_id}`));
  const collisionEvidence = uniq(jobs
    .flatMap(job => collisionEvidenceRows(job))
    .filter(row => {
      const when = eventTime(row);
      return row?.path && when && now - when <= collisionPressureWindow;
    })
    .map(row => row.path)
    .slice(-12));
  const partialLoop = detectPartialLoop(jobs, Number(signals.partial_loop_trigger || 2));
  const unresolvedEvidence = uniq(jobs
    .filter(job => job.state !== 'done')
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 12)
    .map(roleEvidenceRef));

  const youngAge = Number(signals.young_active_pin_guard_age_minutes || 3) * 60_000;
  const youngActive = arr(feed.workers).filter(worker => {
    if (worker.end_at || !(worker.pin_at || worker.job_id)) return false;
    const last = parseTime(worker.last_signal_at || worker.pin_at || worker.start_at || worker.first_seen);
    return last && now - last <= youngAge;
  }).length;
  const guardMinimum = Math.max(
    Number(signals.young_active_pin_guard_minimum || 4),
    Math.ceil(Number(signals.young_active_pin_guard_fraction_of_recent_launches || 0.5) * recentBeacons.length)
  );
  const overloadGuard = recentBeacons.length >= 8 && youngActive >= guardMinimum;
  const genericStarvationOverride = overloadGuard &&
    genericCompatibleFrontier === 0 &&
    capabilityPressure.specialized_total > 0 &&
    unresolvedEvidence.length > 0;

  const existingRoleBusy = role => jobs.some(job => job.guide_role === role && ['ready', 'working', 'recovery', 'suspect', 'partial'].includes(job.state));
  const rolePinState = roleId => {
    const rows = arr(guidePins)
      .filter(row => row.path?.startsWith(`coordination/guide/pins/${roleId}/`))
      .sort((a, b) => {
        const ga = finiteInt(a.path?.match(/G(\d+)\.json$/)?.[1], 0);
        const gb = finiteInt(b.path?.match(/G(\d+)\.json$/)?.[1], 0);
        return ga - gb || eventTime(a.doc) - eventTime(b.doc);
      });
    const latest = rows.at(-1) || null;
    const generation = finiteInt(latest?.path?.match(/G(\d+)\.json$/)?.[1], 0);
    if (arr(receiptByWork.get(roleId)).length) return { terminal: true, active: false, generation, latest };
    if (!latest) return { terminal: false, active: false, generation: 0, latest: null };
    const workerId = latest.doc?.worker_id;
    const hb = arr(hbByWorker.get(workerId)).sort((a, b) => eventTime(a.doc) - eventTime(b.doc)).at(-1) || null;
    const last = Math.max(eventTime(latest.doc), eventTime(hb?.doc));
    return { terminal: false, active: Boolean(last) && now - last < 10 * 60_000, generation, latest };
  };

  const candidate = ({ role, trigger, evidence, title, mission, priority, allow_parallel_same_role = false, scope_project_id = null, state_ref = null, state_revision = null }) => {
    const refs = uniq(evidence).slice(0, 12);
    if (!refs.length || (!allow_parallel_same_role && existingRoleBusy(role))) return null;
    const preimage = JSON.stringify({ role, trigger, scope_project_id, state_revision, evidence: refs });
    const fingerprint = sha12(preimage);
    const roleId = `guide-${roleLower(role)}-${fingerprint}`;
    const state = rolePinState(roleId);
    if (state.terminal || state.active) return null;
    const next = state.generation + 1;
    const predecessor = state.generation ? `coordination/guide/pins/${roleId}/G${g(state.generation)}.json` : null;
    return {
      role_id: roleId,
      guide_work_id: roleId,
      role,
      trigger,
      fingerprint,
      scope_project_id,
      state_ref,
      state_revision,
      title,
      mission,
      priority,
      evidence: refs,
      value_class: candidateValueClass({scope_project_id}, 'guide', growthPolicy),
      state: state.generation ? 'replaceable' : 'ready',
      generation: state.generation,
      next_generation: next,
      claim_mode: 'GUIDE_ROLE_PIN_CREATE',
      claim_path: `coordination/guide/pins/${roleId}/G${g(next)}.json`,
      claim_payload_shape: {
        schema: 'prometeo.guide-role-pin/v1',
        pin_id: `pin-${roleId}-G${g(next)}-<worker_id>`,
        guide_work_id: roleId,
        role,
        trigger,
        scope_project_id,
        state_ref,
        state_revision,
        generation: next,
        worker_id: '<worker_id>',
        claim_id: `claim-${roleId}-G${g(next)}-<worker_id>`,
        claimed_at: '<now_iso>',
        expires_at: '<now_plus_10m_iso>',
        source_head: feed.source_sha || '<allocator_source_sha>',
        evidence: refs,
        predecessor_pin_ref_or_null: predecessor
      },
      post_claim_validate: true
    };
  };

  const roleReady = [];
  if (projectGuideMesh && portfolio?.projects && projectGuideStates) {
    const minFrontier = Number(projectGuideMesh.frontier_min_per_project || 2);
    const maxProjectGuides = Number(projectGuideMesh.max_project_guides_ready || 10);
    const infra = new Set(arr(projectGuideMesh.infrastructure_projects));
    const readyByProject = new Map();
    for (const item of ready) {
      if (!item.project_id) continue;
      readyByProject.set(item.project_id, (readyByProject.get(item.project_id) || 0) + 1);
    }
    const workingByProject = new Map();
    for (const job of jobs) {
      if (!job.project_id || !['working','suspect','partial'].includes(job.state)) continue;
      workingByProject.set(job.project_id, (workingByProject.get(job.project_id) || 0) + 1);
    }
    const stateByProject = new Map(arr(projectGuideStates).map(row => [row.doc?.project_id, row]));
    const projects = arr(portfolio.projects)
      .map(project => {
        const stateRow = stateByProject.get(project.project_id) || null;
        const stateDoc = stateRow?.doc || {};
        const frontierClassification = classifyProjectGuideFrontier(stateDoc, jobs, projectGuideMesh);
        const localReady = frontierClassification.planner_count;
        const localWorking = workingByProject.get(project.project_id) || 0;
        const plannerSuppressed = projectPlannerSuppressedBySourceDebt(stateDoc, projectGuideMesh) ||
          projectPlannerSuppressedByHumanDecision(stateDoc, projectGuideMesh);
        return {
          project,
          stateRow,
          stateDoc,
          localReady,
          localWorking,
          frontierClassification,
          plannerSuppressed,
          gap: Math.max(0, minFrontier - localReady)
        };
      })
      .filter(row => row.gap > 0 && !row.plannerSuppressed)
      .sort((a,b) => {
        const ai=infra.has(a.project.project_id)?1:0, bi=infra.has(b.project.project_id)?1:0;
        if (ai !== bi) return ai - bi;
        return (b.project.priority||0)-(a.project.priority||0) || String(a.project.project_id).localeCompare(String(b.project.project_id));
      })
      .slice(0,maxProjectGuides);

    for (const row of projects) {
      const projectId=row.project.project_id;
      const stateRef=row.stateRow?.path || `coordination/project-guides/${projectId}/STATE.json`;
      const revision=finiteInt(row.stateDoc?.revision,0);
      const refs=uniq([
        `${stateRef}#revision:${revision}`,
        `coordination/portfolio/PORTFOLIO.json#project:${projectId}`,
        ...jobs.filter(job=>job.project_id===projectId && job.state!=='done').sort((a,b)=>(b.priority||0)-(a.priority||0)).slice(0,5).map(roleEvidenceRef)
      ]);
      const target=Number(projectGuideMesh.frontier_target_per_project || 3);
      const label=row.project.label || projectId;
      roleReady.push(candidate({
        role:'GUIDE_PLANNER',
        trigger:'PROJECT_FRONTIER_THIN',
        evidence:refs,
        title:`Guide · ${label}`,
        mission:`Sos el Guide local de ${label}. Cargá sólo ${stateRef} y la evidencia de este candidate. Consumí returns locales, reconciliá el estado y mantené ${minFrontier}–${Number(projectGuideMesh.frontier_max_per_project||5)} trabajos útiles no duplicados (objetivo ${target}). Actualizá STATE.json por CAS incrementando revision/cycle_count y dejando focus, frontier_refs, blockers y last_receipt. Después ejecutá o verificá al menos un trabajo local disponible antes de cerrar. No hagas trabajo de otros proyectos ni control-plane salvo bloqueo directo de este proyecto.`,
        priority:(infra.has(projectId)?145:190)+Math.min(9,Math.floor(Number(row.project.priority||0)/10)),
        allow_parallel_same_role:true,
        scope_project_id:projectId,
        state_ref:stateRef,
        state_revision:revision
      }));
    }
  }

  if (unconsumedReturnRefs.length >= Number(signals.unconsumed_returns_trigger || 3)) {
    roleReady.push(candidate({
      role: 'GUIDE_INTEGRATOR',
      trigger: 'RETURNS_UNCONSUMED',
      evidence: unconsumedReturnRefs,
      title: 'Integrar returns recientes y abrir sus sucesores',
      mission: 'Consumí los returns listados, reconciliá duplicados/conflictos, persistí disposición y materializá todos los sucesores seguros actualmente fundados. Después reentrá al allocator.',
      priority: 170
    }));
  }
  if (genericCompatibleFrontier < targetClaimable && unresolvedEvidence.length && (!overloadGuard || genericStarvationOverride)) {
    roleReady.push(candidate({
      role: 'GUIDE_PLANNER',
      trigger: 'FRONTIER_THIN',
      evidence: uniq([
        ...unresolvedEvidence,
        ...(capabilityPressure.specialized_total ? [capabilityPressureEvidenceRef] : [])
      ]),
      title: `Reponer frontier útil genérica (${genericCompatibleFrontier}/${targetClaimable}; total ${cleanFrontier})`,
      mission: 'Usá los objetivos y pendientes evidenciados para materializar 1–7 trabajos no duplicados de implementación/verificación/integración que aumenten frontier útil para workers genéricos cuando sea posible. Preservá trabajo especializado y unknown como tal: no lo marques ausente ni lo suprimas. Nada de filler ni análisis sin jobs. Después intentá ejecutar o verificar uno.',
      priority: 165
    }));
  }
  const efficiencyNoAllocationReceipts = arr(efficiency?.no_allocation_causes?.recent_receipts)
    .filter(row => {
      if (typeof row === 'string') return true;
      return ![row?.reason, row?.outcome]
        .map(value => String(value || '').trim().toUpperCase())
        .includes('CLAIM_TRANSPORT_BLOCKED');
    })
    .map(row => typeof row === 'string' ? row : row?.ref)
    .filter(Boolean)
    .slice(0, 8);
  const efficiencyNoAllocationCauseRef = Number(efficiency?.no_allocation_causes?.recent_total || 0) > 0
    ? 'gh-pages:live/efficiency.json#no_allocation_causes'
    : null;
  const efficiencyRegressionEvidence = efficiency.status === 'REGRESSION'
    ? uniq([
        ...(efficiencyNoAllocationCauseRef ? [efficiencyNoAllocationCauseRef] : []),
        ...efficiencyNoAllocationReceipts,
        'coordination/efficiency/RATCHET_BASELINE_V1.json'
      ])
    : [];
  const rescueEvidence = uniq([
    ...efficiencyRegressionEvidence,
    ...recoveryEvidence,
    ...collisionEvidence,
    ...(capabilityPressure.specialized_total && genericCompatibleFrontier < cleanFrontier ? [capabilityPressureEvidenceRef] : []),
    ...(recoveryCapabilityPressure.specialized_total ? [recoveryCapabilityPressureEvidenceRef] : []),
    ...(efficiency.status === 'REGRESSION' ? ['coordination/efficiency/RATCHET_BASELINE_V1.json'] : []),
    ...rescueEligibleNoAlloc.slice(0, 4).map(row => row.path)
  ]);
  if (
    genericRecoveryPressure >= Number(signals.replaceable_trigger || 3) ||
    collisionEvidence.length >= Number(signals.collision_pressure_trigger || 3) ||
    efficiency.status === 'REGRESSION' ||
    rescueEligibleNoAlloc.length >= 3
  ) {
    roleReady.push(candidate({
      role: 'GUIDE_RESCATE',
      trigger: 'LOW_YIELD',
      evidence: rescueEvidence,
      title: 'Rescatar el cuello de producción más multiplicativo',
      mission: 'Encontrá el mecanismo común detrás de recovery/colisiones/no-allocation y cambialo durablemente. Preferí compiler/protocolo/CI sobre reparar workers uno por uno; agregá ratchet si es hot path y dejá verificación acotada.',
      priority: 175
    }));
  }
  if (partialLoop.evidence.length || efficiency.status === 'REGRESSION') {
    const hasPartialLoop = partialLoop.evidence.length > 0;
    roleReady.push(candidate({
      role: 'GUIDE_CRITIC',
      trigger: hasPartialLoop ? 'PARTIAL_LOOP' : 'LOW_YIELD',
      evidence: uniq([...partialLoop.evidence, ...(efficiency.status === 'REGRESSION' ? ['coordination/efficiency/RATCHET_BASELINE_V1.json'] : [])]),
      title: hasPartialLoop ? 'Atacar un loop parcial causal' : 'Atacar una regresión de eficiencia',
      mission: hasPartialLoop
        ? 'Auditá independientemente la cadena no terminal evidenciada. Si el defecto es solucionable, materializá o implementá el repair/verify mínimo; no devuelvas sólo crítica.'
        : 'Auditá la regresión de eficiencia evidenciada y materializá o implementá el repair/verify mínimo; no inventes un PARTIAL_LOOP sin lineage.',
      priority: 160
    }));
  }

  const role_ready = roleReady.filter(Boolean).sort((a, b) => b.priority - a.priority || a.role_id.localeCompare(b.role_id));
  return {
    role_ready,
    metabolism: {
      recent_launches: recentBeacons.length,
      target_claimable: targetClaimable,
      clean_frontier: cleanFrontier,
      clean_frontier_total: cleanFrontier,
      generic_compatible_clean_frontier: genericCompatibleFrontier,
      generic_compatible_frontier: genericCompatibleFrontier,
      capability_pressure: capabilityPressure,
      recovery_total: recovery.length,
      generic_compatible_recovery: genericRecoveryPressure,
      recovery_capability_pressure: recoveryCapabilityPressure,
      overload_guard: overloadGuard,
      generic_starvation_override: genericStarvationOverride,
      young_active: youngActive,
      unconsumed_returns: unconsumedReturnRefs.length,
      recent_no_allocation: recentNoAlloc.length,
      rescue_eligible_recent_no_allocation: rescueEligibleNoAlloc.length,
      explicit_transport_blocked_recent_no_allocation: explicitTransportBlockedNoAlloc.length,
      partial_loop_detected: partialLoop.evidence.length > 0,
      partial_loop_kind: partialLoop.kind,
      partial_loop_return_count: partialLoop.return_count
    }
  };
}

export function buildFastAllocator(feed = {}, efficiency = {}, { recoveryPolicies = [], roleContext = null } = {}) {
  const growthPolicy = roleContext?.growthPolicy || {};
  const jobs = arr(feed.projects).flatMap(project => arr(project.jobs).map(job => ({ ...job, project_label: project.label })));
  const policyByJob = new Map(arr(recoveryPolicies).filter(Boolean).map(policy => [policy.job_id, policy]));
  const semantic = job => normalizeRecoveryPolicy(job, policyByJob.get(job.job_id));
  const byPriority = (a, b) => (b.priority || 0) - (a.priority || 0) || String(a.job_id).localeCompare(String(b.job_id));

  const ready = jobs
    .filter(job => ['ready', 'partial'].includes(job.state))
    .filter(jobCapabilityRouteable)
    .filter(job => authorityBoundaryGate(job).eligible)
    .filter(job => job.state !== 'partial' || recoveryBasisGate(job).eligible)
    .filter(job => {
      const semantics = semantic(job);
      if (semantics.mode !== 'fixed_generation') return semantics.valid;
      return semantics.valid && finiteInt(job.pin_generation, 0) < semantics.fixed_generation;
    })
    .sort(byPriority)
    .map(job => {
      const semantics = semantic(job);
      return compactPortfolio(feed, semantic, job, semantics.mode === 'fixed_generation' ? semantics.fixed_generation : null, growthPolicy);
    })
    .slice(0, 40);

  const queueReady = arr(feed.plans).flatMap(plan => arr(plan.items)
    .filter(item => item.state === 'ready')
    .map(item => ({
      opportunity_id: item.opportunity_id,
      mission: item.mission,
      value_class: 'SYSTEM_MULTIPLIER',
      priority: item.priority || 0,
      plan_id: plan.id,
      claim_mode: 'OPPORTUNITY_CLAIM_CREATE',
      claim_path: `coordination/opportunities/claims/${item.opportunity_id}.json`,
      claim_payload_shape: {
        schema: 'prometeo.opportunity-claim/v1',
        worker_id: '<worker_id>',
        opportunity_id: item.opportunity_id,
        claimed_at: '<now_iso>'
      },
      post_claim_validate: true
    })))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 30);

  const recovery = jobs
    .filter(job => job.state === 'replaceable')
    .filter(jobCapabilityRouteable)
    .filter(job => semantic(job).valid && semantic(job).ordinary_next_generation_eligible)
    .filter(job => authorityBoundaryGate(job).eligible)
    .filter(job => recoveryBasisGate(job).eligible)
    .sort(byPriority)
    .map(job => compactPortfolio(feed, semantic, job, null, growthPolicy))
    .slice(0, 30);

  const capabilityAttention = jobs
    .filter(job => job.state !== 'done')
    .map(job => ({ job, model: classifyJobCapabilities(job) }))
    .filter(({ model }) => model.unsupported_legacy_capabilities.length > 0)
    .sort((a, b) => byPriority(a.job, b.job))
    .map(({ job, model }) => ({
      job_id: job.job_id,
      dedupe_key: job.dedupe_key || null,
      project_id: job.project_id || null,
      project_label: job.project_label || null,
      title: job.title || job.job_id,
      source_path: job.source_path || null,
      legacy_capability_required: model.legacy_capability_values,
      normalized_required_capabilities: model.required_capabilities,
      unsupported_legacy_capabilities: model.unsupported_legacy_capabilities,
      priority: job.priority || 0,
      state: job.state,
      reason: 'UNSUPPORTED_LEGACY_CAPABILITY_REQUIRED',
      route: 'CAPABILITY_TAXONOMY_ATTENTION',
      ordinary_claim_eligible: false
    }))
    .slice(0, 30);

  const recoveryAttention = jobs
    .filter(jobCapabilityRouteable)
    .filter(job => ['replaceable', 'partial'].includes(job.state))
    .filter(job => semantic(job).valid && semantic(job).ordinary_next_generation_eligible)
    .map(job => ({ job, gate: combinedRecoveryGate(job) }))
    .filter(({ gate }) => !gate.eligible)
    .sort((a, b) => byPriority(a.job, b.job))
    .map(({ job, gate }) => ({
      job_id: job.job_id,
      dedupe_key: job.dedupe_key || null,
      project_id: job.project_id || null,
      project_label: job.project_label || null,
      title: job.title || job.job_id,
      source_path: job.source_path || null,
      required_capabilities: jobRequiredCapabilities(job),
      priority: job.priority || 0,
      state: job.state,
      pin_generation: finiteInt(job.pin_generation, 0),
      latest_return: job.latest_return || null,
      reason: gate.reason,
      recovery_basis: gate.basis || null,
      source_debt: gate.gate_kind === 'source_debt' ? (gate.source_debt || null) : null,
      authority_gate: gate.gate_kind === 'authority' ? gate : (gate.authority_gate || null),
      ordinary_next_generation_eligible: false
    }))
    .slice(0, 30);

  const fixedAttentionResolved = (job, semantics) => {
    const gate = semantics.attention_until;
    if (!gate) return job.state === 'done';
    if (gate.metric === 'collision_count' && Number.isFinite(Number(gate.gte))) {
      return job.state === 'done' && finiteInt(job.collision_count, 0) >= Number(gate.gte);
    }
    return false;
  };

  const fixedGenerationAttention = jobs
    .filter(jobCapabilityRouteable)
    .map(job => ({ job, semantics: semantic(job) }))
    .filter(({ job, semantics }) => semantics.mode === 'fixed_generation' && semantics.valid && finiteInt(job.pin_generation, 0) >= semantics.fixed_generation && !fixedAttentionResolved(job, semantics))
    .sort((a, b) => byPriority(a.job, b.job))
    .map(({ job, semantics }) => ({
      job_id: job.job_id,
      dedupe_key: job.dedupe_key || null,
      project_id: job.project_id || null,
      project_label: job.project_label || null,
      title: job.title || job.job_id,
      priority: job.priority || 0,
      state: job.state,
      pin_generation: finiteInt(job.pin_generation, 0),
      fixed_generation: semantics.fixed_generation,
      collision_count: finiteInt(job.collision_count, 0),
      latest_return: job.latest_return || null,
      route: semantics.attention_route,
      attention_until: semantics.attention_until,
      reason: semantics.reason,
      ordinary_next_generation_eligible: false
    }))
    .slice(0, 30);

  const invalidRecoveryPolicies = jobs
    .map(job => ({ job_id: job.job_id, policy: semantic(job) }))
    .filter(row => !row.policy.valid);

  const roles = compileRoleFrontier(feed, efficiency, jobs, ready, queueReady, recovery, roleContext);

  const batchCandidates = [];
  const meshInfra = new Set(arr(roleContext?.projectGuideMesh?.infrastructure_projects));
  const isInfraCandidate = item => {
    const pid = item?.project_id || item?.scope_project_id || null;
    return pid ? meshInfra.has(pid) : false;
  };
  const pushBatch = (lane, items) => {
    for (const item of arr(items)) batchCandidates.push({ lane, ...item });
  };
  const productReady = ready.filter(item => !isInfraCandidate(item));
  const productQueue = queueReady.filter(item => !isInfraCandidate(item));
  const productRoles = roles.role_ready.filter(item => !isInfraCandidate(item));
  const infraReady = ready.filter(isInfraCandidate);
  const infraRoles = roles.role_ready.filter(isInfraCandidate);
  pushBatch('ready', productReady);
  pushBatch('queue_ready', productQueue);
  pushBatch('role_ready', productRoles);
  if (batchCandidates.length < 8) pushBatch('recovery', recovery.filter(item => !isInfraCandidate(item)).slice(0, Math.max(0, 8 - batchCandidates.length)));
  if (batchCandidates.length < 8) pushBatch('ready', infraReady.slice(0, Math.max(0, 8 - batchCandidates.length)));
  if (batchCandidates.length < 8) pushBatch('role_ready', infraRoles.slice(0, Math.max(0, 8 - batchCandidates.length)));

  return {
    schema: 'prometeo.fast-allocator/v3',
    generated_at: feed.generated_at,
    source_sha: feed.source_sha || null,
    truth_boundary: 'COMPILED_EXECUTION_PLUS_LATENT_ROLE_FRONTIER',
    max_recovery_snapshot_age_seconds: 90,
    preferred_order: ['ready', 'queue_ready', 'role_ready', 'recovery'],
    batch_strategy: 'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD',
    batch_candidates: batchCandidates.slice(0, 40),
    counts: {
      ready: ready.length,
      queue_ready: queueReady.length,
      role_ready: roles.role_ready.length,
      recovery: recovery.length,
      recovery_attention: recoveryAttention.length,
      capability_attention: capabilityAttention.length,
      fixed_generation_attention: fixedGenerationAttention.length
    },
    ready,
    queue_ready: queueReady,
    role_ready: roles.role_ready,
    recovery,
    recovery_attention: recoveryAttention,
    capability_attention: capabilityAttention,
    fixed_generation_attention: fixedGenerationAttention,
    metabolism: roles.metabolism,
    worker_projection: feed.summary?.workers || {},
    efficiency: {
      status: efficiency.status,
      metrics: efficiency.metrics,
      reasons: efficiency.reasons,
      no_allocation_causes: efficiency.no_allocation_causes || null
    },
    diagnostics: {
      ...(feed.diagnostics || {}),
      invalid_recovery_policies: invalidRecoveryPolicies,
      unsupported_legacy_capability_required: capabilityAttention
    }
  };
}

export function loadRecoveryPolicies(root = '.') {
  const dir = path.join(root, 'coordination', 'portfolio', 'recovery-policies');
  if (!fs.existsSync(dir)) return [];
  const policies = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.json')) continue;
    const file = path.join(dir, ent.name);
    try {
      const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (doc?.job_id) policies.push(doc);
    } catch {
      policies.push({ job_id: `INVALID:${ent.name}`, mode: 'fixed_generation', fixed_generation: 0, reason: 'INVALID_POLICY_JSON' });
    }
  }
  return policies;
}

function loadJsonRows(root, rel) {
  const base = path.join(root, rel);
  if (!fs.existsSync(base)) return [];
  const rows = [];
  const visit = (dir, relDir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, ent.name);
      const relPath = path.posix.join(relDir, ent.name);
      if (ent.isDirectory()) visit(file, relPath);
      else if (ent.name.endsWith('.json')) {
        try { rows.push({ path: relPath, doc: JSON.parse(fs.readFileSync(file, 'utf8')) }); } catch {}
      }
    }
  };
  visit(base, rel);
  return rows;
}

export function loadRoleContext(root = '.') {
  const metabolismPath = path.join(root, 'coordination', 'guide', 'METABOLISM_POLICY_V1.json');
  if (!fs.existsSync(metabolismPath)) return null;
  return {
    metabolism: JSON.parse(fs.readFileSync(metabolismPath, 'utf8')),
    projectGuideMesh: fs.existsSync(path.join(root, 'coordination', 'guide', 'PROJECT_GUIDE_MESH_V1.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'coordination', 'guide', 'PROJECT_GUIDE_MESH_V1.json'), 'utf8')) : null,
    projectGuideStates: loadJsonRows(root, 'coordination/project-guides').filter(row => row.path.endsWith('/STATE.json')),
    portfolio: fs.existsSync(path.join(root, 'coordination', 'portfolio', 'PORTFOLIO.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'coordination', 'portfolio', 'PORTFOLIO.json'), 'utf8')) : null,
    guideReceipts: loadJsonRows(root, 'coordination/guide/receipts'),
    guidePins: loadJsonRows(root, 'coordination/guide/pins'),
    heartbeats: loadJsonRows(root, 'coordination/workers/heartbeats'),
    beacons: loadJsonRows(root, 'coordination/workers/beacons'),
    noAlloc: loadJsonRows(root, 'coordination/workers/no-allocation'),
    growthPolicy: fs.existsSync(path.join(root, 'coordination', 'workers', 'WORKER_GROWTH_POLICY_V1.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'coordination', 'workers', 'WORKER_GROWTH_POLICY_V1.json'), 'utf8')) : null
  };
}

export function runCli(argv = process.argv.slice(2)) {
  const [feedPath, efficiencyPath, outPath, root = '.'] = argv;
  if (!feedPath || !efficiencyPath || !outPath) {
    throw new Error('usage: build-fast-allocator.mjs <feed.json> <efficiency.json> <allocator.json> [repo-root]');
  }
  const feed = JSON.parse(fs.readFileSync(feedPath, 'utf8'));
  const efficiency = JSON.parse(fs.readFileSync(efficiencyPath, 'utf8'));
  const recoveryPolicies = loadRecoveryPolicies(root);
  const roleContext = loadRoleContext(root);
  const allocator = buildFastAllocator(feed, efficiency, { recoveryPolicies, roleContext });
  fs.writeFileSync(outPath, `${JSON.stringify(allocator, null, 2)}\n`);
  process.stdout.write(`allocator ${allocator.schema} ready=${allocator.counts.ready} queue=${allocator.counts.queue_ready} roles=${allocator.counts.role_ready} recovery=${allocator.counts.recovery}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
  }
}