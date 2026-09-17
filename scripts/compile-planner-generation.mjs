import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_DISPOSITIONS = new Set([
  'CONSUMED',
  'DEFERRED',
  'CONFLICTED',
  'REJECTED_WITH_REASON',
  'NOT_APPLICABLE'
]);

const FORBIDDEN_AUTHORITY_LABELS = new Set(['CURRENT', 'HUMAN_ACCEPTED', 'SERVED']);

export function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

export function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : stableStringify(value)).digest('hex');
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function sortedUnique(values = []) {
  return [...new Set(values.filter(Boolean).map(String))].sort();
}

function normalizeWriteScope(scope = []) {
  return sortedUnique(scope.map(x => String(x).replace(/\\/g, '/').replace(/\/+/g, '/')));
}

function required(value, name) {
  if (value === undefined || value === null || value === '') throw new Error(`MISSING_REQUIRED:${name}`);
  return value;
}

function assertPlannerInput(input) {
  if (!input || input.schema !== 'prometeo.planner-generation-input/v1') {
    throw new Error('INVALID_PLANNER_INPUT_SCHEMA');
  }
  required(input.generation_id, 'generation_id');
  required(input.source_head_cutoff, 'source_head_cutoff');
}

function normalizeDisposition(entry) {
  if (!entry || !ALLOWED_DISPOSITIONS.has(entry.disposition)) {
    throw new Error(`INVALID_DISPOSITION:${entry?.disposition ?? 'missing'}`);
  }
  return {
    source_ref: required(entry.source_ref, 'disposition.source_ref'),
    scope_id: required(entry.scope_id, 'disposition.scope_id'),
    disposition: entry.disposition,
    reason: entry.reason ?? null,
    planning_atoms: Array.isArray(entry.planning_atoms) ? entry.planning_atoms : []
  };
}

function fingerprintPayload(atom) {
  return {
    project_id: required(atom.project_id, 'atom.project_id'),
    chat_object_id_or_null: atom.chat_object_id ?? null,
    semantic_target_id_or_null: atom.semantic_target_id ?? null,
    normalized_problem_signature: normalizeText(required(atom.problem_signature, 'atom.problem_signature')),
    resolved_owner_or_owner_candidate_set: sortedUnique(atom.owner_refs ?? atom.owner_candidates ?? []),
    sorted_dependency_ids: sortedUnique(atom.dependency_ids ?? []),
    role_or_type: required(atom.type, 'atom.type'),
    desired_output_class: required(atom.desired_output_class, 'atom.desired_output_class'),
    normalized_write_scope: normalizeWriteScope(atom.allowed_write_scope ?? []),
    fresh_critic_required: Boolean(atom.fresh_critic_required),
    privacy_class: atom.privacy_class ?? 'PUBLIC_COORDINATION_ONLY',
    falsification_target: normalizeText(atom.falsification_target ?? '')
  };
}

export function canonicalFingerprint(atom) {
  return sha256(fingerprintPayload(atom));
}

function makeOpportunityId(fingerprint) {
  return `O-GEN-${fingerprint.slice(0, 16).toUpperCase()}`;
}

function synthesizeMission(atom) {
  const action = atom.type === 'VERIFY' || atom.type === 'CRITIQUE' ? atom.type.toLowerCase() : 'build';
  const target = atom.semantic_target_id ?? atom.desired_output_class;
  return `${action} ${atom.desired_output_class} for ${target}; resolve ${normalizeText(atom.problem_signature)}. Preserve declared authority, privacy, dependency and write-scope gates.`;
}

