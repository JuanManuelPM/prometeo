import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {
  GUIDE_GRADE_CONTEXT_REFS,
  REQUIRED_L0_REFS,
  allocateRoleAndOpportunity,
  canonicalBootstrap,
  deriveRole,
  isDerivedReady,
  scopeAllowsPath,
  scopesOverlap,
  validateAuthorityBoundary,
  validateBootstrapCommand,
  validateContextReceipt,
  validateMutationScope,
  validatePostReturn,
  validateUniversalWorkerEnvelope
} from '../scripts/universal-cognitive-worker-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function opportunity(extra = {}) {
  return {
    opportunity_id: 'O-TEST',
    priority: 10,
    status: 'READY',
    type: 'BUILD',
    write_scope: [
      'scripts/universal-cognitive-worker-lib.mjs',
      'scripts/validate-universal-worker.mjs',
      'tests/universal-cognitive-worker-v1.test.mjs',
      'coordination/swarm-v1/kernel/**'
    ],
    ...extra
  };
}

function claim(extra = {}) {
  return {
    schema: 'prometeo.opportunity-claim/v1',
    opportunity_id: 'O-TEST',
    worker_instance_id: 'W-TEST',
    claimed_at: '2026-09-17T09:00:00-03:00',
    state: 'CLAIMED',
    source_head_observed: 'abc123',
    write_scope: opportunity().write_scope,
    ...extra
  };
}

function contextReceipt(extra = {}) {
  return {
    actor_role: 'universal cognitive worker canary / EXECUTE',
    mission: 'exercise universal worker invariants',
    l0_kernel_refs: [...REQUIRED_L0_REFS, ...GUIDE_GRADE_CONTEXT_REFS],
    l1_digest_refs: [],
    l2_exact_source_refs_opened: [],
    authority_labels: ['CANARY_ACTIVE', 'SCOPED_CANDIDATE_ONLY', 'NO_GLOBAL_PROMOTION'],
    source_freshness: {epoch: 'P3-test', head: 'abc123'},
    contradictions_surfaced: [],
    budget_estimate: 'bounded test fixture',
    ...extra
  };
}

function run(extra = {}) {
  return {
    schema: 'prometeo.opportunity-run/v1',
    opportunity_id: 'O-TEST',
    run_id: 'RUN-O-TEST-1',
    worker_instance_id: 'W-TEST',
    claim_ref: 'coordination/opportunities/claims/O-TEST.json',
    state: 'STARTED',
    started_at: '2026-09-17T09:01:00-03:00',
    source_head_at_start: 'abc123',
    mission: 'exercise universal worker invariants',
    acceptance_criteria: ['machine-auditable validation', 'no authority promotion'],
    planned_checkpoints: ['CP1 validate', 'CP2 test', 'CP3 return'],
    checkpoints_reached: ['CLAIMED', 'STARTED'],
    context_receipt: contextReceipt(),
    ...extra
  };
}

function returnArtifact(extra = {}) {
  return {
    schema: 'prometeo.opportunity-return/v1',
    opportunity_id: 'O-TEST',
    run_id: 'RUN-O-TEST-1',
    worker_instance_id: 'W-TEST',
    returned_at: '2026-09-17T09:05:00-03:00',
    evidence_refs: ['coordination/swarm-v1/kernel/CANARY.json'],
    changed_paths: ['tests/universal-cognitive-worker-v1.test.mjs'],
    post_return_action: 'REENTER_ALLOCATION',
    ...extra
  };
}

function validEnvelope(extra = {}) {
  return {
    bootstrap: canonicalBootstrap(),
    opportunity: opportunity(),
    claim: claim(),
    run: run(),
    return: returnArtifact(),
    attempted_paths: ['tests/universal-cognitive-worker-v1.test.mjs'],
    ...extra
  };
}

test('canonical identical /wc bootstrap is enforced', () => {
  assert.equal(validateBootstrapCommand(canonicalBootstrap()).ok, true);
  const invalid = validateBootstrapCommand('PROMETEO → https://juanmanuelpm.github.io/prometeo/w');
  assert.equal(invalid.ok, false);
  assert.equal(invalid.errors[0].code, 'BOOTSTRAP_NOT_CANONICAL');
});

test('guide-grade context receipt requires the strategic posture refs', () => {
  assert.equal(validateContextReceipt(contextReceipt()).ok, true);
  const missing = contextReceipt({l0_kernel_refs: [...REQUIRED_L0_REFS]});
  const result = validateContextReceipt(missing);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(item => item.code === 'GUIDE_GRADE_REF_MISSING'));
});

test('complete universal worker envelope passes auditable invariants', () => {
  const result = validateUniversalWorkerEnvelope(validEnvelope());
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.invariant_summary.canonical_bootstrap, true);
  assert.equal(result.invariant_summary.claim_before_work, true);
  assert.equal(result.invariant_summary.guide_grade_context, true);
  assert.equal(result.invariant_summary.scoped_mutation, true);
  assert.equal(result.invariant_summary.no_authority_self_promotion, true);
  assert.equal(result.invariant_summary.post_return_reentry, true);
});

test('preserve-first scope rejects writes outside the claimed paths', () => {
  const allowed = validateMutationScope(
    ['scripts/universal-cognitive-worker-lib.mjs', 'coordination/swarm-v1/kernel/CANARY.json'],
    opportunity().write_scope
  );
  assert.equal(allowed.ok, true);

  const rejected = validateMutationScope(['scripts/unrelated-system.mjs'], opportunity().write_scope);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.errors[0].code, 'WRITE_SCOPE_VIOLATION');
});

