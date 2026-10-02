import crypto from 'node:crypto';

export const COMPILED_DISPATCH_SCHEMA = 'prometeo.compiled-dispatch-contract/v1';
export const COMPILED_DISPATCH_AUTHORITY = 'EVIDENCE_GATE_ONLY_NO_SCHEDULING_OR_PROMOTION_AUTHORITY';
export const SPECIFICATION_ASSURANCE_SCHEMA = 'prometeo.specification-assurance/v1';
export const SPECIFICATION_QUESTION_POLICY = 'CONTEXTUAL_INFORMATION_GAIN_ONLY';
export const FAILURE_ORDER = Object.freeze([
  'SUCCESS',
  'SAFE_PARTIAL',
  'KNOWN_REPAIR',
  'CAPABILITY_REALLOCATION',
  'RECOVERY',
  'DECOMPOSE_AROUND_BLOCKER',
  'HARD_BOUNDARY'
]);

const REQUIRED_SECTIONS = Object.freeze([
  'intent',
  'organism',
  'reuse_authority',
  'evidence',
  'impact',
  'decomposition',
  'handoff_sufficiency',
  'qa_recovery',
  'future_branches',
  'autonomy_closure'
]);
const REQUIRED_ORGANISM_BINDINGS = Object.freeze([
  'app_ref', 'chat_ref', 'objective_ref', 'target_node_ref', 'owner_ref', 'consumer_ref'
]);

const arr = value => Array.isArray(value) ? value : [];
const str = value => String(value ?? '').trim();
const uniq = values => [...new Set(arr(values).map(str).filter(Boolean))].sort();
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
const push = (errors, condition, code) => { if (!condition) errors.push(code); };
const lower = value => str(value).toLowerCase();

function weakHumanSuccessTest(value) {
  const text = lower(value);
  if (text.length < 12) return true;
  const observableTerms = ['see', 'show', 'pass', 'verify', 'observe', 'visible', 'works', 'funciona', 'verific', 'muestra', 'puede', 'can '];
  return !observableTerms.some(term => text.includes(term));
}

function resolvedValue(resolutions, id) {
  const value = resolutions?.[id];
  if (Array.isArray(value)) return value.map(str).filter(Boolean).join('; ');
  if (isObject(value)) return str(value.resolution ?? value.value ?? value.answer);
  return str(value);
}

