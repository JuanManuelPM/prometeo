import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FAVORITES_LEGACY_KEY,
  createLegacyFavoritesStore,
} from '../shared/universal-shell/v5/backend/favorites-store-v1.js';

function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  const writes = [];
  return {
    writes,
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { const text = String(value); writes.push([key, text]); map.set(key, text); },
    removeItem(key) { map.delete(key); },
  };
}

test('uses the exact served V5 favorites key', () => {
  assert.equal(FAVORITES_LEGACY_KEY, 'prometeo.v5.favorites.v1');
});

test('legacy read parity: malformed and non-array values degrade without mutation', () => {
  for (const raw of ['{', '{}', '"x"']) {
    const storage = memoryStorage({ [FAVORITES_LEGACY_KEY]: raw });
    const store = createLegacyFavoritesStore({ storage });
    assert.deepEqual(store.list(), []);
    assert.equal(storage.writes.length, 0);
  }
});

test('legacy read parity: ignores invalid/empty ids and deduplicates first occurrence', () => {
  const storage = memoryStorage({
    [FAVORITES_LEGACY_KEY]: '["a",7,null,"","a","b","a","c","b"]',
  });
  const store = createLegacyFavoritesStore({ storage });
  assert.deepEqual(store.list(), ['a', 'b', 'c']);
  assert.equal(storage.writes.length, 0);
});

test('toggle preserves the current synchronous ordered-array JSON behavior', () => {
  const storage = memoryStorage({ [FAVORITES_LEGACY_KEY]: '["page-a","page-b"]' });
  const store = createLegacyFavoritesStore({ storage });

  assert.deepEqual(store.toggle('page-c'), {
    ids: ['page-a', 'page-b', 'page-c'], favorite: true, changed: true,
  });
  assert.deepEqual(storage.writes.at(-1), [FAVORITES_LEGACY_KEY, '["page-a","page-b","page-c"]']);

  assert.deepEqual(store.toggle('page-b'), {
    ids: ['page-a', 'page-c'], favorite: false, changed: true,
  });
  assert.deepEqual(storage.writes.at(-1), [FAVORITES_LEGACY_KEY, '["page-a","page-c"]']);
});

test('toggle normalizes dirty legacy state exactly before writing', () => {
  const storage = memoryStorage({ [FAVORITES_LEGACY_KEY]: '["a","","a","b"]' });
  const store = createLegacyFavoritesStore({ storage });
  assert.deepEqual(store.toggle('c').ids, ['a', 'b', 'c']);
  assert.deepEqual(storage.writes.at(-1), [FAVORITES_LEGACY_KEY, '["a","b","c"]']);
});

test('reorder changes only order and persists synchronously', () => {
  const storage = memoryStorage({ [FAVORITES_LEGACY_KEY]: '["a","b","c","d"]' });
  const store = createLegacyFavoritesStore({ storage });
  const result = store.move('d', 1);
  assert.equal(result.changed, true);
  assert.deepEqual(result.ids, ['a', 'd', 'b', 'c']);
  assert.deepEqual(store.list(), ['a', 'd', 'b', 'c']);
  assert.deepEqual(storage.writes.at(-1), [FAVORITES_LEGACY_KEY, '["a","d","b","c"]']);
});

test('catalog pruning preserves survivor order and only writes on removals', () => {
  const storage = memoryStorage({ [FAVORITES_LEGACY_KEY]: '["a","gone","b","c"]' });
  const store = createLegacyFavoritesStore({ storage });
  const first = store.prune(new Set(['c', 'b', 'a']));
  assert.deepEqual(first, { ids: ['a', 'b', 'c'], changed: true });
  assert.deepEqual(storage.writes.at(-1), [FAVORITES_LEGACY_KEY, '["a","b","c"]']);
  const count = storage.writes.length;
  const second = store.prune(new Set(['a', 'b', 'c']));
  assert.deepEqual(second, { ids: ['a', 'b', 'c'], changed: false });
  assert.equal(storage.writes.length, count);
});

test('constructing the facade is side-effect free', () => {
  const storage = memoryStorage({ [FAVORITES_LEGACY_KEY]: '["a"]' });
  const store = createLegacyFavoritesStore({ storage });
  assert.equal(store.mode, 'LEGACY_LOCALSTORAGE_COMPAT');
  assert.equal(store.available, true);
  assert.equal(storage.writes.length, 0);
  assert.deepEqual(store.list(), ['a']);
  assert.equal(storage.writes.length, 0);
});

test('unavailable storage preserves legacy no-crash fallback semantics', () => {
  const store = createLegacyFavoritesStore({ storage: null });
  assert.equal(store.available, false);
  assert.deepEqual(store.list(), []);
  assert.deepEqual(store.replace(['a', '', 'a', 'b']), ['a', 'b']);
  assert.deepEqual(store.toggle('a'), { ids: ['a'], favorite: true, changed: true });
});
