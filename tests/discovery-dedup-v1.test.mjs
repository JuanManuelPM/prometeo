import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildWorkerProposal,
  canonicalDiscoveryIdentity,
  discoveryFingerprint,
  pinProposalFingerprint,
  validateDiscoveryCandidate
} from '../scripts/discovery-dedup-lib.mjs';

const base = {
  root: 'project-prometeo-chat-control',
  target: 'Control Room / workers',
  problem: 'Missing worker stale-risk projection',
  acceptance: ['Projection is derived from durable evidence', 'No authority promotion'],
  title: 'Derive stale-risk projection',
  mission: 'Build a read-only stale-risk projection from durable claims and runs.',
  evidence_refs: ['coordination/CONTINUITY_HEAD.json'],
  value_signals: {unblock_value: {reason: 'Makes stalled work visible.', evidence_ref: 'coordination/CONTINUITY_HEAD.json'}},
  candidate_write_scope: ['coordination/candidates/stale-risk/**']
};

const source = {
  worker_instance_id: 'worker-test',
  opportunity_id: 'O-TEST',
  run_id: 'RUN-TEST'
};

test('fingerprint is stable across casing, accents, whitespace and acceptance ordering', () => {
  const a = discoveryFingerprint(base);
  const b = discoveryFingerprint({
    ...base,
    root: ' PROJECT-PROMETEO-CHAT-CONTROL ',
    target: 'control   room / WORKERS',
    problem: 'Missing worker stale-risk projection',
    acceptance: [' no authority promotion ', 'PROJECTION is derived from durable evidence']
  });
  assert.equal(a, b);
  assert.match(a, /^pdf-[0-9a-f]{32}$/);
});

test('material identity changes do not false-merge', () => {
  const original = discoveryFingerprint(base);
  assert.notEqual(discoveryFingerprint({...base, root: 'project-facultad'}), original);
  assert.notEqual(discoveryFingerprint({...base, target: 'another-owner'}), original);
  assert.notEqual(discoveryFingerprint({...base, problem: 'different problem class'}), original);
  assert.notEqual(discoveryFingerprint({...base, acceptance: ['Different outcome']}), original);
});

test('canonical identity includes only the deterministic root/target/problem/acceptance key', () => {
  assert.deepEqual(Object.keys(canonicalDiscoveryIdentity(base)), ['root', 'target', 'problem', 'acceptance']);
});

test('proposal gate rejects filler without evidence or compounding value signal', () => {
  assert.throws(() => validateDiscoveryCandidate({...base, evidence_refs: []}), /DISCOVERY_NO_FILLER:evidence_ref_required/);
  assert.throws(() => validateDiscoveryCandidate({...base, value_signals: {}}), /DISCOVERY_NO_FILLER:value_signal_required/);
});

test('candidate cannot smuggle READY/Current/Served authority', () => {
  for (const status of ['READY', 'CURRENT', 'HUMAN_ACCEPTED', 'SERVED']) {
    assert.throws(() => buildWorkerProposal({...base, status}, source), /DISCOVERY_AUTHORITY/);
  }
  const proposal = buildWorkerProposal(base, source, '2026-09-17T03:46:00.000Z');
  assert.equal(proposal.status, 'CANDIDATE');
  assert.ok(proposal.authority_constraints.includes('NO_CURRENT_HUMAN_ACCEPTED_SERVED_PROMOTION'));
});

test('public proposal rejects obvious private credential payload shapes', () => {
  assert.throws(() => buildWorkerProposal({...base, metadata: {access_token: 'secret'}}, source), /DISCOVERY_PRIVATE_PAYLOAD/);
});

test('atomic pin race has exactly one winner and collisions never overwrite', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-dedup-'));
  try {
    const attempts = await Promise.all(Array.from({length: 5}, () => pinProposalFingerprint({
      directory: dir,
      candidate: base,
      source,
      now: '2026-09-17T03:46:00.000Z'
    })));
    assert.equal(attempts.filter(x => x.won).length, 1);
    assert.equal(attempts.filter(x => x.collision).length, 4);
    const winner = attempts.find(x => x.won);
    const before = await fs.readFile(winner.path, 'utf8');
    const collision = await pinProposalFingerprint({directory: dir, candidate: base, source: {...source, worker_instance_id: 'other'}});
    assert.equal(collision.won, false);
    assert.equal(await fs.readFile(winner.path, 'utf8'), before);
  } finally {
    await fs.rm(dir, {recursive: true, force: true});
  }
});
