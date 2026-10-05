export const PRIMARY_CHAT_RESPONSE_CANDIDATE_RETURN_SCHEMA = 'prometeo.primary-chat-response-candidate-return-public/v1';
export const PRIMARY_CHAT_RESPONSE_EXAM_COUNT = 2;
export const PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT = 4;

const RAW_FIELD_NAMES = new Set(['text','raw_text','private_text','private_payload','prompt','transcript','messages']);
const arr = value => Array.isArray(value) ? value : [];
const clone = value => JSON.parse(JSON.stringify(value));
const uniq = values => [...new Set(arr(values).map(String).map(v => v.trim()).filter(Boolean))].sort();

function required(value, field) {
  const out = String(value ?? '').trim();
  if (!out) throw new Error(`PRIMARY_CHAT_RESPONSE_JUDGE_INVALID:${field}_required`);
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
    const path = prefix ? `${prefix}.${key}` : key;
    if (RAW_FIELD_NAMES.has(String(key).toLowerCase())) return path;
    const nested = rawFieldPath(child, path);
    if (nested) return nested;
  }
  return null;
}

export function validateIndependentCandidateReturns(candidateReturns, requestId) {
  const errors = [];
  const returns = arr(candidateReturns);
  if (returns.length !== PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT) errors.push('CANDIDATE_RETURN_COUNT_MUST_BE_4');
  const seenOrdinals = new Set();
  const seenWorkers = new Set();
  const seenRefs = new Set();
  for (const item of returns) {
    if (!item || typeof item !== 'object') { errors.push('CANDIDATE_RETURN_INVALID'); continue; }
    const leak = rawFieldPath(item);
    if (leak) errors.push(`CANDIDATE_RAW_FIELD_FORBIDDEN:${leak}`);
    if (item.schema !== PRIMARY_CHAT_RESPONSE_CANDIDATE_RETURN_SCHEMA) errors.push('CANDIDATE_RETURN_SCHEMA_INVALID');
    if (String(item.request_id ?? '') !== String(requestId ?? '')) errors.push('CANDIDATE_REQUEST_ID_MISMATCH');
    const ordinal = Number(item.candidate_ordinal);
    if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT) errors.push('CANDIDATE_ORDINAL_INVALID');
    else if (seenOrdinals.has(ordinal)) errors.push('CANDIDATE_ORDINAL_DUPLICATE');
    else seenOrdinals.add(ordinal);
    const worker = String(item.worker_id ?? '').trim();
    if (!worker) errors.push('CANDIDATE_WORKER_REQUIRED');
    else if (seenWorkers.has(worker)) errors.push('CANDIDATE_WORKER_DUPLICATE');
    else seenWorkers.add(worker);
    const ref = String(item.return_ref ?? '').trim();
    if (!ref) errors.push('CANDIDATE_RETURN_REF_REQUIRED');
    else if (seenRefs.has(ref)) errors.push('CANDIDATE_RETURN_REF_DUPLICATE');
    else seenRefs.add(ref);
    if (item.durable_return !== true) errors.push('CANDIDATE_RETURN_NOT_DURABLE');
    if (item.raw_text_public !== false) errors.push('CANDIDATE_RAW_TEXT_PUBLIC_MUST_BE_FALSE');
    if (!['VERIFIED','DONE','PASS'].includes(String(item.outcome ?? ''))) errors.push('CANDIDATE_OUTCOME_NOT_ACCEPTED');
  }
  if (seenOrdinals.size !== PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT) errors.push('CANDIDATE_ORDINAL_SET_INCOMPLETE');
  if (seenWorkers.size !== PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT) errors.push('INDEPENDENT_WORKER_COUNT_MUST_BE_4');
  if (seenRefs.size !== PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT) errors.push('INDEPENDENT_RETURN_REF_COUNT_MUST_BE_4');
  return {pass: errors.length === 0, errors: uniq(errors)};
}

function requestKey(requestId) {
  return required(requestId, 'request_id').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96) || 'request';
}

