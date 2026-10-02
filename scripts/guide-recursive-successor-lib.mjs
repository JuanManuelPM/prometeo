import { canonicalDiscoveryIdentity, discoveryFingerprint } from './discovery-dedup-lib.mjs';
import { compileWorkBlockHandoff, validateCompiledDispatchContract } from './compiled-dispatch-contract-lib.mjs';
import { validateClaimReadyCompiledDispatch } from './compiled-dispatch-claim-ready-validator.mjs';

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

// GUIDE_PLANNER / Guide-derived successor materialization MUST use this wrapper.
// compileGuideSuccessor remains the low-level bounded-recursion primitive for historical fixtures
// and non-dispatch compilation internals; it does not satisfy the pre-dispatch invariant by itself.
export function compileGuideDispatchSuccessor(spec = {}, context = {}) {
  const compiledDispatchContractRef = String(context.compiled_dispatch_contract_ref ?? '').trim();
  if (!compiledDispatchContractRef) {
    return {
      materialize: false,
      stop_reason: 'COMPILED_DISPATCH_CONTRACT_REF_REQUIRED',
      compile_gate: {status: 'FAIL', errors: ['compiled_dispatch_contract_ref_required']}
    };
  }

  const validation = validateClaimReadyCompiledDispatch(context.compiled_dispatch_contract ?? {});
  if (!validation.pass) {
    return {
      materialize: false,
      stop_reason: 'COMPILED_DISPATCH_CONTRACT_FAIL',
      compile_gate: {
        status: 'FAIL',
        errors: validation.errors,
        structural_errors: validation.structural_errors,
        mechanical_errors: validation.mechanical_errors
      }
    };
  }

  const workBlockId = String(spec.work_block_id ?? '').trim();
  if (!workBlockId) {
    return {
      materialize: false,
      stop_reason: 'WORK_BLOCK_ID_REQUIRED',
      compile_gate: {status: 'FAIL', errors: ['work_block_id_required']}
    };
  }

  const handoff = compileWorkBlockHandoff(context.compiled_dispatch_contract, workBlockId, compiledDispatchContractRef);
  if (!handoff.pass) {
    return {
      materialize: false,
      stop_reason: handoff.reason,
      compile_gate: {status: 'FAIL', errors: handoff.errors ?? []}
    };
  }

  const workBlock = handoff.packet.work_block;
  if (String(spec.consumer ?? '').trim() !== String(workBlock.consumer ?? '').trim()) {
    return {
      materialize: false,
      stop_reason: 'WORK_BLOCK_CONSUMER_DRIFT',
      compile_gate: {status: 'FAIL', errors: ['consumer_must_match_compiled_work_block']}
    };
  }
  if (JSON.stringify(uniq(spec.required_capabilities)) !== JSON.stringify(uniq(workBlock.required_capabilities))) {
    return {
      materialize: false,
      stop_reason: 'WORK_BLOCK_CAPABILITY_DRIFT',
      compile_gate: {status: 'FAIL', errors: ['required_capabilities_must_match_compiled_work_block']}
    };
  }

  const compiled = compileGuideSuccessor(spec, context);
  if (!compiled.materialize) {
    return {
      ...compiled,
      compile_gate: {status: 'PASS', errors: [], structural_errors: [], mechanical_errors: []}
    };
  }

  return {
    ...compiled,
    compile_gate: {status: 'PASS', errors: [], structural_errors: [], mechanical_errors: []},
    child: {
      ...compiled.child,
      compiled_dispatch_contract_ref: compiledDispatchContractRef,
      work_block_id: workBlockId,
      organism_refs: handoff.packet.organism_node_refs,
      work_block: handoff.packet.work_block
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

const deepClone = value => JSON.parse(JSON.stringify(value));
const hasOwn = (value, key) => Boolean(value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key));
const subset = (values, allowed) => uniq(values).every(value => allowed.has(value));
const DYNAMIC_AUTHORITY_FIELDS = Object.freeze([
  'allowed_paths',
  'mutation_authority',
  'execution_authority',
  'promotion_authority',
  'authority_override',
  'human_approval',
  'tool_policy',
  'shell_identity',
  'parallelism_request'
]);

export function decideGuideChildMode(proposal = {}) {
  if (proposal.shared_state_intimate === true) return {mode: 'LOCAL', reason: 'INTIMATE_SHARED_STATE'};
  if (proposal.material !== true) return {mode: 'LOCAL', reason: 'INSUFFICIENT_MATERIAL_VALUE'};
  if (proposal.independent !== true) return {mode: 'LOCAL', reason: 'NOT_INDEPENDENT'};
  if (proposal.verifiable !== true) return {mode: 'LOCAL', reason: 'NOT_INDEPENDENTLY_VERIFIABLE'};
  if (!String(proposal.work_block?.consumer ?? proposal.consumer ?? '').trim()) return {mode: 'LOCAL', reason: 'CONSUMER_ABSENT'};
  const handoffCost = Number(proposal.handoff_cost);
  const parallelValue = Number(proposal.parallel_value);
  if (Number.isFinite(handoffCost) && Number.isFinite(parallelValue) && handoffCost > parallelValue) {
    return {mode: 'LOCAL', reason: 'HANDOFF_COST_EXCEEDS_PARALLEL_VALUE'};
  }
  return {mode: 'CHILD', reason: 'MATERIAL_INDEPENDENT_VERIFIABLE'};
}

function dynamicRootEnvelope(contract = {}) {
  const blocks = Array.isArray(contract.decomposition?.blocks) ? contract.decomposition.blocks : [];
  const allowedScope = new Set(blocks.flatMap(block => uniq(block.allowed_scope)));
  const forbiddenScope = new Set(blocks.flatMap(block => uniq(block.forbidden_scope)));
  const capabilities = new Set(blocks.flatMap(block => uniq(block.required_capabilities)));
  const consumers = new Set([
    ...uniq(contract.organism?.consumer_refs),
    ...blocks.map(block => String(block.consumer ?? '').trim()).filter(Boolean)
  ]);
  return {
    allowedScope,
    forbiddenScope,
    capabilities,
    consumers,
    owner_ref: String(contract.reuse_authority?.current_owner_ref ?? '').trim(),
    app_ref: String(contract.organism?.app_ref ?? '').trim(),
    chat_ref: String(contract.organism?.chat_ref ?? '').trim(),
    objective_ref: String(contract.organism?.objective_ref ?? '').trim()
  };
}

function dynamicDriftErrors(proposal, block, contract) {
  const envelope = dynamicRootEnvelope(contract);
  const errors = [];
  const authorityField = DYNAMIC_AUTHORITY_FIELDS.find(field => hasOwn(proposal, field) || hasOwn(block, field));
  if (authorityField) errors.push(`authority_field_forbidden:${authorityField}`);
  if (!subset(block.allowed_scope, envelope.allowedScope)) errors.push('allowed_scope_outside_root_envelope');
  if (!subset(block.required_capabilities, envelope.capabilities)) errors.push('capability_outside_root_envelope');
  if (![...envelope.forbiddenScope].every(item => new Set(uniq(block.forbidden_scope)).has(item))) {
    errors.push('forbidden_scope_weakened');
  }
  if (!envelope.consumers.has(String(block.consumer ?? '').trim())) errors.push('consumer_outside_root_envelope');
  if (String(block.organism_refs?.owner_ref ?? '').trim() !== envelope.owner_ref) errors.push('owner_ref_drift');
  if (String(block.organism_refs?.app_ref ?? '').trim() !== envelope.app_ref) errors.push('app_ref_drift');
  if (String(block.organism_refs?.chat_ref ?? '').trim() !== envelope.chat_ref) errors.push('chat_ref_drift');
  if (String(block.organism_refs?.objective_ref ?? '').trim() !== envelope.objective_ref) errors.push('objective_ref_drift');
  if (String(block.organism_refs?.consumer_ref ?? '').trim() !== String(block.consumer ?? '').trim()) errors.push('consumer_ref_drift');
  const forbiddenInput = uniq(block.input_refs).find(ref =>
    ref === envelope.chat_ref || /^chat:\/\//i.test(ref) || /raw[-_/ ]?private/i.test(ref) || /chat[-_/ ]?history/i.test(ref)
  );
  if (forbiddenInput) errors.push('chat_history_or_private_input_forbidden');
  return errors;
}

function dynamicShadowContract(contract, block) {
  const shadow = deepClone(contract);
  const decomposition = shadow.decomposition ?? (shadow.decomposition = {});
  decomposition.blocks = [...(Array.isArray(decomposition.blocks) ? decomposition.blocks : []), deepClone(block)];
  const dependencies = uniq(block.dependency_ids);
  const newEdges = dependencies.map(from => ({from, to: block.block_id}));
  decomposition.dependency_edges = [...(Array.isArray(decomposition.dependency_edges) ? decomposition.dependency_edges : []), ...newEdges];
  decomposition.parallel_now = uniq(decomposition.blocks.filter(item => uniq(item.dependency_ids).length === 0).map(item => item.block_id));
  decomposition.precompilable_downstream = uniq(decomposition.blocks.filter(item => uniq(item.dependency_ids).length > 0).map(item => item.block_id));
  decomposition.serial_gates = uniq((decomposition.dependency_edges ?? []).map(edge => `${edge.from}->${edge.to}`));

  shadow.organism = shadow.organism ?? {};
  shadow.organism.target_node_refs = uniq([...(shadow.organism.target_node_refs ?? []), block.organism_refs?.target_node_ref]);
  shadow.organism.consumer_refs = uniq([...(shadow.organism.consumer_refs ?? []), block.consumer]);
  shadow.organism.owner_refs = uniq([...(shadow.organism.owner_refs ?? []), block.organism_refs?.owner_ref]);

  shadow.impact = shadow.impact ?? {};
  shadow.impact.affected_node_refs = uniq([...(shadow.impact.affected_node_refs ?? []), block.organism_refs?.target_node_ref]);
  shadow.autonomy_closure = shadow.autonomy_closure ?? {};
  shadow.autonomy_closure.return_consumers = uniq([...(shadow.autonomy_closure.return_consumers ?? []), block.consumer]);

  shadow.capacity_plan = shadow.capacity_plan ?? {};
  const ready = new Set(uniq(shadow.capacity_plan.ready_block_ids));
  if (block.dispatch_ready === true) ready.add(block.block_id);
  shadow.capacity_plan.ready_block_ids = [...ready].sort();
  const prepared = shadow.capacity_plan.ready_block_ids.length
    + uniq(shadow.capacity_plan.reserve_refs).length
    + uniq(shadow.capacity_plan.recovery_refs).length;
  decomposition.useful_capacity = prepared;
  const live = Number(shadow.capacity_plan.live_compatible_count || 0);
  shadow.capacity_plan.capacity_request = Math.max(0, prepared - live);
  return shadow;
}

export function compileGuideDynamicChildProposal(proposal = {}, context = {}) {
  const mode = decideGuideChildMode(proposal);
  if (mode.mode === 'LOCAL') {
    return {materialize: false, stop_reason: 'LOCAL_EXECUTION_PREFERRED', dynamic_subcompile: mode};
  }

  const contract = context.compiled_dispatch_contract ?? {};
  const rootValidation = validateCompiledDispatchContract(contract);
  if (!rootValidation.pass) {
    return {
      materialize: false,
      stop_reason: 'COMPILED_DISPATCH_CONTRACT_FAIL',
      compile_gate: {status: 'FAIL', errors: rootValidation.errors},
      dynamic_subcompile: {...mode, status: 'FAIL'}
    };
  }

  const block = deepClone(proposal.work_block ?? {});
  const existing = Array.isArray(contract.decomposition?.blocks) ? contract.decomposition.blocks : [];
  if (existing.some(item => String(item.semantic_key ?? '').trim() === String(block.semantic_key ?? '').trim())) {
    return {
      materialize: false,
      stop_reason: 'SEMANTIC_DUPLICATE_OR_SUPERSEDED',
      dynamic_subcompile: {...mode, status: 'SUPPRESSED', duplicate: true}
    };
  }

  const driftErrors = dynamicDriftErrors(proposal, block, contract);
  if (driftErrors.length) {
    return {
      materialize: false,
      stop_reason: driftErrors.some(error => error.startsWith('authority_field_forbidden:'))
        ? 'DYNAMIC_CHILD_AUTHORITY_DRIFT'
        : 'DYNAMIC_CHILD_ENVELOPE_DRIFT',
      compile_gate: {status: 'FAIL', errors: driftErrors},
      dynamic_subcompile: {...mode, status: 'FAIL'}
    };
  }

  const spec = {
    root_ref: proposal.root_ref ?? context.root_ref,
    parent_ref: proposal.parent_ref ?? context.parent_ref,
    project_id: proposal.project_id,
    dedupe_key: proposal.dedupe_key,
    dependency_ids: uniq(block.dependency_ids),
    gate: proposal.gate,
    consumer: block.consumer,
    definition_of_done: uniq(block.done_when),
    evidence_refs: uniq([...(proposal.evidence_refs ?? []), ...(block.evidence_refs ?? [])]),
    priority: proposal.priority,
    value_class: proposal.value_class,
    required_capabilities: uniq(block.required_capabilities),
    target: proposal.target ?? block.organism_refs?.target_node_ref,
    problem: proposal.problem,
    acceptance: proposal.acceptance ?? block.done_when,
    work_block_id: block.block_id
  };

  const stop = recursiveStopReason(spec, context);
  if (stop) {
    return {
      materialize: false,
      stop_reason: stop,
      dynamic_subcompile: {...mode, status: 'SUPPRESSED'}
    };
  }

  const shadow = dynamicShadowContract(contract, block);
  const shadowValidation = validateCompiledDispatchContract(shadow);
  if (!shadowValidation.pass) {
    return {
      materialize: false,
      stop_reason: 'DYNAMIC_CHILD_SUBCOMPILE_FAIL',
      compile_gate: {status: 'FAIL', errors: shadowValidation.errors},
      dynamic_subcompile: {...mode, status: 'FAIL'}
    };
  }

  const compiled = compileGuideDispatchSuccessor(spec, {
    ...context,
    compiled_dispatch_contract: shadow
  });
  return {
    ...compiled,
    dynamic_subcompile: {
      ...mode,
      status: compiled.materialize ? 'PASS' : 'FAIL',
      root_compiled_dispatch_contract_ref: String(context.compiled_dispatch_contract_ref ?? '').trim(),
      root_current_owner_ref: String(contract.reuse_authority?.current_owner_ref ?? '').trim(),
      materialization_gate: 'EXISTING_GUIDE_SUCCESSOR_WRAPPER',
      claimable_after_materialization: compiled.materialize === true && block.dispatch_ready === true,
      blocking: proposal.blocking !== false
    }
  };
}
