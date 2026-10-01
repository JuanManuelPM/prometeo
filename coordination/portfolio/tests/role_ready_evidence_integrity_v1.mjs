#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyRoleEvidenceIntegrity,
  isExplicitTransportBlockedNoAllocationRef,
  validateRoleEvidenceRefs
} from '../../../scripts/apply-role-evidence-integrity.mjs';
import { buildFastAllocator } from '../../../scripts/build-fast-allocator.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const baseline = JSON.parse(fs.readFileSync(path.join(repoRoot, 'coordination/efficiency/RATCHET_BASELINE_V1.json'), 'utf8'));
const ratchet = baseline.items?.find(item => item.id === 'EFF017');
assert(ratchet, 'EFF017 must remain in the efficiency ratchet baseline');
assert.equal(ratchet.required?.repo_local_evidence_prevalidated, true);
assert.equal(ratchet.required?.missing_repo_local_evidence_machine_diagnostic, true);
assert.equal(ratchet.required?.claim_payload_evidence_sanitized, true);
assert.equal(ratchet.required?.suppress_zero_usable_evidence_candidate, true);
assert.equal(ratchet.required?.role_identity_preserved_across_validation, true);
assert.equal(ratchet.required?.workers_must_not_add_preclaim_evidence_archaeology, true);
assert.equal(ratchet.required?.portfolio_fragment_semantics_validated, true);
assert.equal(ratchet.required?.derived_recovery_source_path_preserved, true);
assert.equal(ratchet.required?.regression_test, 'coordination/portfolio/tests/role_ready_evidence_integrity_v1.mjs');

const transportBoundaryRatchet = baseline.items?.find(item => item.id === 'EFF016B');
assert(transportBoundaryRatchet, 'EFF016B must remain in the efficiency ratchet baseline');
assert.match(String(transportBoundaryRatchet.title || ''), /telemetry.*GUIDE_RESCATE/i, 'EFF016B must keep transport denials telemetry-only for GUIDE_RESCATE');

const causalRecoveryRatchet = baseline.items?.find(item => item.id === 'EFF065');
assert(causalRecoveryRatchet, 'EFF065 must remain in the efficiency ratchet baseline');
assert.equal(causalRecoveryRatchet.required?.all_distinct_known_basis_suppresses_count_only_rescate, true);
assert.equal(causalRecoveryRatchet.required?.actionable_no_allocation_trigger_preserved, true);

const workflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/live-feed.yml'), 'utf8');
const coverageStage = 'node source/scripts/apply-project-coverage.mjs /tmp/allocator.json /tmp/feed.json /tmp/allocator.json source';
const integrityStage = 'node source/scripts/apply-role-evidence-integrity.mjs /tmp/allocator.json /tmp/allocator.json source';
const barrierStage = 'node source/scripts/apply-fast-allocator-contention-barriers.mjs /tmp/allocator.json /tmp/allocator.json source';
assert(workflow.includes('node source/coordination/portfolio/tests/role_ready_evidence_integrity_v1.mjs'), 'binding allocator workflow must run the evidence-integrity regression');
assert(workflow.includes(integrityStage), 'binding allocator workflow must apply the evidence-integrity stage');
assert(workflow.indexOf(coverageStage) < workflow.indexOf(integrityStage), 'evidence integrity must run after project coverage adds role_ready candidates');
assert(workflow.indexOf(integrityStage) < workflow.indexOf(barrierStage), 'evidence integrity must run before later publish-routing stages');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prometeo-role-evidence-'));
try {
  fs.mkdirSync(path.join(root, 'coordination', 'evidence'), { recursive: true });
  fs.mkdirSync(path.join(root, 'coordination', 'portfolio'), { recursive: true });
  fs.mkdirSync(path.join(root, 'coordination', 'workers', 'no-allocation'), { recursive: true });
  fs.writeFileSync(path.join(root, 'coordination', 'evidence', 'valid.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'coordination', 'portfolio', 'PORTFOLIO.json'), JSON.stringify({
    projects: [{ project_id: 'alpha', jobs: [{ job_id: 'seed-one' }] }]
  }) + '\n');

  const blockedClassification = 'coordination/workers/no-allocation/blocked-classification.json';
  const blockedOutcome = 'coordination/workers/no-allocation/blocked-outcome.json';
  const blockedCode = 'coordination/workers/no-allocation/blocked-code.json';
  const actionableNoAlloc = 'coordination/workers/no-allocation/actionable.json';
  fs.writeFileSync(path.join(root, blockedClassification), JSON.stringify({ classification: 'CLAIM_TRANSPORT_BLOCKED' }) + '\n');
  fs.writeFileSync(path.join(root, blockedOutcome), JSON.stringify({ outcome: 'CLAIM_TRANSPORT_BLOCKED' }) + '\n');
  fs.writeFileSync(path.join(root, blockedCode), JSON.stringify({ code: 'CLAIM_TRANSPORT_BLOCKED' }) + '\n');
  fs.writeFileSync(path.join(root, actionableNoAlloc), JSON.stringify({ reason: 'CREATE_EXISTS_EXHAUSTED' }) + '\n');

  assert.equal(isExplicitTransportBlockedNoAllocationRef(blockedClassification, root), true, 'classification field must preserve explicit transport-boundary semantics');
  assert.equal(isExplicitTransportBlockedNoAllocationRef(blockedOutcome, root), true, 'outcome field must preserve explicit transport-boundary semantics');
  assert.equal(isExplicitTransportBlockedNoAllocationRef(blockedCode, root), true, 'code field must preserve explicit transport-boundary semantics');
  assert.equal(isExplicitTransportBlockedNoAllocationRef(actionableNoAlloc, root), false, 'actionable no-allocation evidence must remain repair-eligible');

  const valid = 'coordination/evidence/valid.json#proof';
  const validPortfolioProject = 'coordination/portfolio/PORTFOLIO.json#project:alpha';
  const validPortfolioJob = 'coordination/portfolio/PORTFOLIO.json#job:seed-one';
  const validPortfolioProjectJob = 'coordination/portfolio/PORTFOLIO.json#project:alpha:job:seed-one';
  const missingPortfolioProject = 'coordination/portfolio/PORTFOLIO.json#project:missing-project';
  const missingPortfolioJob = 'coordination/portfolio/PORTFOLIO.json#job:derived-only-job';
  const missing = 'coordination/evidence/absent.json';
  const externalActions = 'github-actions:run/123';
  const externalPages = 'gh-pages:live/allocator.json@2026-09-17T21:36:13.758Z';

  const direct = validateRoleEvidenceRefs([
    missing,
    valid,
    validPortfolioProject,
    validPortfolioJob,
    validPortfolioProjectJob,
    missingPortfolioProject,
    missingPortfolioJob,
    externalPages,
    externalActions
  ], root);
  assert(direct.usable.includes(valid), 'valid repo-local evidence must remain usable');
  assert(direct.usable.includes(validPortfolioProject), 'existing PORTFOLIO project fragment must remain usable');
  assert(direct.usable.includes(validPortfolioJob), 'existing PORTFOLIO job fragment must remain usable');
  assert(direct.usable.includes(validPortfolioProjectJob), 'existing PORTFOLIO project/job fragment must remain usable');
  assert(!direct.usable.includes(missingPortfolioProject), 'missing PORTFOLIO project fragment must be rejected');
  assert(!direct.usable.includes(missingPortfolioJob), 'missing PORTFOLIO job fragment must be rejected');
  assert(direct.diagnostics.some(row => row.kind === 'MISSING_REPO_LOCAL_FRAGMENT' && row.ref === missingPortfolioProject), 'missing project fragment must be diagnosed');
  assert(direct.diagnostics.some(row => row.kind === 'MISSING_REPO_LOCAL_FRAGMENT' && row.ref === missingPortfolioJob), 'missing job fragment must be diagnosed');
  assert(!direct.usable.includes(missing), 'missing repo-local evidence must not remain usable');
  assert(direct.usable.includes(externalActions), 'github-actions evidence must remain usable');
  assert(direct.usable.includes(externalPages), 'gh-pages evidence must remain usable');
  assert(direct.diagnostics.some(row => row.kind === 'MISSING_REPO_LOCAL' && row.ref === missing), 'missing repo-local evidence must be diagnosed');

  const allocator = {
    schema: 'prometeo.fast-allocator/v3',
    counts: { role_ready: 4 },
    role_ready: [
      {
        role_id: 'guide-critic-fixedfingerprint',
        guide_work_id: 'guide-critic-fixedfingerprint',
        role: 'GUIDE_CRITIC',
        trigger: 'PARTIAL_LOOP',
        fingerprint: 'fixedfingerprint',
        evidence: [missing, valid, validPortfolioJob, missingPortfolioProject, missingPortfolioJob, externalActions, externalPages],
        claim_payload_shape: {
          schema: 'prometeo.guide-role-pin/v1',
          guide_work_id: 'guide-critic-fixedfingerprint',
          evidence: [missing, valid, validPortfolioJob, missingPortfolioProject, missingPortfolioJob, externalActions, externalPages]
        }
      },
      {
        role_id: 'guide-planner-missingonly',
        guide_work_id: 'guide-planner-missingonly',
        role: 'GUIDE_PLANNER',
        trigger: 'FRONTIER_THIN',
        fingerprint: 'missingonly',
        evidence: ['missing:coordination/evidence/already-known-missing.json'],
        claim_payload_shape: {
          schema: 'prometeo.guide-role-pin/v1',
          guide_work_id: 'guide-planner-missingonly',
          evidence: ['missing:coordination/evidence/already-known-missing.json']
        }
      },
      {
        role_id: 'guide-rescate-mixed',
        guide_work_id: 'guide-rescate-mixed',
        role: 'GUIDE_RESCATE',
        trigger: 'LOW_YIELD',
        fingerprint: 'mixed',
        evidence: [blockedClassification, blockedOutcome, blockedCode, actionableNoAlloc, valid],
        claim_payload_shape: {
          schema: 'prometeo.guide-role-pin/v1',
          guide_work_id: 'guide-rescate-mixed',
          evidence: [blockedClassification, blockedOutcome, blockedCode, actionableNoAlloc, valid]
        }
      },
      {
        role_id: 'guide-rescate-blockedonly',
        guide_work_id: 'guide-rescate-blockedonly',
        role: 'GUIDE_RESCATE',
        trigger: 'LOW_YIELD',
        fingerprint: 'blockedonly',
        evidence: [blockedClassification, blockedOutcome, blockedCode],
        claim_payload_shape: {
          schema: 'prometeo.guide-role-pin/v1',
          guide_work_id: 'guide-rescate-blockedonly',
          evidence: [blockedClassification, blockedOutcome, blockedCode]
        }
      }
    ]
  };

  const first = applyRoleEvidenceIntegrity(structuredClone(allocator), root);
  const second = applyRoleEvidenceIntegrity(structuredClone(allocator), root);
  assert.deepEqual(first, second, 'compiled evidence validation must be deterministic');
  assert.equal(first.counts.role_ready, 2, 'missing-only and transport-blocked-only role candidates must be suppressed');
  assert.equal(first.role_ready.length, 2);

  const kept = first.role_ready.find(row => row.role_id === 'guide-critic-fixedfingerprint');
  assert(kept, 'valid critic candidate must remain emitted');
  assert.equal(kept.role_id, 'guide-critic-fixedfingerprint', 'role identity must not be recomputed');
  assert.equal(kept.fingerprint, 'fixedfingerprint', 'role fingerprint must not be recomputed');
  assert(kept.evidence.includes(valid));
  assert(kept.evidence.includes(validPortfolioJob));
  assert(!kept.evidence.includes(missingPortfolioProject));
  assert(!kept.evidence.includes(missingPortfolioJob));
  assert(!kept.evidence.includes(missing));
  assert(kept.evidence.includes(externalActions));
  assert(kept.evidence.includes(externalPages));
  assert.deepEqual(kept.claim_payload_shape.evidence, kept.evidence, 'PIN payload evidence must match sanitized evidence');
  assert(kept.evidence_diagnostics.some(row => row.kind === 'MISSING_REPO_LOCAL' && row.ref === missing));

  const rescueKept = first.role_ready.find(row => row.role_id === 'guide-rescate-mixed');
  assert(rescueKept, 'mixed rescate candidate must remain when actionable evidence survives');
  assert(rescueKept.evidence.includes(actionableNoAlloc), 'actionable no-allocation evidence must survive');
  assert(rescueKept.evidence.includes(valid), 'unrelated valid causal evidence must survive');
  assert(!rescueKept.evidence.includes(blockedClassification), 'classification-form explicit transport denial must be telemetry-only');
  assert(!rescueKept.evidence.includes(blockedOutcome), 'outcome-form explicit transport denial must be telemetry-only');
  assert(!rescueKept.evidence.includes(blockedCode), 'code-form explicit transport denial must be telemetry-only');
  assert.deepEqual(rescueKept.claim_payload_shape.evidence, rescueKept.evidence, 'rescate PIN payload must receive the same sanitized evidence');
  assert(rescueKept.evidence_diagnostics.filter(row => row.kind === 'TELEMETRY_ONLY_EXPLICIT_TRANSPORT_BLOCKED').length === 3, 'transport boundary refs must remain machine-visible diagnostics');

  const blockedOnlySuppressed = first.diagnostics.role_evidence_integrity.suppressed_candidates.find(row => row.role_id === 'guide-rescate-blockedonly');
  assert(blockedOnlySuppressed, 'blocked-only rescate must be suppressed');
  assert.equal(blockedOnlySuppressed.reason, 'NO_ACTIONABLE_EVIDENCE_AFTER_TRANSPORT_BOUNDARY_FILTER');

  const recoveryFeed = {
    generated_at: '2026-09-17T22:36:00Z',
    source_sha: 'recovery-source-path-fixture',
    summary: { workers: {} },
    workers: [],
    plans: [],
    projects: [{
      project_id: 'alpha',
      label: 'Alpha',
      jobs: [1, 2, 3].map(n => ({
        job_id: `derived-recovery-${n}`,
        dedupe_key: `derived:recovery:${n}`,
        project_id: 'alpha',
        title: `Derived recovery ${n}`,
        priority: 100 - n,
        state: 'replaceable',
        pin_generation: 0,
        source_path: `coordination/portfolio/derived/alpha/derived-recovery-${n}.json`
      }))
    }]
  };
  const recoveryAllocator = buildFastAllocator(
    recoveryFeed,
    { status: 'HEALTHY', metrics: {}, reasons: [] },
    {
      recoveryPolicies: [],
      roleContext: {
        metabolism: { signals: { replaceable_trigger: 3, frontier_floor_absolute: 8 } },
        guideReceipts: [],
        guidePins: [],
        heartbeats: [],
        beacons: [],
        noAlloc: [1, 2, 3].map(n => ({
          path: `coordination/workers/no-allocation/role-evidence-integrity-fixture-${n}.json`,
          doc: {
            observed_at: new Date().toISOString(),
            outcome: 'NO_ALLOCATION',
            reason: 'CREATE_EXISTS_EXHAUSTED'
          }
        }))
      }
    }
  );
  const rescue = recoveryAllocator.role_ready.find(row => row.role === 'GUIDE_RESCATE');
  assert(rescue, 'actionable no-allocation pressure must materialize GUIDE_RESCATE while derived recovery evidence remains available');
  assert(rescue.evidence.includes('coordination/portfolio/derived/alpha/derived-recovery-1.json'), 'derived recovery evidence must preserve source_path');
  assert(!rescue.evidence.some(ref => ref === 'coordination/portfolio/PORTFOLIO.json#job:derived-recovery-1'), 'derived recovery evidence must not fabricate a seed PORTFOLIO job anchor');

  const diag = first.diagnostics.role_evidence_integrity;
  assert.equal(diag.schema, 'prometeo.role-evidence-integrity/v1');
  assert.equal(diag.suppressed_candidates.length, 2);
  assert(diag.suppressed_candidates.some(row => row.reason === 'NO_USABLE_EVIDENCE_AFTER_REPO_LOCAL_VALIDATION'));
  assert(diag.suppressed_candidates.some(row => row.reason === 'NO_ACTIONABLE_EVIDENCE_AFTER_TRANSPORT_BOUNDARY_FILTER'));
  assert(diag.missing_repo_local_refs.some(row => row.ref === missing));
  assert(diag.missing_repo_local_refs.some(row => row.ref === 'missing:coordination/evidence/already-known-missing.json'));
  assert(diag.missing_repo_local_fragment_refs.some(row => row.ref === missingPortfolioProject));
  assert(diag.missing_repo_local_fragment_refs.some(row => row.ref === missingPortfolioJob));
  assert(diag.external_refs_preserved.includes(externalActions));
  assert(diag.external_refs_preserved.includes(externalPages));
  assert.deepEqual(diag.explicit_transport_blocked_telemetry_only_refs, [blockedClassification, blockedCode, blockedOutcome].sort(), 'transport-denial refs must remain visible in deterministic telemetry-only diagnostics');

  console.log('ROLE_READY_EVIDENCE_INTEGRITY_PASS');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
