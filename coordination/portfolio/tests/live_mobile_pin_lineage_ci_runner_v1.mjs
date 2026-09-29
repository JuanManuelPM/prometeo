import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const TARGET_URL = process.env.LIVE_TARGET_URL || 'https://juanmanuelpm.github.io/prometeo/live/';
const ARTIFACT_DIR = process.env.LIVE_ARTIFACT_DIR || 'artifacts/live-mobile-pin-lineage-ci';
const VIEWPORT = { width: 360, height: 780 };
const TIMEOUT_MS = Number(process.env.LIVE_BROWSER_TIMEOUT_MS || 45000);

await fs.mkdir(ARTIFACT_DIR, { recursive: true });

const result = {
  schema: 'prometeo.live-mobile-pin-lineage-ci-result/v1',
  target_url: TARGET_URL,
  checked_at: new Date().toISOString(),
  viewport: VIEWPORT,
  outcome: 'FAIL',
  failure_code: null,
  selected_worker_id: null,
  lineage_text: null,
  http_status: null,
  checks: [],
  console_errors: [],
  page_errors: []
};

const pass = (name, evidence = null) => result.checks.push({ name, status: 'PASS', evidence });
const fail = (name, code, evidence = null) => {
  result.checks.push({ name, status: 'FAIL', code, evidence });
  const error = new Error(code);
  error.failureCode = code;
  throw error;
};

let browser;
let page;
let terminalError = null;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') result.console_errors.push(msg.text());
  });
  page.on('pageerror', error => result.page_errors.push(String(error?.message || error)));

  const response = await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  result.http_status = response?.status() ?? null;
  if (!response) fail('published-live-route', 'LIVE_ROUTE_NO_RESPONSE');
  if (response.status() >= 400) fail('published-live-route', `LIVE_ROUTE_HTTP_${response.status()}`, { status: response.status() });
  pass('published-live-route', { status: response.status(), final_url: page.url() });

  await page.waitForSelector('#rail', { timeout: TIMEOUT_MS });
  await page.waitForSelector('.tabs [data-go="projectsView"]', { timeout: TIMEOUT_MS });
  await page.waitForFunction(() => {
    const line = document.querySelector('#statusLine')?.textContent || '';
    return /6\s*min/i.test(line) && /10\s*min/i.test(line);
  }, { timeout: TIMEOUT_MS });
  pass('liveness-threshold-presentation', await page.locator('#statusLine').innerText());

  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth
  }));
  if (overflow.documentScrollWidth > overflow.innerWidth + 1 || overflow.bodyScrollWidth > overflow.innerWidth + 1) {
    fail('page-wide-horizontal-overflow', 'LIVE_PAGE_HORIZONTAL_OVERFLOW', overflow);
  }
  pass('page-wide-horizontal-overflow', overflow);

  const cards = page.locator('details.workerCard');
  await cards.first().waitFor({ state: 'attached', timeout: TIMEOUT_MS });
  const cardCount = await cards.count();
  let selected = null;
  for (let i = 0; i < cardCount; i += 1) {
    const card = cards.nth(i);
    await card.evaluate(el => { el.open = true; el.dispatchEvent(new Event('toggle')); });
    const tech = card.locator('.tech');
    const text = (await tech.innerText()).replace(/\s+/g, ' ').trim();
    const hasGeneration = /PIN G\d{6}/.test(text);
    const hasOwner = /dueño\s+\S+/i.test(text);
    const hasContention = /\b[1-9]\d*\s+colisi(?:ón|ones)\b/i.test(text);
    const hasRecovery = /recuperación/i.test(text);
    if (hasGeneration && hasOwner && (hasContention || hasRecovery)) {
      selected = {
        index: i,
        workerId: await card.getAttribute('data-worker'),
        text,
        hasContention,
        hasRecovery
      };
      break;
    }
    await card.evaluate(el => { el.open = false; el.dispatchEvent(new Event('toggle')); });
  }
  if (!selected) {
    fail('expanded-pin-lineage-evidence', 'NO_CONTENDED_OR_RECOVERED_WORKER_DETAIL', { card_count: cardCount });
  }
  result.selected_worker_id = selected.workerId;
  result.lineage_text = selected.text;
  pass('expanded-pin-lineage-evidence', selected);

  const readable = await cards.nth(selected.index).locator('.tech').evaluate(el => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      fontSizePx: Number.parseFloat(style.fontSize || '0'),
      overflowWrap: style.overflowWrap,
      left: rect.left,
      right: rect.right,
      viewportWidth: innerWidth
    };
  });
  if (readable.fontSizePx < 12 || readable.left < -1 || readable.right > readable.viewportWidth + 1) {
    fail('expanded-detail-readable', 'LIVE_LINEAGE_DETAIL_NOT_READABLE', readable);
  }
  pass('expanded-detail-readable', readable);

  await page.locator('.tabs [data-go="projectsView"]').click();
  await page.waitForFunction(() => document.querySelector('.tabs [data-go="projectsView"]')?.classList.contains('selected'), { timeout: 5000 });
  pass('tab-navigation', 'projectsView selected');

  const rail = page.locator('#rail');
  await rail.evaluate(el => {
    el.scrollTo({ left: el.clientWidth * 3, behavior: 'auto' });
    el.dispatchEvent(new Event('scroll'));
  });
  await page.waitForFunction(() => document.querySelector('.tabs [data-go="productionView"]')?.classList.contains('selected'), { timeout: 5000 });
  pass('swipe-equivalent-navigation', 'rail scroll selected productionView');

  await page.locator('.tabs [data-go="nowView"]').click();
  await page.waitForFunction(() => document.querySelector('.tabs [data-go="nowView"]')?.classList.contains('selected'), { timeout: 5000 });

  if (result.console_errors.length || result.page_errors.length) {
    fail('runtime-errors', 'LIVE_BROWSER_RUNTIME_ERRORS', {
      console_errors: result.console_errors,
      page_errors: result.page_errors
    });
  }
  pass('runtime-errors', 'none');

  result.outcome = 'PASS';
} catch (error) {
  terminalError = error;
  result.failure_code = error?.failureCode || error?.message || 'LIVE_BROWSER_RUNNER_FAILED';
} finally {
  if (page) {
    try {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live-mobile.png'), fullPage: true });
    } catch (error) {
      result.screenshot_error = String(error?.message || error);
    }
  }
  result.finished_at = new Date().toISOString();
  await fs.writeFile(path.join(ARTIFACT_DIR, 'result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  if (browser) await browser.close();
}

console.log(JSON.stringify(result, null, 2));
if (terminalError) process.exitCode = 1;
