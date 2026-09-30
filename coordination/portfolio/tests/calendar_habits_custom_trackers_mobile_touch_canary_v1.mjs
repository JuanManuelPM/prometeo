import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = path.resolve('artifacts/calendar-habits-mobile-touch');
fs.mkdirSync(outDir, { recursive: true });
const result = {
  schema: 'prometeo.calendar-habits-mobile-touch-canary/v1',
  viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  url: 'http://127.0.0.1:4173/prometeo/candidate/calendar-habits-custom-trackers-v1/',
  checks: [],
  observations: {},
  console_errors: [],
  page_errors: []
};
const failures = [];
const check = (name, ok, detail = null) => {
  result.checks.push({ name, ok: Boolean(ok), detail });
  if (!ok) failures.push(name);
};
const persist = () => fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2) + '\n');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
});
const page = await context.newPage();
page.on('console', msg => { if (msg.type() === 'error') result.console_errors.push(msg.text()); });
page.on('pageerror', err => result.page_errors.push(String(err)));

try {
  const response = await page.goto(result.url, { waitUntil: 'networkidle', timeout: 30000 });
  check('candidate_http_200', response?.status() === 200, { status: response?.status() ?? null });
  check('touch_runtime_enabled', await page.evaluate(() => navigator.maxTouchPoints > 0), {
    maxTouchPoints: await page.evaluate(() => navigator.maxTouchPoints)
  });

  const geometry = async label => {
    const g = await page.evaluate(() => ({
      innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      title: document.getElementById('activeTitle')?.textContent?.trim() || null
    }));
    result.observations[label] = g;
    check(label + '_no_horizontal_overflow', g.scrollWidth <= g.innerWidth + 1 && g.bodyScrollWidth <= g.innerWidth + 1, g);
  };

  await geometry('calendar');
  const calendarFrame = page.locator('#romanticCalendarFrame');
  check('calendar_iframe_visible', await calendarFrame.isVisible());
  const calendarReady = await calendarFrame.evaluate(el => ({
    width: el.getBoundingClientRect().width,
    height: el.getBoundingClientRect().height,
    loaded: Boolean(el.contentDocument && el.contentDocument.readyState === 'complete')
  }));
  result.observations.calendar_iframe = calendarReady;
  check('calendar_iframe_has_area', calendarReady.width > 100 && calendarReady.height > 100, calendarReady);
  check('calendar_iframe_loaded_same_origin', calendarReady.loaded, calendarReady);
  await page.screenshot({ path: path.join(outDir, '01-calendar.png'), fullPage: true });

  const habitsButton = page.getByRole('button', { name: 'HÁBITOS' });
  const habitsBox = await habitsButton.boundingBox();
  result.observations.habits_button_box = habitsBox;
  check('habits_touch_target_rendered', Boolean(habitsBox && habitsBox.width > 0 && habitsBox.height > 0), habitsBox);
  await habitsButton.tap();
  await page.locator('#habitsSpace').waitFor({ state: 'visible' });
  await geometry('habits');

  const edit = page.getByRole('button', { name: 'EDITAR' });
  check('tracker_manage_visible', await edit.isVisible());
  const editBox = await edit.boundingBox();
  result.observations.tracker_edit_box = editBox;
  check('tracker_manage_touch_target_rendered', Boolean(editBox && editBox.width > 0 && editBox.height > 0), editBox);
  await edit.tap();

  const trackerDialog = page.locator('#habitTrackerDialog');
  check('tracker_dialog_open', await trackerDialog.evaluate(el => el.open || el.hasAttribute('open')));
  const dialogBox = await trackerDialog.boundingBox();
  result.observations.tracker_dialog_box = dialogBox;
  check('tracker_dialog_fits_viewport', Boolean(dialogBox && dialogBox.x >= -1 && dialogBox.x + dialogBox.width <= 391), dialogBox);

  const addForm = trackerDialog.locator('form[data-add]');
  await addForm.locator('input[name="label"]').fill('Canary touch');
  await addForm.locator('select[name="kind"]').selectOption('positive');
  await addForm.locator('select[name="group"]').selectOption('routine');
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    addForm.getByRole('button', { name: 'AGREGAR' }).tap()
  ]);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'HÁBITOS' }).tap();
  await page.getByRole('button', { name: 'EDITAR' }).tap();
  const trackerNamesAfterReload = await trackerDialog.locator('.tracker-config-row input[aria-label="Nombre"]').evaluateAll(els => els.map(el => el.value));
  result.observations.tracker_names_after_reload = trackerNamesAfterReload;
  check('tracker_add_persisted_after_reload', trackerNamesAfterReload.includes('Canary touch'), trackerNamesAfterReload);

  const beforeRange = (await page.locator('#traceRange').textContent())?.trim() || '';
  await trackerDialog.getByRole('button', { name: 'Cerrar' }).tap();
  await page.locator('#tracePrev').tap();
  const afterRange = (await page.locator('#traceRange').textContent())?.trim() || '';
  result.observations.trace_range = { before: beforeRange, after: afterRange };
  check('habits_range_navigation_works', beforeRange !== afterRange && afterRange.length > 0, result.observations.trace_range);
  await page.screenshot({ path: path.join(outDir, '02-habits.png'), fullPage: true });

  const moneyButton = page.getByRole('button', { name: 'DINERO' });
  await moneyButton.tap();
  await page.locator('#moneySpace').waitFor({ state: 'visible' });
  await geometry('money');
  check('money_editor_reachable', await page.locator('#moneyAdd').isVisible());
  await page.locator('#moneyAdd').tap();
  const moneyDialog = page.locator('#moneyEditor');
  check('money_editor_opens_by_touch', await moneyDialog.evaluate(el => el.open || el.hasAttribute('open')));
  const moneyBox = await moneyDialog.boundingBox();
  result.observations.money_dialog_box = moneyBox;
  check('money_dialog_fits_viewport', Boolean(moneyBox && moneyBox.x >= -1 && moneyBox.x + moneyBox.width <= 391), moneyBox);
  await page.screenshot({ path: path.join(outDir, '03-money-dialog.png'), fullPage: true });
  await page.locator('#moneyEditorCancel').tap();

  await page.getByRole('button', { name: 'CALENDARIO' }).tap();
  await page.locator('#calendarSpace').waitFor({ state: 'visible' });
  await geometry('calendar_return');
  check('mode_switch_roundtrip', (await page.locator('#activeTitle').textContent())?.trim() === 'Calendario');

  result.observations.console_error_count = result.console_errors.length;
  result.observations.page_error_count = result.page_errors.length;
  check('no_page_errors', result.page_errors.length === 0, result.page_errors);
} catch (error) {
  result.fatal_error = String(error?.stack || error);
  failures.push('fatal_error');
} finally {
  result.pass = failures.length === 0;
  result.failures = failures;
  persist();
  await browser.close();
}
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
