import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ACTIVE_CLAIM_STATES = new Set(['CLAIMED', 'STARTED', 'EXECUTING', 'WRITING', 'INTEGRATING']);
const FORBIDDEN_AUTHORITY_CLASSES = new Set([
  'GLOBAL_PROMOTION',
  'CURRENT_MUTATION',
  'HUMAN_ACCEPTED_MUTATION',
  'SERVED_MUTATION',
  'CURRENT',
  'HUMAN_ACCEPTED',
  'SERVED'
]);

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function upper(value, fallback = '') {
  const normalized = String(value ?? '').trim().toUpperCase();
  return normalized || fallback;
}

function opportunityId(value) {
  const id = String(value ?? '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) {
    throw new Error(`INVALID_OPPORTUNITY_ID:${id || '<empty>'}`);
  }
  return id;
}

export function continuationContext(work = {}) {
  const explicit = String(work.continuation_context ?? work.context_key ?? '').trim();
  if (explicit) return explicit;
  const project = String(work.project_id ?? '').trim();
  const surface = String(work.surface_id ?? '').trim();
  const campaign = String(work.campaign_id ?? '').trim();
  return [project, surface, campaign].filter(Boolean).join('::') || null;
}

export function authorityClass(work = {}) {
  return upper(work.authority_class ?? work.authority, 'SCOPED_CANDIDATE_ONLY');
}

export function readinessEvidence(successor = {}) {
  if (upper(successor.status) === 'READY') {
    return {
      ready: true,
      mode: 'EXPLICIT_READY',
      proof_refs: arr(successor.readiness_proof_refs),
      failed_prerequisites: [],
      conflicted_prerequisites: []
    };
  }

  const derived = successor.derived_readiness;
  if (upper(successor.status) !== 'BLOCKED_DEPENDENCY' || !derived || typeof derived !== 'object') {
    return {ready: false, mode: 'NOT_READY', proof_refs: [], failed_prerequisites: [], conflicted_prerequisites: []};
  }

  const proofRefs = arr(derived.proof_refs).filter(Boolean);
  const failed = arr(derived.failed_prerequisites).filter(Boolean);
  const conflicted = arr(derived.conflicted_prerequisites).filter(Boolean);
  const ready = derived.ready === true && proofRefs.length > 0 && failed.length === 0 && conflicted.length === 0;
  return {
    ready,
    mode: ready ? 'DERIVED_READY' : 'DERIVED_NOT_PROVEN',
    proof_refs: proofRefs,
    failed_prerequisites: failed,
    conflicted_prerequisites: conflicted
  };
}

export function evaluateCheckpointContinuation({run = {}, remaining_checkpoints = []} = {}) {
  const context = continuationContext(run);
  const authority = authorityClass(run);
  const reasons = [];

  if (!context) reasons.push('RUN_CONTINUATION_CONTEXT_MISSING');
  if (FORBIDDEN_AUTHORITY_CLASSES.has(authority)) reasons.push('RUN_AUTHORITY_NOT_WORKER_SAFE');

  for (const [index, checkpoint] of arr(remaining_checkpoints).entries()) {
    const cpContext = continuationContext(checkpoint) || context;
    const cpAuthority = authorityClass(checkpoint);
    if (context && cpContext !== context) reasons.push(`CHECKPOINT_${index}_CONTEXT_SPLIT_REQUIRED`);
    if (cpAuthority !== authority) reasons.push(`CHECKPOINT_${index}_AUTHORITY_SPLIT_REQUIRED`);
    if (FORBIDDEN_AUTHORITY_CLASSES.has(cpAuthority)) reasons.push(`CHECKPOINT_${index}_AUTHORITY_FORBIDDEN`);
  }

  return {
    schema: 'prometeo.multi-stage-checkpoint-decision/v1',
    decision: reasons.length === 0 ? 'CONTINUE_SAME_RUN' : 'SPLIT_OR_BOUNDARY',
    same_context: reasons.every(reason => !reason.includes('CONTEXT')),
    same_authority: reasons.every(reason => !reason.includes('AUTHORITY')),
    context,
    authority_class: authority,
    remaining_checkpoint_count: arr(remaining_checkpoints).length,
    reasons
  };
}

function activeClaimFor(opportunityIdValue, claims = []) {
  return arr(claims).find(claim =>
    claim?.opportunity_id === opportunityIdValue &&
    ACTIVE_CLAIM_STATES.has(upper(claim.state))
  ) || null;
}

export function evaluateSuccessorClaim({current = {}, successor = {}, claims = []} = {}) {
  const id = opportunityId(successor.opportunity_id);
  const reasons = [];
  const currentContext = continuationContext(current);
  const successorContext = continuationContext(successor);
  const currentAuthority = authorityClass(current);
  const successorAuthority = authorityClass(successor);
  const readiness = readinessEvidence(successor);
  const existing = activeClaimFor(id, claims);

  if (!readiness.ready) reasons.push('SUCCESSOR_NOT_READY');
  if (!currentContext || !successorContext) reasons.push('CONTINUATION_CONTEXT_MISSING');
  if (currentContext && successorContext && currentContext !== successorContext) reasons.push('CONTEXT_CHANGED');
  if (currentAuthority !== successorAuthority) reasons.push('AUTHORITY_CHANGED');
  if (FORBIDDEN_AUTHORITY_CLASSES.has(successorAuthority)) reasons.push('AUTHORITY_FORBIDDEN');
  if (existing) reasons.push('SUCCESSOR_ALREADY_CLAIMED');

  return {
    schema: 'prometeo.multi-stage-successor-decision/v1',
    opportunity_id: id,
    decision: reasons.length === 0 ? 'ATTEMPT_ATOMIC_CLAIM' : 'REENTER_ALLOCATION',
    claim_mode: reasons.length === 0 ? 'CREATE_IF_ABSENT_EXCLUSIVE' : null,
    readiness,
    current_context: currentContext,
    successor_context: successorContext,
    current_authority_class: currentAuthority,
    successor_authority_class: successorAuthority,
    existing_claim_ref: existing?.claim_ref ?? existing?.path ?? null,
    reasons
  };
}

