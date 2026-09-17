const CANONICAL_BOOTSTRAP = 'PROMETEO → https://juanmanuelpm.github.io/prometeo/wc';

export const UNIVERSAL_WORKER_ROLES = Object.freeze([
  'EXECUTE',
  'DISCOVER',
  'PLAN_LOCAL',
  'CRITIQUE',
  'VERIFY',
  'INTEGRATE_LOCAL',
  'CONTEXT_COMPILE',
  'RECOVER',
  'COMPACT'
]);

export const GUIDE_GRADE_CONTEXT_REFS = Object.freeze([
  'coordination/workstreams/chat-native-control-plane-v1/PROMETEO_MASTER_CONTEXT_V1.md',
  'coordination/workstreams/chat-native-control-plane-v1/USER_INTENT_GAP_AUDIT_V1.md',
  'coordination/workstreams/chat-native-control-plane-v1/STRATEGIC_NON_REGRESSION_AND_SELF_CRITIQUE_V1.md',
  'coordination/workstreams/chat-native-control-plane-v1/VERIFICATION_AND_CRITIC_CONTROL_V1.md'
]);

export const REQUIRED_L0_REFS = Object.freeze([
  '.well-known/prometeo.json',
  'coordination/GLOBAL_AGENT_CONSTITUTION_V1.md',
  'coordination/CONTINUITY_HEAD.json',
  'coordination/workstreams/chat-native-control-plane-v1/FOCUS.json',
  'coordination/workstreams/chat-native-control-plane-v1/UNIVERSAL_COGNITIVE_WORKER_V1.md'
]);

const TERMINAL_SAFE_ACTIONS = new Set([
  'REENTER_ALLOCATION',
  'CLAIM_SUCCESSOR',
  'DISCOVER',
  'RECOVER',
  'IDLE_NO_SAFE_USEFUL_WORK',
  'BOUNDARY'
]);

const ACTIVE_CLAIM_STATES = new Set(['CLAIMED', 'STARTED', 'EXECUTING', 'WRITING', 'INTEGRATING']);
const FORBIDDEN_AUTHORITY_VALUES = new Set([
  'CURRENT',
  'HUMAN_ACCEPTED',
  'SERVED',
  'PROMOTED_CURRENT',
  'PROMOTED_HUMAN_ACCEPTED',
  'PROMOTED_SERVED'
]);

const GLOBAL_PROMOTION_CLASSES = new Set([
  'GLOBAL_PROMOTION',
  'CURRENT_MUTATION',
  'HUMAN_ACCEPTED_MUTATION',
  'SERVED_MUTATION'
]);

const ROLE_BY_TYPE = Object.freeze({
  BUILD: 'EXECUTE',
  BUILD_VERIFY: 'EXECUTE',
  EXECUTE: 'EXECUTE',
  DISCOVERY: 'DISCOVER',
  PROJECT_DISCOVERY: 'DISCOVER',
  PLAN: 'PLAN_LOCAL',
  PLAN_LOCAL: 'PLAN_LOCAL',
  CRITIQUE: 'CRITIQUE',
  VERIFY: 'VERIFY',
  TEST: 'VERIFY',
  INTEGRATE_ASSIST: 'INTEGRATE_LOCAL',
  INTEGRATE_LOCAL: 'INTEGRATE_LOCAL',
  CONTEXT_COMPILE: 'CONTEXT_COMPILE',
  RECOVERY: 'RECOVER',
  RECOVER: 'RECOVER',
  COMPACT: 'COMPACT',
  ARCHAEOLOGY: 'DISCOVER',
  RESEARCH: 'DISCOVER',
  DOCUMENT: 'EXECUTE'
});

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function asSet(values) {
  return new Set(arr(values).filter(Boolean));
}

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function issue(code, message, path = null, severity = 'ERROR', evidence = null) {
  return {code, severity, message, ...(path ? {path} : {}), ...(evidence !== null ? {evidence} : {})};
}

