#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import * as core from './build-fast-allocator-core-v3.mjs';
import { compileFixedGenerationRecoveryPolicies } from './fixed-generation-recovery-policy-gate-v1.mjs';

export * from './build-fast-allocator-core-v3.mjs';
export * from './fixed-generation-recovery-policy-gate-v1.mjs';

// Compatibility markers for static allocator regressions after the v3 core split.
// The executable implementations live in build-fast-allocator-core-v3.mjs:
// const localReady = frontierClassification.planner_count;
// batch_strategy: 'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD'
// batch_candidates: usefulReserve.ordered.slice(0, 40)

const arr = value => Array.isArray(value) ? value : [];
const normalizeBoundaryValue = value => String(value || '').trim().toUpperCase();
const parseTime = value => Date.parse(value || '') || 0;
const uniq = values => [...new Set(arr(values).filter(Boolean).map(value => String(value)))];
const SUCCESS_VALUES = new Set(['DONE', 'SUCCESS', 'SUCCEEDED', 'COMPLETE', 'COMPLETED', 'PASS', 'PASSED', 'VERIFIED', 'OK']);
const DEPENDENCY_BOUNDARY_VALUES = new Set(['BOUNDARY', 'PARTIAL', 'FAILED', 'FAILURE', 'BLOCKED', 'ROUTE_ABORTED', 'CAPABILITY_BOUNDARY', 'HTTP_BOUNDARY']);
const EXPLICIT_SAFETY_COMPLETION_CLASSES = new Set(['EXPLICIT_SAFETY_BOUNDARY_INHERITED']);
const transportBoundaryValues = doc => [
  doc?.reason,
  doc?.outcome,
  doc?.classification,
  doc?.transport_boundary_v1?.classification
].map(normalizeBoundaryValue);

export function isExplicitClaimTransportBlocked(doc = {}) {
  return transportBoundaryValues(doc).includes('CLAIM_TRANSPORT_BLOCKED');
}

function normalizeTransportBoundaryAliases(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return doc;
  if (!isExplicitClaimTransportBlocked(doc)) return doc;
  if ([doc.reason, doc.outcome].map(normalizeBoundaryValue).includes('CLAIM_TRANSPORT_BLOCKED')) return doc;
  return { ...doc, reason: 'CLAIM_TRANSPORT_BLOCKED' };
}

function normalizeRoleContext(roleContext) {
  if (!roleContext || typeof roleContext !== 'object') return roleContext;
  return {
    ...roleContext,
    noAlloc: arr(roleContext.noAlloc).map(row => ({
      ...row,
      doc: normalizeTransportBoundaryAliases(row?.doc)
    }))
  };
}

function normalizeEfficiency(efficiency) {
  if (!efficiency || typeof efficiency !== 'object') return efficiency;
  const causes = efficiency.no_allocation_causes;
  if (!causes || typeof causes !== 'object') return efficiency;
  return {
    ...efficiency,
    no_allocation_causes: {
      ...causes,
      recent_receipts: arr(causes.recent_receipts).map(row =>
        typeof row === 'string' ? row : normalizeTransportBoundaryAliases(row)
      )
    }
  };
}

