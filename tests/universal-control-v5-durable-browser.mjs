import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.V5_CANARY_BASE || 'http://127.0.0.1:4173';
const URL = `${BASE}/shared/universal-shell/v5/candidate/durable-favorites-source.html`;
const QUIET = `${BASE}/shared/storage/v1/README.md`;
const LEGACY = 'prometeo.v5.favorites.v1';
const RECOVERY = 'prometeo.v5.favorites.recovery.v2';
const OUTBOX = 'prometeo.v5.favorites.outbox.v2';
const DB_KEY = 'universal-control/favorites/v2';
const META_KEY = 'universal-control/favorites/v2/migration';

async function resetOrigin(page, legacy = '[]') {
  await page.goto(QUIET, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async ({ legacyKey, recoveryKey, outboxKey, legacy }) => {
    localStorage.clear();
    localStorage.setItem(legacyKey, legacy);
    localStorage.removeItem(recoveryKey);
    localStorage.removeItem(outboxKey);
    await new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase('prometeo.local');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('prometeo.local delete blocked'));
    });
  }, { legacyKey: LEGACY, recoveryKey: RECOVERY, outboxKey: OUTBOX, legacy });
}

async function waitFavoritesDB(page) {
  await page.waitForFunction(() => globalThis.PrometeoDB?.getKV && globalThis.__PROMETEO_V5_BACKEND_STATUS__?.get?.('favorites')?.state === 'DB_CANONICAL', null, { timeout: 15000 });
}

async function dbSnapshot(page) {
  return page.evaluate(async ({ dbKey, metaKey, legacyKey, recoveryKey, outboxKey }) => ({
    db: await PrometeoDB.getKV(dbKey, null),
    marker: await PrometeoDB.getMeta(metaKey, null),
    legacy: localStorage.getItem(legacyKey),
    recovery: localStorage.getItem(recoveryKey),
    outbox: localStorage.getItem(outboxKey),
    status: __PROMETEO_V5_BACKEND_STATUS__.snapshot(),
  }), { dbKey: DB_KEY, metaKey: META_KEY, legacyKey: LEGACY, recoveryKey: RECOVERY, outboxKey: OUTBOX });
}

async function semanticClick(page, selector) {
  await page.evaluate(sel => document.querySelector(sel)?.click(), selector);
}

async function waitReady(page) {
  await page.waitForFunction(() => document.querySelector('#puck')?.getAttribute('aria-label')?.startsWith('Abrir Prometeo'));
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));

  // Migration: first paint comes from legacy synchronously, then DB becomes canonical without
  // removing the rollback/recovery projections.
  await resetOrigin(page, '["alpha","beta"]');
  await page.route('https://juanmanuelpm.github.io/**', route => route.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page);
  await waitFavoritesDB(page);
  let snap = await dbSnapshot(page);
  assert.equal(snap.marker?.active, true);
  assert.equal(snap.marker?.canonical, 'PrometeoDB');
  assert.deepEqual(snap.db?.ids, ['alpha','beta']);
  assert.equal(snap.legacy, '["alpha","beta"]');
  assert.equal(snap.recovery, '["alpha","beta"]');
  assert.equal(snap.outbox, null);
  assert.equal(snap.status.favorites?.state, 'DB_CANONICAL');

  // Reload: DB owns truth after migration. Corrupt/stale the legacy mirror only; reload must
  // hydrate from DB and repair both mirrors instead of regressing to localStorage authority.
  await page.evaluate(key => localStorage.setItem(key, '["stale"]'), LEGACY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitReady(page);
  await waitFavoritesDB(page);
  await page.waitForFunction(key => localStorage.getItem(key) === '["alpha","beta"]', LEGACY);
  snap = await dbSnapshot(page);
  assert.deepEqual(snap.db?.ids, ['alpha','beta']);
  assert.equal(snap.legacy, '["alpha","beta"]');
  assert.equal(snap.recovery, '["alpha","beta"]');

  await context.close();

  // Real mutation path: use live Catalog to load one real page, pin it through the exact UI,
  // wait for durable DB commit, then reload and prove the pin survives with mirrors in parity.
  const live = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await live.newPage();
  const liveErrors = [];
  p.on('pageerror', error => liveErrors.push(String(error)));
  await resetOrigin(p, '[]');
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(p);
  await waitFavoritesDB(p);
  const firstId = await p.evaluate(async () => {
    const r = await fetch('https://juanmanuelpm.github.io/prometeo/catalog/pages.json', { cache:'no-store' });
    const data = await r.json();
    return (data.pages || []).find(row => row?.id && row?.href)?.id || null;
  });
  assert.ok(firstId);
  await p.goto(`${URL}#/p/${encodeURIComponent(firstId)}`, { waitUntil:'domcontentloaded' });
  await waitReady(p);
  await p.waitForFunction(() => document.querySelector('#pageHost')?.getAttribute('src') !== 'about:blank');
  await semanticClick(p, '#puck');
  await semanticClick(p, '#nextBtn');
  assert.equal(await p.locator('#labelTextPath').textContent(), 'Anclar página');
  await semanticClick(p, '#currentBtn');
  await p.waitForFunction(({ dbKey, id, outboxKey }) => globalThis.PrometeoDB?.getKV(dbKey, null).then(row => Array.isArray(row?.ids) && row.ids.includes(id) && !localStorage.getItem(outboxKey)), { dbKey:DB_KEY, id:firstId, outboxKey:OUTBOX }, { timeout:15000 });
  let liveSnap = await dbSnapshot(p);
  assert.deepEqual(liveSnap.db.ids, [firstId]);
  assert.equal(liveSnap.legacy, JSON.stringify([firstId]));
  assert.equal(liveSnap.recovery, JSON.stringify([firstId]));
  await p.reload({ waitUntil:'domcontentloaded' });
  await waitReady(p);
  await waitFavoritesDB(p);
  liveSnap = await dbSnapshot(p);
  assert.deepEqual(liveSnap.db.ids, [firstId]);
  assert.equal(liveSnap.legacy, JSON.stringify([firstId]));
  assert.equal(liveSnap.recovery, JSON.stringify([firstId]));
  assert.deepEqual(liveErrors, []);
  await live.close();

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status:'PASS', migration:true, db_reload_authority:true, real_pin_durable:true, rollback_mirrors:true }, null, 2));
} finally {
  await browser.close();
}
