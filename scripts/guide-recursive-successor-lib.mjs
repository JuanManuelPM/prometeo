import { canonicalDiscoveryIdentity, discoveryFingerprint } from './discovery-dedup-lib.mjs';

export const DEFAULT_RECURSION_BUDGET = Object.freeze({
  max_depth: 2,
  max_children_per_parent: 3,
  max_open_descendants: 6,
  proposal_ttl_hours: 24
});

export const HARD_RECURSION_CAPS = Object.freeze({
  max_depth: 4,
  max_children_per_parent: 7,
  max_open_descendants: 20,
  proposal_ttl_hours: 168
});

const positiveInt = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};
const uniq = values => [...new Set((Array.isArray(values) ? values : []).map(String).map(v => v.trim()).filter(Boolean))].sort();
const required = (value, field) => {
  const out = String(value ?? '').trim();
  if (!out) throw new Error(`GUIDE_RECURSION_INVALID:${field}_required`);
  return out;
};
const asDateMs = value => Date.parse(value || '') || 0;

export function resolveRecursionBudget(ownerOverride = null) {
  if (!ownerOverride) return {...DEFAULT_RECURSION_BUDGET};
  if (ownerOverride.authority !== 'CURRENT_OWNER_RECURSION_BUDGET_OVERRIDE') {
    throw new Error('GUIDE_RECURSION_AUTHORITY:owner_override_required');
  }
  required(ownerOverride.source_ref, 'owner_override_source_ref');
  const out = {};
  for (const key of Object.keys(DEFAULT_RECURSION_BUDGET)) {
    const requested = positiveInt(ownerOverride[key], DEFAULT_RECURSION_BUDGET[key]);
    out[key] = Math.min(requested, HARD_RECURSION_CAPS[key]);
  }
  return out;
}

export function recursiveStopReason(spec = {}, context = {}) {
  const budget = resolveRecursionBudget(context.owner_override ?? null);
  const parentDepth = Number.isInteger(Number(context.parent_depth)) ? Number(context.parent_depth) : 0;
  const nextDepth = parentDepth + 1;
  if (context.frontier_sufficient === true) return 'FRONTIER_SUFFICIENT_FOR_OBSERVABLE_CAPACITY';
  if (context.semantic_duplicate === true || context.superseded === true) return 'SEMANTIC_DUPLICATE_OR_SUPERSEDED';
  if (!String(spec.consumer ?? '').trim()) return 'CONSUMER_ABSENT';
  if (!Array.isArray(spec.evidence_refs) || spec.evidence_refs.filter(Boolean).length === 0) return 'EVIDENCE_INSUFFICIENT';
  const unavailable = new Set(uniq(context.definitively_unavailable_capabilities));
  if (uniq(spec.required_capabilities).some(capability => unavailable.has(capability))) {
    return 'CAPABILITY_WITHOUT_OBSERVABLE_OFFER';
  }
  if (context.human_authority_boundary === true) return 'HUMAN_AUTHORITY_BOUNDARY';
  if (context.campaign_closed === true) return 'CAMPAIGN_CLOSED';
  if (nextDepth > budget.max_depth) return 'MAX_DEPTH_REACHED';
  if (Number(context.existing_children_for_parent || 0) >= budget.max_children_per_parent) {
    return 'MAX_CHILDREN_PER_PARENT_REACHED';
  }
  if (Number(context.open_descendants || 0) >= budget.max_open_descendants) {
    return 'MAX_OPEN_DESCENDANTS_REACHED';
  }
  const nowMs = asDateMs(context.now || new Date().toISOString());
  const expiresMs = asDateMs(context.expires_at);
  if (expiresMs && nowMs > expiresMs) return 'PROPOSAL_TTL_EXPIRED';
  return null;
}