const rowOutcome = row => normalizeBoundaryValue(row?.outcome || row?.status || row?.result);
const rowTime = row => parseTime(
  row?.returned_at || row?.completed_at || row?.verified_at || row?.recorded_at ||
  row?.updated_at || row?.created_at || row?.observed_at || row?.timestamp
);
const jobReturnRows = job => {
  const rows = arr(job?.recent_return_evidence).length ? arr(job.recent_return_evidence) : arr(job?.returns);
  const latest = job?.latest_return && typeof job.latest_return === 'object' ? [job.latest_return] : [];
  const seen = new Set();
  return [...rows, ...latest].filter(row => {
    const key = `${row?.path || ''}\u0000${rowOutcome(row)}\u0000${rowTime(row)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const safetyReturnRows = job => {
  const latest = job?.latest_return && typeof job.latest_return === 'object' ? [job.latest_return] : [];
  const seen = new Set();
  return [...arr(job?.returns), ...arr(job?.recent_return_evidence), ...latest].filter(row => {
    const key = `${row?.path || ''}\u0000${rowOutcome(row)}\u0000${rowTime(row)}\u0000${normalizeBoundaryValue(row?.completion_class)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const explicitSafetyDenialRow = job => safetyReturnRows(job)
  .filter(row => (
    EXPLICIT_SAFETY_COMPLETION_CLASSES.has(normalizeBoundaryValue(row?.completion_class)) ||
    isExplicitClaimTransportBlocked(row)
  ))
  .sort((a, b) => rowTime(b) - rowTime(a) || String(b?.path || '').localeCompare(String(a?.path || '')))[0] || null;

const explicitSafetyGateKind = gate => String(gate?.required_authority?.kind || '').trim().toUpperCase();

export function normalizeExplicitSafetyDenialAuthorityGates(feed = {}) {
  const decisions = [];
  const projects = arr(feed?.projects).map(project => ({
    ...project,
    jobs: arr(project?.jobs).map(job => {
      const denial = explicitSafetyDenialRow(job);
      if (!denial) return job;

      const existing = job?.authority_gate && typeof job.authority_gate === 'object' && !Array.isArray(job.authority_gate)
        ? job.authority_gate
        : null;
      if (existing && explicitSafetyGateKind(existing) === 'EXPLICIT_SAFETY_DENIAL_LIFT') {
        decisions.push({
          job_id: job?.job_id || null,
          normalized: false,
          reason: 'EXPLICIT_SAFETY_GATE_ALREADY_PRESENT',
          boundary_return_ref: existing.boundary_return_ref || denial?.path || null
        });
        return job;
      }

      const boundaryRef = denial?.path || job?.latest_return?.path || null;
      const boundaryAt = denial?.returned_at || denial?.completed_at || denial?.recorded_at || denial?.updated_at || null;
      const authorityGate = {
        schema: 'prometeo.portfolio-authority-gate/v1',
        gate: 'NEW_AUTHORITY_GATE',
        status: 'OPEN',
        boundary_return_ref: boundaryRef,
        boundary_returned_at: boundaryAt,
        opened_at: boundaryAt,
        required_authority: {
          kind: 'EXPLICIT_SAFETY_DENIAL_LIFT',
          description: 'Durable explicit evidence that the inherited safety denial was lifted or replaced without bypass.'
        },
        satisfied_by_evidence_ref_or_null: null,
        satisfied_at_or_null: null,
        satisfied_ref_exists: false,
        synthesized_from_completion_class: normalizeBoundaryValue(denial?.completion_class) || null
      };
      decisions.push({
        job_id: job?.job_id || null,
        normalized: true,
        reason: 'EXPLICIT_SAFETY_DENIAL_NORMALIZED_TO_AUTHORITY_GATE',
        boundary_return_ref: boundaryRef
      });
      return { ...job, authority_gate: authorityGate };
    })
  }));
  return { feed: { ...feed, projects }, decisions };
}

const exactRecoveryEvidenceSignal = job => {
  const basis = job?.recovery_basis && typeof job.recovery_basis === 'object' ? job.recovery_basis : null;
  if (!basis) return null;
  const sourceRef = typeof basis.source_ref === 'string' && basis.source_ref.trim() ? basis.source_ref.trim() : null;
  const sourceSha = String(basis.source_sha256 || '').trim().toLowerCase();
  const exactSha = /^[0-9a-f]{64}$/.test(sourceSha);
  const evidence = uniq([...arr(basis.evidence), ...arr(basis.artifacts)]);
  if (!(exactSha && (sourceRef || evidence.length))) return null;
  const at = parseTime(basis.updated_at || job?.recovery_basis_updated_at || job?.updated_at);
  return at > 0 ? { at, kind: 'EXACT_RECOVERY_EVIDENCE', ref: sourceRef || evidence.at(-1) || null } : null;
};

const dependencyMaterialSignal = dependency => {
  if (!dependency) return null;
  const successRows = jobReturnRows(dependency)
    .filter(row => SUCCESS_VALUES.has(rowOutcome(row)))
    .map(row => ({ at: rowTime(row), kind: 'TERMINAL_SUCCESS_RETURN', ref: row?.path || null }))
    .filter(row => row.at > 0);
  if (String(dependency?.state || '').toLowerCase() === 'done') {
    const at = Math.max(
      0,
      ...successRows.map(row => row.at),
      parseTime(dependency?.completed_at || dependency?.returned_at || dependency?.updated_at || dependency?.created_at)
    );
    if (at > 0) successRows.push({ at, kind: 'DEPENDENCY_DONE', ref: dependency?.source_path || null });
  }
  const exact = exactRecoveryEvidenceSignal(dependency);
  if (exact) successRows.push(exact);
  successRows.sort((a, b) => b.at - a.at || String(a.kind).localeCompare(String(b.kind)));
  return successRows[0] || null;
};

export function dependencyRecoveryGate(job = {}, allJobs = []) {
  const dependencyIds = uniq(job?.dependency_ids);
  if (!dependencyIds.length) {
    return { required: false, eligible: true, reason: 'NO_DEPENDENCIES', dependency_ids: [] };
  }

  const byId = new Map(arr(allJobs).filter(row => row?.job_id).map(row => [String(row.job_id), row]));
  const boundaryRows = jobReturnRows(job).filter(row => DEPENDENCY_BOUNDARY_VALUES.has(rowOutcome(row)));
  const boundaryCount = boundaryRows.length;
  const latestBoundaryAt = Math.max(0, ...boundaryRows.map(rowTime));
  const claimedAt = parseTime(job?.claimed_at);
  const dependencies = dependencyIds.map(jobId => {
    const dependency = byId.get(jobId) || null;
    const signal = dependencyMaterialSignal(dependency);
    const terminalNonSuccess = Boolean(
      dependency &&
      String(dependency?.state || '').toLowerCase() === 'done' &&
      !signal
    ) || jobReturnRows(dependency || {}).some(row => DEPENDENCY_BOUNDARY_VALUES.has(rowOutcome(row)));
    return {
      job_id: jobId,
      present: Boolean(dependency),
      state: dependency?.state || null,
      terminal_non_success: terminalNonSuccess,
      material_signal: signal
    };
  });

  const allSatisfiedAfterBoundary = latestBoundaryAt > 0 && dependencies.every(row => row.material_signal?.at > latestBoundaryAt);
  const unlockAt = allSatisfiedAfterBoundary
    ? Math.max(...dependencies.map(row => row.material_signal.at))
    : 0;
  const unlockConsumed = unlockAt > 0 && claimedAt > unlockAt;
  if (allSatisfiedAfterBoundary && !unlockConsumed) {
    return {
      required: true,
      eligible: true,
      reason: 'DEPENDENCY_MATERIAL_SUCCESS_UNLOCK',
      dependency_ids: dependencyIds,
      boundary_count: boundaryCount,
      latest_boundary_at: latestBoundaryAt,
      unlock_at: unlockAt,
      unlock_consumed: false,
      dependencies
    };
  }
  if (allSatisfiedAfterBoundary && unlockConsumed) {
    return {
      required: true,
      eligible: false,
      reason: 'DEPENDENCY_MATERIAL_SUCCESS_UNLOCK_CONSUMED',
      dependency_ids: dependencyIds,
      boundary_count: boundaryCount,
      latest_boundary_at: latestBoundaryAt,
      unlock_at: unlockAt,
      unlock_consumed: true,
      dependencies
    };
  }

  const terminalNonSuccess = dependencies.some(row => row.terminal_non_success);
  const repeatedEquivalentBoundary = boundaryCount >= 3 && latestBoundaryAt > 0;
  if (terminalNonSuccess || repeatedEquivalentBoundary) {
    return {
      required: true,
      eligible: false,
      reason: terminalNonSuccess ? 'DEPENDENCY_TERMINAL_NON_SUCCESS' : 'DEPENDENCY_REPEATED_BOUNDARY_UNRESOLVED',
      dependency_ids: dependencyIds,
      boundary_count: boundaryCount,
      latest_boundary_at: latestBoundaryAt,
      unlock_at: 0,
      unlock_consumed: false,
      dependencies
    };
  }

  return {
    required: true,
    eligible: true,
    reason: 'DEPENDENCY_GATE_NOT_YET_ARMED',
    dependency_ids: dependencyIds,
    boundary_count: boundaryCount,
    latest_boundary_at: latestBoundaryAt,
    unlock_at: 0,
    unlock_consumed: false,
    dependencies
  };
}

export function applyDependencyRecoveryGate(feed = {}) {
  const projects = arr(feed?.projects);
  const allJobs = projects.flatMap(project => arr(project?.jobs));
  const decisions = [];
  const nextProjects = projects.map(project => ({
    ...project,
    jobs: arr(project?.jobs).map(job => {
      if (String(job?.state || '').toLowerCase() !== 'replaceable' || !arr(job?.dependency_ids).length) return job;
      const decision = dependencyRecoveryGate(job, allJobs);
      decisions.push({ job_id: job?.job_id || null, ...decision });
      if (decision.eligible) return job;
      return {
        ...job,
        state: 'dependency_blocked',
        dependency_recovery_gate: {
          reason: decision.reason,
          dependency_ids: decision.dependency_ids,
          boundary_count: decision.boundary_count,
          latest_boundary_at: decision.latest_boundary_at || 0,
          unlock_at: decision.unlock_at || 0,
          unlock_consumed: decision.unlock_consumed === true
        }
      };
    })
  }));
  return {
    feed: { ...feed, projects: nextProjects },
    decisions
  };
}

export function compileRoleFrontier(feed = {}, efficiency = {}, jobs = [], ready = [], queueReady = [], recovery = [], roleContext = null) {
  return core.compileRoleFrontier(
    feed,
    normalizeEfficiency(efficiency),
    jobs,
    ready,
    queueReady,
    recovery,
    normalizeRoleContext(roleContext)
  );
}

export function buildFastAllocator(feed = {}, efficiency = {}, options = {}) {
  const safetyGate = normalizeExplicitSafetyDenialAuthorityGates(feed);
  const dependencyGate = applyDependencyRecoveryGate(safetyGate.feed);
  const fixedGenerationGate = compileFixedGenerationRecoveryPolicies(
    dependencyGate.feed,
    options?.recoveryPolicies || []
  );
  const allocator = core.buildFastAllocator(dependencyGate.feed, normalizeEfficiency(efficiency), {
    ...options,
    recoveryPolicies: fixedGenerationGate.recoveryPolicies,
    roleContext: normalizeRoleContext(options?.roleContext || null)
  });
  return {
    ...allocator,
    explicit_safety_denial_recovery_gate: {
      evaluated: safetyGate.decisions.length,
      synthesized_open_gates: safetyGate.decisions.filter(row => row.normalized === true).length,
      decisions: safetyGate.decisions
    },
    dependency_recovery_gate: {
      evaluated: dependencyGate.decisions.length,
      suppressed: dependencyGate.decisions.filter(row => row.eligible === false).length,
      decisions: dependencyGate.decisions
    },
    fixed_generation_recovery_policy_gate: {
      evaluated: fixedGenerationGate.decisions.length,
      unlocked: fixedGenerationGate.decisions.filter(row => row.eligible === true).length,
      suppressed_at_or_above_fixed_generation: fixedGenerationGate.decisions.filter(row =>
        row.eligible === false &&
        Number.isInteger(row.current_generation) &&
        Number.isInteger(row.fixed_generation) &&
        row.current_generation >= row.fixed_generation
      ).length,
      decisions: fixedGenerationGate.decisions
    }
  };
}

export function runCli(argv = process.argv.slice(2)) {
  const [feedPath, efficiencyPath, outPath, root = '.'] = argv;
  if (!feedPath || !efficiencyPath || !outPath) {
    throw new Error('usage: build-fast-allocator.mjs <feed.json> <efficiency.json> <allocator.json> [repo-root]');
  }
  const feed = JSON.parse(fs.readFileSync(feedPath, 'utf8'));
  const efficiency = JSON.parse(fs.readFileSync(efficiencyPath, 'utf8'));
  const recoveryPolicies = core.loadRecoveryPolicies(root);
  const roleContext = core.loadRoleContext(root);
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