export function buildSuccessorClaim({current = {}, successor = {}, worker = {}, now = new Date().toISOString(), source = {}} = {}) {
  const id = opportunityId(successor.opportunity_id);
  const workerId = String(worker.worker_instance_id ?? '').trim();
  if (!workerId) throw new Error('WORKER_INSTANCE_ID_REQUIRED');

  return {
    schema: 'prometeo.opportunity-claim/v1',
    opportunity_id: id,
    ...(successor.queue_id ? {queue_id: successor.queue_id} : {}),
    worker_instance_id: workerId,
    claimed_at: now,
    state: 'CLAIMED',
    type: successor.type ?? null,
    project_id: successor.project_id ?? current.project_id ?? null,
    role: worker.role ?? successor.role ?? 'EXECUTE',
    write_scope: arr(successor.write_scope),
    source_head_observed: source.source_head_observed ?? worker.source_head_observed ?? null,
    epoch_observed: source.epoch_observed ?? worker.epoch_observed ?? null,
    queue_epoch_observed: source.queue_epoch_observed ?? worker.queue_epoch_observed ?? null,
    claim_protocol: 'CREATE_IF_ABSENT_EXCLUSIVE',
    continuation: {
      previous_opportunity_id: current.opportunity_id ?? null,
      previous_run_id: current.run_id ?? null,
      context: continuationContext(successor),
      authority_class: authorityClass(successor),
      readiness_mode: readinessEvidence(successor).mode
    },
    authority: 'SCOPED_CANDIDATE_ONLY_NO_GLOBAL_PROMOTION'
  };
}

export async function createJsonIfAbsent(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), {recursive: true});
  let handle;
  try {
    handle = await fs.open(filePath, 'wx', 0o600);
  } catch (error) {
    if (error?.code === 'EEXIST') {
      return {won: false, outcome: 'CLAIM_LOST_ALREADY_EXISTS', path: filePath};
    }
    throw error;
  }

  try {
    await handle.writeFile(`${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  } finally {
    await handle.close();
  }
  return {won: true, outcome: 'CLAIM_WON_CREATED', path: filePath};
}

export async function attemptAtomicSuccessorClaim({
  current = {},
  successor = {},
  claims = [],
  worker = {},
  claim_root,
  now = new Date().toISOString(),
  source = {}
} = {}) {
  if (!claim_root) throw new Error('CLAIM_ROOT_REQUIRED');
  const decision = evaluateSuccessorClaim({current, successor, claims});
  if (decision.decision !== 'ATTEMPT_ATOMIC_CLAIM') {
    return {
      schema: 'prometeo.multi-stage-claim-receipt/v1',
      opportunity_id: successor.opportunity_id ?? null,
      worker_instance_id: worker.worker_instance_id ?? null,
      outcome: 'NOT_ATTEMPTED',
      won: false,
      may_start_run: false,
      decision
    };
  }

  const claim = buildSuccessorClaim({current, successor, worker, now, source});
  const claimPath = path.join(claim_root, `${opportunityId(successor.opportunity_id)}.json`);
  const atomic = await createJsonIfAbsent(claimPath, claim);
  return {
    schema: 'prometeo.multi-stage-claim-receipt/v1',
    opportunity_id: successor.opportunity_id,
    worker_instance_id: worker.worker_instance_id ?? null,
    outcome: atomic.outcome,
    won: atomic.won,
    may_start_run: atomic.won,
    claim_ref: claimPath,
    decision,
    ...(atomic.won ? {claim} : {})
  };
}

export function runStartPermission(claimReceipt = {}) {
  return {
    allowed: claimReceipt.won === true && claimReceipt.may_start_run === true,
    reason: claimReceipt.won === true && claimReceipt.may_start_run === true
      ? 'ATOMIC_CLAIM_WON'
      : 'NO_EXCLUSIVE_SUCCESSOR_OWNERSHIP'
  };
}

async function readJsonInput(file) {
  if (file) return JSON.parse(await fs.readFile(file, 'utf8'));
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  if (!text.trim()) throw new Error('JSON_INPUT_REQUIRED');
  return JSON.parse(text);
}

async function main() {
  const [command = 'evaluate', inputFile] = process.argv.slice(2);
  const input = await readJsonInput(inputFile);
  let output;
  if (command === 'checkpoints') output = evaluateCheckpointContinuation(input);
  else if (command === 'evaluate') output = evaluateSuccessorClaim(input);
  else if (command === 'claim') output = await attemptAtomicSuccessorClaim(input);
  else throw new Error(`UNKNOWN_COMMAND:${command}`);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedAsScript) {
  main().catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
