import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyAppendCreateError, createAppendOnlyWithRetry} from '../scripts/append-only-create-retry-lib.mjs';

const WC_BEACON_PATH = 'coordination/workers/beacons/wc-test-atomic.json';

test('retries the exact same absent path after unrelated main/head movement', async () => {
  const createPaths = [];
  const heads = ['head-2'];
  let calls = 0;
  const host = {
    readPath: async () => null,
    readHead: async () => heads.shift() ?? 'head-2',
    createPath: async ({path, sourceHead}) => {
      createPaths.push([path, sourceHead]);
      calls += 1;
      if (calls === 1) throw Object.assign(new Error('branch head moved'), {code: 'HEAD_MOVED', status: 409});
      return {commit_sha: 'created-commit'};
    },
  };

  const result = await createAppendOnlyWithRetry({path: WC_BEACON_PATH, content: '{}', host, sourceHead: 'head-1'});
  assert.equal(result.state, 'CREATED');
  assert.equal(result.attempts, 2);
  assert.deepEqual(createPaths, [[WC_BEACON_PATH, 'head-1'], [WC_BEACON_PATH, 'head-2']]);
  assert.equal(result.trace[0].outcome, 'RETRY_SAME_PATH');
});

test('path existence after a failed create is authoritative lost-race evidence', async () => {
  let creates = 0;
  const winner = {worker_id: 'other-worker'};
  const host = {
    readPath: async (path) => path === WC_BEACON_PATH ? winner : null,
    readHead: async () => 'head-2',
    createPath: async () => {
      creates += 1;
      throw Object.assign(new Error('conflict'), {code: 'HEAD_MOVED', status: 409});
    },
  };

  const result = await createAppendOnlyWithRetry({path: WC_BEACON_PATH, content: '{}', host, sourceHead: 'head-1'});
  assert.equal(result.state, 'LOST_RACE');
  assert.equal(creates, 1);
  assert.equal(result.path, WC_BEACON_PATH);
  assert.deepEqual(result.winner, winner);
});

test('unknown failure on an absent path aborts rather than inventing a variant authority path', async () => {
  const attempted = [];
  const host = {
    readPath: async () => null,
    readHead: async () => 'head-2',
    createPath: async ({path}) => {
      attempted.push(path);
      throw Object.assign(new Error('permission denied'), {status: 403});
    },
  };

  const result = await createAppendOnlyWithRetry({path: WC_BEACON_PATH, content: '{}', host, sourceHead: 'head-1'});
  assert.equal(result.state, 'ABORTED');
  assert.equal(result.reason, 'NON_RETRYABLE_CREATE_FAILURE');
  assert.deepEqual(attempted, [WC_BEACON_PATH]);
});

test('retry budget is bounded while preserving one deterministic path', async () => {
  const attempted = [];
  let head = 1;
  const host = {
    readPath: async () => null,
    readHead: async () => `head-${++head}`,
    createPath: async ({path}) => {
      attempted.push(path);
      throw Object.assign(new Error('ref conflict: branch moved'), {code: 'CAS_CONFLICT', status: 409});
    },
  };

  const result = await createAppendOnlyWithRetry({path: WC_BEACON_PATH, content: '{}', host, sourceHead: 'head-1', maxHeadRetries: 2});
  assert.equal(result.state, 'RETRY_LIMIT');
  assert.equal(result.attempts, 3);
  assert.deepEqual(new Set(attempted), new Set([WC_BEACON_PATH]));
});

test('classification separates transient head movement from path collision hints', () => {
  assert.equal(classifyAppendCreateError({code: 'HEAD_MOVED'}), 'HEAD_MOVED');
  assert.equal(classifyAppendCreateError({status: 409, message: 'branch ref conflict'}), 'HEAD_MOVED');
  assert.equal(classifyAppendCreateError({status: 422, message: 'file already exists at path'}), 'PATH_MAY_EXIST');
  assert.equal(classifyAppendCreateError({status: 403, message: 'forbidden'}), 'UNKNOWN');
});
