const arr = value => Array.isArray(value) ? value : [];
const finiteInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};
const parseTime = value => Date.parse(value || '') || 0;
const uniq = values => [...new Set(arr(values).map(value => String(value || '').trim()).filter(Boolean))];

const explicitRecoveryEvidence = job => {
  const basis = job?.recovery_basis && typeof job.recovery_basis === 'object' && !Array.isArray(job.recovery_basis)
    ? job.recovery_basis
    : {};
  return {
    refs: uniq([
      typeof basis.source_ref === 'string' ? basis.source_ref : null,
      ...arr(basis.evidence),
      ...arr(basis.artifacts)
    ]),
    updated_at: basis.updated_at || job?.recovery_basis_updated_at || null,
    updated_at_ms: parseTime(basis.updated_at || job?.recovery_basis_updated_at)
  };
};

export function fixedGenerationAttentionDecision(job = {}, policy = {}) {
  if (policy?.mode !== 'fixed_generation') {
    return {
      applicable: false,
      eligible: false,
      reason: 'NOT_FIXED_GENERATION_POLICY',
      fixed_generation: null,
      target_generation: null,
      new_evidence_refs: []
    };
  }

  const fixedGeneration = finiteInt(policy?.fixed_generation, 0);
  const currentGeneration = finiteInt(job?.pin_generation, 0);
  if (fixedGeneration < 1) {
    return {
      applicable: true,
      eligible: false,
      reason: 'FIXED_GENERATION_POLICY_INVALID',
      fixed_generation: null,
      target_generation: null,
      new_evidence_refs: []
    };
  }

  const attention = policy?.attention_until && typeof policy.attention_until === 'object' && !Array.isArray(policy.attention_until)
    ? policy.attention_until
    : null;
  const requiredChange = typeof attention?.required_change === 'string' && attention.required_change.trim()
    ? attention.required_change.trim()
    : null;
  const policyCreatedAt = parseTime(policy?.created_at);
  const evidence = explicitRecoveryEvidence(job);
  const baselineRefs = new Set(uniq([
    ...arr(policy?.evidence),
    typeof attention?.owner_ref === 'string' ? attention.owner_ref : null
  ]));
  const newEvidenceRefs = evidence.refs.filter(ref => !baselineRefs.has(ref));
  const evidenceAfterPolicy = Boolean(policyCreatedAt > 0 && evidence.updated_at_ms > policyCreatedAt);
  const requiredChangeSatisfied = Boolean(requiredChange && evidenceAfterPolicy && newEvidenceRefs.length > 0);

  if (!requiredChange) {
    return {
      applicable: true,
      eligible: false,
      reason: 'FIXED_GENERATION_NO_REQUIRED_CHANGE_GATE',
      fixed_generation: fixedGeneration,
      target_generation: null,
      current_generation: currentGeneration,
      new_evidence_refs: []
    };
  }

  if (currentGeneration < fixedGeneration) {
    return {
      applicable: true,
      eligible: false,
      reason: 'FIXED_GENERATION_NOT_REACHED',
      fixed_generation: fixedGeneration,
      target_generation: fixedGeneration,
      current_generation: currentGeneration,
      new_evidence_refs: newEvidenceRefs,
      required_change_satisfied: requiredChangeSatisfied
    };
  }

  if (!requiredChangeSatisfied) {
    return {
      applicable: true,
      eligible: false,
      reason: 'FIXED_GENERATION_ATTENTION_UNSATISFIED',
      fixed_generation: fixedGeneration,
      target_generation: null,
      current_generation: currentGeneration,
      new_evidence_refs: newEvidenceRefs,
      evidence_updated_at: evidence.updated_at,
      policy_created_at: policy?.created_at || null,
      required_change_satisfied: false
    };
  }

  if (currentGeneration === fixedGeneration) {
    return {
      applicable: true,
      eligible: true,
      reason: 'FIXED_GENERATION_ATTENTION_SATISFIED_ONE_SHOT',
      fixed_generation: fixedGeneration,
      target_generation: fixedGeneration + 1,
      current_generation: currentGeneration,
      new_evidence_refs: newEvidenceRefs,
      evidence_updated_at: evidence.updated_at,
      policy_created_at: policy?.created_at || null,
      required_change_satisfied: true
    };
  }

  return {
    applicable: true,
    eligible: false,
    reason: 'FIXED_GENERATION_ATTENTION_UNLOCK_CONSUMED',
    fixed_generation: fixedGeneration,
    target_generation: null,
    current_generation: currentGeneration,
    new_evidence_refs: newEvidenceRefs,
    evidence_updated_at: evidence.updated_at,
    policy_created_at: policy?.created_at || null,
    required_change_satisfied: true
  };
}

export function compileFixedGenerationRecoveryPolicies(feed = {}, recoveryPolicies = []) {
  const jobs = arr(feed?.projects).flatMap(project => arr(project?.jobs));
  const jobById = new Map(jobs.filter(job => job?.job_id).map(job => [String(job.job_id), job]));
  const decisions = [];
  const policies = arr(recoveryPolicies).map(policy => {
    if (!policy?.job_id || policy?.mode !== 'fixed_generation') return policy;
    const job = jobById.get(String(policy.job_id));
    if (!job) return policy;
    const decision = fixedGenerationAttentionDecision(job, policy);
    decisions.push({ job_id: policy.job_id, ...decision });
    if (!decision.eligible) return policy;
    return {
      ...policy,
      mode: 'next_generation_retry',
      reason: decision.reason,
      fixed_generation_unlock: {
        source_mode: 'fixed_generation',
        fixed_generation: decision.fixed_generation,
        target_generation: decision.target_generation,
        new_evidence_refs: decision.new_evidence_refs
      }
    };
  });
  return { recoveryPolicies: policies, decisions };
}