function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+/g, '/');
}

function globToRegex(pattern) {
  const normalized = normalizePath(pattern);
  let out = '^';
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    const next = normalized[i + 1];
    if (ch === '*' && next === '*') {
      out += '.*';
      i += 1;
    } else if (ch === '*') {
      out += '[^/]*';
    } else if ('\\^$+?.()|{}[]'.includes(ch)) {
      out += `\\${ch}`;
    } else {
      out += ch;
    }
  }
  out += '$';
  return new RegExp(out);
}

export function scopeAllowsPath(filePath, scopePatterns = []) {
  const target = normalizePath(filePath);
  return arr(scopePatterns)
    .filter(pattern => typeof pattern === 'string' && !pattern.includes('own claim/run/return'))
    .some(pattern => globToRegex(pattern).test(target));
}

export function scopesOverlap(scopeA = [], scopeB = []) {
  const concreteA = arr(scopeA).filter(v => typeof v === 'string' && !v.includes('own claim/run/return'));
  const concreteB = arr(scopeB).filter(v => typeof v === 'string' && !v.includes('own claim/run/return'));
  for (const a of concreteA) {
    for (const b of concreteB) {
      const aPrefix = normalizePath(a).replace(/\*\*.*$/, '');
      const bPrefix = normalizePath(b).replace(/\*\*.*$/, '');
      if (!aPrefix || !bPrefix) continue;
      if (aPrefix.startsWith(bPrefix) || bPrefix.startsWith(aPrefix)) return true;
      if (!a.includes('*') && scopeAllowsPath(a, [b])) return true;
      if (!b.includes('*') && scopeAllowsPath(b, [a])) return true;
    }
  }
  return false;
}

export function validateBootstrapCommand(command) {
  const errors = [];
  if (String(command || '').trim() !== CANONICAL_BOOTSTRAP) {
    errors.push(issue(
      'BOOTSTRAP_NOT_CANONICAL',
      'Universal workers must use the identical canonical /wc bootstrap.',
      'bootstrap',
      'ERROR',
      {expected: CANONICAL_BOOTSTRAP}
    ));
  }
  return {ok: errors.length === 0, errors, canonical_bootstrap: CANONICAL_BOOTSTRAP};
}

export function validateContextReceipt(receipt, {requireGuideGrade = true} = {}) {
  const errors = [];
  const warnings = [];
  if (!receipt || typeof receipt !== 'object') {
    return {ok: false, errors: [issue('CONTEXT_RECEIPT_MISSING', 'A material worker run requires an auditable context receipt.', 'run.context_receipt')], warnings};
  }

  if (!receipt.actor_role) errors.push(issue('CONTEXT_ACTOR_ROLE_MISSING', 'Context receipt must identify actor/role.', 'run.context_receipt.actor_role'));
  if (!receipt.mission) errors.push(issue('CONTEXT_MISSION_MISSING', 'Context receipt must identify the mission.', 'run.context_receipt.mission'));

  const l0 = asSet(receipt.l0_kernel_refs);
  for (const ref of REQUIRED_L0_REFS) {
    if (!l0.has(ref)) errors.push(issue('L0_REF_MISSING', `Required L0 ref missing: ${ref}`, 'run.context_receipt.l0_kernel_refs', 'ERROR', ref));
  }

  if (requireGuideGrade) {
    for (const ref of GUIDE_GRADE_CONTEXT_REFS) {
      if (!l0.has(ref) && !asSet(receipt.l1_digest_refs).has(ref) && !asSet(receipt.l2_exact_source_refs_opened).has(ref)) {
        errors.push(issue('GUIDE_GRADE_REF_MISSING', `Guide-grade strategic posture ref missing: ${ref}`, 'run.context_receipt', 'ERROR', ref));
      }
    }
  }

  if (arr(receipt.authority_labels).length === 0) errors.push(issue('AUTHORITY_LABELS_MISSING', 'Context receipt must carry authority labels.', 'run.context_receipt.authority_labels'));
  if (!receipt.source_freshness || typeof receipt.source_freshness !== 'object') errors.push(issue('SOURCE_FRESHNESS_MISSING', 'Context receipt must record source freshness/head/epoch evidence.', 'run.context_receipt.source_freshness'));
  if (!Object.prototype.hasOwnProperty.call(receipt, 'contradictions_surfaced')) warnings.push(issue('CONTRADICTION_LEDGER_MISSING', 'Context receipt should explicitly record contradictions surfaced, even if empty.', 'run.context_receipt.contradictions_surfaced', 'WARNING'));
  if (!receipt.budget_estimate) warnings.push(issue('CONTEXT_BUDGET_MISSING', 'Context receipt should record its bounded context budget.', 'run.context_receipt.budget_estimate', 'WARNING'));

  return {ok: errors.length === 0, errors, warnings};
}