function examBlock(template, {requestId, ordinal, candidateRefs, judgeContractRef}) {
  const suffix = String(ordinal).padStart(2, '0');
  const key = requestKey(requestId);
  const targetBase = required(template.organism_refs?.target_node_ref, 'template_target_node_ref');
  const consumer = required(template.consumer, 'template_consumer');
  return {
    ...clone(template),
    block_id: `primary-chat-response-${key}-exam-${suffix}`,
    semantic_key: `primary-chat:response:${requestId}:exam:${ordinal}:v1`,
    new_worker_executable: true,
    input_refs: uniq([...candidateRefs, judgeContractRef]),
    output_contract: `prometeo.primary-chat-response-exam/v1 request_id=${requestId} exam=${ordinal}; judge only durable sanitized candidate returns`,
    allowed_scope: uniq(template.allowed_scope),
    forbidden_scope: uniq([...arr(template.forbidden_scope),'public raw/private prompt persistence','scoring a candidate without durable RETURN evidence','claiming exam completion before a durable independent exam RETURN','new scheduler/queue/CURRENT/authority']),
    done_when: [
      `Exam ${ordinal} independently evaluates all four durable candidate RETURN refs for request ${requestId}.`,
      'Judgment records concise observable rubric results and durable refs only; no hidden reasoning or raw private prompt text is published.',
      'Exam RETURN is durable before it can count toward synthesis.'
    ],
    evidence_refs: uniq([...arr(template.evidence_refs), ...candidateRefs, judgeContractRef]),
    required_capabilities: uniq(template.required_capabilities),
    consumer,
    dependency_ids: [],
    dispatch_ready: true,
    request_id: requestId,
    exam_ordinal: ordinal,
    exam_count_target: PRIMARY_CHAT_RESPONSE_EXAM_COUNT,
    candidate_count_observed: PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT,
    counts_are_targets_not_claims: true,
    actual_exam_return_required: true,
    runtime_binding: {request_id: requestId,candidate_return_refs: candidateRefs,raw_text_public: false},
    organism_refs: {...clone(template.organism_refs),target_node_ref: `${targetBase}/response-exam/${key}/e${suffix}`,consumer_ref: consumer}
  };
}

export function compilePrimaryChatResponseJudgeFanout({request_id, candidate_returns, exam_template, judge_contract_ref} = {}) {
  const requestId = required(request_id, 'request_id');
  const judgeContractRef = required(judge_contract_ref, 'judge_contract_ref');
  const validation = validateIndependentCandidateReturns(candidate_returns, requestId);
  if (!validation.pass) return {pass:false,status:'FAIL',errors:validation.errors};
  const template = clone(exam_template ?? {});
  if (template.new_worker_executable !== true || template.dispatch_ready !== true) return {pass:false,status:'FAIL',errors:['EXAM_TEMPLATE_MUST_BE_READY_NEW_WORKER_EXECUTABLE']};
  if (arr(template.dependency_ids).length !== 0) return {pass:false,status:'FAIL',errors:['EXAM_TEMPLATE_MUST_HAVE_NO_DEPENDENCIES']};
  const candidateRefs = candidate_returns.slice().sort((a,b) => Number(a.candidate_ordinal)-Number(b.candidate_ordinal)).map(item => String(item.return_ref));
  const exams = Array.from({length:PRIMARY_CHAT_RESPONSE_EXAM_COUNT},(_,i) => examBlock(template,{requestId,ordinal:i+1,candidateRefs,judgeContractRef}));
  return {pass:true,status:'PASS',response_judge_fanout:{
    schema:'prometeo.primary-chat-response-judge-fanout/v1',request_id:requestId,candidate_returns_received:PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT,
    independent_candidate_workers:PRIMARY_CHAT_RESPONSE_CANDIDATE_COUNT,exam_count_target:PRIMARY_CHAT_RESPONSE_EXAM_COUNT,exam_blocks_prepared:PRIMARY_CHAT_RESPONSE_EXAM_COUNT,
    exam_workers_claimed:0,exam_returns_received:0,counts_are_targets_not_claims:true,actual_exam_returns_required_for_synthesis:true,raw_text_public:false,
    authority:'DERIVED_COMPILED_WORK_ONLY_PIN_REMAINS_AUTHORITY'
  },exam_blocks:exams};
}
