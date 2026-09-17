import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  attemptAtomicSuccessorClaim,
  authorityClass,
  buildSuccessorClaim,
  evaluateCheckpointContinuation,
  evaluateSuccessorClaim,
  readinessEvidence,
  runStartPermission
} from '../scripts/multi-stage-worker-continuation.mjs';

const CONTEXT = 'project-prometeo-chat-control::control-plan::campaign-a';
const SAFE_AUTHORITY = 'SCOPED_CANDIDATE_ONLY';

function current(overrides = {}) {
  return {
    opportunity_id: 'O-A',
    run_id: 'RUN-A-1',
    project_id: 'project-prometeo-chat-control',
    surface_id: 'control-plan',
    continuation_context: CONTEXT,
    authority_class: SAFE_AUTHORITY,
    ...overrides
  };
}

function successor(id = 'O-B', overrides = {}) {
  return {
    opportunity_id: id,
    queue_id: 'Q-TEST',
    status: 'BLOCKED_DEPENDENCY',
    derived_readiness: {
      ready: true,
      proof_refs: ['returns/O-A/RUN-A-1.json'],
      failed_prerequisites: [],
      conflicted_prerequisites: []
    },
    type: 'BUILD',
    project_id: 'project-prometeo-chat-control',
    surface_id: 'control-plan',
    continuation_context: CONTEXT,
    authority_class: SAFE_AUTHORITY,
    write_scope: [`candidate/${id}/**`],
    ...overrides
  };
}

function worker(id) {
  return {
    worker_instance_id: id,
    role: 'EXECUTE',
    source_head_observed: 'abc123',
    epoch_observed: 'P3-test',
    queue_epoch_observed: 'Q-TEST@1'
  };
}

test('same-context same-authority checkpoints continue in one run', () => {
  const result = evaluateCheckpointContinuation({
    run: current(),
    remaining_checkpoints: [
      {continuation_context: CONTEXT, authority_class: SAFE_AUTHORITY},
      {continuation_context: CONTEXT, authority_class: SAFE_AUTHORITY}
    ]
  });
  assert.equal(result.decision, 'CONTINUE_SAME_RUN');
  assert.equal(result.same_context, true);
  assert.equal(result.same_authority, true);
});

test('context or authority changes force a split/boundary', () => {
  const changedContext = evaluateCheckpointContinuation({
    run: current(),
    remaining_checkpoints: [{continuation_context: 'different-context', authority_class: SAFE_AUTHORITY}]
  });
  assert.equal(changedContext.decision, 'SPLIT_OR_BOUNDARY');
  assert.ok(changedContext.reasons.some(reason => reason.includes('CONTEXT')));

  const promoted = evaluateCheckpointContinuation({
    run: current(),
    remaining_checkpoints: [{continuation_context: CONTEXT, authority_class: 'CURRENT_MUTATION'}]
  });
  assert.equal(promoted.decision, 'SPLIT_OR_BOUNDARY');
  assert.ok(promoted.reasons.some(reason => reason.includes('AUTHORITY')));
});

test('derived readiness is consumed only with durable proof and no failed/conflicted prerequisites', () => {
  assert.equal(readinessEvidence(successor()).ready, true);
  assert.equal(readinessEvidence(successor('O-X', {
    derived_readiness: {ready: true, proof_refs: [], failed_prerequisites: [], conflicted_prerequisites: []}
  })).ready, false);
  assert.equal(readinessEvidence(successor('O-Y', {
    derived_readiness: {ready: true, proof_refs: ['r'], failed_prerequisites: ['O-Z'], conflicted_prerequisites: []}
  })).ready, false);
});

test('successor claim is blocked by context change, authority escalation, or live existing claim', () => {
  assert.equal(evaluateSuccessorClaim({current: current(), successor: successor()}).decision, 'ATTEMPT_ATOMIC_CLAIM');

  const contextMismatch = evaluateSuccessorClaim({
    current: current(),
    successor: successor('O-C', {continuation_context: 'other'})
  });
  assert.equal(contextMismatch.decision, 'REENTER_ALLOCATION');
  assert.ok(contextMismatch.reasons.includes('CONTEXT_CHANGED'));

  const authorityEscalation = evaluateSuccessorClaim({
    current: current(),
    successor: successor('O-D', {authority_class: 'SERVED_MUTATION'})
  });
  assert.equal(authorityEscalation.decision, 'REENTER_ALLOCATION');
  assert.ok(authorityEscalation.reasons.includes('AUTHORITY_FORBIDDEN'));

  const alreadyClaimed = evaluateSuccessorClaim({
    current: current(),
    successor: successor('O-E'),
    claims: [{opportunity_id: 'O-E', state: 'EXECUTING', claim_ref: 'claims/O-E.json'}]
  });
  assert.equal(alreadyClaimed.decision, 'REENTER_ALLOCATION');
  assert.ok(alreadyClaimed.reasons.includes('SUCCESSOR_ALREADY_CLAIMED'));
});