export function validateClaim(claim, opportunity = null) {
  const errors = [];
  if (!claim || typeof claim !== 'object') return {ok: false, errors: [issue('CLAIM_MISSING', 'Exclusive work requires a durable claim before substantive execution.', 'claim')]};
  if (claim.schema !== 'prometeo.opportunity-claim/v1') errors.push(issue('CLAIM_SCHEMA_INVALID', 'Claim schema must be prometeo.opportunity-claim/v1.', 'claim.schema'));
  for (const key of ['opportunity_id', 'worker_instance_id', 'claimed_at', 'state', 'source_head_observed']) {
    if (!claim[key]) errors.push(issue('CLAIM_FIELD_MISSING', `Claim field missing: ${key}`, `claim.${key}`));
  }
  if (opportunity?.opportunity_id && claim.opportunity_id !== opportunity.opportunity_id) errors.push(issue('CLAIM_OPPORTUNITY_MISMATCH', 'Claim opportunity_id does not match selected opportunity.', 'claim.opportunity_id'));
  if (!['CLAIMED', 'STARTED', 'EXECUTING', 'WRITING', 'INTEGRATING', 'DONE', 'BOUNDARY'].includes(claim.state)) warningsFromClaimState(claim, errors);
  return {ok: errors.length === 0, errors};
}

function warningsFromClaimState(claim, errors) {
  errors.push(issue('CLAIM_STATE_UNKNOWN', `Unknown claim state: ${claim.state}`, 'claim.state'));
}

export function validateRun(run, claim = null, {requireGuideGrade = true} = {}) {
  const errors = [];
  const warnings = [];
  if (!run || typeof run !== 'object') return {ok: false, errors: [issue('RUN_MISSING', 'A material worker must persist STARTED before substantive work.', 'run')], warnings};
  if (run.schema !== 'prometeo.opportunity-run/v1') errors.push(issue('RUN_SCHEMA_INVALID', 'Run schema must be prometeo.opportunity-run/v1.', 'run.schema'));
  for (const key of ['opportunity_id', 'run_id', 'worker_instance_id', 'claim_ref', 'state', 'started_at', 'source_head_at_start', 'mission']) {
    if (!run[key]) errors.push(issue('RUN_FIELD_MISSING', `Run field missing: ${key}`, `run.${key}`));
  }
  if (!['STARTED', 'EXECUTING', 'WRITING', 'INTEGRATING', 'DONE', 'BOUNDARY'].includes(run.state)) errors.push(issue('RUN_STATE_INVALID', `Unsupported run state: ${run.state}`, 'run.state'));
  if (claim) {
    if (run.opportunity_id !== claim.opportunity_id) errors.push(issue('RUN_CLAIM_OPPORTUNITY_MISMATCH', 'Run and claim opportunity_id differ.', 'run.opportunity_id'));
    if (run.worker_instance_id !== claim.worker_instance_id) errors.push(issue('RUN_CLAIM_WORKER_MISMATCH', 'Run and claim worker_instance_id differ.', 'run.worker_instance_id'));
  }
  if (arr(run.acceptance_criteria).length === 0) errors.push(issue('ACCEPTANCE_CRITERIA_MISSING', 'Run must persist acceptance criteria before substantive work.', 'run.acceptance_criteria'));
  if (arr(run.planned_checkpoints).length < 2) errors.push(issue('MULTI_CHECKPOINT_PLAN_MISSING', 'Universal worker run must plan multiple material checkpoints when work is non-trivial.', 'run.planned_checkpoints'));
  if (!arr(run.checkpoints_reached).includes('STARTED')) errors.push(issue('STARTED_RECEIPT_MISSING', 'checkpoints_reached must include STARTED.', 'run.checkpoints_reached'));
  const context = validateContextReceipt(run.context_receipt, {requireGuideGrade});
  errors.push(...context.errors);
  warnings.push(...context.warnings);
  return {ok: errors.length === 0, errors, warnings};
}

