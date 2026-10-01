import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  discoveryFingerprint,
  pinProposalFingerprint
} from './discovery-dedup-lib.mjs';

const semanticIdentity = {
  root: 'prometeo-autonomous-growth',
  target: {
    owner: 'worker-e3-capsule-source-integrity',
    surface: 'guide-successor'
  },
  problem: 'duplicate semantic successor materialization',
  acceptance: [
    'one durable successor per semantic residual',
    'concurrent equivalent attempts become collision/reference',
    'dedup never grants execution or promotion authority'
  ]
};

const successorA = {
  ...semanticIdentity,
  proposal_id: 'portfolio-primary-chat-work-unit-ingress-capsule-contract-repair-v1',
  title: 'Primary Chat · reparar contrato ejecutable del Work Unit ingress reconcile',
  mission: 'Repair the existing Primary Chat Work Unit ingress-reconcile execution capsule.',
  evidence_refs: ['fixture:return-boundary-a'],
  value_signals: {
    regression_prevention: 'Prevent replay of the same E3 capsule defect.'
  }
};

const successorB = {
  ...semanticIdentity,
  proposal_id: 'portfolio-worker-e3-capsule-source-integrity-repair-v1',
  title: 'Worker E3 · reparar integridad fuente→cápsula sin contexto fantasma',
  mission: 'Repair E3 source-to-capsule integrity for the same ingress reconcile residual.',
  evidence_refs: ['fixture:return-boundary-b'],
  value_signals: {
    regression_prevention: 'Prevent replay of the same E3 capsule defect.'
  }
};

const genuinelyDifferent = {
  ...semanticIdentity,
  target: {
    owner: 'guide-successor-semantic-dedup',
    surface: 'guide-successor'
  },
  proposal_id: 'portfolio-guide-successor-semantic-dedup-v1',
  title: 'Guide · deduplicar sucesores semánticos antes de materializar',
  mission: 'Repair the Guide materialization gate itself.',
  evidence_refs: ['fixture:duplicate-materialization'],
  value_signals: {
    regression_prevention: 'Prevent future duplicate successors.'
  }
};

const fingerprintA = discoveryFingerprint(successorA);
const fingerprintB = discoveryFingerprint(successorB);
const fingerprintDifferent = discoveryFingerprint(genuinelyDifferent);

assert.equal(
  fingerprintA,
  fingerprintB,
  'Equivalent residuals with different job ids/title/mission must share one semantic fingerprint.'
);
assert.notEqual(
  fingerprintA,
  fingerprintDifferent,
  'A genuinely different semantic target must have a different fingerprint.'
);

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-guide-dedup-'));
try {
  const [attemptA, attemptB] = await Promise.all([
    pinProposalFingerprint({
      directory,
      candidate: successorA,
      source: {worker_instance_id: 'fixture-guide-a'},
      now: '2026-10-01T18:00:00.000Z'
    }),
    pinProposalFingerprint({
      directory,
      candidate: successorB,
      source: {worker_instance_id: 'fixture-guide-b'},
      now: '2026-10-01T18:00:00.001Z'
    })
  ]);

  const attempts = [attemptA, attemptB];
  const winners = attempts.filter(x => x.won);
  const collisions = attempts.filter(x => x.collision);

  assert.equal(winners.length, 1, 'Exactly one equivalent successor fingerprint claim must win.');
  assert.equal(collisions.length, 1, 'The concurrent equivalent attempt must become a collision/reference.');
  assert.equal(winners[0].pin.authority, 'DEDUP_PIN_ONLY_NO_EXECUTION_OR_PROMOTION_AUTHORITY');

  console.log(JSON.stringify({
    ok: true,
    equivalent_fingerprint: fingerprintA,
    distinct_fingerprint: fingerprintDifferent,
    race: {
      winners: winners.length,
      collisions: collisions.length
    },
    authority: winners[0].pin.authority
  }, null, 2));
} finally {
  await fs.rm(directory, {recursive: true, force: true});
}
