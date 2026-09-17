#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  allocateRoleAndOpportunity,
  scoreOpportunity,
  UNIVERSAL_WORKER_ROLES
} from './universal-cognitive-worker-lib.mjs';

const ACTIVE_STATES = new Set(['CLAIMED', 'STARTED', 'EXECUTING', 'WRITING', 'INTEGRATING']);
const FALLBACK_ROLES = new Set(['DISCOVER', 'CONTEXT_COMPILE', 'COMPACT']);

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function bool(value) {
  return value === true;
}

function activeClaimedIds(claims = []) {
  return new Set(arr(claims)
    .filter(claim => claim && ACTIVE_STATES.has(String(claim.state || '').toUpperCase()))
    .map(claim => claim.opportunity_id)
    .filter(Boolean));
}

function normalizeRecoveryCandidate(candidate = {}, claimed = new Set()) {
  const opportunityId = candidate.opportunity_id || candidate.original_opportunity_id;
  const reasons = [];
  if (!opportunityId) reasons.push('MISSING_OPPORTUNITY_ID');
  if (!bool(candidate.recovery_eligible ?? candidate.eligible)) reasons.push('NOT_RECOVERY_ELIGIBLE');
  if (candidate.retry_safe === false) reasons.push('RETRY_UNSAFE');
  if (candidate.return_exists === true) reasons.push('RETURN_ALREADY_EXISTS');
  if (candidate.newer_signal_exists === true) reasons.push('NEWER_SIGNAL_EXISTS');
  if (candidate.live_write_collision === true) reasons.push('LIVE_WRITE_COLLISION');
  if (opportunityId && claimed.has(opportunityId) && candidate.original_claim_active !== true) {
    reasons.push('ACTIVE_NONRECOVERY_CLAIM');
  }
  if (reasons.length > 0) return {eligible: false, opportunity_id: opportunityId || null, reasons};

  const priority = finite(candidate.priority ?? candidate.original_priority, 0);
  const ageMinutes = finite(candidate.age_minutes, 30);
  const urgencyBonus = Math.max(0, Math.min(999, Math.floor(ageMinutes - 30)));
  const synthetic = {
    opportunity_id: opportunityId,
    type: 'RECOVERY',
    priority,
    unblock_value: finite(candidate.unblock_value),
    compounding_value: finite(candidate.compounding_value),
    information_gain: finite(candidate.information_gain),
    collision_risk: finite(candidate.collision_risk),
    human_friction: finite(candidate.human_friction)
  };
  return {
    eligible: true,
    opportunity_id: opportunityId,
    role: 'RECOVER',
    score: scoreOpportunity(synthetic) + urgencyBonus,
    claim_mode: 'APPEND_ONLY_RECOVERY_CLAIM',
    recovery_attempt_mode: candidate.recovery_attempt_mode || candidate.write_mode || 'ISOLATED_CANDIDATE',
    source: candidate
  };
}

function fallbackDecision(signals = {}) {
  if (bool(signals.context_compile_required) && bool(signals.context_compile_authorized)) {
    return {
      role: 'CONTEXT_COMPILE',
      action: 'COMPILE_CONTEXT',
      claim_mode: 'SCOPED_LOCAL_RECEIPT',
      reason: 'CONTEXT_QUALITY_BLOCKS_SAFE_ALLOCATION'
    };
  }
  if (bool(signals.compact_required) && bool(signals.compact_authorized)) {
    return {
      role: 'COMPACT',
      action: 'COMPACT_DURABLE_CONTEXT',
      claim_mode: 'SCOPED_LOCAL_RECEIPT',
      reason: 'CONTEXT_DEBT_IS_CURRENT_BOTTLENECK'
    };
  }
  if (bool(signals.discovery_authorized)) {
    return {
      role: 'DISCOVER',
      action: 'DISCOVER_AND_PIN_PROPOSAL',
      claim_mode: 'CREATE_IF_ABSENT_PROPOSAL_FINGERPRINT',
      reason: 'PREPARED_AND_RECOVERY_FRONTIERS_EXHAUSTED'
    };
  }
  return null;
}

