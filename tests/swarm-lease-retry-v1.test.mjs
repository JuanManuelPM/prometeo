import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BINDING_CANARY_POLICY,
  buildRecoveryAttempt,
  evaluateCas,
  evaluateRecovery,
  reconcileLateReturn,
} from '../scripts/swarm-lease-lib.mjs';
import {scanSubjects} from '../scripts/swarm-stale-scan.mjs';

const NOW = '2026-09-17T01:00:00-03:00';
const claim = (at) => ({kind: 'CLAIM', at, ref: 'claims/O.json', claim_protocol: 'CREATE_IF_ABSENT_EXCLUSIVE'});
const started = (at) => ({kind: 'STARTED', at, ref: 'runs/O/RUN.json'});
const heartbeat = (at) => ({kind: 'HEARTBEAT', at, ref: 'runs/O/RUN.json'});
const base = (ageMinutes, extra = {}) => ({
  subject_id: 'O-1',
  events: [claim('2026-09-17T00:00:00-03:00'), started('2026-09-17T00:01:00-03:00'), heartbeat(new Date(Date.parse(NOW) - ageMinutes * 60_000).toISOString())],
  now: NOW,
  policy: BINDING_CANARY_POLICY,
  retryable: true,
  recovery_mode: 'CAS_CONTINUE',
  target_refetched: true,
  expected_sha: 'abc',
  observed_sha: 'abc',
  ...extra,
});

test('recent durable heartbeat remains ACTIVE_OR_UNKNOWN with no takeover', () => {
  const result = evaluateRecovery(base(19));
  assert.equal(result.state, 'ACTIVE_OR_UNKNOWN');
  assert.equal(result.decision, 'NO_TAKEOVER');
  assert.equal(result.recovery_eligible, false);
});

test('20-29 minute silence is STALE_SUSPECT but not retryable yet', () => {
  const result = evaluateRecovery(base(25));
  assert.equal(result.state, 'STALE_SUSPECT');
  assert.equal(result.decision, 'OBSERVE_ONLY');
  assert.equal(result.recovery_eligible, false);
});

test('30+ minute silence becomes RECOVERY_ELIGIBLE only after all safety gates pass', () => {
  const result = evaluateRecovery(base(31));
  assert.equal(result.state, 'RECOVERY_ELIGIBLE');
  assert.equal(result.decision, 'APPEND_RECOVERY_CLAIM');
  assert.equal(result.recovery_eligible, true);
});

test('newer heartbeat invalidates an older stale assumption', () => {
  const stale = evaluateRecovery(base(40));
  assert.equal(stale.state, 'RECOVERY_ELIGIBLE');
  const fresh = evaluateRecovery(base(40, {events: [...base(40).events, heartbeat('2026-09-17T00:55:00-03:00')]}));
  assert.equal(fresh.state, 'ACTIVE_OR_UNKNOWN');
  assert.equal(fresh.recovery_eligible, false);
});

test('durable RETURN suppresses retry regardless of age', () => {
  const input = base(40);
  input.events.push({kind: 'RETURN', at: '2026-09-17T00:50:00-03:00', ref: 'returns/O/R.json'});
  const result = evaluateRecovery(input);
  assert.equal(result.state, 'TERMINAL');
  assert.equal(result.decision, 'NO_RETRY');
});

test('missing explicit governing policy never infers stale from age alone', () => {
  const result = evaluateRecovery({...base(120), policy: null});
  assert.equal(result.state, 'ACTIVE_OR_UNKNOWN');
  assert.equal(result.decision, 'HOLD');
  assert.deepEqual(result.reasons, ['STALE_POLICY_MISSING']);
});

test('CAS mismatch blocks continuation and requires reload', () => {
  const result = evaluateRecovery(base(40, {observed_sha: 'changed'}));
  assert.equal(result.recovery_eligible, false);
  assert.equal(result.decision, 'RELOAD_REQUIRED');
  assert.ok(result.reasons.includes('CAS_MISMATCH'));
  assert.deepEqual(evaluateCas({mode: 'CAS_CONTINUE', expected_sha: 'a', observed_sha: 'b', refetched: true}).state, 'RELOAD_REQUIRED');
});