function detectCycles(opportunities) {
  const ids = new Set(opportunities.map(x => x.opportunity_id));
  const deps = new Map(opportunities.map(x => [x.opportunity_id, (x.dependency_ids ?? []).filter(d => ids.has(d))]));
  const visiting = new Set();
  const visited = new Set();
  const cycle = new Set();

  function visit(id, stack = []) {
    if (visiting.has(id)) {
      const idx = stack.indexOf(id);
      for (const member of stack.slice(idx)) cycle.add(member);
      cycle.add(id);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const nextStack = [...stack, id];
    for (const dep of deps.get(id) ?? []) visit(dep, nextStack);
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of ids) visit(id);
  return cycle;
}

function authorityBlocked(atom) {
  if (atom.authority_resolved === false) return true;
  const requested = String(atom.requested_authority_label ?? 'PLANNING_PROJECTION_ONLY').toUpperCase();
  return FORBIDDEN_AUTHORITY_LABELS.has(requested);
}

function privacyBlocked(atom) {
  const privacy = String(atom.privacy_class ?? 'PUBLIC_COORDINATION_ONLY').toUpperCase();
  return privacy === 'UNRESOLVED' || privacy === 'PRIVATE_UNAVAILABLE' || privacy === 'EXPORT_FORBIDDEN';
}

function derivedStatus(atom, satisfied) {
  if (authorityBlocked(atom)) return ['BLOCKED_AUTHORITY', ['AUTHORITY_UNRESOLVED_OR_FORBIDDEN']];
  if (privacyBlocked(atom)) return ['BLOCKED_PRIVACY', ['PRIVACY_UNRESOLVED_OR_INCOMPATIBLE']];
  const missing = sortedUnique(atom.dependency_ids ?? []).filter(id => !satisfied.has(id));
  if (missing.length) return ['BLOCKED_DEPENDENCY', missing.map(id => `UNSATISFIED:${id}`)];
  if ((atom.blocker_refs ?? []).length) return ['BLOCKED', sortedUnique(atom.blocker_refs).map(x => `BLOCKER:${x}`)];
  return ['READY_DERIVED', []];
}

function criticAtom(input, criticPolicy = {}) {
  if (!criticPolicy.required) return null;
  const triggerClass = required(criticPolicy.trigger_class, 'critic_policy.trigger_class');
  return {
    project_id: criticPolicy.project_id ?? 'project-prometeo-chat-control',
    chat_object_id: criticPolicy.chat_object_id ?? null,
    semantic_target_id: `strategic-critic:${input.generation_id}:${triggerClass}`,
    problem_signature: `fresh strategic critic required for ${triggerClass} at generation ${input.generation_id}`,
    type: 'CRITIQUE',
    desired_output_class: 'strategic_critic_return',
    owner_refs: sortedUnique(criticPolicy.owner_refs ?? []),
    dependency_ids: sortedUnique(criticPolicy.dependency_ids ?? []),
    allowed_write_scope: ['own claim/run/return'],
    privacy_class: criticPolicy.privacy_class ?? 'PUBLIC_COORDINATION_ONLY',
    falsification_target: criticPolicy.falsification_target ?? 'route remains unchanged despite material contradictory evidence',
    fresh_critic_required: true,
    authority_resolved: true,
    source_refs: sortedUnique(criticPolicy.source_refs ?? []),
    forbidden_worker_ids: sortedUnique([criticPolicy.route_author_worker_id].filter(Boolean))
  };
}

export function compilePlannerGeneration({
  plannerInput,
  dispositionLedger,
  existingOpportunities = [],
  satisfiedDependencyIds = [],
  criticPolicy = {},
  generationId = null,
  parentGenerationId = null
}) {
  assertPlannerInput(plannerInput);
  const dispositions = (dispositionLedger?.dispositions ?? dispositionLedger ?? []).map(normalizeDisposition);
  const existing = existingOpportunities.map(x => ({...x}));
  const existingByFingerprint = new Map();
  for (const item of existing) {
    if (item.canonical_fingerprint) existingByFingerprint.set(item.canonical_fingerprint, item);
    else if (item.planning_atom) existingByFingerprint.set(canonicalFingerprint(item.planning_atom), item);
  }

  const atoms = [];
  const sourceDispositions = [];
  for (const disposition of dispositions) {
    if (disposition.disposition !== 'CONSUMED') {
      sourceDispositions.push({
        source_ref: disposition.source_ref,
        scope_id: disposition.scope_id,
        disposition: disposition.disposition,
        result: 'NO_WORK_DERIVED',
        reason: disposition.reason ?? null
      });
      continue;
    }
    for (const atom of disposition.planning_atoms) {
      atoms.push({...atom, source_refs: sortedUnique([...(atom.source_refs ?? []), disposition.source_ref])});
    }
  }

  const autoCritic = criticAtom(plannerInput, criticPolicy);
  if (autoCritic) atoms.push(autoCritic);

  const satisfied = new Set(satisfiedDependencyIds.map(String));
  const opportunities = [];
  const dispositionsOut = [...sourceDispositions];
  const fingerprintsSeen = new Map();

  for (const atom of atoms) {
    const fp = canonicalFingerprint(atom);
    const existingMatch = existingByFingerprint.get(fp);
    const generatedEarlier = fingerprintsSeen.get(fp);
    if (existingMatch || generatedEarlier) {
      const target = existingMatch?.opportunity_id ?? generatedEarlier;
      dispositionsOut.push({
        source_refs: sortedUnique(atom.source_refs ?? []),
        canonical_fingerprint: fp,
        disposition: existingMatch ? 'LINK_TO_EXISTING' : 'HARD_DUPLICATE',
        opportunity_id: target
      });
      continue;
    }

    const opportunityId = atom.opportunity_id ?? makeOpportunityId(fp);
    const [status, blockReasons] = derivedStatus(atom, satisfied);
    const opportunity = {
      opportunity_id: opportunityId,
      generation_id: generationId ?? `GEN-${plannerInput.generation_id}-NEXT`,
      project_id: atom.project_id,
      chat_object_id: atom.chat_object_id ?? null,
      campaign_id_or_null: atom.campaign_id ?? null,
      state: 'PREPARED',
      derived_status: status,
      type: atom.type,
      mission: synthesizeMission(atom),
      priority_class: atom.priority_class ?? 'P2_CURRENT_FRONTIER_GOAL',
      source_trigger_refs: sortedUnique(atom.source_refs ?? []),
      owner_refs: sortedUnique(atom.owner_refs ?? atom.owner_candidates ?? []),
      authority_refs: sortedUnique(atom.authority_refs ?? []),
      dependency_ids: sortedUnique(atom.dependency_ids ?? []),
      blocker_refs: sortedUnique(atom.blocker_refs ?? []),
      required_capabilities: sortedUnique(atom.required_capabilities ?? []),
      required_tools: sortedUnique(atom.required_tools ?? []),
      privacy_class: atom.privacy_class ?? 'PUBLIC_COORDINATION_ONLY',
      context_refs_or_working_set_ref: atom.context_refs_or_working_set_ref ?? sortedUnique(atom.source_refs ?? []),
      must_preserve: sortedUnique(atom.must_preserve ?? []),
      allowed_write_scope: normalizeWriteScope(atom.allowed_write_scope ?? []),
      forbidden_write_scope: normalizeWriteScope(atom.forbidden_write_scope ?? ['Current', 'Human Accepted', 'Served']),
      verification_requirements: sortedUnique(atom.verification_requirements ?? []),
      return_contract: atom.return_contract ?? `${atom.desired_output_class} candidate evidence plus falsification results`,
      completion_boundary: atom.completion_boundary ?? 'RETURN + DONE; no authority promotion',
      supersedes_or_null: atom.supersedes_or_null ?? null,
      canonical_fingerprint: fp,
      desired_output_class: atom.desired_output_class,
      falsification_target: atom.falsification_target ?? null,
      fresh_critic_required: Boolean(atom.fresh_critic_required),
      forbidden_worker_ids: sortedUnique(atom.forbidden_worker_ids ?? []),
      block_reasons: blockReasons
    };
    opportunities.push(opportunity);
    fingerprintsSeen.set(fp, opportunityId);
    dispositionsOut.push({
      source_refs: opportunity.source_trigger_refs,
      canonical_fingerprint: fp,
      disposition: status.startsWith('BLOCKED_AUTHORITY') ? 'BLOCKED_AUTHORITY'
        : status.startsWith('BLOCKED_PRIVACY') ? 'BLOCKED_PRIVACY'
        : status.startsWith('BLOCKED_DEPENDENCY') ? 'BLOCKED_DEPENDENCY'
        : 'CREATE_NEW_PREPARED',
      opportunity_id: opportunityId
    });
  }

  const cycleIds = detectCycles(opportunities);
  for (const item of opportunities) {
    if (cycleIds.has(item.opportunity_id)) {
      item.derived_status = 'BLOCKED_DEPENDENCY';
      item.block_reasons = sortedUnique([...item.block_reasons, 'DEPENDENCY_CYCLE']);
    }
  }

  const dependencyEdges = opportunities.flatMap(item =>
    item.dependency_ids.map(from => ({from, to: item.opportunity_id}))
  ).sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));

  const ready = opportunities
    .filter(x => x.derived_status === 'READY_DERIVED')
    .map(x => x.opportunity_id)
    .sort();
  const blocked = opportunities
    .filter(x => x.derived_status !== 'READY_DERIVED')
    .map(x => x.opportunity_id)
    .sort();

  opportunities.sort((a, b) => a.opportunity_id.localeCompare(b.opportunity_id));
  dispositionsOut.sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));

  const inputDigest = sha256({
    plannerInput,
    dispositionLedger: dispositions,
    existingOpportunities: existing.map(x => stableValue(x)),
    satisfiedDependencyIds: [...satisfied].sort(),
    criticPolicy: stableValue(criticPolicy),
    generationId,
    parentGenerationId
  });

  const outputBase = {
    schema: 'prometeo.planner-generation-output/v1',
    generation_id: generationId ?? `GEN-${plannerInput.generation_id}-NEXT`,
    parent_generation_id: parentGenerationId ?? plannerInput.generation_id,
    input_digest: inputDigest,
    source_head_cutoff: plannerInput.source_head_cutoff,
    north_star_ref: plannerInput.north_star_ref ?? null,
    authority: 'PLANNING_PROJECTION_ONLY_NOT_CURRENT_NOT_HUMAN_ACCEPTED_NOT_SERVED',
    planning_atoms: atoms.map(atom => ({
      canonical_fingerprint: canonicalFingerprint(atom),
      source_refs: sortedUnique(atom.source_refs ?? []),
      semantic_target_id: atom.semantic_target_id ?? null,
      type: atom.type,
      desired_output_class: atom.desired_output_class
    })).sort((a, b) => a.canonical_fingerprint.localeCompare(b.canonical_fingerprint)),
    dispositions: dispositionsOut,
    opportunities,
    dependency_edges: dependencyEdges,
    blocked_candidates: blocked,
    derived_ready_frontier: ready,
    critic_trigger_decision: {
      required: Boolean(criticPolicy.required),
      trigger_class: criticPolicy.trigger_class ?? null,
      independence_enforced_by_forbidden_worker_ids: sortedUnique([criticPolicy.route_author_worker_id].filter(Boolean))
    },
    stop_state_or_null: opportunities.length === 0 ? 'STABLE_NO_NEW_WORK' : null,
    next_generation_trigger: 'RETURN_OR_STEWARD_DISPOSITION_OR_PROPOSAL_OR_INCIDENT_OR_CRITIC_OR_BLOCKER_TRANSITION'
  };
  const outputDigest = sha256(outputBase);
  const output = {...outputBase, output_digest: outputDigest};

  const queue = {
    schema: 'prometeo.opportunity-queue/v0',
    queue_id: `Q-${output.generation_id}`,
    generation_id: output.generation_id,
    authority: output.authority,
    opportunities: output.opportunities,
    derived_ready_frontier: output.derived_ready_frontier,
    blocked_candidates: output.blocked_candidates,
    input_digest: output.input_digest,
    output_digest: output.output_digest
  };

  return {output, queue};
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error('USAGE: --source <json> --out <dir>');
    args[key.slice(2)] = value;
  }
  return args;
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePath = required(args.source, '--source');
  const outDir = required(args.out, '--out');
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const result = compilePlannerGeneration(source);
  fs.mkdirSync(outDir, {recursive: true});
  fs.writeFileSync(path.join(outDir, 'OUTPUT.json'), `${JSON.stringify(result.output, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'QUEUE.json'), `${JSON.stringify(result.queue, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({input_digest: result.output.input_digest, output_digest: result.output.output_digest, opportunities: result.output.opportunities.length, ready: result.output.derived_ready_frontier.length})}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) runCli();