test('authority validator rejects Current/Human Accepted/Served self-promotion', () => {
  assert.equal(validateAuthorityBoundary({status: 'CANDIDATE_READY'}).ok, true);
  const served = validateAuthorityBoundary({served: true});
  assert.equal(served.ok, false);
  assert.equal(served.errors[0].code, 'AUTHORITY_SELF_PROMOTION');

  const forbiddenOpportunity = validateAuthorityBoundary({}, {authority_class: 'SERVED_MUTATION'});
  assert.equal(forbiddenOpportunity.ok, false);
  assert.equal(forbiddenOpportunity.errors[0].code, 'OPPORTUNITY_AUTHORITY_INCOMPATIBLE');
});

test('dependency-gated work requires explicit proof and no failed/conflicted prerequisite', () => {
  assert.equal(isDerivedReady({status: 'READY'}), true);
  assert.equal(isDerivedReady({status: 'BLOCKED_DEPENDENCY'}), false);
  assert.equal(isDerivedReady({
    status: 'BLOCKED_DEPENDENCY',
    derived_readiness: {ready: true, proof_refs: ['returns/A.json'], failed_prerequisites: [], conflicted_prerequisites: []}
  }), true);
  assert.equal(isDerivedReady({
    status: 'BLOCKED_DEPENDENCY',
    derived_readiness: {ready: true, proof_refs: ['returns/A.json'], failed_prerequisites: ['A'], conflicted_prerequisites: []}
  }), false);
});

test('role derivation covers execute, plan, verify, recovery and archaeology', () => {
  assert.equal(deriveRole({type: 'BUILD'}), 'EXECUTE');
  assert.equal(deriveRole({type: 'PLAN'}), 'PLAN_LOCAL');
  assert.equal(deriveRole({type: 'VERIFY'}), 'VERIFY');
  assert.equal(deriveRole({type: 'RECOVER'}), 'RECOVER');
  assert.equal(deriveRole({type: 'ARCHAEOLOGY'}), 'DISCOVER');
});

test('allocator skips claimed/colliding/authority-incompatible work and picks the best safe lane', () => {
  const result = allocateRoleAndOpportunity({
    opportunities: [
      opportunity({opportunity_id: 'O-TAKEN', priority: 50}),
      opportunity({opportunity_id: 'O-COLLIDE', priority: 40, write_scope: ['scripts/shared/**']}),
      opportunity({opportunity_id: 'O-FORBIDDEN', priority: 30, authority_class: 'CURRENT_MUTATION'}),
      opportunity({opportunity_id: 'O-SAFE', priority: 20, type: 'VERIFY', write_scope: ['tests/isolated/**']})
    ],
    claims: [{opportunity_id: 'O-TAKEN', state: 'STARTED'}],
    activeWriters: [{state: 'WRITING', write_scope: ['scripts/shared/file.mjs']}]
  });

  assert.equal(result.selected.opportunity_id, 'O-SAFE');
  assert.equal(result.selected.role, 'VERIFY');
  assert.ok(result.rejected.some(item => item.opportunity_id === 'O-TAKEN' && item.reason === 'ALREADY_CLAIMED'));
  assert.ok(result.rejected.some(item => item.opportunity_id === 'O-COLLIDE' && item.reason === 'LIVE_WRITE_COLLISION'));
  assert.ok(result.rejected.some(item => item.opportunity_id === 'O-FORBIDDEN' && item.reason === 'AUTHORITY_INCOMPATIBLE'));
});

test('post-return idle requires explicit exhaustion proof', () => {
  const invalid = validatePostReturn(returnArtifact({post_return_action: 'IDLE_NO_SAFE_USEFUL_WORK'}), run());
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.some(item => item.code === 'IDLE_NOT_PROVEN'));

  const valid = validatePostReturn(returnArtifact({
    post_return_action: 'IDLE_NO_SAFE_USEFUL_WORK',
    discovery_recovery_exhausted: true
  }), run());
  assert.equal(valid.ok, true);
});

test('path/glob collision helpers preserve exact write ownership boundaries', () => {
  assert.equal(scopeAllowsPath('coordination/swarm-v1/kernel/CANARY.json', ['coordination/swarm-v1/kernel/**']), true);
  assert.equal(scopeAllowsPath('coordination/swarm-v1/other/CANARY.json', ['coordination/swarm-v1/kernel/**']), false);
  assert.equal(scopesOverlap(['scripts/shared/**'], ['scripts/shared/file.mjs']), true);
  assert.equal(scopesOverlap(['scripts/a/**'], ['tests/b/**']), false);
});

test('CLI validator returns machine-readable pass/fail exit codes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prometeo-worker-validator-'));
  const input = path.join(dir, 'envelope.json');
  const report = path.join(dir, 'report.json');
  try {
    fs.writeFileSync(input, `${JSON.stringify(validEnvelope(), null, 2)}\n`, 'utf8');
    const pass = spawnSync(process.execPath, ['scripts/validate-universal-worker.mjs', input, '--out', report], {
      cwd: ROOT,
      encoding: 'utf8'
    });
    assert.equal(pass.status, 0, pass.stderr || pass.stdout);
    assert.equal(JSON.parse(pass.stdout).ok, true);
    assert.equal(JSON.parse(fs.readFileSync(report, 'utf8')).ok, true);

    fs.writeFileSync(input, `${JSON.stringify(validEnvelope({bootstrap: 'wrong'}), null, 2)}\n`, 'utf8');
    const fail = spawnSync(process.execPath, ['scripts/validate-universal-worker.mjs', input], {
      cwd: ROOT,
      encoding: 'utf8'
    });
    assert.equal(fail.status, 1, fail.stderr || fail.stdout);
    assert.equal(JSON.parse(fail.stdout).ok, false);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
