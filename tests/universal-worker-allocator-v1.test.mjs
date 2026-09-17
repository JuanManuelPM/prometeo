import test from 'node:test';
import assert from 'node:assert/strict';
import { decideUniversalWorkerAction } from '../scripts/universal-worker-allocator.mjs';

const ready = (id, priority, type = 'BUILD', extra = {}) => ({
  opportunity_id: id,
  priority,
  status: 'READY',
  type,
  ...extra
});

test('selects the highest-value compatible prepared opportunity and derives role', () => {
  const result = decideUniversalWorkerAction({
    opportunities: [ready('O-LOW', 2, 'VERIFY'), ready('O-HIGH', 7, 'PLAN')]
  });
  assert.equal(result.selected.opportunity_id, 'O-HIGH');
  assert.equal(result.selected.role, 'PLAN_LOCAL');
  assert.equal(result.selected.claim_mode, 'CREATE_IF_ABSENT_EXCLUSIVE');
});

test('does not select an already-active claimed opportunity', () => {
  const result = decideUniversalWorkerAction({
    opportunities: [ready('O-TAKEN', 9), ready('O-FREE', 8)],
    claims: [{opportunity_id: 'O-TAKEN', state: 'STARTED'}]
  });
  assert.equal(result.selected.opportunity_id, 'O-FREE');
});

test('accepts dependency work only with durable derived-readiness proof', () => {
  const result = decideUniversalWorkerAction({
    opportunities: [
      {opportunity_id: 'O-NOPROOF', priority: 20, status: 'BLOCKED_DEPENDENCY', type: 'VERIFY'},
      {
        opportunity_id: 'O-PROVEN', priority: 10, status: 'BLOCKED_DEPENDENCY', type: 'VERIFY',
        derived_readiness: {ready: true, proof_refs: ['returns/A.json'], failed_prerequisites: [], conflicted_prerequisites: []}
      }
    ]
  });
  assert.equal(result.selected.opportunity_id, 'O-PROVEN');
  assert.equal(result.selected.role, 'VERIFY');
});

test('eligible stale recovery can outrank lower-value prepared work and remains append-only', () => {
  const result = decideUniversalWorkerAction({
    opportunities: [ready('O-FILLER', 10, 'DOCUMENT')],
    recovery_candidates: [{
      opportunity_id: 'O-STALLED', recovery_eligible: true, retry_safe: true,
      original_priority: 50, age_minutes: 47, return_exists: false,
      newer_signal_exists: false, live_write_collision: false
    }]
  });
  assert.equal(result.selected.opportunity_id, 'O-STALLED');
  assert.equal(result.selected.role, 'RECOVER');
  assert.equal(result.selected.claim_mode, 'APPEND_ONLY_RECOVERY_CLAIM');
  assert.equal(result.invariants.recovery_is_append_only, true);
});

test('unsafe or stale-unproven recovery never preempts safe prepared work', () => {
  const result = decideUniversalWorkerAction({
    opportunities: [ready('O-SAFE', 5, 'BUILD')],
    recovery_candidates: [{
      opportunity_id: 'O-UNSAFE', recovery_eligible: true, retry_safe: false,
      original_priority: 99, age_minutes: 80
    }]
  });
  assert.equal(result.selected.opportunity_id, 'O-SAFE');
  assert.equal(result.recovery_frontier.eligible.length, 0);
  assert.deepEqual(result.recovery_frontier.rejected[0].reasons, ['RETRY_UNSAFE']);
});

test('preserve-first rejects a prepared opportunity with a live overlapping writer', () => {
  const result = decideUniversalWorkerAction({
    opportunities: [
      ready('O-COLLIDES', 20, 'BUILD', {write_scope: ['scripts/shared/**']}),
      ready('O-INDEPENDENT', 10, 'BUILD', {write_scope: ['scripts/isolated/**']})
    ],
    active_writers: [{state: 'WRITING', write_scope: ['scripts/shared/file.mjs']}]
  });
  assert.equal(result.selected.opportunity_id, 'O-INDEPENDENT');
  assert.ok(result.prepared_frontier.rejected.some(item => item.opportunity_id === 'O-COLLIDES' && item.reason === 'LIVE_WRITE_COLLISION'));
});

test('authority boundary rejects global promotion work even when it has the highest priority', () => {
  const result = decideUniversalWorkerAction({
    opportunities: [
      ready('O-FORBIDDEN', 100, 'BUILD', {authority_class: 'SERVED_MUTATION'}),
      ready('O-CANDIDATE', 10, 'VERIFY')
    ]
  });
  assert.equal(result.selected.opportunity_id, 'O-CANDIDATE');
  assert.ok(result.prepared_frontier.rejected.some(item => item.opportunity_id === 'O-FORBIDDEN' && item.reason === 'AUTHORITY_INCOMPATIBLE'));
  assert.equal(result.invariants.no_authority_promotion, true);
});

test('falls back to context compilation before discovery when context quality blocks safe allocation', () => {
  const result = decideUniversalWorkerAction({
    signals: {
      context_compile_required: true,
      context_compile_authorized: true,
      discovery_authorized: true
    }
  });
  assert.equal(result.selected.role, 'CONTEXT_COMPILE');
  assert.equal(result.selected.action, 'COMPILE_CONTEXT');
});

test('uses deduplicated discovery only after prepared and recovery frontiers are empty', () => {
  const result = decideUniversalWorkerAction({signals: {discovery_authorized: true}});
  assert.equal(result.selected.role, 'DISCOVER');
  assert.equal(result.selected.claim_mode, 'CREATE_IF_ABSENT_PROPOSAL_FINGERPRINT');
  assert.equal(result.invariants.discovery_requires_authorization, true);
});

test('never emits IDLE without explicit exhaustion proof', () => {
  const unproven = decideUniversalWorkerAction({});
  assert.equal(unproven.selected, null);

  const proven = decideUniversalWorkerAction({signals: {discovery_recovery_exhausted: true}});
  assert.equal(proven.selected.action, 'IDLE_NO_SAFE_USEFUL_WORK');
  assert.equal(proven.invariants.idle_requires_exhaustion_proof, true);
});

test('compact fallback is scoped and only selected when authorized', () => {
  const blocked = decideUniversalWorkerAction({signals: {compact_required: true}});
  assert.equal(blocked.selected, null);

  const allowed = decideUniversalWorkerAction({signals: {compact_required: true, compact_authorized: true}});
  assert.equal(allowed.selected.role, 'COMPACT');
  assert.equal(allowed.selected.claim_mode, 'SCOPED_LOCAL_RECEIPT');
});