export function compileGuideSuccessor(spec = {}, context = {}) {
  const forbiddenInherited = ['mutation_authority', 'allowed_paths', 'tool_policy', 'execution_authority', 'promotion_authority', 'shell_identity'];
  const inherited = forbiddenInherited.find(key => Object.prototype.hasOwnProperty.call(spec, key));
  if (inherited) throw new Error(`GUIDE_RECURSION_AUTHORITY:forbidden_inherited_field:${inherited}`);

  const stop = recursiveStopReason(spec, context);
  if (stop) return {materialize: false, stop_reason: stop};

  const root_ref = required(spec.root_ref ?? context.root_ref, 'root_ref');
  const parent_ref = required(spec.parent_ref ?? context.parent_ref, 'parent_ref');
  const project_id = required(spec.project_id, 'project_id');
  const dedupe_key = required(spec.dedupe_key, 'dedupe_key');
  const consumer = required(spec.consumer, 'consumer');
  const gate = spec.gate;
  if (gate == null || (typeof gate === 'string' && !gate.trim())) throw new Error('GUIDE_RECURSION_INVALID:gate_required');
  const definition_of_done = uniq(spec.definition_of_done);
  if (!definition_of_done.length) throw new Error('GUIDE_RECURSION_INVALID:definition_of_done_required');
  const evidence_refs = uniq(spec.evidence_refs);
  if (!evidence_refs.length) throw new Error('GUIDE_RECURSION_INVALID:evidence_refs_required');
  const value_class = required(spec.value_class, 'value_class');
  const priority = Number(spec.priority);
  if (!Number.isFinite(priority)) throw new Error('GUIDE_RECURSION_INVALID:priority_required');

  const semantic_identity = canonicalDiscoveryIdentity({
    root: project_id,
    target: spec.semantic_identity?.target ?? spec.target,
    problem: spec.semantic_identity?.problem ?? spec.problem,
    acceptance: spec.semantic_identity?.acceptance ?? spec.acceptance ?? definition_of_done
  });
  const semantic_fingerprint = discoveryFingerprint(semantic_identity);
  const budget = resolveRecursionBudget(context.owner_override ?? null);
  const parentDepth = Number.isInteger(Number(context.parent_depth)) ? Number(context.parent_depth) : 0;
  const createdAt = context.created_at || context.now || new Date().toISOString();
  const expiresAt = context.expires_at || new Date(asDateMs(createdAt) + budget.proposal_ttl_hours * 3600_000).toISOString();

  return {
    materialize: true,
    stop_reason: null,
    child: {
      parent_ref,
      root_ref,
      project_id,
      dedupe_key,
      dependency_ids: uniq(spec.dependency_ids),
      gate,
      consumer,
      definition_of_done,
      evidence_refs,
      priority,
      value_class,
      required_capabilities: uniq(spec.required_capabilities),
      semantic_identity,
      semantic_fingerprint,
      semantic_pin_ref: `coordination/guide/successor-pins/${semantic_fingerprint}.json`,
      recursive_lineage: {
        root_ref,
        parent_ref,
        depth: parentDepth + 1,
        budget,
        expires_at: expiresAt
      }
    }
  };
}

export function evaluateRecursiveFanIn(children = []) {
  const blocking = children.filter(child => child.blocking !== false && child.superseded !== true);
  const unresolved = blocking.filter(child => !['PASS', 'CONSUMED'].includes(String(child.outcome || '').toUpperCase()));
  const failed = unresolved.filter(child => String(child.outcome || '').toUpperCase() === 'FAIL');
  if (failed.length) {
    return {
      status: 'NEXT_FRONTIER',
      repair_refs: uniq(failed.map(child => child.repair_ref).filter(Boolean)),
      unresolved_refs: uniq(unresolved.map(child => child.ref).filter(Boolean))
    };
  }
  if (unresolved.length) {
    return {
      status: 'WAIT_BLOCKING_CHILDREN',
      repair_refs: [],
      unresolved_refs: uniq(unresolved.map(child => child.ref).filter(Boolean))
    };
  }
  return {status: 'CLOSED', repair_refs: [], unresolved_refs: []};
}

export function recursiveMetrics(events = []) {
  const proposed = events.filter(e => e.type === 'PROPOSED').length;
  const materialized = events.filter(e => e.type === 'MATERIALIZED').length;
  const duplicates = events.filter(e => e.type === 'DUPLICATE_SUPPRESSED').length;
  const claimed = events.filter(e => e.type === 'CLAIMED').length;
  const consumed = events.filter(e => e.type === 'CONSUMED').length;
  const orphaned = events.filter(e => e.type === 'ORPHANED').length;
  const depths = events.map(e => Number(e.depth || 0)).filter(Number.isFinite);
  return {
    children_proposed: proposed,
    children_materialized: materialized,
    duplicates_suppressed: duplicates,
    descendants_claimed: claimed,
    descendants_consumed: consumed,
    orphan_ratio: materialized ? orphaned / materialized : 0,
    max_depth_observed: depths.length ? Math.max(...depths) : 0
  };
}