export function compileSpecificationAssurance(contract = {}, signals = {}) {
  const intent = contract.intent || {};
  const reuse = contract.reuse_authority || {};
  const evidence = contract.evidence || {};
  const decomposition = contract.decomposition || {};
  const stored = isObject(contract.specification_assurance) ? contract.specification_assurance : {};
  const storedSignals = isObject(stored.signals) ? stored.signals : {};
  const mergedSignals = {...storedSignals, ...(isObject(signals) ? signals : {})};
  const resolutions = isObject(stored.resolutions) ? stored.resolutions : {};
  const questions = [];

  const addQuestion = (id, dimension, trigger, question, whyItMatters) => {
    if (!trigger) return;
    const resolution = resolvedValue(resolutions, id);
    questions.push({
      id,
      dimension,
      question,
      trigger: whyItMatters,
      information_gain: 'HIGH',
      blocking: !resolution,
      resolution: resolution || null
    });
  };

  const missingIntent = [
    ['requested', 'SPEC_REQUESTED', '¿Qué pedido concreto debe preservar la compilación?', 'literal human ask is absent'],
    ['observable_outcome', 'SPEC_OUTCOME', '¿Qué resultado observable debe quedar cierto al terminar?', 'observable desired outcome is absent'],
    ['human_success_test', 'SPEC_HUMAN_TEST', '¿Cómo puede una persona reconocer que el resultado funciona?', 'human success test is absent']
  ];
  for (const [field, id, question, reason] of missingIntent) {
    addQuestion(id, 'FIDELITY', !str(intent[field]), question, reason);
  }
  addQuestion(
    'SPEC_NON_GOALS',
    'FIDELITY',
    !Array.isArray(intent.non_goals),
    '¿Qué resultados o efectos deben quedar explícitamente fuera de alcance?',
    'non-goals are not durably represented'
  );

  addQuestion(
    'SPEC_LITERAL_OUTCOME_CONFLICT',
    'FIDELITY',
    mergedSignals.literal_request_conflicts_with_outcome === true,
    'El pedido literal y el resultado observable apuntan en direcciones distintas. ¿Cuál debe gobernar y qué parte literal debe preservarse?',
    'literal fulfillment could violate the desired observable outcome'
  );

  const metrics = arr(intent.success_metrics ?? stored.success_metrics);
  const antiGaming = arr(stored.anti_gaming_constraints);
  addQuestion(
    'SPEC_METRIC_GAMING',
    'ANTI_FULFILLMENT',
    mergedSignals.metric_gaming_risk === true || (metrics.length > 0 && antiGaming.length === 0),
    '¿Qué comportamiento contaría como “ganar la métrica” pero fallar el objetivo, y qué constraint observable lo impide?',
    'a metric can be optimized while breaking the actual objective'
  );

  addQuestion(
    'SPEC_OWNER_REUSE',
    'OWNER_REUSE',
    mergedSignals.owner_or_reuse_omitted === true || !str(reuse.current_owner_ref) || arr(reuse.reuse).length === 0,
    '¿Qué owner/capability CURRENT debe reutilizarse y qué mecanismo duplicado queda prohibido?',
    'owner or reuse binding is missing or explicitly flagged as omitted'
  );

  addQuestion(
    'SPEC_HUMAN_TEST_INCOMPLETE',
    'VERIFICATION',
    mergedSignals.human_test_incomplete === true || (!!str(intent.human_success_test) && weakHumanSuccessTest(intent.human_success_test)),
    'El human success test no parece producir una observación verificable. ¿Qué evidencia concreta debe poder inspeccionarse?',
    'acceptance cannot be independently recognized from the durable test'
  );

  addQuestion(
    'SPEC_FUTURE_CONDITION',
    'FUTURE_BRANCHES',
    mergedSignals.foreseeable_condition_changes_decomposition === true,
    '¿Qué condición futura previsible cambiaría la descomposición, y cuál es la rama correspondiente si ocurre?',
    'a foreseeable condition would change the correct decomposition'
  );

  addQuestion(
    'SPEC_GRANULARITY_PARALLELISM',
    'DECOMPOSITION',
    mergedSignals.granularity_or_parallelism_uncertain === true,
    '¿Qué dependencia o shared-state constraint impide separar o paralelizar estos bloques con seguridad?',
    'granularity or parallelism is uncertain enough to change WorkBlock boundaries'
  );

  addQuestion(
    'SPEC_VERIFICATION_GAP',
    'VERIFICATION',
    mergedSignals.verification_incomplete === true || arr(evidence.evidence_refs).length === 0,
    '¿Qué evidencia durable permite verificar el resultado sin depender del chat original?',
    'verification evidence is absent or explicitly incomplete'
  );

  const unresolved = questions.filter(item => item.blocking).map(item => item.id);
  const reconstruction = {
    requested: str(intent.requested),
    observable_outcome: str(intent.observable_outcome),
    non_goals: uniq(intent.non_goals),
    human_success_test: str(intent.human_success_test),
    current_owner_ref: str(reuse.current_owner_ref),
    reuse_refs: uniq(reuse.reuse),
    evidence_refs: uniq(evidence.evidence_refs),
    work_block_ids: uniq(arr(decomposition.blocks).map(block => block?.block_id)),
    private_history_required: false
  };

  return {
    schema: SPECIFICATION_ASSURANCE_SCHEMA,
    policy: SPECIFICATION_QUESTION_POLICY,
    status: unresolved.length === 0 ? 'PASS' : 'NEEDS_CLARIFICATION',
    intent_contract: {
      requested: reconstruction.requested,
      observable_outcome: reconstruction.observable_outcome,
      non_goals: reconstruction.non_goals,
      human_success_test: reconstruction.human_success_test
    },
    signals: mergedSignals,
    resolutions,
    questions,
    unresolved_blocking_question_ids: unresolved,
    reconstruction,
    private_history_required: false
  };
}