function recurseAuthority(value, path, findings) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    const keyLower = key.toLowerCase();
    if (typeof child === 'boolean' && child === true && ['current', 'human_accepted', 'served'].includes(keyLower)) {
      findings.push(issue('AUTHORITY_SELF_PROMOTION', `Worker artifact cannot assert ${key}=true.`, childPath));
    }
    if (typeof child === 'string' && FORBIDDEN_AUTHORITY_VALUES.has(child.trim().toUpperCase())) {
      findings.push(issue('AUTHORITY_SELF_PROMOTION', `Worker artifact cannot self-promote authority to ${child}.`, childPath));
    }
    if (Array.isArray(child)) child.forEach((item, index) => recurseAuthority(item, `${childPath}[${index}]`, findings));
    else if (child && typeof child === 'object') recurseAuthority(child, childPath, findings);
  }
}

export function validateAuthorityBoundary(artifact, opportunity = null) {
  const errors = [];
  recurseAuthority(artifact, '', errors);
  const authorityClass = String(opportunity?.authority_class || opportunity?.authority || '').toUpperCase();
  if (GLOBAL_PROMOTION_CLASSES.has(authorityClass)) {
    errors.push(issue('OPPORTUNITY_AUTHORITY_INCOMPATIBLE', `Universal worker may not claim global-promotion authority class ${authorityClass}.`, 'opportunity.authority_class'));
  }
  return {ok: errors.length === 0, errors};
}

export function validateMutationScope(paths, allowedScope) {
  const errors = [];
  const normalized = arr(paths).map(normalizePath);
  for (const filePath of normalized) {
    if (!scopeAllowsPath(filePath, allowedScope)) errors.push(issue('WRITE_SCOPE_VIOLATION', `Path is outside the claimed preserve-first write scope: ${filePath}`, 'attempted_paths', 'ERROR', filePath));
  }
  return {ok: errors.length === 0, errors, checked_paths: normalized};
}

export function isDerivedReady(opportunity) {
  if (!opportunity || typeof opportunity !== 'object') return false;
  if (opportunity.status === 'READY') return true;
  if (opportunity.status !== 'BLOCKED_DEPENDENCY') return false;
  const d = opportunity.derived_readiness;
  return Boolean(
    d && d.ready === true && arr(d.proof_refs).length > 0 &&
    arr(d.failed_prerequisites).length === 0 && arr(d.conflicted_prerequisites).length === 0
  );
}

export function deriveRole(opportunity) {
  const explicit = String(opportunity?.role || opportunity?.role_mode || '').toUpperCase();
  if (UNIVERSAL_WORKER_ROLES.includes(explicit)) return explicit;
  return ROLE_BY_TYPE[String(opportunity?.type || '').toUpperCase()] || 'EXECUTE';
}

