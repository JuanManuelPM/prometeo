import {
  compileWorkBlockHandoff,
  validateCompiledDispatchContract
} from './compiled-dispatch-contract-lib.mjs';

export const PRIMARY_CHAT_RESPONSE_REQUEST_PUBLIC_SCHEMA = 'prometeo.primary-chat-response-request-public-projection/v1';
export const PRIMARY_CHAT_RESPONSE_FANOUT_SCHEMA = 'prometeo.primary-chat-response-fanout/v1';
export const PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT = 4;

const RAW_FIELD_NAMES = new Set([
  'text',
  'raw_text',
  'private_text',
  'private_payload',
  'prompt',
  'transcript',
  'messages'
]);

const clone = value => JSON.parse(JSON.stringify(value));
const arr = value => Array.isArray(value) ? value : [];
const uniq = values => [...new Set(arr(values).map(String).map(v => v.trim()).filter(Boolean))].sort();

function required(value, field) {
  const out = String(value ?? '').trim();
  if (!out) throw new Error(`PRIMARY_CHAT_RESPONSE_FANOUT_INVALID:${field}_required`);
  return out;
}

function rawFieldPath(value, prefix = '') {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const hit = rawFieldPath(value[i], `${prefix}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value)) {
    const normalized = String(key).toLowerCase();
    const path = prefix ? `${prefix}.${key}` : key;
    if (RAW_FIELD_NAMES.has(normalized)) return path;
    const nested = rawFieldPath(child, path);
    if (nested) return nested;
  }
  return null;
}

function validateRequestProjection(request = {}) {
  const errors = [];
  if (request.schema !== PRIMARY_CHAT_RESPONSE_REQUEST_PUBLIC_SCHEMA) errors.push('REQUEST_SCHEMA_INVALID');
  if (!String(request.request_id ?? '').trim()) errors.push('REQUEST_ID_REQUIRED');
  if (request.routing !== 'CURRENT_WORK_GRAPH') errors.push('REQUEST_ROUTING_MUST_BE_CURRENT_WORK_GRAPH');
  if (request.priority !== 'HIGH') errors.push('REQUEST_PRIORITY_MUST_BE_HIGH');
  if (Number(request.requested_candidate_count) !== PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT) {
    errors.push('REQUEST_CANDIDATE_COUNT_MUST_BE_4');
  }
  if (request.counts_are_targets_not_claims !== true) errors.push('REQUEST_COUNTS_MUST_BE_TARGETS_NOT_CLAIMS');
  if (request.raw_text_public !== false) errors.push('REQUEST_RAW_TEXT_PUBLIC_MUST_BE_FALSE');
  const forbidden = rawFieldPath(request);
  if (forbidden) errors.push(`REQUEST_RAW_FIELD_FORBIDDEN:${forbidden}`);
  return {pass: errors.length === 0, errors};
}

function requestKey(requestId) {
  return required(requestId, 'request_id')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'request';
}

function candidateBlock(template, {
  requestId,
  requestProjectionRef,
  rootContractRef,
  ordinal
}) {
  const suffix = String(ordinal).padStart(2, '0');
  const key = requestKey(requestId);
  const targetBase = required(template.organism_refs?.target_node_ref, 'template_target_node_ref');
  const consumer = required(template.consumer, 'template_consumer');
  const blockId = `primary-chat-response-${key}-c${suffix}`;
  const targetRef = `${targetBase}/response-candidate/${key}/c${suffix}`;
  return {
    ...clone(template),
    block_id: blockId,
    semantic_key: `primary-chat:response:${requestId}:candidate:${ordinal}:v1`,
    new_worker_executable: true,
    input_refs: uniq([
      requestProjectionRef,
      'current-tree/control-v11/ingress-v1.js'
    ]),
    output_contract: `prometeo.primary-chat-response-candidate/v1 request_id=${requestId} candidate=${ordinal}; payload resolved post-claim through existing private ingress`,
    allowed_scope: uniq(template.allowed_scope),
    forbidden_scope: uniq([
      ...arr(template.forbidden_scope),
      'public raw/private prompt persistence',
      'claiming multi-worker execution before durable independent returns',
      'new scheduler/queue/CURRENT/authority'
    ]),
    done_when: [
      `Candidate ${ordinal} produces one independently reconstructible response artifact for request ${requestId}.`,
      'The candidate cites only durable/sanitized evidence refs publicly; raw private prompt text remains in the existing private ingress.',
      'RETURN is durable before this candidate can count toward multi-worker response synthesis.'
    ],
    evidence_refs: uniq([
      ...arr(template.evidence_refs),
      requestProjectionRef,
      rootContractRef,
      'coordination/experiments/PROMETEO-PRIMARY-CHAT-INDEPENDENCE-V1/WORK_GRAPH.json',
      'coordination/guide/PRIMARY_CHAT_RESPONSE_FANOUT_CONTRACT_V1.json'
    ]),
    required_capabilities: uniq(template.required_capabilities),
    consumer,
    dependency_ids: [],
    dispatch_ready: true,
    request_id: requestId,
    candidate_ordinal: ordinal,
    candidate_count_target: PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT,
    counts_are_targets_not_claims: true,
    actual_worker_return_required: true,
    runtime_binding: {
      request_id: requestId,
      payload_owner_ref: 'current-tree/control-v11/ingress-v1.js',
      payload_resolution: 'POST_CLAIM_PRIVATE_INGRESS',
      raw_text_public: false
    },
    organism_refs: {
      ...clone(template.organism_refs),
      target_node_ref: targetRef,
      consumer_ref: consumer
    }
  };
}

export function compilePrimaryChatResponseFanout({
  root_contract,
  root_contract_ref,
  request_projection,
  request_projection_ref,
  template_work_block_id
} = {}) {
  const rootContractRef = required(root_contract_ref, 'root_contract_ref');
  const requestProjectionRef = required(request_projection_ref, 'request_projection_ref');
  const templateId = required(template_work_block_id, 'template_work_block_id');

  const requestValidation = validateRequestProjection(request_projection ?? {});
  if (!requestValidation.pass) {
    return {pass: false, status: 'FAIL', errors: requestValidation.errors};
  }

  const root = clone(root_contract ?? {});
  const rootValidation = validateCompiledDispatchContract(root);
  if (!rootValidation.pass) {
    return {pass: false, status: 'FAIL', errors: rootValidation.errors.map(error => `ROOT:${error}`)};
  }

  const template = arr(root.decomposition?.blocks).find(block => String(block.block_id) === templateId);
  if (!template) return {pass: false, status: 'FAIL', errors: ['TEMPLATE_WORK_BLOCK_NOT_FOUND']};
  if (template.new_worker_executable !== true || template.dispatch_ready !== true) {
    return {pass: false, status: 'FAIL', errors: ['TEMPLATE_MUST_BE_READY_NEW_WORKER_EXECUTABLE']};
  }
  if (arr(template.dependency_ids).length !== 0) {
    return {pass: false, status: 'FAIL', errors: ['TEMPLATE_MUST_HAVE_NO_DEPENDENCIES']};
  }

  const requestId = required(request_projection.request_id, 'request_id');
  const candidates = Array.from({length: PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT}, (_, index) =>
    candidateBlock(template, {
      requestId,
      requestProjectionRef,
      rootContractRef,
      ordinal: index + 1
    })
  );

  const out = clone(root);
  out.decomposition.blocks = [...arr(out.decomposition.blocks), ...candidates];
  out.decomposition.parallel_now = uniq([
    ...arr(out.decomposition.parallel_now),
    ...candidates.map(block => block.block_id)
  ]);
  out.organism.target_node_refs = uniq([
    ...arr(out.organism.target_node_refs),
    ...candidates.map(block => block.organism_refs.target_node_ref)
  ]);
  out.organism.candidate_refs = uniq([
    ...arr(out.organism.candidate_refs),
    ...candidates.map(block => `${requestProjectionRef}#candidate-${String(block.candidate_ordinal).padStart(2, '0')}`)
  ]);
  out.organism.consumer_refs = uniq([
    ...arr(out.organism.consumer_refs),
    ...candidates.map(block => block.consumer)
  ]);
  out.organism.owner_refs = uniq([
    ...arr(out.organism.owner_refs),
    ...candidates.map(block => block.organism_refs.owner_ref)
  ]);
  out.impact.affected_node_refs = uniq([
    ...arr(out.impact.affected_node_refs),
    ...candidates.map(block => block.organism_refs.target_node_ref)
  ]);
  out.impact.security_privacy = uniq([
    ...arr(out.impact.security_privacy),
    'Response fanout stores request_id + sanitized refs only; raw private prompt remains in existing private ingress.'
  ]);
  out.evidence.evidence_refs = uniq([
    ...arr(out.evidence.evidence_refs),
    requestProjectionRef,
    rootContractRef,
    'coordination/guide/PRIMARY_CHAT_RESPONSE_FANOUT_CONTRACT_V1.json'
  ]);
  out.autonomy_closure.return_consumers = uniq([
    ...arr(out.autonomy_closure.return_consumers),
    ...candidates.map(block => block.consumer)
  ]);

  const ready = uniq([
    ...arr(out.capacity_plan.ready_block_ids),
    ...candidates.map(block => block.block_id)
  ]);
  out.capacity_plan.ready_block_ids = ready;
  const prepared = ready.length
    + uniq(out.capacity_plan.reserve_refs).length
    + uniq(out.capacity_plan.recovery_refs).length;
  out.decomposition.useful_capacity = prepared;
  out.capacity_plan.capacity_request = Math.max(
    0,
    prepared - Number(out.capacity_plan.live_compatible_count || 0)
  );

  out.response_fanout = {
    schema: PRIMARY_CHAT_RESPONSE_FANOUT_SCHEMA,
    request_id: requestId,
    request_projection_ref: requestProjectionRef,
    routing: 'CURRENT_WORK_GRAPH',
    candidate_count_target: PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT,
    candidate_block_ids: candidates.map(block => block.block_id),
    candidates_prepared: candidates.length,
    workers_claimed: 0,
    returns_received: 0,
    counts_are_targets_not_claims: true,
    actual_worker_returns_required_for_multi_worker_claim: true,
    human_routing_actions_target: 0,
    raw_text_public: false,
    authority: 'DERIVED_COMPILED_WORK_ONLY_PIN_REMAINS_AUTHORITY'
  };

  const validation = validateCompiledDispatchContract(out);
  if (!validation.pass) {
    return {
      pass: false,
      status: 'FAIL',
      errors: validation.errors.map(error => `FANOUT:${error}`),
      response_fanout: out.response_fanout
    };
  }

  const handoffs = candidates.map(block =>
    compileWorkBlockHandoff(out, block.block_id, rootContractRef)
  );
  const badHandoff = handoffs.find(item => item.pass !== true);
  if (badHandoff) {
    return {pass: false, status: 'FAIL', errors: [`HANDOFF:${badHandoff.reason || 'UNKNOWN'}`]};
  }

  return {
    pass: true,
    status: 'PASS',
    contract: out,
    response_fanout: out.response_fanout,
    candidate_blocks: candidates,
    handoffs
  };
}
