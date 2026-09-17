#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyRoleEvidenceIntegrity, validateRoleEvidenceRefs } from '../../../scripts/apply-role-evidence-integrity.mjs';

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
assert.equal(ratchet.required?.regression_test, 'coordination/portfolio/tests/role_ready_evidence_integrity_v1.mjs');

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
  fs.writeFileSync(path.join(root, 'coordination', 'evidence', 'valid.json'), '{}\n');

  const valid = 'coordination/evidence/valid.json#proof';
  const missing = 'coordination/evidence/absent.json';
  const externalActions = 'github-actions:run/123';
  const externalPages = 'gh-pages:live/allocator.json@2026-09-17T21:36:13.758Z';

  const direct = validateRoleEvidenceRefs([missing, valid, externalPages, externalActions], root);
  assert(direct.usable.includes(valid), 'valid repo-local evidence must remain usable');
  assert(!direct.usable.includes(missing), 'missing repo-local evidence must not remain usable');
  assert(direct.usable.includes(externalActions), 'github-actions evidence must remain usable');
  assert(direct.usable.includes(externalPages), 'gh-pages evidence must remain usable');
  assert(direct.diagnostics.some(row => row.kind === 'MISSING_REPO_LOCAL' && row.ref === missing), 'missing repo-local evidence must be diagnosed');

  const allocator = {
    schema: 'prometeo.fast-allocator/v3',
    counts: { role_ready: 2 },
    role_ready: [
      {
        role_id: 'guide-critic-fixedfingerprint',
        guide_work_id: 'guide-critic-fixedfingerprint',
        role: 'GUIDE_CRITIC',
        trigger: 'PARTIAL_LOOP',
        fingerprint: 'fixedfingerprint',
        evidence: [missing, valid, externalActions, externalPages],
        claim_payload_shape: {
          schema: 'prometeo.guide-role-pin/v1',
          guide_work_id: 'guide-critic-fixedfingerprint',
          evidence: [missing, valid, externalActions, externalPages]
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
      }
    ]
  };

  const first = applyRoleEvidenceIntegrity(structuredClone(allocator), root);
  const second = applyRoleEvidenceIntegrity(structuredClone(allocator), root);
  assert.deepEqual(first, second, 'compiled evidence validation must be deterministic');
  assert.equal(first.counts.role_ready, 1, 'evidence-empty role candidates must be suppressed');
  assert.equal(first.role_ready.length, 1);

  const kept = first.role_ready[0];
  assert.equal(kept.role_id, 'guide-critic-fixedfingerprint', 'role identity must not be recomputed');
  assert.equal(kept.fingerprint, 'fixedfingerprint', 'role fingerprint must not be recomputed');
  assert(kept.evidence.includes(valid));
  assert(!kept.evidence.includes(missing));
  assert(kept.evidence.includes(externalActions));
  assert(kept.evidence.includes(externalPages));
  assert.deepEqual(kept.claim_payload_shape.evidence, kept.evidence, 'PIN payload evidence must match sanitized evidence');
  assert(kept.evidence_diagnostics.some(row => row.kind === 'MISSING_REPO_LOCAL' && row.ref === missing));

  const diag = first.diagnostics.role_evidence_integrity;
  assert.equal(diag.schema, 'prometeo.role-evidence-integrity/v1');
  assert.equal(diag.suppressed_candidates.length, 1);
  assert.equal(diag.suppressed_candidates[0].reason, 'NO_USABLE_EVIDENCE_AFTER_REPO_LOCAL_VALIDATION');
  assert(diag.missing_repo_local_refs.some(row => row.ref === missing));
  assert(diag.missing_repo_local_refs.some(row => row.ref === 'missing:coordination/evidence/already-known-missing.json'));
  assert(diag.external_refs_preserved.includes(externalActions));
  assert(diag.external_refs_preserved.includes(externalPages));

  console.log('ROLE_READY_EVIDENCE_INTEGRITY_PASS');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