function activeClaimedIds(claims = []) {
  return new Set(arr(claims)
    .filter(claim => claim && ACTIVE_CLAIM_STATES.has(String(claim.state || '').toUpperCase()))
    .map(claim => claim.opportunity_id)
    .filter(Boolean));
}

function compatibleCapabilities(opportunity, worker) {
  const required = arr(opportunity?.required_capabilities);
  if (required.length === 0) return true;
  const available = asSet(worker?.capabilities);
  return required.every(cap => available.has(cap));
}

function hasLiveWriteCollision(opportunity, activeWriters = []) {
  const own = arr(opportunity?.write_scope);
  if (own.length === 0) return false;
  return arr(activeWriters).some(writer => {
    if (!writer || !['CLAIMED', 'STARTED', 'EXECUTING', 'WRITING', 'INTEGRATING'].includes(String(writer.state || '').toUpperCase())) return false;
    return scopesOverlap(own, writer.write_scope);
  });
}

export function scoreOpportunity(opportunity) {
  const priority = finite(opportunity?.priority);
  const unblock = finite(opportunity?.unblock_value);
  const compound = finite(opportunity?.compounding_value);
  const info = finite(opportunity?.information_gain);
  const collision = finite(opportunity?.collision_risk);
  const friction = finite(opportunity?.human_friction);
  return priority * 1_000_000 + unblock * 10_000 + compound * 1_000 + info * 100 - collision * 10 - friction;
}

export function allocateRoleAndOpportunity({opportunities = [], claims = [], activeWriters = [], worker = {}} = {}) {
  const claimed = activeClaimedIds(claims);
  const rejected = [];
  const candidates = [];

  for (const opportunity of arr(opportunities)) {
    if (!opportunity?.opportunity_id) {
      rejected.push({opportunity_id: null, reason: 'MISSING_ID'});
      continue;
    }
    if (!isDerivedReady(opportunity)) {
      rejected.push({opportunity_id: opportunity.opportunity_id, reason: 'NOT_READY'});
      continue;
    }
    if (claimed.has(opportunity.opportunity_id)) {
      rejected.push({opportunity_id: opportunity.opportunity_id, reason: 'ALREADY_CLAIMED'});
      continue;
    }
    if (!compatibleCapabilities(opportunity, worker)) {
      rejected.push({opportunity_id: opportunity.opportunity_id, reason: 'CAPABILITY_MISMATCH'});
      continue;
    }
    if (GLOBAL_PROMOTION_CLASSES.has(String(opportunity.authority_class || '').toUpperCase())) {
      rejected.push({opportunity_id: opportunity.opportunity_id, reason: 'AUTHORITY_INCOMPATIBLE'});
      continue;
    }
    if (hasLiveWriteCollision(opportunity, activeWriters)) {
      rejected.push({opportunity_id: opportunity.opportunity_id, reason: 'LIVE_WRITE_COLLISION'});
      continue;
    }
    candidates.push({opportunity, role: deriveRole(opportunity), score: scoreOpportunity(opportunity)});
  }

  candidates.sort((a, b) => b.score - a.score || a.opportunity.opportunity_id.localeCompare(b.opportunity.opportunity_id));
  const selected = candidates[0] || null;
  return {
    selected: selected ? {
      opportunity_id: selected.opportunity.opportunity_id,
      role: selected.role,
      score: selected.score,
      claim_mode: 'CREATE_IF_ABSENT_EXCLUSIVE'
    } : null,
    candidates: candidates.map(item => ({opportunity_id: item.opportunity.opportunity_id, role: item.role, score: item.score})),
    rejected
  };
}

