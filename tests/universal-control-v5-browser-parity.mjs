import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.V5_CANARY_BASE || 'http://127.0.0.1:4173';
const LEGACY = `${BASE}/shared/universal-shell/v5/candidate/baseline-source.html`;
const CANDIDATE = `${BASE}/shared/universal-shell/v5/candidate/favorites-facade-source.html`;
const FAV_KEY = 'prometeo.v5.favorites.v1';
const CORNER_KEY = 'prometeo.universal-control.corner.v1';

async function semanticClick(page, selector) {
  await page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`missing semantic control ${sel}`);
    el.click();
  }, selector);
}

async function openControl(page) {
  await semanticClick(page, '#puck');
  await page.waitForFunction(() => document.querySelector('#selector')?.classList.contains('open'));
}

async function rootSnapshot(browser, url, seed, { blockExternal = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  if (blockExternal) {
    await page.route('https://juanmanuelpm.github.io/**', route => route.abort());
  }
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: FAV_KEY, value: seed });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openControl(page);
  await semanticClick(page, '#nextBtn');
  const label = await page.locator('#labelTextPath').textContent();
  const count = await page.locator('#labelCount').textContent();
  const stored = await page.evaluate(key => localStorage.getItem(key), FAV_KEY);
  const controls = await page.locator('.puck').count();
  const result = { label, count, stored, controls, pageErrors };
  await context.close();
  return result;
}

async function firstCatalogPage(page) {
  return page.evaluate(async () => {
    const r = await fetch('https://juanmanuelpm.github.io/prometeo/catalog/pages.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(`catalog ${r.status}`);
    const data = await r.json();
    const first = (data.pages || []).find(p => p?.id && p?.href);
    if (!first) throw new Error('catalog has no page');
    return first.id;
  });
}

async function pinFlow(browser, url) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const firstId = await firstCatalogPage(page);
  await page.evaluate(key => localStorage.setItem(key, '[]'), FAV_KEY);
  await page.goto(`${url}#/p/${encodeURIComponent(firstId)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const frame = document.querySelector('#pageHost');
    return frame && frame.getAttribute('src') && frame.getAttribute('src') !== 'about:blank';
  }, null, { timeout: 10000 });

  await openControl(page);
  await semanticClick(page, '#nextBtn');
  const before = await page.locator('#labelTextPath').textContent();
  await semanticClick(page, '#currentBtn');
  const storedPinned = await page.evaluate(key => localStorage.getItem(key), FAV_KEY);
  const afterPin = await page.locator('#labelTextPath').textContent();
  await semanticClick(page, '#currentBtn');
  const storedUnpinned = await page.evaluate(key => localStorage.getItem(key), FAV_KEY);
  const afterUnpin = await page.locator('#labelTextPath').textContent();

  const result = { firstId, before, storedPinned, afterPin, storedUnpinned, afterUnpin, pageErrors };
  await context.close();
  return result;
}

async function cornerFlow(browser, url) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(key => localStorage.removeItem(key), CORNER_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const box = await page.locator('#puck').boundingBox();
  assert.ok(box, 'puck has a bounding box');
  const sx = box.x + box.width / 2;
  const sy = box.y + box.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(55, 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(260);
  const corner = await page.evaluate(key => localStorage.getItem(key), CORNER_KEY);
  const finalBox = await page.locator('#puck').boundingBox();
  const result = { corner, finalX: Math.round(finalBox?.x ?? -1), finalY: Math.round(finalBox?.y ?? -1), pageErrors };
  await context.close();
  return result;
}

const browser = await chromium.launch({ headless: true });
try {
  const dirty = '["alpha","","alpha","beta",7,null,"beta"]';
  const [legacyRoot, candidateRoot] = await Promise.all([
    rootSnapshot(browser, LEGACY, dirty),
    rootSnapshot(browser, CANDIDATE, dirty),
  ]);
  assert.deepEqual(candidateRoot, legacyRoot, 'candidate root/Favorites normalization must match Golden Master');
  assert.equal(candidateRoot.label, 'Favoritos · 2');
  assert.equal(candidateRoot.controls, 1);
  assert.deepEqual(candidateRoot.pageErrors, []);

  const [legacyOffline, candidateOffline] = await Promise.all([
    rootSnapshot(browser, LEGACY, '["alpha","beta"]', { blockExternal: true }),
    rootSnapshot(browser, CANDIDATE, '["alpha","beta"]', { blockExternal: true }),
  ]);
  assert.deepEqual(candidateOffline, legacyOffline, 'candidate local-only boot must match Golden Master');
  assert.equal(candidateOffline.label, 'Favoritos · 2');
  assert.deepEqual(candidateOffline.pageErrors, []);

  const legacyPin = await pinFlow(browser, LEGACY);
  const candidatePin = await pinFlow(browser, CANDIDATE);
  assert.deepEqual(candidatePin, legacyPin, 'pin/unpin flow must match Golden Master');
  assert.match(candidatePin.before || '', /^Anclar página$/);
  assert.equal(JSON.parse(candidatePin.storedPinned).length, 1);
  assert.match(candidatePin.afterPin || '', /^Desanclar página$/);
  assert.deepEqual(JSON.parse(candidatePin.storedUnpinned), []);
  assert.match(candidatePin.afterUnpin || '', /^Anclar página$/);
  assert.deepEqual(candidatePin.pageErrors, []);

  const legacyCorner = await cornerFlow(browser, LEGACY);
  const candidateCorner = await cornerFlow(browser, CANDIDATE);
  assert.equal(legacyCorner.corner, 'top-left');
  assert.equal(candidateCorner.corner, legacyCorner.corner, 'Corner Anchor persistence cannot regress');
  assert.ok(Math.abs(candidateCorner.finalX - legacyCorner.finalX) <= 1);
  assert.ok(Math.abs(candidateCorner.finalY - legacyCorner.finalY) <= 1);
  assert.deepEqual(candidateCorner.pageErrors, []);

  console.log(JSON.stringify({
    status: 'PASS',
    root: candidateRoot,
    offline: candidateOffline,
    pin: candidatePin,
    corner: candidateCorner,
  }, null, 2));
} finally {
  await browser.close();
}
