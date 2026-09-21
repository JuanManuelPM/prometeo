import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PublicStateError,
  createMemoryStore,
  createMemoryTransport,
  createPrometeoPublicState,
  validateProjection
} from '../shared/public-state/v1/prometeo-public-state.mjs';

const registry = {
  'habits.exercise.current_streak': {
    source: 'habits.projection/v1',
    channels: ['home', 'tv'],
    visibilities: ['workspace', 'channel'],
    validate: value => Number.isInteger(value) && value >= 0
  }
};

function client(transport = createMemoryTransport()) {
  return createPrometeoPublicState({
    workspaceId: 'ws-test',
    store: createMemoryStore(),
    transport,
    registry
  });
}

const publishOpts = (overrides = {}) => ({
  source: 'habits.projection/v1',
  sourceVersion: 1,
  channel: 'home',
  visibility: 'workspace',
  operationId: 'op-1',
  ...overrides
});

test('validates semantic address, source, schema registry and explicit public exposure', () => {
  assert.throws(() => validateProjection({workspaceId:'w',channel:'home',key:'bad',value:1,source:'x/v1',sourceVersion:1}), /KEY_INVALID/);
  assert.throws(() => validateProjection({workspaceId:'w',channel:'home',key:'x.y',value:1,source:'x/v1',sourceVersion:1,visibility:'public_anonymous'}), /PUBLIC_SAFE_ASSERTION_REQUIRED/);
  assert.doesNotThrow(() => validateProjection({workspaceId:'w',channel:'home',key:'x.y',value:1,source:'x/v1',sourceVersion:1,visibility:'public_anonymous',publicSafe:true}));
});

test('offline publish is immediately readable locally and remains queued until reconnect', async () => {
  const transport = createMemoryTransport({online:false});
  const api = client(transport);
  const queued = await api.publish('habits.exercise.current_streak', 7, publishOpts());
  assert.equal(queued.sync, 'queued');
  assert.equal(await api.get('habits.exercise.current_streak', {channel:'home'}), 7);
  transport.setOnline(true);
  const flushed = await api.flush();
  assert.equal(flushed[0].synced, true);
  const entry = await api.getEntry('habits.exercise.current_streak', {channel:'home'});
  assert.equal(entry.version, 1);
  assert.equal(entry.value_json, 7);
});

test('source version is monotonic and idempotent; no CRDT is needed for a single semantic owner', async () => {
  const transport = createMemoryTransport();
  const api = client(transport);
  const first = await api.publish('habits.exercise.current_streak', 7, publishOpts({operationId:'same-a'}));
  assert.equal(first.version, 1);
  const replay = await api.publish('habits.exercise.current_streak', 7, publishOpts({operationId:'same-b'}));
  assert.equal(replay.version, 1);
  await assert.rejects(
    api.publish('habits.exercise.current_streak', 8, publishOpts({operationId:'conflict',sourceVersion:1})),
    error => error instanceof PublicStateError && error.code === 'SOURCE_VERSION_CONFLICT'
  );
  const newer = await api.publish('habits.exercise.current_streak', 8, publishOpts({operationId:'newer',sourceVersion:2}));
  assert.equal(newer.version, 2);
  await assert.rejects(
    api.publish('habits.exercise.current_streak', 7, publishOpts({operationId:'stale',sourceVersion:1})),
    error => error.code === 'STALE_SOURCE_VERSION'
  );
});

test('channels isolate the same semantic key', async () => {
  const transport = createMemoryTransport();
  const api = client(transport);
  await api.publish('habits.exercise.current_streak', 7, publishOpts({operationId:'home',channel:'home'}));
  await api.publish('habits.exercise.current_streak', 12, publishOpts({operationId:'tv',channel:'tv'}));
  assert.equal(await api.get('habits.exercise.current_streak', {channel:'home'}), 7);
  assert.equal(await api.get('habits.exercise.current_streak', {channel:'tv'}), 12);
});

test('subscription receives current projection and subsequent version changes without coupling to producer code', async () => {
  const transport = createMemoryTransport();
  const producer = client(transport);
  const renderer = createPrometeoPublicState({workspaceId:'ws-test',store:createMemoryStore(),transport});
  await producer.publish('habits.exercise.current_streak', 7, publishOpts({operationId:'initial',channel:'tv'}));
  const seen = [];
  const unsubscribe = await renderer.subscribe('habits.exercise.current_streak', value => seen.push(value), {channel:'tv'});
  await producer.publish('habits.exercise.current_streak', 8, publishOpts({operationId:'next',channel:'tv',sourceVersion:2}));
  unsubscribe();
  assert.deepEqual(seen, [7, 8]);
});

test('history is opt-in and records shared-state transitions, not canonical domain history', async () => {
  const transport = createMemoryTransport();
  const api = client(transport);
  await api.publish('habits.exercise.current_streak', 7, publishOpts({operationId:'h1',historyMode:'changes'}));
  await api.publish('habits.exercise.current_streak', 8, publishOpts({operationId:'h2',historyMode:'changes',sourceVersion:2}));
  const events = await transport.eventsFor({workspaceId:'ws-test',channel:'home',key:'habits.exercise.current_streak'});
  assert.deepEqual(events.map(e => [e.version, e.value_json]), [[1, 7], [2, 8]]);
});

test('get refreshes remote current state instead of freezing a cached renderer value', async()=>{
  const transport=createMemoryTransport();
  const producer=createPrometeoPublicState({workspaceId:'ws',store:createMemoryStore(),transport,registry});
  const consumer=createPrometeoPublicState({workspaceId:'ws',store:createMemoryStore(),transport,registry});
  await producer.publish('habits.exercise.current_streak',7,{channel:'home',source:'habits.projection/v1',sourceVersion:1,visibility:'workspace'});
  assert.equal(await consumer.get('habits.exercise.current_streak',{channel:'home'}),7);
  await producer.publish('habits.exercise.current_streak',8,{channel:'home',source:'habits.projection/v1',sourceVersion:2,visibility:'workspace'});
  assert.equal(await consumer.get('habits.exercise.current_streak',{channel:'home'}),8);
});