export function validateSpecificationAssuranceRecord(record = {}, contract = {}) {
  const errors = [];
  push(errors, record.schema === SPECIFICATION_ASSURANCE_SCHEMA, 'SPEC:SCHEMA_INVALID');
  push(errors, record.policy === SPECIFICATION_QUESTION_POLICY, 'SPEC:QUESTION_POLICY_INVALID');
  push(errors, record.private_history_required === false, 'SPEC:PRIVATE_HISTORY_MUST_NOT_BE_REQUIRED');
  push(errors, isObject(record.intent_contract), 'SPEC:INTENT_CONTRACT_REQUIRED');
  push(errors, Array.isArray(record.questions), 'SPEC:QUESTIONS_ARRAY_REQUIRED');
  push(errors, Array.isArray(record.unresolved_blocking_question_ids), 'SPEC:UNRESOLVED_ARRAY_REQUIRED');
  push(errors, isObject(record.reconstruction), 'SPEC:RECONSTRUCTION_REQUIRED');
  push(errors, record.reconstruction?.private_history_required === false, 'SPEC:RECONSTRUCTION_PRIVATE_HISTORY_MUST_BE_FALSE');

  const intent = contract.intent || {};
  if (isObject(record.intent_contract)) {
    push(errors, str(record.intent_contract.requested) === str(intent.requested), 'SPEC:REQUESTED_DRIFT');
    push(errors, str(record.intent_contract.observable_outcome) === str(intent.observable_outcome), 'SPEC:OUTCOME_DRIFT');
    push(errors, JSON.stringify(uniq(record.intent_contract.non_goals)) === JSON.stringify(uniq(intent.non_goals)), 'SPEC:NON_GOALS_DRIFT');
    push(errors, str(record.intent_contract.human_success_test) === str(intent.human_success_test), 'SPEC:HUMAN_TEST_DRIFT');
  }

  const unresolved = arr(record.unresolved_blocking_question_ids).map(str).filter(Boolean);
  const blockingQuestionIds = arr(record.questions).filter(q => q?.blocking === true).map(q => str(q.id)).filter(Boolean);
  push(errors, JSON.stringify(uniq(unresolved)) === JSON.stringify(uniq(blockingQuestionIds)), 'SPEC:UNRESOLVED_BLOCKING_MISMATCH');
  push(errors, unresolved.length === 0, `SPEC:UNRESOLVED_BLOCKING:${unresolved.join(',') || 'unknown'}`);
  push(errors, record.status === 'PASS', 'SPEC:STATUS_NOT_PASS');

  for (const question of arr(record.questions)) {
    push(errors, !!str(question?.id), 'SPEC:QUESTION_ID_REQUIRED');
    push(errors, !!str(question?.dimension), `SPEC:${str(question?.id) || 'unknown'}:DIMENSION_REQUIRED`);
    push(errors, !!str(question?.question), `SPEC:${str(question?.id) || 'unknown'}:QUESTION_REQUIRED`);
    push(errors, question?.information_gain === 'HIGH', `SPEC:${str(question?.id) || 'unknown'}:INFORMATION_GAIN_HIGH_REQUIRED`);
  }

  return {pass: errors.length === 0, status: errors.length ? 'FAIL' : 'PASS', errors};
}

function validateBlock(block, errors, blockIds) {
  const id = str(block?.block_id);
  push(errors, !!id, 'E7:block_id_required');
  if (id) {
    push(errors, !blockIds.has(id), `E7:duplicate_block_id:${id}`);
    blockIds.add(id);
  }
  push(errors, block?.new_worker_executable === true, `E7:${id || 'unknown'}:new_worker_executable_must_be_true`);
  push(errors, arr(block?.input_refs).filter(Boolean).length > 0, `E7:${id || 'unknown'}:input_refs_required`);
  push(errors, !!str(block?.output_contract), `E7:${id || 'unknown'}:output_contract_required`);
  push(errors, arr(block?.allowed_scope).filter(Boolean).length > 0, `E7:${id || 'unknown'}:allowed_scope_required`);
  push(errors, Array.isArray(block?.forbidden_scope), `E7:${id || 'unknown'}:forbidden_scope_array_required`);
  push(errors, arr(block?.done_when).filter(Boolean).length > 0, `E7:${id || 'unknown'}:done_when_required`);
  push(errors, arr(block?.evidence_refs).filter(Boolean).length > 0, `E7:${id || 'unknown'}:evidence_refs_required`);
  push(errors, Array.isArray(block?.required_capabilities), `E7:${id || 'unknown'}:required_capabilities_array_required`);
  push(errors, !!str(block?.consumer), `E7:${id || 'unknown'}:consumer_required`);
  push(errors, !!str(block?.semantic_key), `E7:${id || 'unknown'}:semantic_key_required`);
  push(errors, isObject(block?.organism_refs), `E7:${id || 'unknown'}:organism_refs_required`);
  for (const key of REQUIRED_ORGANISM_BINDINGS) {
    push(errors, !!str(block?.organism_refs?.[key]), `E7:${id || 'unknown'}:organism_${key}_required`);
  }
  if (str(block?.consumer) && str(block?.organism_refs?.consumer_ref)) {
    push(errors, str(block.consumer) === str(block.organism_refs.consumer_ref), `E7:${id}:consumer_binding_mismatch`);
  }
}

