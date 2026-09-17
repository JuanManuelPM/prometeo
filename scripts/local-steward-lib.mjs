import crypto from 'node:crypto';

export const DISPOSITIONS = Object.freeze([
  'CONSUMED',
  'PARTIAL',
  'CONFLICTED',
  'SUPERSEDED_WITH_REASON',
  'DEFERRED_INSUFFICIENT_EVIDENCE',
  'OUT_OF_SCOPE',
]);

export const PROTECTED_AUTHORITY = Object.freeze(new Set([
  'HUMAN_ACCEPTED',
  'CURRENT',
  'SERVED',
]));

const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const text = value => String(value ?? '').trim();
const upper = value => text(value).toUpperCase();
const uniq = values => [...new Set((values || []).filter(Boolean).map(String))];
const sha256 = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : stableStringify(value)).digest('hex');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(stable(value));
}

export function semanticAtomKey(atom = {}) {
  return stableStringify({
    scope: text(atom.scope || 'default'),
    key: text(atom.key || atom.claim || atom.name || 'statement'),
    value: atom.value ?? atom.statement ?? atom.text ?? null,
    kind: upper(atom.kind || 'CANDIDATE'),
  });
}

function fallbackAtoms(source, index) {
  const statement = source.mission_result
    ?? source.result
    ?? source.summary?.text
    ?? source.summary
    ?? source.statement
    ?? null;
  if (!statement) return [];
  return [{
    atom_id: `fallback-${index + 1}`,
    scope: source.integration_scope_id || source.surface_id || 'default',
    key: 'summary',
    value: statement,
    kind: 'CANDIDATE',
    authority_class: source.authority_class || 'CANDIDATE_EVIDENCE_ONLY',
    evidence_refs: uniq([source.return_ref]),
  }];
}

function normalizeAtom(atom, source, index, atomIndex) {
  const scope = text(atom.scope || source.integration_scope_id || source.surface_id || 'default');
  const key = text(atom.key || atom.claim || atom.name || `statement-${atomIndex + 1}`);
  const kind = upper(atom.kind || 'CANDIDATE');
  const authorityClass = upper(atom.authority_class || source.authority_class || 'CANDIDATE_EVIDENCE_ONLY');
  const value = clone(atom.value ?? atom.statement ?? atom.text ?? null);
  const atomId = text(atom.atom_id) || `A-${sha256({scope, key, value, kind}).slice(0, 12)}`;
  return {
    atom_id: atomId,
    scope,
    key,
    value,
    kind,
    authority_class: authorityClass,
    evidence_refs: uniq([...(atom.evidence_refs || []), source.return_ref]),
    source_return_ref: source.return_ref,
    source_content_sha: source.content_sha,
    source_index: index,
  };
}

function normalizeSource(source, index) {
  const returnRef = text(source.return_ref || source.ref);
  const contentSha = text(source.content_sha || source.sha || source.blob_sha);
  const atomsRaw = Array.isArray(source.semantic_atoms)
    ? source.semantic_atoms
    : Array.isArray(source.atoms)
      ? source.atoms
      : fallbackAtoms(source, index);
  return {
    ...clone(source),
    return_ref: returnRef,
    content_sha: contentSha,
    semantic_atoms: atomsRaw.map((atom, atomIndex) => normalizeAtom(atom, {...source, return_ref: returnRef, content_sha: contentSha}, index, atomIndex)),
  };
}

function sourceIdentityProblems(source) {
  const problems = [];
  if (!source.return_ref) problems.push('MISSING_RETURN_REF');
  if (!source.content_sha) problems.push('MISSING_CONTENT_SHA');
  if (!text(source.run_id || source.source_run_id)) problems.push('MISSING_RUN_ID');
  return problems;
}

function authorityBoundaryProblems(source) {
  const assertions = [];
  for (const atom of source.semantic_atoms || []) {
    if (PROTECTED_AUTHORITY.has(upper(atom.authority_class))) {
      assertions.push({
        atom_id: atom.atom_id,
        attempted_authority: upper(atom.authority_class),
        reason: 'WORKER_OR_STEWARD_CANNOT_SELF_PROMOTE_PROTECTED_AUTHORITY',
      });
    }
  }
  for (const field of ['human_accepted','current','served']) {
    if (source[field] === true) {
      assertions.push({
        field,
        attempted_authority: field.toUpperCase(),
        reason: 'SOURCE_SELF_ASSERTION_IS_NOT_AUTHORITY_EVIDENCE',
      });
    }
  }
  return assertions;
}

function applicableAtoms(source, integrationScopeId) {
  const target = text(integrationScopeId);
  if (!target) return source.semantic_atoms || [];
  return (source.semantic_atoms || []).filter(atom => {
    const scope = text(atom.scope);
    return scope === target || scope === 'global' || scope === '*' || scope.startsWith(`${target}/`) || target.startsWith(`${scope}/`);
  });
}

