import test from 'node:test';
import assert from 'node:assert/strict';
import { createDurableFavoritesStore } from '../shared/universal-shell/v5/backend/favorites-durable-v2.js';

function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: key => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
    dump: key => map.get(key),
  };
}

function memoryDB(seed = {}) {
  const kv = new Map(Object.entries(seed.kv || {}));
  const meta = new Map(Object.entries(seed.meta || {}));
  return {
    async putKV(key, value) { kv.set(key, structuredClone(value)); return structuredClone(value); },
    async getKV(key, fallback = null) { return kv.has(key) ? structuredClone(kv.get(key)) : fallback; },
    async setMeta(key, value) { meta.set(key, structuredClone(value)); return structuredClone(value); },
    async getMeta(key, fallback = null) { return meta.has(key) ? structuredClone(meta.get(key)) : fallback; },
    kv,
    meta,
  };
}

const LEGACY = 'prometeo.v5.favorites.v1';
const RECOVERY = 'prometeo.v5.favorites.recovery.v2';
const OUTBOX = 'prometeo.v5.favorites.outbox.v2';
const DB_KEY = 'universal-control/favorites/v2';
const META_KEY = 'universal-control/favorites/v2/migration';
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

async function settle(store) {
  await tick();
  await store.flush();
  await tick();
}

test('first construction is synchronous and preserves legacy Favorites before IndexedDB exists', () => {
  const storage = memoryStorage({ [LEGACY]: '["a","a","","b"]' });
  const store = createDurableFavoritesStore({ storage, loadDB: async () => { throw new Error('not now'); } });
  assert.deepEqual(store.list(), ['a','b']);
  assert.equal(storage.dump(RECOVERY), '["a","b"]');
  assert.equal(storage.dump(LEGACY), '["a","b"]');
  assert.equal(store.canonical(), 'LOCAL_RECOVERY');
});

test('first start migrates legacy state only after DB readback then activates marker', async () => {
  const storage = memoryStorage({ [LEGACY]: '["a","b"]' });
  const db = memoryDB();
  const store = createDurableFavoritesStore({ storage, loadDB: async () => db, clock: () => 100 });
  const result = await store.start();
  assert.equal(result.migrated, true);
  assert.equal(store.canonical(), 'PROMETEO_DB');
  assert.deepEqual((await db.getKV(DB_KEY)).ids, ['a','b']);
  assert.equal((await db.getMeta(META_KEY)).active, true);
  assert.equal(storage.getItem(OUTBOX), null);
  assert.equal((await store.verify()).ok, true);
});

test('after activation DB hydrates canonical state and refreshes both rollback mirrors', async () => {
  const storage = memoryStorage({ [LEGACY]: '["old"]', [RECOVERY]: '["old"]' });
  const db = memoryDB({
    kv: { [DB_KEY]: { schema:'prometeo.universal-control-favorites/v2', ids:['db-a','db-b'] } },
    meta: { [META_KEY]: { active:true, canonical:'PrometeoDB' } },
  });
  const hydrated = [];
  const store = createDurableFavoritesStore({ storage, loadDB: async () => db, onHydrate: ids => hydrated.push(ids) });
  assert.deepEqual(store.list(), ['old']); // immediate first paint stays synchronous.
  const result = await store.start();
  assert.equal(result.hydrated, true);
  assert.deepEqual(store.list(), ['db-a','db-b']);
  assert.deepEqual(hydrated, [['db-a','db-b']]);
  assert.equal(storage.dump(LEGACY), '["db-a","db-b"]');
  assert.equal(storage.dump(RECOVERY), '["db-a","db-b"]');
});

test('local mutation persists mirrors and outbox synchronously before DB flush', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const storage = memoryStorage({ [LEGACY]: '["a"]' });
  const db = memoryDB({ meta:{ [META_KEY]:{active:true} }, kv:{ [DB_KEY]:{ids:['a']} } });
  const store = createDurableFavoritesStore({ storage, loadDB: async () => { await gate; return db; } });
  const result = store.toggle('b');
  assert.deepEqual(result.ids, ['a','b']);
  assert.equal(storage.dump(LEGACY), '["a","b"]');
  assert.equal(storage.dump(RECOVERY), '["a","b"]');
  assert.deepEqual(JSON.parse(storage.dump(OUTBOX)).ids, ['a','b']);
  release();
  await settle(store);
  assert.deepEqual((await db.getKV(DB_KEY)).ids, ['a','b']);
  assert.equal(storage.getItem(OUTBOX), null);
});

test('pending outbox wins over stale DB after reload and is recovered automatically', async () => {
  const storage = memoryStorage({
    [LEGACY]: '["stale"]',
    [RECOVERY]: '["stale"]',
    [OUTBOX]: JSON.stringify({ schema:'prometeo.universal-control-favorites-outbox/v2', ids:['new','order'], reason:'move', updated_at:1 }),
  });
  const db = memoryDB({ meta:{ [META_KEY]:{active:true} }, kv:{ [DB_KEY]:{ids:['stale']} } });
  const store = createDurableFavoritesStore({ storage, loadDB: async () => db });
  assert.deepEqual(store.list(), ['new','order']);
  const result = await store.start();
  assert.equal(result.recovered_outbox, true);
  assert.deepEqual((await db.getKV(DB_KEY)).ids, ['new','order']);
  assert.equal(storage.getItem(OUTBOX), null);
  assert.equal((await store.verify()).ok, true);
});

test('IndexedDB failure never loses current behavior or queued intent', async () => {
  const storage = memoryStorage({ [LEGACY]: '["a"]' });
  const store = createDurableFavoritesStore({ storage, loadDB: async () => { throw new Error('db unavailable'); } });
  assert.deepEqual(store.toggle('b').ids, ['a','b']);
  await tick();
  assert.deepEqual(store.list(), ['a','b']);
  assert.deepEqual(JSON.parse(storage.dump(OUTBOX)).ids, ['a','b']);
  const started = await store.start();
  assert.equal(started.degraded, true);
  assert.deepEqual(store.list(), ['a','b']);
});

test('missing canonical DB row heals from synchronous recovery mirror rather than erasing favorites', async () => {
  const storage = memoryStorage({ [RECOVERY]: '["keep","me"]', [LEGACY]: '["old"]' });
  const db = memoryDB({ meta:{ [META_KEY]:{active:true, canonical:'PrometeoDB'} } });
  const store = createDurableFavoritesStore({ storage, loadDB: async () => db });
  const result = await store.start();
  assert.equal(result.healed, true);
  assert.deepEqual((await db.getKV(DB_KEY)).ids, ['keep','me']);
  assert.equal((await store.verify()).ok, true);
});

test('move and prune remain synchronous and preserve stable ordered page ids', async () => {
  const storage = memoryStorage({ [LEGACY]: '["a","b","c","d"]' });
  const db = memoryDB();
  const store = createDurableFavoritesStore({ storage, loadDB: async () => db });
  await store.start();
  assert.deepEqual(store.move('d', 1).ids, ['a','d','b','c']);
  assert.deepEqual(store.prune(new Set(['a','d','c'])).ids, ['a','d','c']);
  await settle(store);
  assert.deepEqual((await db.getKV(DB_KEY)).ids, ['a','d','c']);
  assert.equal((await store.verify()).ok, true);
});
