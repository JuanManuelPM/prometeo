import fs from 'node:fs';
import path from 'node:path';
import { compileGuideSuccessor } from './guide-recursive-successor-lib.mjs';

export const ORTHOGONAL_VERIFIER_RUNTIME_SCHEMA = 'prometeo.orthogonal-verifier-runtime-materialization/v1';
export const ORTHOGONAL_VERIFIER_RUNTIME_AUTHORITY = 'DERIVED_SHADOW_ONLY_NO_EXECUTION_OR_PROMOTION_AUTHORITY';
const MATRIX_REF = 'coordination/guide/ORTHOGONAL_VERIFIER_MATRIX_V1.json';
const OUTPUT_REF = 'coordination/workstreams/chat-native-control-plane-v1/generated/metabolism/ORTHOGONAL_VERIFIER_SLICES.json';
const REQUIRED_ARTIFACT_IDENTITY = ['project_id', 'artifact_key', 'artifact_version_ref', 'target_scope'];
const FORBIDDEN_CHILD_AUTHORITY = ['mutation_authority', 'allowed_paths', 'tool_policy', 'execution_authority', 'promotion_authority', 'shell_identity'];

const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(arr(values).map(value => String(value ?? '').trim()).filter(Boolean))].sort();

function requiredText(value, field) {
  const out = String(value ?? '').trim();
  if (!out) throw new Error(`ORTHOGONAL_VERIFIER_INVALID:${field}_required`);
  return out;
}

function verifierDescriptor(proposal = {}) {
  const descriptor = proposal.orthogonal_verification_v1 ?? proposal.orthogonal_verification ?? null;
  return descriptor && typeof descriptor === 'object' && !Array.isArray(descriptor) ? descriptor : null;
}

function normalizeArtifactIdentity(descriptor = {}) {
  const identity = descriptor.artifact_identity ?? {};
  const out = {};
  for (const field of REQUIRED_ARTIFACT_IDENTITY) out[field] = requiredText(identity[field], `artifact_identity.${field}`);
  return out;
}

function replicaCount(descriptor = {}, sliceId) {
  const bySlice = descriptor.replication?.required_replicas_by_slice ?? {};
  const raw = bySlice[sliceId] ?? descriptor.replication?.required_replicas ?? 1;
  const count = Number(raw);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error(`ORTHOGONAL_VERIFIER_INVALID:required_replicas:${sliceId}`);
  }
  return count;
}

function applicableSlices(matrix, signals) {
  const signalSet = new Set(uniq(signals));
  return arr(matrix?.slices).filter(slice => {
    const accepted = uniq(slice?.applies_when?.any_signal);
    return accepted.some(signal => signalSet.has(signal));
  });
}

function evidenceRefs(proposal, descriptor, identity) {
  return uniq([
    proposal._source_ref,
    ...(proposal.evidence_refs ?? []),
    ...(descriptor.evidence_refs ?? []),
    identity.artifact_version_ref
  ]);
}

function compileSlice({matrix, proposal, descriptor, identity, slice, replicaIndex, now}) {
  const fixtureRevision = requiredText(descriptor.fixture_revision, 'fixture_revision');
  const evidence = evidenceRefs(proposal, descriptor, identity);
  if (!evidence.length) throw new Error('ORTHOGONAL_VERIFIER_INVALID:evidence_refs_required');
  const parentRef = requiredText(proposal._source_ref ?? proposal.parent_ref ?? proposal.proposal_id, 'parent_ref');
  const rootRef = requiredText(proposal.root_ref ?? proposal.root ?? `project:${identity.project_id}`, 'root_ref');
  const target = {
    artifact_key: identity.artifact_key,
    artifact_version_ref: identity.artifact_version_ref,
    slice_id: requiredText(slice.slice_id, 'slice_id'),
    target_scope: identity.target_scope,
    fixture_revision: fixtureRevision,
    replica_index: String(replicaIndex)
  };
  const priority = Number.isFinite(Number(proposal.priority)) ? Number(proposal.priority) : 50;
  const compiled = compileGuideSuccessor({
    root_ref: rootRef,
    parent_ref: parentRef,
    project_id: identity.project_id,
    dedupe_key: `orthogonal-verifier:${identity.project_id}:${identity.artifact_key}:${identity.artifact_version_ref}:${slice.slice_id}:${fixtureRevision}:${replicaIndex}`,
    consumer: slice.consumer_judge?.consumer ?? 'existing Guide/Integrator',
    gate: `ORTHOGONAL_QA:${slice.default_timing ?? 'CAN_RUN_IN_PARALLEL_WHEN_DEPENDENCIES_READY'}`,
    definition_of_done: uniq(slice.acceptance),
    evidence_refs: evidence,
    priority,
    value_class: 'VERIFICATION',
    required_capabilities: uniq(slice.required_capabilities),
    dependency_ids: uniq(proposal.dependency_ids),
    semantic_identity: {
      target,
      problem: 'orthogonal_verifier_slice',
      acceptance: uniq(slice.acceptance)
    }
  }, {
    root_ref: rootRef,
    parent_ref: parentRef,
    parent_depth: Number(proposal.recursive_lineage?.depth ?? 0),
    existing_children_for_parent: 0,
    open_descendants: 0,
    frontier_sufficient: false,
    semantic_duplicate: false,
    human_authority_boundary: false,
    campaign_closed: false,
    now,
    created_at: now
  });
  if (!compiled.materialize) return compiled;
  for (const field of FORBIDDEN_CHILD_AUTHORITY) {
    if (Object.prototype.hasOwnProperty.call(compiled.child, field)) {
      throw new Error(`ORTHOGONAL_VERIFIER_AUTHORITY_LEAK:${field}`);
    }
  }
  return {
    materialize: true,
    stop_reason: null,
    candidate: {
      schema: 'prometeo.orthogonal-verifier-slice-candidate/v1',
      authority: 'CANDIDATE_VERIFIER_SLICE_ONLY_NO_EXECUTION_OR_PROMOTION_AUTHORITY',
      source_matrix_ref: MATRIX_REF,
      source_matrix_id: matrix.matrix_id ?? null,
      source_proposal_ref: proposal._source_ref ?? null,
      source_proposal_id: proposal.proposal_id ?? null,
      artifact_identity: identity,
      slice_id: slice.slice_id,
      replica_index: replicaIndex,
      required_capabilities: uniq(slice.required_capabilities),
      default_timing: slice.default_timing ?? null,
      consumer_judge: slice.consumer_judge ?? null,
      semantic_fingerprint: compiled.child.semantic_fingerprint,
      semantic_pin_ref: compiled.child.semantic_pin_ref,
      successor: compiled.child
    }
  };
}

