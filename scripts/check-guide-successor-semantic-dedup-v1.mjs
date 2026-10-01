import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  canonicalDiscoveryIdentity,
  discoveryFingerprint,
  discoverySemanticAliasId,
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

const privateIngressOwnerForm = {
  root: 'prometeo-autonomous-growth',
  target: {
    capability: 'opaque work_item_id return_path correlation',
    owner: 'current-tree/control-v11 private ingress',
    surface: 'primary chat'
  },
  problem: 'browser drops opaque execution correlation before ui reload',
  acceptance: [
    'existing deterministic ingress and approval regressions remain passing',
    'ingress-v1 preserves validated work_item_id and return_path',
    'input-module-v1 exposes the exact sanitized return correlation to primary chat ui',
    'no workspace secret or raw private payload is persisted publicly'
  ],
  proposal_id: 'P-primary-chat-private-ingress-correlation-v1',
  title: 'Primary Chat · retain opaque private ingress correlation',
  mission: 'Preserve opaque private-ingress correlation through Primary Chat reload.',
  evidence_refs: ['fixture:pdf-5b2c5e47862fc359d1528a50b91cb4bd'],
  value_signals: {
    regression_prevention: 'Prevent duplicate successor materialization for one private-ingress residual.'
  }
};

const privateIngressPathForm = {
  root: 'prometeo-autonomous-growth',
  target: [
    'current-tree/control-v11/chat-canary/input-module-v1.js',
    'current-tree/control-v11/ingress-v1.js'
  ],
  problem: 'private ingress browser drops opaque correlation work_item_id return_path before exact return reload',
  acceptance: [
    'deterministic harness covers reload/replay and malformed correlation rejection',
    'ui reload/correlation targets the exact sanitized return without exposing private payload or secret',
    'validated work_item_id and return_path persist from prepare_execution response through input-module state'
  ],
  proposal_id: 'P-aab1b67e64b4-private-ingress-correlation',
  title: 'Primary Chat · retain private ingress correlation by concrete paths',
  mission: 'Preserve the same opaque correlation through the two concrete browser surfaces.',
  evidence_refs: ['fixture:pdf-aab1b67e64b43e814a3f214f98b10634'],
  value_signals: {
    regression_prevention: 'Prevent duplicate successor materialization for one private-ingress residual.'
  }
};

const privateIngressDifferentTarget = {
  ...privateIngressPathForm,
  target: [
    'current-tree/control-v11/chat-canary/progress-v1.js',
    'current-tree/control-v11/ingress-v1.js'
  ],
  proposal_id: 'P-private-ingress-different-target'
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

const privateIngressOwnerFingerprint = discoveryFingerprint(privateIngressOwnerForm);
const privateIngressPathFingerprint = discoveryFingerprint(privateIngressPathForm);
const privateIngressDifferentFingerprint = discoveryFingerprint(privateIngressDifferentTarget);
assert.equal(
  privateIngressOwnerFingerprint,
  privateIngressPathFingerprint,
  'Real private-ingress owner/capability and concrete-path forms must converge before pin CREATE.'
);
assert.equal(
  privateIngressOwnerFingerprint,
  'pdf-8a4ce606f43065c2f9bda3ccc98f8477',
  'The bounded private-ingress semantic alias must remain deterministic.'
);
assert.equal(discoverySemanticAliasId(privateIngressOwnerForm), 'primary-chat-private-ingress-correlation-v1');
assert.equal(discoverySemanticAliasId(privateIngressPathForm), 'primary-chat-private-ingress-correlation-v1');
assert.notEqual(
  privateIngressOwnerFingerprint,
  privateIngressDifferentFingerprint,
  'A genuinely different concrete surface must not collapse into the private-ingress correlation alias.'
);
assert.deepEqual(
  canonicalDiscoveryIdentity(privateIngressOwnerForm),
  canonicalDiscoveryIdentity(privateIngressPathForm),
  'Both historical description forms must resolve to one canonical semantic identity.'
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

  const aliasGuardPath = path.join(directory, `${privateIngressOwnerFingerprint}.json`);
  await fs.writeFile(aliasGuardPath, `${JSON.stringify({
    schema: 'prometeo.proposal-fingerprint-claim/v1',
    fingerprint: privateIngressOwnerFingerprint,
    proposal_id: 'P-private-ingress-alias-guard',
    state: 'PINNED_CANDIDATE',
    canonical_identity: canonicalDiscoveryIdentity(privateIngressOwnerForm),
    semantic_alias_id: 'primary-chat-private-ingress-correlation-v1',
    historical_alias_fingerprints: [
      'pdf-5b2c5e47862fc359d1528a50b91cb4bd',
      'pdf-aab1b67e64b43e814a3f214f98b10634'
    ],
    successor_ref: 'coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-primary-chat-private-ingress-correlation-retention-v1.json',
    authority: 'DEDUP_PIN_ONLY_NO_EXECUTION_OR_PROMOTION_AUTHORITY'
  }, null, 2)}\n`, 'utf8');

  const [aliasAttemptA, aliasAttemptB] = await Promise.all([
    pinProposalFingerprint({directory, candidate: privateIngressOwnerForm, source:{worker_instance_id:'fixture-private-a'}, now:'2026-10-01T23:55:00.000Z'}),
    pinProposalFingerprint({directory, candidate: privateIngressPathForm, source:{worker_instance_id:'fixture-private-b'}, now:'2026-10-01T23:55:00.001Z'})
  ]);
  assert.equal(aliasAttemptA.collision, true, 'Owner/capability form must collide with durable alias guard.');
  assert.equal(aliasAttemptB.collision, true, 'Concrete-path form must collide with durable alias guard.');

  console.log(JSON.stringify({
    ok: true,
    equivalent_fingerprint: fingerprintA,
    distinct_fingerprint: fingerprintDifferent,
    race: {
      winners: winners.length,
      collisions: collisions.length
    },
    real_incident: {
      historical_fingerprints: [
        'pdf-5b2c5e47862fc359d1528a50b91cb4bd',
        'pdf-aab1b67e64b43e814a3f214f98b10634'
      ],
      canonical_fingerprint: privateIngressOwnerFingerprint,
      alias_id: discoverySemanticAliasId(privateIngressOwnerForm),
      guard_collisions: [aliasAttemptA.collision, aliasAttemptB.collision],
      distinct_target_fingerprint: privateIngressDifferentFingerprint
    },
    authority: winners[0].pin.authority
  }, null, 2));
} finally {
  await fs.rm(directory, {recursive: true, force: true});
}
