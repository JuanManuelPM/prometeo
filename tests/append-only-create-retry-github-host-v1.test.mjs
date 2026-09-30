import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGitHubContentsAppendOnly,
  normalizeGitHubContentsCreateError,
} from '../scripts/github-contents-append-only-host-v1.mjs';

const WC_RESULT_PATH =
  'coordination/workers/local-batch-results/LOCAL-BATCH-E5-01/fixture.RESULT.json';

test('GitHub host adapter retries the exact same absent path after branch-head movement', async () => {
  const attempted = [];
  let createCalls = 0;
  let headReads = 0;

  const client = {
    readPath: async () => {
      const error = new Error('Not Found');
      error.status = 404;
      throw error;
    },
    readHead: async () => {
      headReads += 1;
      return 'head-2';
    },
    createFile: async ({path, sourceHead}) => {
      attempted.push({path, sourceHead});
      createCalls += 1;
      if (createCalls === 1) {
        const error = new Error('branch head moved while creating file');
        error.status = 409;
        throw error;
      }
      return {commit_sha: 'created-on-head-2'};
    },
  };

  const result = await createGitHubContentsAppendOnly({
    path: WC_RESULT_PATH,
    content: '{"ok":true}\n',
    client,
    sourceHead: 'head-1',
  });

  assert.equal(result.state, 'CREATED');
  assert.equal(result.attempts, 2);
  assert.equal(headReads, 1);
  assert.deepEqual(attempted, [
    {path: WC_RESULT_PATH, sourceHead: 'head-1'},
    {path: WC_RESULT_PATH, sourceHead: 'head-2'},
  ]);
  assert.equal(result.trace[0].outcome, 'RETRY_SAME_PATH');
  assert.equal(result.trace[0].classification, 'HEAD_MOVED');
  assert.equal(new Set(attempted.map(x => x.path)).size, 1);
});

test('GitHub 422 sha-not-supplied plus existing path becomes LOST_RACE with no retry', async () => {
  const attempted = [];
  const winner = {worker_id: 'other-worker', generation: 1};

  const client = {
    readPath: async path => path === WC_RESULT_PATH ? winner : null,
    readHead: async () => 'head-2',
    createFile: async ({path, sourceHead}) => {
      attempted.push({path, sourceHead});
      const error = new Error('Invalid request. "sha" wasn\'t supplied.');
      error.status = 422;
      throw error;
    },
  };

  const result = await createGitHubContentsAppendOnly({
    path: WC_RESULT_PATH,
    content: '{"ok":true}\n',
    client,
    sourceHead: 'head-1',
  });

  assert.equal(result.state, 'LOST_RACE');
  assert.equal(result.attempts, 1);
  assert.deepEqual(result.winner, winner);
  assert.deepEqual(attempted, [{path: WC_RESULT_PATH, sourceHead: 'head-1'}]);
  assert.equal(result.trace[0].classification, 'PATH_MAY_EXIST');
  assert.equal(new Set(attempted.map(x => x.path)).size, 1);
});

test('normalizer preserves non-retryable failures', () => {
  const forbidden = new Error('forbidden');
  forbidden.status = 403;
  assert.equal(normalizeGitHubContentsCreateError(forbidden), forbidden);

  const collision = new Error('Invalid request. "sha" was not supplied.');
  collision.status = 422;
  const normalizedCollision = normalizeGitHubContentsCreateError(collision);
  assert.equal(normalizedCollision.code, 'PATH_MAY_EXIST');
  assert.equal(normalizedCollision.status, 422);

  const moved = new Error('branch ref conflict');
  moved.status = 409;
  const normalizedMoved = normalizeGitHubContentsCreateError(moved);
  assert.equal(normalizedMoved.code, 'HEAD_MOVED');
  assert.equal(normalizedMoved.status, 409);
});
