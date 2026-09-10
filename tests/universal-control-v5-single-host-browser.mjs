import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.V5_CANARY_BASE || 'http://127.0.0.1:4173';
const SHELL = `${BASE}/shared/universal-shell/v5/candidate/single-host-source.html`;
const RELEASE_ROOT = `${BASE}/shared/universal-shell/v5/release-candidate/index.html`;
const CORNER_KEY = 'prometeo.universal-control.corner.v1';

async function puckCenter(page) {
  const box = await page.locator('#puck').boundingBox();
  assert.ok(box, 'puck must have a bounding box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function dragPuck(page, target, { waitAfter = 280 } = {}) {
  const start = await puckCenter(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 10 });
  await page.mouse.up();
  if (waitAfter) await page.waitForTimeout(waitAfter);
}

async function corner(page) {
  return page.evaluate(key => localStorage.getItem(key), CORNER_KEY);
}

async function selectorClosed(page) {
  return page.locator('#selector').evaluate(el => el.classList.contains('closed'));
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  await page.goto(SHELL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(key => localStorage.removeItem(key), CORNER_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });

  // 1) Stable repeated drag: BR -> TL -> BR without reload.
  await dragPuck(page, { x: 52, y: 58 });
  assert.equal(await corner(page), 'top-left');
  assert.equal(await selectorClosed(page), true, 'first drag must not open selector');

  await dragPuck(page, { x: 338, y: 786 });
  assert.equal(await corner(page), 'bottom-right', 'puck must remain draggable after a completed snap');
  assert.equal(await selectorClosed(page), true, 'second drag must not open selector');

  // 2) Re-grab while the 210 ms snap animation is still in progress.
  await dragPuck(page, { x: 52, y: 786 }, { waitAfter: 35 });
  assert.equal(await corner(page), 'bottom-left');
  const midSnap = await puckCenter(page);
  await page.mouse.move(midSnap.x, midSnap.y);
  await page.mouse.down();
  await page.mouse.move(338, 58, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  assert.equal(await corner(page), 'top-right', 'new pointerdown must cancel old snap and own the puck immediately');
  assert.equal(await selectorClosed(page), true, 'synthetic click after re-grab drag must stay suppressed');

  // 3) Normal tap still opens after drag suppression has been consumed.
  await page.waitForTimeout(1100);
  await page.locator('#puck').click({ force: true });
  await page.waitForFunction(() => !document.querySelector('#selector')?.classList.contains('closed'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('#selector')?.classList.contains('closed'));

  // 4) PAGE HOST owns presentation only. A nested root loader must refuse its own shell
  // and signal the outer host, which returns home instead of allowing a recursive V5.
  await page.evaluate(url => {
    const frame = document.querySelector('#pageHost');
    frame.src = url;
  }, RELEASE_ROOT);
  await page.waitForFunction(() => document.querySelector('#pageHost')?.getAttribute('src') === 'about:blank', null, { timeout: 10000 });
  assert.equal(await page.locator('#puck').count(), 1, 'outer browsing context must still own exactly one puck');
  assert.equal(await page.evaluate(() => !!window.__PROMETEO_UNIVERSAL_HOST__), true);
  assert.deepEqual(errors, []);

  // 5) The release loader itself boots one shell only when top-level.
  const top = await context.newPage();
  const topErrors = [];
  top.on('pageerror', err => topErrors.push(String(err)));
  await top.goto(RELEASE_ROOT, { waitUntil: 'domcontentloaded' });
  await top.waitForSelector('#puck', { timeout: 10000 });
  assert.equal(await top.locator('#puck').count(), 1);
  assert.equal(await top.evaluate(() => document.documentElement.dataset.prometeoUniversalShell), 'v5');
  assert.deepEqual(topErrors, []);

  console.log(JSON.stringify({
    status: 'PASS',
    repeated_drag: ['top-left', 'bottom-right'],
    regrab_during_snap: 'top-right',
    nested_root: 'BLOCKED_AND_RETURNED_TO_OUTER_HOST',
    top_level_release_shells: 1,
  }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
