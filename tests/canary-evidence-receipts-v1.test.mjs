import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const schema = readJson('coordination/canary-evidence/SCHEMA_V1.json');
const validFixture = readJson('tests/fixtures/canary-evidence/valid-race-bundle.json');
const outOfScopeFixture = readJson('tests/fixtures/canary-evidence/out-of-scope-bundle.json');

const SHA40 = /^[0-9a-f]{40}$/;
const parseTime = value => {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : NaN;
};

function pathAllowed(pattern, changedPath) {
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);
    return changedPath === prefix || changedPath.startsWith(`${prefix}/`);
  }
  return changedPath === pattern;
}

function validateBundle(bundle) {
  const errors = [];
  const receipts = Array.isArray(bundle.receipts) ? bundle.receipts : [];

  if (bundle.schema !== 'prometeo.canary-evidence-bundle/v1') errors.push('BAD_BUNDLE_SCHEMA');
  if (!bundle.bundle_id) errors.push('MISSING_BUNDLE_ID');
  if (!receipts.length) errors.push('NO_RECEIPTS');

  const receiptIds = new Set();
  const runByRef = new Map();
  const startedByRun = new Map();

  for (const receipt of receipts) {
    if (!receipt.receipt_id) errors.push('MISSING_RECEIPT_ID');
    else if (receiptIds.has(receipt.receipt_id)) errors.push(`DUPLICATE_RECEIPT_ID:${receipt.receipt_id}`);
    else receiptIds.add(receipt.receipt_id);

    if (receipt.immutable !== true) errors.push(`NOT_IMMUTABLE:${receipt.receipt_id ?? 'UNKNOWN'}`);

    if (receipt.receipt_type === 'CLAIM_ATTEMPT') {
      if (!receipt.opportunity_id || !receipt.session_id || !receipt.worker_instance_id || !receipt.attempt_id) {
        errors.push(`CLAIM_IDENTITY_INCOMPLETE:${receipt.receipt_id}`);
      }
      if (!Number.isFinite(parseTime(receipt.attempted_at)) || !Number.isFinite(parseTime(receipt.host_observed_at))) {
        errors.push(`CLAIM_TIME_INVALID:${receipt.receipt_id}`);
      }
      if (!['CREATE_IF_ABSENT', 'CAS', 'UNIQUE_TXN'].includes(receipt.atomic_primitive)) {
        errors.push(`CLAIM_NOT_ATOMIC:${receipt.receipt_id}`);
      }
      if (receipt.host_result === 'WON' && !SHA40.test(receipt.claim_commit ?? '')) {
        errors.push(`WINNER_COMMIT_MISSING:${receipt.receipt_id}`);
      }
      if (receipt.host_result === 'LOST_EXISTING') {
        if (!receipt.winning_claim_ref || !SHA40.test(receipt.winning_claim_commit ?? '')) {
          errors.push(`LOSER_WINNER_REF_MISSING:${receipt.receipt_id}`);
        }
        if (receipt.no_overwrite_decision !== true) errors.push(`LOSER_OVERWRITE_RISK:${receipt.receipt_id}`);
      }
    }

    if (receipt.receipt_type === 'RUN_LINEAGE') {
      if (!receipt.run_ref || !receipt.session_id || !Number.isInteger(receipt.continuation_index)) {
        errors.push(`RUN_LINEAGE_INCOMPLETE:${receipt.receipt_id}`);
      } else {
        runByRef.set(receipt.run_ref, receipt);
      }
    }

    if (receipt.receipt_type === 'STARTED_PERSISTENCE') {
      if (receipt.run_ref) startedByRun.set(receipt.run_ref, receipt);
      if (!SHA40.test(receipt.started_commit_sha ?? '')) errors.push(`STARTED_COMMIT_INVALID:${receipt.receipt_id}`);
      const persisted = parseTime(receipt.persisted_at);
      const firstEffect = parseTime(receipt.first_material_effect_at);
      if (!Number.isFinite(persisted) || !Number.isFinite(firstEffect)) {
        errors.push(`STARTED_TIME_INVALID:${receipt.receipt_id}`);
      } else if (persisted > firstEffect) {
        errors.push(`STARTED_AFTER_MATERIAL_EFFECT:${receipt.receipt_id}`);
      }
    }

    if (receipt.receipt_type === 'WRITE_SET') {
      const commits = Array.isArray(receipt.commit_shas) ? receipt.commit_shas : [];
      if (!commits.length || commits.some(sha => !SHA40.test(sha))) {
        errors.push(`WRITESET_COMMIT_INVALID:${receipt.receipt_id}`);
      }
      const scopes = Array.isArray(receipt.declared_write_scope) ? receipt.declared_write_scope : [];
      const changed = Array.isArray(receipt.changed_paths) ? receipt.changed_paths : [];
      if (!scopes.length || !changed.length) errors.push(`WRITESET_INCOMPLETE:${receipt.receipt_id}`);
      for (const changedPath of changed) {
        if (!scopes.some(scope => pathAllowed(scope, changedPath))) {
          errors.push(`OUT_OF_SCOPE_WRITE:${receipt.receipt_id}:${changedPath}`);
        }
      }
    }
  }

  for (const run of runByRef.values()) {
    if (run.continuation_index === 0) {
      if (run.previous_run_ref !== null) errors.push(`ROOT_RUN_HAS_PREVIOUS:${run.receipt_id}`);
    } else {
      if (!run.previous_run_ref) {
        errors.push(`CONTINUATION_PREVIOUS_MISSING:${run.receipt_id}`);
      } else {
        const previous = runByRef.get(run.previous_run_ref);
        if (!previous) errors.push(`CONTINUATION_PREVIOUS_UNRESOLVED:${run.receipt_id}`);
        else {
          if (previous.session_id !== run.session_id) errors.push(`CONTINUATION_SESSION_CHANGED:${run.receipt_id}`);
          if (previous.continuation_index !== run.continuation_index - 1) {
            errors.push(`CONTINUATION_INDEX_NON_MONOTONIC:${run.receipt_id}`);
          }
        }
      }
    }

    const started = startedByRun.get(run.run_ref);
    if (!started) errors.push(`STARTED_RECEIPT_MISSING:${run.receipt_id}`);
    else if (started.session_id !== run.session_id) errors.push(`STARTED_SESSION_MISMATCH:${run.receipt_id}`);
  }

  return errors;
}