test('active overlapping writer parks recovery', () => {
  const result = evaluateRecovery(base(40, {active_overlap: true}));
  assert.equal(result.recovery_eligible, false);
  assert.equal(result.decision, 'PARK');
  assert.ok(result.reasons.includes('ACTIVE_OVERLAPPING_WRITER'));
});

test('recovery attempt is append-only lineage with scoped candidate authority', () => {
  const evaluation = evaluateRecovery(base(40, {recovery_mode: 'ISOLATED_CANDIDATE'}));
  const built = buildRecoveryAttempt({
    recovery_attempt_id: 'REC-01',
    opportunity_id: 'O-1',
    original_claim_ref: 'coordination/opportunities/claims/O-1.json',
    original_run_ref: 'coordination/opportunities/runs/O-1/RUN-ORIGINAL.json',
    recovery_worker_instance_id: 'worker-recovery',
    created_at: NOW,
    source_head: 'head1',
    epoch: 'P3-test',
    mode: 'ISOLATED_CANDIDATE',
    evaluation,
    intended_write_scope: ['candidate/**'],
  });
  assert.equal(built.recovery_claim_path, 'coordination/opportunities/recovery-claims/O-1/REC-01.json');
  assert.equal(built.recovery_claim.original_run_ref, 'coordination/opportunities/runs/O-1/RUN-ORIGINAL.json');
  assert.equal(built.run_seed.previous_run, 'coordination/opportunities/runs/O-1/RUN-ORIGINAL.json');
  assert.equal(built.run_seed.supersedes_attempt_candidate, 'coordination/opportunities/runs/O-1/RUN-ORIGINAL.json');
  assert.match(built.recovery_claim.authority, /NO_GLOBAL_PROMOTION/);
  assert.match(built.recovery_claim.preservation_rule, /IMMUTABLE/);
});

test('late original return preserves both attempts and requires validation', () => {
  const reconciliation = reconcileLateReturn({
    original_return: {ref: 'returns/O/original.json', digest: 'a'},
    recovery_return: {ref: 'returns/O/recovery.json', digest: 'b'},
    compared_at: NOW,
    validator_id: 'validator-1',
  });
  assert.equal(reconciliation.preserve_both, true);
  assert.equal(reconciliation.auto_promote, false);
  assert.equal(reconciliation.disposition, 'REQUIRES_VALIDATION');
  assert.match(reconciliation.rule, /NEITHER/);
});

test('read-only scanner emits candidates but performs no mutation', () => {
  const subject = {
    opportunity_id: 'O-1',
    subject_id: 'O-1',
    events: base(40).events,
    retryable: true,
    recovery_mode: 'ISOLATED_CANDIDATE',
    target_refetched: true,
    active_overlap: false,
    original_claim_ref: 'coordination/opportunities/claims/O-1.json',
    original_run_ref: 'coordination/opportunities/runs/O-1/RUN.json',
    emit_recovery_candidate: true,
    recovery_attempt_id: 'REC-SCAN-01',
    recovery_worker_instance_id: 'worker-scan',
    source_head: 'head1',
    epoch: 'P3-test',
    intended_write_scope: ['candidate/**'],
  };
  const output = scanSubjects({now: NOW, policy: BINDING_CANARY_POLICY, subjects: [subject]});
  assert.equal(output.schema, 'prometeo.swarm-stale-scan/v1');
  assert.equal(output.mode, 'READ_ONLY_CANDIDATE_SCAN');
  assert.equal(output.mutation_performed, false);
  assert.equal(output.recovery_candidates, 1);
  assert.ok(output.results[0].stale_probe_candidate);
  assert.ok(output.results[0].recovery_candidate);
});