export function validateCompiledDispatchContract(contract = {}) {
  const errors = [];
  push(errors, contract.schema === COMPILED_DISPATCH_SCHEMA, 'SCHEMA_INVALID');
  push(errors, contract.authority === COMPILED_DISPATCH_AUTHORITY, 'AUTHORITY_INVALID');
  push(errors, contract.status === 'PASS', 'STATUS_NOT_PASS');
  push(errors, /^P[0-4]$/.test(str(contract.planning_depth)), 'PLANNING_DEPTH_INVALID');

  for (const section of REQUIRED_SECTIONS) push(errors, isObject(contract[section]), `SECTION_REQUIRED:${section}`);

  const e1 = contract.intent || {};
  push(errors, !!str(e1.requested), 'E1:requested_required');
  push(errors, !!str(e1.observable_outcome), 'E1:observable_outcome_required');
  push(errors, !!str(e1.request_class), 'E1:request_class_required');
  push(errors, Array.isArray(e1.non_goals), 'E1:non_goals_array_required');
  push(errors, !!str(e1.human_success_test), 'E1:human_success_test_required');

  const e2 = contract.organism || {};
  push(errors, !!str(e2.app_ref), 'E2:app_ref_required');
  push(errors, !!str(e2.chat_ref), 'E2:chat_ref_required');
  push(errors, !!str(e2.objective_ref), 'E2:objective_ref_required');
  for (const key of ['target_node_refs','parent_refs','consumer_refs','current_refs','candidate_refs','owner_refs','artifact_refs']) {
    push(errors, Array.isArray(e2[key]), `E2:${key}_array_required`);
  }

  const e3 = contract.reuse_authority || {};
  push(errors, !!str(e3.current_owner_ref), 'E3:current_owner_ref_required');
  push(errors, arr(e3.existing_mechanisms).length > 0, 'E3:existing_mechanisms_required');
  push(errors, arr(e3.reuse).length > 0, 'E3:reuse_required');
  push(errors, Array.isArray(e3.forbidden_duplicates), 'E3:forbidden_duplicates_array_required');
  push(errors, !!str(e3.authority_projection_boundary), 'E3:authority_projection_boundary_required');

  const e4 = contract.evidence || {};
  push(errors, Array.isArray(e4.known), 'E4:known_array_required');
  push(errors, Array.isArray(e4.unknown), 'E4:unknown_array_required');
  push(errors, arr(e4.evidence_refs).length > 0, 'E4:evidence_refs_required');
  push(errors, Array.isArray(e4.stale_refs), 'E4:stale_refs_array_required');
  push(errors, Array.isArray(e4.fresh_checks), 'E4:fresh_checks_array_required');
  push(errors, !!str(e4.truth_boundary), 'E4:truth_boundary_required');

  const e5 = contract.impact || {};
  push(errors, Array.isArray(e5.mutate), 'E5:mutate_array_required');
  push(errors, Array.isArray(e5.preserve), 'E5:preserve_array_required');
  push(errors, Array.isArray(e5.affected_node_refs), 'E5:affected_node_refs_array_required');
  push(errors, Array.isArray(e5.security_privacy), 'E5:security_privacy_array_required');
  push(errors, !!str(e5.rollback_baseline), 'E5:rollback_baseline_required');
  push(errors, !!str(e5.scope_limit), 'E5:scope_limit_required');

  const e6 = contract.decomposition || {};
  push(errors, Array.isArray(e6.blocks), 'E6:blocks_array_required');
  push(errors, Array.isArray(e6.dependency_edges), 'E6:dependency_edges_array_required');
  push(errors, Array.isArray(e6.parallel_now), 'E6:parallel_now_array_required');
  push(errors, Array.isArray(e6.serial_gates), 'E6:serial_gates_array_required');
  push(errors, Array.isArray(e6.precompilable_downstream), 'E6:precompilable_downstream_array_required');
  push(errors, Array.isArray(e6.fuse_blocks), 'E6:fuse_blocks_array_required');
  push(errors, Number.isInteger(e6.useful_capacity) && e6.useful_capacity >= 0, 'E6:useful_capacity_nonnegative_integer_required');

  const blockIds = new Set();
  const semanticKeys = new Set();
  for (const block of arr(e6.blocks)) {
    validateBlock(block, errors, blockIds);
    const semantic = str(block?.semantic_key);
    if (semantic) {
      push(errors, !semanticKeys.has(semantic), `E7:semantic_duplicate:${semantic}`);
      semanticKeys.add(semantic);
    }
  }
  for (const edge of arr(e6.dependency_edges)) {
    push(errors, blockIds.has(str(edge?.from)), `E6:edge_from_unknown:${str(edge?.from)}`);
    push(errors, blockIds.has(str(edge?.to)), `E6:edge_to_unknown:${str(edge?.to)}`);
  }

  const e7 = contract.handoff_sufficiency || {};
  push(errors, e7.all_children_new_worker_executable === true, 'E7:all_children_new_worker_executable_required');
  push(errors, e7.packet_shape === 'compiled_dispatch_contract_ref+organism_node_refs+work_block', 'E7:packet_shape_invalid');
  push(errors, e7.no_chat_history_required === true, 'E7:no_chat_history_required');

  const e8 = contract.qa_recovery || {};
  push(errors, !!str(e8.qa_profile), 'E8:qa_profile_required');
  push(errors, Array.isArray(e8.self_checks), 'E8:self_checks_array_required');
  push(errors, Array.isArray(e8.independent_checks), 'E8:independent_checks_array_required');
  push(errors, Array.isArray(e8.known_failure_branches), 'E8:known_failure_branches_array_required');
  push(errors, !!str(e8.recovery), 'E8:recovery_required');
  push(errors, !!str(e8.hard_boundary_condition), 'E8:hard_boundary_condition_required');

  const e9 = contract.future_branches || {};
  for (const key of ['ON_PASS','ON_PARTIAL','ON_FAIL','ON_CORRECTION','ON_SCALE','ON_DEPENDENCY_DOWN']) push(errors, has(e9, key), `E9:${key}_required`);

  const e10 = contract.autonomy_closure || {};
  push(errors, Array.isArray(e10.autonomous_without_human), 'E10:autonomous_without_human_array_required');
  push(errors, Array.isArray(e10.return_consumers), 'E10:return_consumers_array_required');
  push(errors, !!str(e10.closer), 'E10:closer_required');
  push(errors, !!str(e10.done_condition), 'E10:done_condition_required');
  push(errors, !!str(e10.successor_policy), 'E10:successor_policy_required');
  push(errors, Array.isArray(e10.telemetry), 'E10:telemetry_array_required');
  push(errors, !!str(e10.orphan_check), 'E10:orphan_check_required');

  const cp = contract.capacity_plan || {};
  push(errors, isObject(cp), 'CAPACITY:plan_required');
  push(errors, Array.isArray(cp.ready_block_ids), 'CAPACITY:ready_block_ids_array_required');
  push(errors, Array.isArray(cp.reserve_refs), 'CAPACITY:reserve_refs_array_required');
  push(errors, Array.isArray(cp.recovery_refs), 'CAPACITY:recovery_refs_array_required');
  push(errors, Number.isInteger(cp.live_compatible_count) && cp.live_compatible_count >= 0, 'CAPACITY:live_compatible_count_required');
  push(errors, Number.isInteger(cp.capacity_request) && cp.capacity_request >= 0, 'CAPACITY:capacity_request_required');

  const blocksById = new Map(arr(e6.blocks).map(block => [str(block.block_id), block]));
  const readyIds = uniq(cp.ready_block_ids);
  for (const id of readyIds) {
    const block = blocksById.get(id);
    push(errors, !!block, `CAPACITY:ready_block_unknown:${id}`);
    if (block) push(errors, block.dispatch_ready === true, `CAPACITY:ready_block_not_dispatch_ready:${id}`);
  }
  const prepared = readyIds.length + uniq(cp.reserve_refs).length + uniq(cp.recovery_refs).length;
  const expectedCapacityRequest = Math.max(0, prepared - Number(cp.live_compatible_count || 0));
  push(errors, Number(cp.capacity_request) === expectedCapacityRequest, `CAPACITY:request_mismatch:expected_${expectedCapacityRequest}`);
  push(errors, Number(e6.useful_capacity) === prepared, `CAPACITY:useful_capacity_mismatch:expected_${prepared}`);

  let specificationAssurance = null;
  if (isObject(contract.specification_assurance)) {
    specificationAssurance = validateSpecificationAssuranceRecord(contract.specification_assurance, contract);
    for (const error of specificationAssurance.errors) errors.push(error);
  }

  return {
    pass: errors.length === 0,
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errors,
    block_count: blockIds.size,
    prepared_units: prepared,
    expected_capacity_request: expectedCapacityRequest,
    specification_assurance: specificationAssurance
  };
}

