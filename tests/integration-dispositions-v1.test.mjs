import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadSchema,
  projectPlannerEvidence,
  validateIntegrationDispositionLedger
} from '../scripts/validate-integration-dispositions.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(DIR, 'fixtures/integration-dispositions');
const schema = loadSchema(path.join(DIR, '../coordination/planner/INTEGRATION_DISPOSITION_SCHEMA_V1.json'));
const base = () => JSON.parse(fs.readFileSync(path.join(FIX, 'valid-partial-scope.json'), 'utf8'));

test('valid ledger is replayable and preserves partial-scope conflict', () => {
  const ledger = base();
  const result = validateIntegrationDispositionLedger(ledger, schema);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  const projection = projectPlannerEvidence(ledger, schema);
  assert.equal(projection.consumed.length, 1);
  assert.equal(projection.conflicted.length, 1);
  assert.equal(projection.pending_unread.length, 1);
  assert.equal(projection.consumed[0].return_ref, projection.conflicted[0].return_ref);
  assert.notEqual(projection.consumed[0].scope_id, projection.conflicted[0].scope_id);
});

test('missing disposition fails closed', () => {
  const ledger = base();
  delete ledger.entries[0].scopes[0].disposition;
  const result = validateIntegrationDispositionLedger(ledger, schema);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.path.endsWith('.disposition')));
});

test('newest-wins policy is rejected', () => {
  const ledger = base();
  ledger.selection_policy = 'NEWEST_WINS';
  const result = validateIntegrationDispositionLedger(ledger, schema);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.path === '$.selection_policy'));
});

test('worker cannot consume its own RETURN', () => {
  const ledger = base();
  ledger.decision_actor_id = ledger.entries[0].source_worker_instance_id;
  const result = validateIntegrationDispositionLedger(ledger, schema);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.message.includes('cannot consume its own RETURN')));
});

test('embedded/mutated RETURN payload fields are rejected', () => {
  const ledger = base();
  ledger.entries[0].return_payload = { mutated: true };
  const result = validateIntegrationDispositionLedger(ledger, schema);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.path.endsWith('.return_payload')));
});

test('CONFLICTED must carry discriminating evidence and reason', () => {
  const ledger = base();
  delete ledger.entries[0].scopes[1].conflict_refs;
  delete ledger.entries[0].scopes[1].reason;
  const result = validateIntegrationDispositionLedger(ledger, schema);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.path.endsWith('.conflict_refs')));
  assert.ok(result.errors.some(error => error.path.endsWith('.reason')));
});

test('PENDING_UNREAD cannot silently carry consumed scopes', () => {
  const ledger = base();
  ledger.entries[1].scopes = [structuredClone(ledger.entries[0].scopes[0])];
  const result = validateIntegrationDispositionLedger(ledger, schema);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.message.includes('fail-closed') || error.message.includes('PENDING_UNREAD')));
});
