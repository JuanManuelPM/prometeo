import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  REQUEST_SCHEMA,
  normalizeSha,
  parseNameStatus,
  selectRequestEntry,
  validateRequest,
  resolveExactSource,
} from '../scripts/resolve-frontier-pressure-request.mjs';

const HISTORICAL = '1bcfbb91b1e5da0a4e26d364882e676a4127eb58';

function git(root, ...args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout.trim();
}

async function initRepo() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fp-request-'));
  git(root, 'init');
  git(root, 'config', 'user.email', 'test@example.invalid');
  git(root, 'config', 'user.name', 'Prometeo Test');
  await fs.writeFile(path.join(root, 'base.txt'), 'base\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'base');
  const before = git(root, 'rev-parse', 'HEAD');
  return { root, before };
}

async function addRequest(root, requestId, sourceSha = HISTORICAL) {
  const rel = `coordination/portfolio/frontier-pressure-requests/${requestId}.json`;
  await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true });
  await fs.writeFile(path.join(root, rel), `${JSON.stringify({
    schema: REQUEST_SCHEMA,
    request_id: requestId,
    source_sha: sourceSha,
    requested_at: '2026-09-18T00:00:00Z',
    requested_by: 'test-worker',
    authority: 'REQUEST_ONLY_NO_PRODUCT_PROMOTION',
  }, null, 2)}\n`);
  git(root, 'add', rel);
  git(root, 'commit', '-m', `request ${requestId}`);
  return { rel, event: git(root, 'rev-parse', 'HEAD') };
}

test('dispatch requires and normalizes one exact 40-hex SHA', async () => {
  const result = await resolveExactSource({ eventName: 'workflow_dispatch', dispatchSha: HISTORICAL.toUpperCase() });
  assert.equal(result.mode, 'workflow_dispatch');
  assert.equal(result.source_sha, HISTORICAL);
  assert.throws(() => normalizeSha('abc'), /exactly 40 hex/);
});

test('request push resolves historical source_sha instead of request commit HEAD', async () => {
  const { root, before } = await initRepo();
  const { rel, event } = await addRequest(root, 'req-historical');
  assert.notEqual(event, HISTORICAL);
  const result = await resolveExactSource({ repoRoot: root, eventName: 'push', beforeSha: before, eventSha: event });
  assert.equal(result.mode, 'request_push');
  assert.equal(result.request_path, rel);
  assert.equal(result.source_sha, HISTORICAL);
  assert.notEqual(result.source_sha, event);
});

test('push with no request file preserves self-test event SHA behavior', async () => {
  const { root, before } = await initRepo();
  await fs.writeFile(path.join(root, 'tests.txt'), 'changed\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'self test change');
  const event = git(root, 'rev-parse', 'HEAD');
  const result = await resolveExactSource({ repoRoot: root, eventName: 'push', beforeSha: before, eventSha: event });
  assert.equal(result.mode, 'self_test_push');
  assert.equal(result.source_sha, event);
});

test('multiple changed request files fail closed', () => {
  const entries = parseNameStatus([
    'A\tcoordination/portfolio/frontier-pressure-requests/a.json',
    'A\tcoordination/portfolio/frontier-pressure-requests/b.json',
  ].join('\n'));
  assert.throws(() => selectRequestEntry(entries), /exactly one changed/);
});

test('modified or renamed request files fail append-only validation', () => {
  assert.throws(() => selectRequestEntry(parseNameStatus('M\tcoordination/portfolio/frontier-pressure-requests/a.json\n')), /append-only CREATEs/);
  assert.throws(() => selectRequestEntry(parseNameStatus('R100\tcoordination/portfolio/frontier-pressure-requests/a.json\tcoordination/portfolio/frontier-pressure-requests/b.json\n')), /append-only CREATEs/);
});

test('malformed request source_sha and filename mismatch fail closed', () => {
  assert.throws(() => validateRequest({ schema: REQUEST_SCHEMA, request_id: 'a', source_sha: 'abc' }, 'coordination/portfolio/frontier-pressure-requests/a.json'), /exactly 40 hex/);
  assert.throws(() => validateRequest({ schema: REQUEST_SCHEMA, request_id: 'other', source_sha: HISTORICAL }, 'coordination/portfolio/frontier-pressure-requests/a.json'), /match filename/);
});


test('workflow envelope manifest fails closed before historical snapshot regressions', async () => {
  const workflowPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../.github/workflows/frontier-pressure-exact-snapshot.yml');
  const workflow = await fs.readFile(workflowPath, 'utf8');
  const capture = workflow.indexOf('Capture regression manifest from workflow envelope');
  const checkout = workflow.indexOf('Checkout exact snapshot');
  assert.ok(capture >= 0 && checkout > capture, 'regression manifest must be captured before exact-snapshot checkout');
  assert.match(workflow, /frontier-pressure-routable-scope-parity-v1\.test\.mjs/);
  assert.match(workflow, /MISSING_EXPECTED_REGRESSION/);
  assert.match(workflow, /EXPECTED_REGRESSION_PATH_MISSING/);
  assert.match(workflow, /CURRENT_WORKFLOW_ENVELOPE/);
  assert.match(workflow, /exit 66/);
});