export function deriveOrthogonalVerifierMaterialization({matrix, proposals = [], now = new Date().toISOString()} = {}) {
  if (!matrix || matrix.schema !== 'prometeo.orthogonal-verifier-matrix/v1') {
    throw new Error('ORTHOGONAL_VERIFIER_INVALID:matrix_schema');
  }
  const materialized = [];
  const skipped = [];
  const seen = new Set();
  let duplicatesSuppressed = 0;

  for (const proposal of proposals) {
    const descriptor = verifierDescriptor(proposal);
    if (!descriptor) continue;
    try {
      const identity = normalizeArtifactIdentity(descriptor);
      const signals = uniq(descriptor.signals);
      if (!signals.length) throw new Error('ORTHOGONAL_VERIFIER_INVALID:signals_required');
      const slices = applicableSlices(matrix, signals);
      if (!slices.length) {
        skipped.push({source_proposal_ref: proposal._source_ref ?? null, reason: 'NO_APPLICABLE_SLICE'});
        continue;
      }
      for (const slice of slices) {
        const replicas = replicaCount(descriptor, slice.slice_id);
        for (let replicaIndex = 0; replicaIndex < replicas; replicaIndex += 1) {
          const compiled = compileSlice({matrix, proposal, descriptor, identity, slice, replicaIndex, now});
          if (!compiled.materialize) {
            skipped.push({
              source_proposal_ref: proposal._source_ref ?? null,
              slice_id: slice.slice_id,
              replica_index: replicaIndex,
              reason: compiled.stop_reason
            });
            continue;
          }
          const fingerprint = compiled.candidate.semantic_fingerprint;
          if (seen.has(fingerprint)) {
            duplicatesSuppressed += 1;
            continue;
          }
          seen.add(fingerprint);
          materialized.push(compiled.candidate);
        }
      }
    } catch (error) {
      skipped.push({
        source_proposal_ref: proposal._source_ref ?? null,
        source_proposal_id: proposal.proposal_id ?? null,
        reason: String(error?.message ?? error)
      });
    }
  }

  materialized.sort((a, b) => String(a.semantic_fingerprint).localeCompare(String(b.semantic_fingerprint)));
  skipped.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return {
    schema: ORTHOGONAL_VERIFIER_RUNTIME_SCHEMA,
    authority: ORTHOGONAL_VERIFIER_RUNTIME_AUTHORITY,
    generated_at: now,
    matrix_ref: MATRIX_REF,
    matrix_id: matrix.matrix_id ?? null,
    candidates: materialized,
    metrics: {
      opted_in_proposals: proposals.filter(proposal => Boolean(verifierDescriptor(proposal))).length,
      materialized_slices: materialized.length,
      duplicates_suppressed: duplicatesSuppressed,
      skipped: skipped.length
    },
    skipped,
    truth_boundary: 'This projection only materializes verifier slice candidates and semantic pin refs. Existing portfolio PIN/claim machinery remains the sole execution authority; existing Judge/source/publication owners remain promotion authority.'
  };
}

export function loadOrthogonalVerifierMatrix(root = process.cwd()) {
  return JSON.parse(fs.readFileSync(path.join(root, MATRIX_REF), 'utf8'));
}

export function writeOrthogonalVerifierShadow(root, payload) {
  const file = path.join(root, OUTPUT_REF);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  const prior = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (prior === serialized) return {changed: false, path: OUTPUT_REF};
  fs.writeFileSync(file, serialized, 'utf8');
  return {changed: true, path: OUTPUT_REF};
}
