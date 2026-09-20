import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.PROMETEO_CANARY_URL || 'http://127.0.0.1:8000/prometeo/candidate/calendar-habits-custom-trackers-v1/?view=habits';
const outDir = process.env.PROMETEO_CANARY_OUT || 'artifacts/calendar-habits-mobile-touch-canary';
fs.mkdirSync(outDir, { recursive: true });

const evidence = {
  schema: 'prometeo.mobile-touch-canary-evidence/v1',
  observed_at: new Date().toISOString(),
  target: base,
  browser: 'chromium-playwright',
  viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
  touch: { hasTouch: true, isMobile: true },
  authority_boundary: 'verification-only; candidate bytes and Current/Human Accepted/Served/Catalog pointers unchanged',
  checks: {},
  console_errors: [],
  page_errors: [],
  overall: 'RUNNING'
};

const save = () => fs.writeFileSync(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
const mark = (name, details = true) => {
  evidence.checks[name] = { result: 'PASS', details };
  save();
};

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  page.on('pageerror', error => { evidence.page_errors.push(String(error)); save(); });
  page.on('console', msg => { if (msg.type() === 'error') { evidence.console_errors.push(msg.text()); save(); } });

  await page.goto(base, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#modeSwitch', { timeout: 15000 });
  await page.waitForSelector('#habitTrackerManage', { timeout: 15000 });

  const viewportState = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    maxTouchPoints: navigator.maxTouchPoints
  }));
  assert.equal(viewportState.innerWidth, 390);
  assert.ok(viewportState.scrollWidth <= viewportState.innerWidth + 1, `page horizontal overflow: ${viewportState.scrollWidth} > ${viewportState.innerWidth}`);
  assert.ok(viewportState.maxTouchPoints > 0, 'touch emulation must expose maxTouchPoints > 0');
  mark('touch_mobile_context', viewportState);

  const assertVisibleInViewport = async (selector, name) => {
    const box = await page.locator(selector).boundingBox();
    assert.ok(box, `${name} must have a bounding box`);
    assert.ok(box.width > 0 && box.height > 0, `${name} must have non-zero size`);
    assert.ok(box.x >= -1, `${name} must not be clipped off the left edge: x=${box.x}`);
    assert.ok(box.x + box.width <= 391, `${name} must not be clipped off the right edge: ${box.x + box.width}`);
    assert.ok(box.y + box.height > 0, `${name} must not be clipped above viewport`);
    const hit = await page.locator(selector).evaluate(el => {
      const r = el.getBoundingClientRect();
      const node = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, window.innerHeight - r.top - 1));
      return Boolean(node && (node === el || el.contains(node)));
    });
    assert.equal(hit, true, `${name} center must be an unobstructed touch target`);
    return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
  };

  const modeBoxes = {};
  for (const [space, label] of [['calendar', 'CALENDARIO'], ['habits', 'HÁBITOS'], ['money', 'DINERO']]) {
    modeBoxes[space] = await assertVisibleInViewport(`#modeSwitch [data-space="${space}"]`, label);
  }
  mark('primary_mode_controls_visible', modeBoxes);

  const modeNames = Object.keys(modeBoxes);
  for (let i = 0; i < modeNames.length; i++) {
    for (let j = i + 1; j < modeNames.length; j++) {
      const a = modeBoxes[modeNames[i]], b = modeBoxes[modeNames[j]];
      const overlaps = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      assert.equal(overlaps, false, `mode controls overlap: ${modeNames[i]} / ${modeNames[j]}`);
    }
  }
  mark('primary_mode_controls_non_overlapping_and_hit_tested', modeBoxes);

  const assertOnlySpace = async active => {
    const state = await page.evaluate(() => ({
      calendar: !document.querySelector('#calendarSpace')?.hidden,
      habits: !document.querySelector('#habitsSpace')?.hidden,
      money: !document.querySelector('#moneySpace')?.hidden
    }));
    for (const key of ['calendar','habits','money']) {
      assert.equal(state[key], key === active, `unexpected ${key} activation while ${active} should be active`);
    }
    return state;
  };

  await page.getByRole('button', { name: 'HÁBITOS' }).tap();
  await page.waitForSelector('#habitsSpace:not([hidden])');
  assert.equal(await page.locator('#activeTitle').textContent(), 'Hábitos');
  await assertVisibleInViewport('#habitTrackerManage', 'habitTrackerManage');
  mark('habits_single_active_space', await assertOnlySpace('habits'));

  const initialRange = (await page.locator('#traceRange').textContent()) || '';
  await page.locator('#tracePrev').tap();
  await page.waitForTimeout(120);
  const previousRange = (await page.locator('#traceRange').textContent()) || '';
  assert.notEqual(previousRange, initialRange, 'previous range tap should change the visible range');
  await page.locator('#traceNext').tap();
  await page.waitForTimeout(120);
  const restoredRange = (await page.locator('#traceRange').textContent()) || '';
  mark('habits_range_touch_navigation', { initialRange, previousRange, restoredRange });

  await page.locator('#habitTrackerManage').tap();
  await page.waitForSelector('#habitTrackerDialog[open], #habitTrackerDialog:modal', { timeout: 5000 });
  const dialogBox = await page.locator('#habitTrackerDialog').boundingBox();
  assert.ok(dialogBox, 'tracker dialog must be visible');
  assert.ok(dialogBox.width <= 390 + 1, `tracker dialog width ${dialogBox.width} exceeds viewport`);
  await page.fill('#habitTrackerDialog [data-add] input[name="label"]', 'Toque CI');
  await page.selectOption('#habitTrackerDialog [data-add] select[name="kind"]', 'positive');
  await page.selectOption('#habitTrackerDialog [data-add] select[name="group"]', 'extras');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.locator('#habitTrackerDialog [data-add] button[type="submit"]').tap()
  ]);
  await page.waitForSelector('#habitTrackerManage', { timeout: 15000 });
  const added = await page.evaluate(() => window.PrometeoHabitTrackerConfig.getConfig().trackers.find(t => t.label === 'Toque CI') || null);
  assert.ok(added, 'touch-created tracker must persist through reload');
  mark('tracker_config_touch_dialog', { tracker_id: added.id, dialog_width: Math.round(dialogBox.width) });

  await page.getByRole('button', { name: 'DINERO' }).tap();
  await page.waitForSelector('#moneySpace:not([hidden])');
  assert.equal(await page.locator('#activeTitle').textContent(), 'Dinero');
  mark('money_single_active_space', await assertOnlySpace('money'));
  await page.locator('#moneyAdd').tap();
  assert.ok(await page.locator('#moneyEditor').evaluate(el => el.open || el.hasAttribute('open')), 'money editor should open via touch');
  await page.locator('#moneyEditorCancel').tap();
  mark('money_touch_dialog');

  await page.getByRole('button', { name: 'CALENDARIO' }).tap();
  await page.waitForSelector('#calendarSpace:not([hidden])');
  assert.equal(await page.locator('#activeTitle').textContent(), 'Calendario');
  mark('calendar_single_active_space', await assertOnlySpace('calendar'));
  const frame = page.frameLocator('#romanticCalendarFrame');
  await frame.locator('body').waitFor({ state: 'attached', timeout: 15000 });
  mark('calendar_touch_mode_reachable');

  await page.getByRole('button', { name: 'HÁBITOS' }).tap();
  await page.waitForSelector('#habitsSpace:not([hidden])');
  const finalLayout = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth
  }));
  assert.ok(finalLayout.scrollWidth <= finalLayout.innerWidth + 1, `final document horizontal overflow: ${finalLayout.scrollWidth}`);
  assert.ok(finalLayout.bodyScrollWidth <= finalLayout.innerWidth + 1, `final body horizontal overflow: ${finalLayout.bodyScrollWidth}`);
  mark('no_mobile_page_overflow', finalLayout);

  await page.screenshot({ path: path.join(outDir, 'habits-mobile-touch.png'), fullPage: true });
  evidence.overall = 'PASS';
  evidence.completed_at = new Date().toISOString();
  save();
  console.log('calendar_habits_custom_trackers_mobile_touch_ci_v1: PASS');
} catch (error) {
  evidence.overall = 'FAIL';
  evidence.completed_at = new Date().toISOString();
  evidence.error = { message: String(error?.message || error), stack: String(error?.stack || '') };
  save();
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
