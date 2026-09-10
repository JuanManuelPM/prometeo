import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.V5_CANARY_BASE || 'http://127.0.0.1:4173';
const LEGACY = `${BASE}/shared/universal-shell/v5/candidate/baseline-source.html`;
const CANDIDATE_PATH = process.env.V5_CANDIDATE_PATH || 'shared/universal-shell/v5/candidate/favorites-facade-source.html';
const CANDIDATE = `${BASE}/${CANDIDATE_PATH.replace(/^\//,'')}`;
const IS_DURABLE = CANDIDATE_PATH.includes('durable-favorites-source') || CANDIDATE_PATH.includes('single-host-source') || CANDIDATE_PATH.includes('change-loop-source');
const FAV_KEY = 'prometeo.v5.favorites.v1';
const CORNER_KEY = 'prometeo.universal-control.corner.v1';

async function waitReady(page) {
  await page.waitForFunction(() => {
    const puck = document.querySelector('#puck');
    const selector = document.querySelector('#selector');
    return puck?.getAttribute('aria-label')?.startsWith('Abrir Prometeo') && selector?.classList.contains('closed');
  }, null, { timeout: 15000 });
}

async function semanticClick(page, selector) {
  await page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`missing semantic control ${sel}`);
    el.click();
  }, selector);
}

async function openControl(page) {
  await waitReady(page);
  await semanticClick(page, '#puck');
  await page.waitForFunction(() => !document.querySelector('#selector')?.classList.contains('closed'));
}

async function rootSnapshot(browser, url, seed, { blockExternal = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  if (blockExternal) await page.route('https://juanmanuelpm.github.io/**', route => route.abort());
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: FAV_KEY, value: seed });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openControl(page);
  await page.keyboard.press('ArrowRight');
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
  await page.keyboard.press('ArrowRight');
  const before = await page.locator('#labelTextPath').textContent();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(IS_DURABLE ? 50 : 0);
  const storedPinned = await page.evaluate(key => localStorage.getItem(key), FAV_KEY);
  const afterPin = await page.locator('#labelTextPath').textContent();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(IS_DURABLE ? 50 : 0);
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
  await waitReady(page);
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

async function backendStatus(browser, url) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitReady(page);
  await page.waitForTimeout(50);
  const status = await page.evaluate(() => window.__PROMETEO_V5_BACKEND_STATUS__?.snapshot?.() || null);
  await context.close();
  return status;
}

const browser = await chromium.launch({ headless: true });
try {
  const [legacyRoot, candidateRoot] = await Promise.all([
    rootSnapshot(browser, LEGACY, '[]'),
    rootSnapshot(browser, CANDIDATE, '[]'),
  ]);
  assert.deepEqual(candidateRoot, legacyRoot, 'candidate online root must match Golden Master');
  assert.equal(candidateRoot.controls, 1);
  assert.deepEqual(candidateRoot.pageErrors, []);

  // P1/P2 retain legacy authority. P3 and later candidates have already activated DB ownership
  // after the first load in this helper; their pre-migration dirty-legacy semantics are covered
  // by the dedicated durable browser test instead.
  const offlineSeed = IS_DURABLE ? '[]' : '["alpha","","alpha","beta",7,null,"beta"]';
  const [legacyOffline, candidateOffline] = await Promise.all([
    rootSnapshot(browser, LEGACY, offlineSeed, { blockExternal: true }),
    rootSnapshot(browser, CANDIDATE, offlineSeed, { blockExternal: true }),
  ]);
  assert.deepEqual(candidateOffline, legacyOffline, 'candidate local-only boot must match Golden Master at the active authority boundary');
  if (!IS_DURABLE) assert.equal(candidateOffline.label, 'Favoritos · 2');
  assert.deepEqual(candidateOffline.pageErrors, []);

  const legacyPin = await pinFlow(browser, LEGACY);
  const candidatePin = await pinFlow(browser, CANDIDATE);
  assert.deepEqual(candidatePin, legacyPin, 'pin/unpin flow must match Golden Master');
  assert.equal(JSON.parse(candidatePin.storedPinned).length, 1);
  assert.deepEqual(JSON.parse(candidatePin.storedUnpinned), []);
  assert.deepEqual(candidatePin.pageErrors, []);

  const legacyCorner = await cornerFlow(browser, LEGACY);
  const candidateCorner = await cornerFlow(browser, CANDIDATE);
  assert.equal(candidateCorner.corner, legacyCorner.corner, 'Corner Anchor persistence cannot regress');
  assert.ok(Math.abs(candidateCorner.finalX - legacyCorner.finalX) <= 1);
  assert.ok(Math.abs(candidateCorner.finalY - legacyCorner.finalY) <= 1);
  assert.deepEqual(candidateCorner.pageErrors, []);

  const status = await backendStatus(browser, CANDIDATE);
  if (CANDIDATE_PATH.includes('backend-facades-source') || IS_DURABLE) {
    assert.ok(status, 'modular candidate must expose internal backend status');
    assert.equal(status.shell?.state, 'READY');
  }

  console.log(JSON.stringify({ status: 'PASS', candidate: CANDIDATE_PATH, root: candidateRoot, offline: candidateOffline, pin: candidatePin, corner: candidateCorner, backendStatus: status }, null, 2));
} finally {
  await browser.close();
}