test('claim payload remains candidate-scoped and never self-promotes authority', () => {
  const payload = buildSuccessorClaim({
    current: current(),
    successor: successor(),
    worker: worker('worker-a'),
    now: '2026-09-17T00:50:00-03:00'
  });
  assert.equal(payload.claim_protocol, 'CREATE_IF_ABSENT_EXCLUSIVE');
  assert.equal(payload.authority, 'SCOPED_CANDIDATE_ONLY_NO_GLOBAL_PROMOTION');
  assert.equal(payload.continuation.authority_class, SAFE_AUTHORITY);
  assert.equal(authorityClass(payload), 'SCOPED_CANDIDATE_ONLY_NO_GLOBAL_PROMOTION');
  const encoded = JSON.stringify(payload).toUpperCase();
  assert.equal(encoded.includes('"CURRENT":TRUE'), false);
  assert.equal(encoded.includes('"HUMAN_ACCEPTED":TRUE'), false);
  assert.equal(encoded.includes('"SERVED":TRUE'), false);
});

test('two workers racing the same exclusive successor produce exactly one start permission', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-continuation-race-'));
  try {
    const next = successor('O-RACE');
    const [a, b] = await Promise.all([
      attemptAtomicSuccessorClaim({current: current(), successor: next, worker: worker('worker-a'), claim_root: dir, now: '2026-09-17T00:51:00-03:00'}),
      attemptAtomicSuccessorClaim({current: current(), successor: next, worker: worker('worker-b'), claim_root: dir, now: '2026-09-17T00:51:00-03:00'})
    ]);
    const winners = [a, b].filter(result => result.won);
    const losers = [a, b].filter(result => !result.won);
    assert.equal(winners.length, 1);
    assert.equal(losers.length, 1);
    assert.equal(runStartPermission(winners[0]).allowed, true);
    assert.equal(runStartPermission(losers[0]).allowed, false);

    const persisted = JSON.parse(await fs.readFile(path.join(dir, 'O-RACE.json'), 'utf8'));
    assert.equal(persisted.opportunity_id, 'O-RACE');
    assert.ok(['worker-a', 'worker-b'].includes(persisted.worker_instance_id));
  } finally {
    await fs.rm(dir, {recursive: true, force: true});
  }
});

test('independent sibling successors stay parallel because their exclusive claim paths are distinct', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-continuation-siblings-'));
  try {
    const [left, right] = await Promise.all([
      attemptAtomicSuccessorClaim({current: current(), successor: successor('O-LEFT'), worker: worker('worker-left'), claim_root: dir}),
      attemptAtomicSuccessorClaim({current: current(), successor: successor('O-RIGHT'), worker: worker('worker-right'), claim_root: dir})
    ]);
    assert.equal(left.won, true);
    assert.equal(right.won, true);
    assert.equal(runStartPermission(left).allowed, true);
    assert.equal(runStartPermission(right).allowed, true);
    const entries = (await fs.readdir(dir)).sort();
    assert.deepEqual(entries, ['O-LEFT.json', 'O-RIGHT.json']);
  } finally {
    await fs.rm(dir, {recursive: true, force: true});
  }
});

test('preserve-first: claiming mutates only the append-only claim path, not opportunity objects', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-continuation-preserve-'));
  try {
    const cur = current();
    const next = successor('O-PRESERVE');
    const beforeCurrent = structuredClone(cur);
    const beforeNext = structuredClone(next);
    const receipt = await attemptAtomicSuccessorClaim({current: cur, successor: next, worker: worker('worker-preserve'), claim_root: dir});
    assert.equal(receipt.won, true);
    assert.deepEqual(cur, beforeCurrent);
    assert.deepEqual(next, beforeNext);
    assert.deepEqual(await fs.readdir(dir), ['O-PRESERVE.json']);
  } finally {
    await fs.rm(dir, {recursive: true, force: true});
  }
});