export function validatePostReturn(returnArtifact, run = null) {
  const errors = [];
  if (!returnArtifact || typeof returnArtifact !== 'object') return {ok: false, errors: [issue('RETURN_MISSING', 'Completed material work requires a durable RETURN artifact.', 'return')]};
  for (const key of ['opportunity_id', 'run_id', 'worker_instance_id', 'returned_at']) {
    if (!returnArtifact[key]) errors.push(issue('RETURN_FIELD_MISSING', `RETURN field missing: ${key}`, `return.${key}`));
  }
  if (run) {
    if (returnArtifact.run_id !== run.run_id) errors.push(issue('RETURN_RUN_MISMATCH', 'RETURN run_id must match the originating run.', 'return.run_id'));
    if (returnArtifact.opportunity_id !== run.opportunity_id) errors.push(issue('RETURN_OPPORTUNITY_MISMATCH', 'RETURN opportunity_id must match the originating run.', 'return.opportunity_id'));
    if (returnArtifact.worker_instance_id !== run.worker_instance_id) errors.push(issue('RETURN_WORKER_MISMATCH', 'RETURN worker_instance_id must match the originating run.', 'return.worker_instance_id'));
  }
  if (arr(returnArtifact.evidence_refs).length === 0 && arr(returnArtifact.changed_paths).length === 0) errors.push(issue('RETURN_EVIDENCE_MISSING', 'RETURN must point to evidence and/or changed paths.', 'return'));
  const action = String(returnArtifact.post_return_action || '').toUpperCase();
  if (!TERMINAL_SAFE_ACTIONS.has(action)) errors.push(issue('POST_RETURN_ACTION_INVALID', 'RETURN must explicitly re-enter allocation, claim a successor, discover/recover, idle only after exhaustion, or stop at a real boundary.', 'return.post_return_action', 'ERROR', {allowed: [...TERMINAL_SAFE_ACTIONS]}));
  if (action === 'IDLE_NO_SAFE_USEFUL_WORK' && returnArtifact.discovery_recovery_exhausted !== true) errors.push(issue('IDLE_NOT_PROVEN', 'IDLE_NO_SAFE_USEFUL_WORK requires evidence that prepared work, derived readiness, recovery and discovery were exhausted.', 'return.discovery_recovery_exhausted'));
  return {ok: errors.length === 0, errors};
}

export function validateUniversalWorkerEnvelope(envelope = {}) {
  const errors = [];
  const warnings = [];
  const checks = {};

  checks.bootstrap = validateBootstrapCommand(envelope.bootstrap);
  errors.push(...checks.bootstrap.errors);

  checks.claim = validateClaim(envelope.claim, envelope.opportunity);
  errors.push(...checks.claim.errors);

  checks.run = validateRun(envelope.run, envelope.claim, {requireGuideGrade: envelope.require_guide_grade !== false});
  errors.push(...checks.run.errors);
  warnings.push(...checks.run.warnings);

  checks.authority = validateAuthorityBoundary(envelope.return || envelope.run || {}, envelope.opportunity);
  errors.push(...checks.authority.errors);

  if (arr(envelope.attempted_paths).length > 0) {
    checks.scope = validateMutationScope(envelope.attempted_paths, envelope.claim?.write_scope || envelope.opportunity?.write_scope || []);
    errors.push(...checks.scope.errors);
  } else {
    checks.scope = {ok: true, errors: [], checked_paths: []};
  }

  if (envelope.return) {
    checks.post_return = validatePostReturn(envelope.return, envelope.run);
    errors.push(...checks.post_return.errors);
  } else {
    checks.post_return = {ok: true, errors: [], pending: true};
  }

  return {
    schema: 'prometeo.universal-worker-validation-report/v1',
    ok: errors.length === 0,
    errors,
    warnings,
    checks,
    invariant_summary: {
      canonical_bootstrap: checks.bootstrap.ok,
      claim_before_work: checks.claim.ok && checks.run.ok,
      guide_grade_context: checks.run.ok,
      scoped_mutation: checks.scope.ok,
      no_authority_self_promotion: checks.authority.ok,
      post_return_reentry: checks.post_return.pending === true ? 'PENDING' : checks.post_return.ok
    }
  };
}

export function canonicalBootstrap() {
  return CANONICAL_BOOTSTRAP;
}