function deduplicateAtoms(atoms) {
  const map = new Map();
  for (const atom of atoms) {
    const key = semanticAtomKey(atom);
    const existing = map.get(key);
    if (existing) {
      existing.source_return_refs = uniq([...existing.source_return_refs, atom.source_return_ref]);
      existing.evidence_refs = uniq([...existing.evidence_refs, ...(atom.evidence_refs || [])]);
      continue;
    }
    map.set(key, {
      semantic_id: `S-${sha256(key).slice(0, 12)}`,
      scope: atom.scope,
      key: atom.key,
      value: clone(atom.value),
      kind: atom.kind,
      source_return_refs: uniq([atom.source_return_ref]),
      evidence_refs: uniq(atom.evidence_refs || []),
    });
  }
  return [...map.values()].sort((a, b) => a.semantic_id.localeCompare(b.semantic_id));
}

function detectConflicts(semanticAtoms) {
  const groups = new Map();
  for (const atom of semanticAtoms) {
    const groupKey = `${atom.scope}\u0000${atom.key}`;
    const group = groups.get(groupKey) || [];
    group.push(atom);
    groups.set(groupKey, group);
  }

  const conflicts = [];
  for (const [groupKey, atoms] of groups.entries()) {
    const variants = new Map();
    for (const atom of atoms) {
      const valueKey = stableStringify(atom.value);
      const list = variants.get(valueKey) || [];
      list.push(atom);
      variants.set(valueKey, list);
    }
    if (variants.size <= 1) continue;
    const [scope, key] = groupKey.split('\u0000');
    conflicts.push({
      conflict_id: `C-${sha256({scope, key, values: [...variants.keys()].sort()}).slice(0, 12)}`,
      scope,
      key,
      variants: [...variants.values()].map(items => ({
        value: clone(items[0].value),
        semantic_ids: items.map(item => item.semantic_id).sort(),
        source_return_refs: uniq(items.flatMap(item => item.source_return_refs)).sort(),
      })),
      status: 'UNRESOLVED',
      rule: 'NEWEST_WINS_FORBIDDEN_REQUIRE_DISCRIMINATING_EVIDENCE_OR_AUTHORIZED_DECISION',
    });
  }
  return conflicts.sort((a, b) => a.conflict_id.localeCompare(b.conflict_id));
}

function sourceConflictRefs(sourceRef, conflicts) {
  return conflicts
    .filter(conflict => conflict.variants.some(variant => variant.source_return_refs.includes(sourceRef)))
    .map(conflict => conflict.conflict_id);
}

export function assertCandidateAuthorityBoundary(candidate = {}) {
  if (upper(candidate.authority_class) !== 'CANDIDATE_ONLY') {
    throw new Error('LOCAL_STEWARD_AUTHORITY_VIOLATION:CANDIDATE_ONLY_REQUIRED');
  }
  const serialized = stableStringify(candidate).toLowerCase();
  const forbiddenTruths = ['"human_accepted":true','"current":true','"served":true'];
  const hit = forbiddenTruths.find(value => serialized.includes(value));
  if (hit) throw new Error(`LOCAL_STEWARD_AUTHORITY_VIOLATION:${hit}`);
  return true;
}