export function decideUniversalWorkerAction(snapshot = {}) {
  const opportunities = arr(snapshot.opportunities);
  const claims = arr(snapshot.claims);
  const activeWriters = arr(snapshot.active_writers ?? snapshot.activeWriters);
  const worker = snapshot.worker || {};
  const claimed = activeClaimedIds(claims);

  const prepared = allocateRoleAndOpportunity({opportunities, claims, activeWriters, worker});
  const recoveries = arr(snapshot.recovery_candidates)
    .map(candidate => normalizeRecoveryCandidate(candidate, claimed));
  const eligibleRecoveries = recoveries
    .filter(candidate => candidate.eligible)
    .sort((a, b) => b.score - a.score || String(a.opportunity_id).localeCompare(String(b.opportunity_id)));

  const preparedCandidate = prepared.selected
    ? {...prepared.selected, source: 'PREPARED_OR_DERIVED_READY'}
    : null;
  const recoveryCandidate = eligibleRecoveries[0]
    ? {...eligibleRecoveries[0], source: 'RECOVERY_ELIGIBLE'}
    : null;

  let decision = null;
  if (preparedCandidate && recoveryCandidate) {
    decision = recoveryCandidate.score > preparedCandidate.score ? recoveryCandidate : preparedCandidate;
  } else {
    decision = recoveryCandidate || preparedCandidate;
  }

  if (!decision) {
    const fallback = fallbackDecision(snapshot.signals || {});
    if (fallback) decision = {...fallback, opportunity_id: null, score: null, source: 'AUTHORIZED_FALLBACK'};
  }

  if (!decision && bool(snapshot.signals?.discovery_recovery_exhausted)) {
    decision = {
      opportunity_id: null,
      role: null,
      action: 'IDLE_NO_SAFE_USEFUL_WORK',
      claim_mode: 'NONE',
      reason: 'EXHAUSTION_PROVEN',
      score: null,
      source: 'EXHAUSTION_PROOF'
    };
  }

  if (decision?.role && !UNIVERSAL_WORKER_ROLES.includes(decision.role)) {
    throw new Error(`allocator produced unsupported role: ${decision.role}`);
  }
  if (decision?.source === 'AUTHORIZED_FALLBACK' && !FALLBACK_ROLES.has(decision.role)) {
    throw new Error(`fallback role is not authorized by allocator contract: ${decision.role}`);
  }

  return {
    schema: 'prometeo.universal-worker-allocation-decision/v1',
    selected: decision,
    prepared_frontier: prepared,
    recovery_frontier: {
      eligible: eligibleRecoveries.map(({source, ...candidate}) => candidate),
      rejected: recoveries.filter(candidate => !candidate.eligible)
    },
    exhaustion: {
      prepared_selected: Boolean(preparedCandidate),
      recovery_selected: Boolean(recoveryCandidate),
      discovery_authorized: bool(snapshot.signals?.discovery_authorized),
      discovery_recovery_exhausted: bool(snapshot.signals?.discovery_recovery_exhausted)
    },
    invariants: {
      role_is_supported: !decision?.role || UNIVERSAL_WORKER_ROLES.includes(decision.role),
      recovery_is_append_only: decision?.role !== 'RECOVER' || decision.claim_mode === 'APPEND_ONLY_RECOVERY_CLAIM',
      discovery_requires_authorization: decision?.role !== 'DISCOVER' || bool(snapshot.signals?.discovery_authorized) || decision.source === 'PREPARED_OR_DERIVED_READY',
      idle_requires_exhaustion_proof: decision?.action !== 'IDLE_NO_SAFE_USEFUL_WORK' || bool(snapshot.signals?.discovery_recovery_exhausted),
      no_authority_promotion: true
    }
  };
}

function parseArgs(argv) {
  const args = [...argv];
  let pretty = false;
  let inputPath = null;
  for (const arg of args) {
    if (arg === '--pretty') pretty = true;
    else if (arg === '--stdin' || arg === '-') inputPath = '-';
    else if (!arg.startsWith('-') && !inputPath) inputPath = arg;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return {pretty, inputPath: inputPath || '-'};
}

export function runCli(argv = process.argv.slice(2)) {
  const {pretty, inputPath} = parseArgs(argv);
  const raw = inputPath === '-'
    ? fs.readFileSync(0, 'utf8')
    : fs.readFileSync(inputPath, 'utf8');
  const snapshot = JSON.parse(raw);
  const decision = decideUniversalWorkerAction(snapshot);
  process.stdout.write(`${JSON.stringify(decision, null, pretty ? 2 : 0)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
  }
}
