import { evaluateSuccessorClaim, attemptAtomicSuccessorClaim } from './multi-stage-worker-continuation.mjs';

const arr = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();

function candidateKeys(candidate = {}) {
  return new Set([
    candidate.job_id,
    candidate.work_id,
    candidate.lane,
    candidate.block_id,
    candidate.opportunity_id
  ].map(text).filter(Boolean));
}

function successorKeys(successor = {}) {
  return new Set([
    successor.opportunity_id,
    successor.job_id,
    successor.work_id,
    successor.lane,
    successor.block_id
  ].map(text).filter(Boolean));
}

function exactMatch(requested, rows, keyFn) {
  return rows.find(row => keyFn(row).has(requested)) || null;
}

export function resolveMaterialReturnConsumerReentry({
  close = {},
  allocator_candidates = [],
  successor_opportunities = [],
  current = {},
  claims = []
} = {}) {
  if (text(close?.status).toUpperCase() !== 'CONTINUE') {
    return {
      schema: 'prometeo.material-return-consumer-reentry/v1',
      decision: 'NO_REENTRY_TERMINAL',
      requested: [],
      allocator_matches: [],
      successor_matches: [],
      unresolved: [],
      authority: 'EXISTING_PATHS_ONLY_NO_NEW_AUTHORITY'
    };
  }

  const requested = [...new Set(arr(close?.continuity_request).map(text).filter(Boolean))].sort();
  const allocatorMatches = [];
  const successorMatches = [];
  const unresolved = [];

  for (const lane of requested) {
    const candidate = exactMatch(lane, arr(allocator_candidates), candidateKeys);
    if (candidate) {
      allocatorMatches.push({
        requested: lane,
        job_id: candidate.job_id ?? null,
        work_id: candidate.work_id ?? null,
        claim_path: candidate.claim_path ?? null,
        claim_mode: candidate.claim_mode ?? null,
        source_path: candidate.source_path ?? null,
        required_capabilities: arr(candidate.required_capabilities)
      });
      continue;
    }

    const successor = exactMatch(lane, arr(successor_opportunities), successorKeys);
    if (successor) {
      const evaluation = evaluateSuccessorClaim({ current, successor, claims });
      if (evaluation.decision === 'ATTEMPT_ATOMIC_CLAIM') {
        successorMatches.push({ requested: lane, successor, evaluation });
      } else {
        unresolved.push({ requested: lane, reason: 'SUCCESSOR_NOT_ATOMICALLY_CLAIMABLE', evaluation });
      }
      continue;
    }

    unresolved.push({ requested: lane, reason: 'NO_EXISTING_ALLOCATOR_OR_SUCCESSOR_MATCH' });
  }

  let decision = 'DURABLE_BOUNDARY_REQUIRED';
  if (requested.length === 0) decision = 'NO_REENTRY_REQUESTED';
  else if (unresolved.length === 0 && allocatorMatches.length > 0) decision = 'REENTER_EXISTING_ALLOCATOR';
  else if (unresolved.length === 0 && successorMatches.length > 0) decision = 'ATTEMPT_EXISTING_SUCCESSOR_CLAIMS';

  return {
    schema: 'prometeo.material-return-consumer-reentry/v1',
    decision,
    requested,
    allocator_matches: allocatorMatches,
    successor_matches: successorMatches,
    unresolved,
    authority: 'EXISTING_PATHS_ONLY_NO_NEW_AUTHORITY',
    boundary: decision === 'DURABLE_BOUNDARY_REQUIRED'
      ? { code: 'CONTINUITY_REQUEST_UNRESOLVED', durable: true }
      : null
  };
}

export async function executeMaterialReturnConsumerReentry({
  close = {},
  allocator_candidates = [],
  successor_opportunities = [],
  current = {},
  claims = [],
  worker = {},
  claim_root,
  now,
  source = {}
} = {}) {
  const resolved = resolveMaterialReturnConsumerReentry({
    close,
    allocator_candidates,
    successor_opportunities,
    current,
    claims
  });

  if (resolved.decision !== 'ATTEMPT_EXISTING_SUCCESSOR_CLAIMS') {
    return { ...resolved, claim_receipts: [] };
  }

  const claimReceipts = [];
  for (const match of resolved.successor_matches) {
    const receipt = await attemptAtomicSuccessorClaim({
      current,
      successor: match.successor,
      claims,
      worker,
      claim_root,
      now,
      source
    });
    claimReceipts.push(receipt);
  }

  return {
    ...resolved,
    decision: claimReceipts.every(receipt => receipt.won)
      ? 'SUCCESSOR_CLAIMS_WON'
      : 'REENTER_EXISTING_ALLOCATOR_AFTER_CLAIM_RACE',
    claim_receipts: claimReceipts
  };
}