function reconstructClaimRace(bundle, opportunityId) {
  const attempts = bundle.receipts
    .filter(r => r.receipt_type === 'CLAIM_ATTEMPT' && r.opportunity_id === opportunityId)
    .sort((a, b) => parseTime(a.host_observed_at) - parseTime(b.host_observed_at));
  const winners = attempts.filter(r => r.host_result === 'WON');
  const losers = attempts.filter(r => r.host_result === 'LOST_EXISTING');
  return {attempts, winners, losers};
}

assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(schema.$id, 'prometeo://canary-evidence/SCHEMA_V1');
assert.ok(schema.$defs.claim_attempt);
assert.ok(schema.$defs.run_lineage);
assert.ok(schema.$defs.started_persistence);
assert.ok(schema.$defs.write_set);
assert.ok(schema['x-prometeo-semantic-invariants'].length >= 4);

const validErrors = validateBundle(validFixture);
assert.deepEqual(validErrors, [], `valid evidence fixture must pass: ${validErrors.join(', ')}`);

const race = reconstructClaimRace(validFixture, 'O-FIXTURE-RACE');
assert.equal(race.winners.length, 1, 'exactly one atomic claim winner must be reconstructable');
assert.equal(race.losers.length, 1, 'losing contender must remain visible');
assert.equal(race.winners[0].claim_commit, race.losers[0].winning_claim_commit, 'loser must point to the observed winning commit');
assert.ok(parseTime(race.winners[0].host_observed_at) < parseTime(race.losers[0].host_observed_at), 'host receipt ordering must reconstruct winner before loser observation');
assert.equal(race.losers[0].no_overwrite_decision, true, 'race loser must explicitly preserve no-overwrite behavior');

const continuation = validFixture.receipts.find(r => r.receipt_id === 'R-RUN-1');
const previous = validFixture.receipts.find(r => r.run_ref === continuation.previous_run_ref && r.receipt_type === 'RUN_LINEAGE');
assert.equal(continuation.session_id, previous.session_id, 'continuation must preserve stable session_id');
assert.equal(continuation.continuation_index, previous.continuation_index + 1, 'continuation index must be monotonic');

const outOfScopeErrors = validateBundle(outOfScopeFixture);
assert.ok(
  outOfScopeErrors.some(error => error.includes('OUT_OF_SCOPE_WRITE') && error.includes('coordination/CONTINUITY_HEAD.json')),
  'independent verifier must flag actual out-of-scope writes even when worker reports PASS'
);

const missingPrevious = structuredClone(validFixture);
missingPrevious.receipts.find(r => r.receipt_id === 'R-RUN-1').previous_run_ref = null;
assert.ok(validateBundle(missingPrevious).some(error => error.startsWith('CONTINUATION_PREVIOUS_MISSING')));

const changedSession = structuredClone(validFixture);
changedSession.receipts.find(r => r.receipt_id === 'R-RUN-1').session_id = 'SESSION-CHANGED';
assert.ok(validateBundle(changedSession).some(error => error.startsWith('CONTINUATION_SESSION_CHANGED')));

const missingStartedProof = structuredClone(validFixture);
missingStartedProof.receipts.find(r => r.receipt_id === 'R-STARTED-0').started_commit_sha = 'not-a-commit';
assert.ok(validateBundle(missingStartedProof).some(error => error.startsWith('STARTED_COMMIT_INVALID')));

const lateStarted = structuredClone(validFixture);
lateStarted.receipts.find(r => r.receipt_id === 'R-STARTED-0').persisted_at = '2026-09-17T12:00:00.400Z';
assert.ok(validateBundle(lateStarted).some(error => error.startsWith('STARTED_AFTER_MATERIAL_EFFECT')));

const unsafeLoser = structuredClone(validFixture);
unsafeLoser.receipts.find(r => r.receipt_id === 'R-CLAIM-LOSER').no_overwrite_decision = false;
assert.ok(validateBundle(unsafeLoser).some(error => error.startsWith('LOSER_OVERWRITE_RISK')));

console.log(JSON.stringify({
  ok: true,
  schema: schema.$id,
  valid_receipts: validFixture.receipts.length,
  reconstructed_claim_attempts: race.attempts.length,
  out_of_scope_injection_flagged: true,
  continuation_lineage_enforced: true,
  started_persistence_enforced: true
}, null, 2));