export function deriveCapacityRequest(contract = {}) {
  const validation = validateCompiledDispatchContract(contract);
  if (!validation.pass) return {pass: false, capacity_request: 0, errors: validation.errors};
  return {
    pass: true,
    capacity_request: validation.expected_capacity_request,
    prepared_units: validation.prepared_units,
    live_compatible_count: contract.capacity_plan.live_compatible_count
  };
}

export function compileWorkBlockHandoff(contract = {}, blockId, compiledDispatchContractRef) {
  const validation = validateCompiledDispatchContract(contract);
  if (!validation.pass) return {pass: false, reason: 'COMPILED_DISPATCH_CONTRACT_FAIL', errors: validation.errors};
  const block = arr(contract.decomposition.blocks).find(item => str(item.block_id) === str(blockId));
  if (!block) return {pass: false, reason: 'WORK_BLOCK_NOT_FOUND', errors: []};
  if (block.new_worker_executable !== true) return {pass: false, reason: 'HANDOFF_INSUFFICIENT', errors: []};
  return {
    pass: true,
    packet: {
      compiled_dispatch_contract_ref: str(compiledDispatchContractRef),
      organism_node_refs: {...block.organism_refs},
      work_block: JSON.parse(JSON.stringify(block))
    }
  };
}

export function affectedBlocksForCorrection(contract = {}, changedBlockIds = []) {
  const changed = new Set(uniq(changedBlockIds));
  const edges = arr(contract?.decomposition?.dependency_edges);
  let advanced = true;
  while (advanced) {
    advanced = false;
    for (const edge of edges) {
      const from = str(edge?.from);
      const to = str(edge?.to);
      if (changed.has(from) && to && !changed.has(to)) {
        changed.add(to);
        advanced = true;
      }
    }
  }
  return [...changed].sort();
}

export function classifyFailure(failure = {}) {
  if (failure.success === true) return 'SUCCESS';
  if (failure.safe_partial === true) return 'SAFE_PARTIAL';
  if (failure.known_repair === true) return 'KNOWN_REPAIR';
  if (failure.capability_unavailable === true) return 'CAPABILITY_REALLOCATION';
  if (failure.recovery_available === true) return 'RECOVERY';
  if (failure.decomposable_around_blocker === true) return 'DECOMPOSE_AROUND_BLOCKER';
  if (failure.hard_boundary_proven === true) return 'HARD_BOUNDARY';
  return 'RECOVERY';
}

export function orphanAudit(contract = {}) {
  const orphans = [];
  for (const block of arr(contract?.decomposition?.blocks)) {
    const bindingOk = REQUIRED_ORGANISM_BINDINGS.every(key => !!str(block?.organism_refs?.[key]));
    if (!bindingOk || !str(block?.consumer)) orphans.push(str(block?.block_id) || 'unknown');
  }
  return {pass: orphans.length === 0, promotion_ready: orphans.length === 0, orphan_block_ids: orphans};
}

export function contractDigest(contract = {}) {
  return crypto.createHash('sha256').update(JSON.stringify(contract)).digest('hex');
}
