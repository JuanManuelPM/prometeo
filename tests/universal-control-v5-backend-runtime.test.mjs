import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBackendStatus,
  createLegacyPreferencesStore,
  createPageRouteController,
  createLinkProvider,
  createContextProvider,
  createCaptureSyncQueue,
  createFavoritesShadowAdapter,
} from '../shared/universal-shell/v5/backend/runtime-v1.js';
import { createLegacyFavoritesStore } from '../shared/universal-shell/v5/backend/favorites-store-v1.js';

function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: key => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
    dump: key => map.get(key),
  };
}

function memoryDB() {
  const map = new Map();
  return {
    async putKV(key, value) { map.set(key, structuredClone(value)); return structuredClone(value); },
    async getKV(key, fallback = null) { return map.has(key) ? structuredClone(map.get(key)) : fallback; },
  };
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('backend status exposes explicit domain state without UI dependency', () => {
  let now = 100;
  const status = createBackendStatus({ clock: () => ++now });
  status.set('remote', 'LOCAL_ONLY', { reason: 'offline' });
  assert.equal(status.get('remote').state, 'LOCAL_ONLY');
  assert.deepEqual(status.snapshot().remote.detail, { reason: 'offline' });
});

test('preferences facade preserves exact semantic-corner persistence', () => {
  const storage = memoryStorage();
  const prefs = createLegacyPreferencesStore({ storage, corners: ['top-left','top-right','bottom-left','bottom-right'] });
  assert.equal(prefs.getCorner(), 'bottom-right');
  assert.equal(prefs.setCorner('top-left'), true);
  assert.equal(storage.dump('prometeo.universal-control.corner.v1'), 'top-left');
  assert.equal(prefs.getCorner(), 'top-left');
  assert.equal(prefs.setCorner('middle'), false);
});

test('page route controller owns semantic URL/history projection', () => {
  const storage = memoryStorage();
  const calls = [];
  const historyRef = { pushState: (...args) => calls.push(args) };
  const locationRef = { hash: '#/p/abc%20def' };
  const route = createPageRouteController({ storage, historyRef, locationRef });
  const page = { id: 'abc def', public_url: 'https://example.test/page' };
  assert.equal(route.activate(page).pageId, 'abc def');
  assert.equal(storage.dump('prometeo.v5.lastPage'), 'abc def');
  assert.equal(calls[0][2], '#/p/abc%20def');
  assert.equal(route.hashId(), 'abc def');
  assert.equal(route.eventId({ state: { pageId: 'state-page' } }), 'state-page');
});

test('link provider hides remote mechanics behind one API', async () => {
  let imported = null;
  const link = createLinkProvider({ remote: { linkCode: () => 'CODE', importLinkCode: async code => { imported = code; return 7; } } });
  assert.equal(link.code(), 'CODE');
  assert.equal(await link.importCode('X'), 7);
  assert.equal(imported, 'X');
});

test('context provider preserves sync -> patent -> local annotation order', async () => {
  const steps = [];
  const note = { id: 'n1', status: 'done', text: 'hola', pageId: 'p1' };
  const provider = createContextProvider({
    clock: () => 1234,
    pageForNote: n => ({ id: n.pageId }),
    remote: {
      async syncCapture(n, p) { steps.push(['sync', n.id, p.id]); },
      async createPatent(ids) { steps.push(['patent', ...ids]); return { patent_code: 'P-1', command: 'CMD', expires_at: 'later' }; },
    },
    async putNote(n) { steps.push(['put', n.id, n.patentedIn]); },
  });
  const result = await provider.prepare([note]);
  assert.equal(result.code, 'P-1');
  assert.equal(note.patentedAt, 1234);
  assert.deepEqual(steps, [['sync','n1','p1'],['patent','n1'],['put','n1','P-1']]);
});

test('capture queue only sends changed notes and persists delete intent', async () => {
  const storage = memoryStorage();
  const sent = [];
  const notes = new Map([['a',{ id:'a', text:'one', status:'done', transcriptRevision:1, pageId:'p' }]]);
  const queue = createCaptureSyncQueue({
    storage,
    remote: {
      async syncCapture(note) { sent.push(['put', note.id, note.text]); },
      async deleteCapture(id) { sent.push(['delete', id]); },
    },
    getNote: async id => notes.get(id) || null,
    listNotes: async () => [...notes.values()],
    pageForNote: n => ({ id:n.pageId }),
    online: () => true,
  });
  await queue.flush();
  assert.deepEqual(sent, [['put','a','one']]);
  sent.length = 0;
  await queue.flush();
  assert.deepEqual(sent, []);
  notes.get('a').text = 'two';
  await queue.flush();
  assert.deepEqual(sent, [['put','a','two']]);
  sent.length = 0;
  notes.delete('a');
  queue.markDelete('a');
  await queue.flush();
  assert.deepEqual(sent, [['delete','a']]);
  assert.deepEqual(queue.inspect().ops, {});
});

test('capture queue never blocks local behavior while offline', async () => {
  const storage = memoryStorage();
  const queue = createCaptureSyncQueue({
    storage,
    remote: { async syncCapture(){ throw new Error('must not run'); }, async deleteCapture(){ throw new Error('must not run'); } },
    getNote: async () => null,
    listNotes: async () => [{ id:'a', text:'x', status:'done' }],
    pageForNote: () => null,
    online: () => false,
  });
  assert.deepEqual(await queue.flush(), { deferred:true });
});

test('favorites shadow writes DB additively while legacy remains canonical', async () => {
  const storage = memoryStorage({ 'prometeo.v5.favorites.v1': '["a"]' });
  const legacy = createLegacyFavoritesStore({ storage });
  const db = memoryDB();
  const status = createBackendStatus();
  const shadow = createFavoritesShadowAdapter({ legacy, loadDB: async () => db, status });
  assert.deepEqual(shadow.list(), ['a']);
  shadow.toggle('b');
  assert.deepEqual(legacy.list(), ['a','b']);
  await tick(); await tick();
  const verification = await shadow.verify();
  assert.equal(verification.ok, true);
  assert.deepEqual(verification.legacy, ['a','b']);
  assert.equal(status.get('favorites-shadow').state, 'SHADOW_PARITY');
});

test('favorites shadow failure never changes legacy result', async () => {
  const storage = memoryStorage({ 'prometeo.v5.favorites.v1': '["a"]' });
  const legacy = createLegacyFavoritesStore({ storage });
  const status = createBackendStatus();
  const shadow = createFavoritesShadowAdapter({ legacy, loadDB: async () => { throw new Error('db down'); }, status });
  const result = shadow.toggle('b');
  assert.deepEqual(result.ids, ['a','b']);
  assert.deepEqual(legacy.list(), ['a','b']);
  await tick();
  assert.equal(status.get('favorites-shadow').state, 'SHADOW_UNAVAILABLE');
});