export function buildLocalIntegrationCandidate({
  surface_id,
  integration_scope_id,
  steward_id,
  steward_generation = 1,
  returns = [],
  supersessions = {},
  required_return_refs = [],
  verification_policy = {},
  observed_head = null,
} = {}) {
  if (!text(surface_id)) throw new Error('LOCAL_STEWARD_INPUT:surface_id required');
  if (!text(integration_scope_id)) throw new Error('LOCAL_STEWARD_INPUT:integration_scope_id required');
  if (!text(steward_id)) throw new Error('LOCAL_STEWARD_INPUT:steward_id required');

  const sources = returns.map(normalizeSource);
  const immutabilityMap = new Map();
  const immutabilityBreaches = [];
  for (const source of sources) {
    if (!source.return_ref || !source.content_sha) continue;
    const prior = immutabilityMap.get(source.return_ref);
    if (prior && prior !== source.content_sha) {
      immutabilityBreaches.push({
        return_ref: source.return_ref,
        observed_hashes: uniq([prior, source.content_sha]).sort(),
        reason: 'IMMUTABLE_RETURN_PATH_CHANGED_BYTES',
      });
    } else {
      immutabilityMap.set(source.return_ref, source.content_sha);
    }
  }

  const identityProblems = new Map();
  const authorityProblems = new Map();
  const eligibleAtoms = [];
  for (const source of sources) {
    identityProblems.set(source.return_ref || `index:${sources.indexOf(source)}`, sourceIdentityProblems(source));
    authorityProblems.set(source.return_ref || `index:${sources.indexOf(source)}`, authorityBoundaryProblems(source));
    eligibleAtoms.push(...applicableAtoms(source, integration_scope_id).filter(atom => !PROTECTED_AUTHORITY.has(upper(atom.authority_class))));
  }

  const semanticAtoms = deduplicateAtoms(eligibleAtoms);
  const conflicts = detectConflicts(semanticAtoms);
  const dispositions = sources.map(source => {
    const sourceRef = source.return_ref || `index:${sources.indexOf(source)}`;
    const identity = identityProblems.get(sourceRef) || [];
    const authority = authorityProblems.get(sourceRef) || [];
    const sourceAtoms = applicableAtoms(source, integration_scope_id);
    const conflictRefs = sourceConflictRefs(source.return_ref, conflicts);
    const supersessionReason = text(supersessions[source.return_ref]);

    let disposition = 'CONSUMED';
    const reasons = [];
    if (supersessionReason) {
      disposition = 'SUPERSEDED_WITH_REASON';
      reasons.push(supersessionReason);
    } else if (identity.length) {
      disposition = 'DEFERRED_INSUFFICIENT_EVIDENCE';
      reasons.push(...identity);
    } else if (!sourceAtoms.length) {
      disposition = 'OUT_OF_SCOPE';
      reasons.push('NO_ATOMS_APPLICABLE_TO_INTEGRATION_SCOPE');
    } else if (conflictRefs.length && sourceAtoms.some(atom => !conflictRefs.some(id => conflicts.find(c => c.conflict_id === id)?.key === atom.key))) {
      disposition = 'PARTIAL';
      reasons.push('MIXED_CONFLICTING_AND_NONCONFLICTING_ATOMS');
    } else if (conflictRefs.length) {
      disposition = 'CONFLICTED';
      reasons.push('UNRESOLVED_SAME_SCOPE_CONTRADICTION');
    } else if (authority.length) {
      disposition = 'PARTIAL';
      reasons.push('PROTECTED_AUTHORITY_ASSERTION_EXCLUDED');
    }

    return {
      return_ref: source.return_ref || null,
      content_sha: source.content_sha || null,
      disposition,
      reasons: uniq(reasons),
      conflict_refs: conflictRefs,
      protected_authority_assertions: authority,
      source_atom_count: sourceAtoms.length,
    };
  });

  const missingRequiredReturns = uniq(required_return_refs).filter(ref => !sources.some(source => source.return_ref === ref));
  const highRisk = verification_policy.high_risk === true;
  const explicitIndependent = verification_policy.require_independent === true
    || sources.some(source => source.requires_independent_verification === true);
  const verificationRequests = [];
  if (conflicts.length) verificationRequests.push({trigger:'UNRESOLVED_CONFLICT',independent:true});
  if (immutabilityBreaches.length) verificationRequests.push({trigger:'IMMUTABILITY_BREACH',independent:true});
  if (missingRequiredReturns.length) verificationRequests.push({trigger:'MISSING_REQUIRED_RETURNS',independent:true,refs:missingRequiredReturns});
  if ([...authorityProblems.values()].some(items => items.length)) verificationRequests.push({trigger:'PROTECTED_AUTHORITY_ASSERTION',independent:true});
  if (highRisk) verificationRequests.push({trigger:'HIGH_RISK_POLICY',independent:true});
  if (explicitIndependent) verificationRequests.push({trigger:'EXPLICIT_INDEPENDENT_VERIFICATION',independent:true});

  const candidateState = (conflicts.length || immutabilityBreaches.length || missingRequiredReturns.length)
    ? 'BLOCKED_CONTRADICTION'
    : 'CANDIDATE_DECISION_READY';

  const body = {
    schema: 'prometeo.local-steward-integration-candidate/v1',
    authority_class: 'CANDIDATE_ONLY',
    surface_id: text(surface_id),
    integration_scope_id: text(integration_scope_id),
    steward: {
      steward_id: text(steward_id),
      steward_generation: Number(steward_generation) || 1,
    },
    candidate_state: candidateState,
    source_returns: sources.map(source => ({
      return_ref: source.return_ref || null,
      content_sha: source.content_sha || null,
      run_id: text(source.run_id || source.source_run_id) || null,
    })),
    dispositions,
    semantic_atoms: semanticAtoms,
    conflicts,
    immutability_breaches: immutabilityBreaches,
    missing_required_returns: missingRequiredReturns,
    verification_requests: verificationRequests,
    authority_boundary: {
      may_prepare_candidate: true,
      may_mark_human_accepted: false,
      may_move_current: false,
      may_claim_served: false,
      observed_head: observed_head || null,
      mutation_requires_separate_authorized_owner_receipt: true,
    },
  };

  const candidate = {
    ...body,
    candidate_id: `LSC-${sha256(body).slice(0, 16)}`,
  };
  assertCandidateAuthorityBoundary(candidate);
  return candidate;
}
