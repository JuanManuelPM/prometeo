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
  contract: 'LIVE_V6',
  target_url: TARGET_URL,
  checked_at: new Date().toISOString(),
  viewport: VIEWPORT,
  outcome: 'FAIL',
  failure_code: null,
  final_url: null,
  document_title: null,
  selected_worker_id: null,
  lineage_text: null,
  http_status: null,
  checks: [],
  defects: [],
  console_errors: [],
  page_errors: []
};

const pass = (name, evidence = null) => result.checks.push({ name, status: 'PASS', evidence });
const defect = (name, code, evidence = null) => {
  const item = { name, status: 'FAIL', code, evidence };
  result.checks.push(item);
  result.defects.push(item);
  if (!result.failure_code) result.failure_code = code;
};
const hardFail = (name, code, evidence = null) => {
  defect(name, code, evidence);
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
  if (!response) hardFail('published-live-route', 'LIVE_ROUTE_NO_RESPONSE');
  if (response.status() >= 400) hardFail('published-live-route', `LIVE_ROUTE_HTTP_${response.status()}`, { status: response.status() });
  result.final_url = page.url();
  pass('published-live-route', { status: response.status(), final_url: result.final_url });

  await page.waitForSelector('button.tab[data-view="estado"]', { timeout: TIMEOUT_MS });
  await page.waitForSelector('#estado.view.on', { timeout: TIMEOUT_MS });
  await page.waitForSelector('#statecontent', { timeout: TIMEOUT_MS });
  result.document_title = await page.title();

  if (!/Prometeo\s*·\s*Live State V6/i.test(result.document_title)) {
    defect('live-v6-shell', 'LIVE_V6_SHELL_IDENTITY_MISMATCH', {
      title: result.document_title,
      final_url: result.final_url
    });
  } else {
    pass('live-v6-shell', { title: result.document_title, final_url: result.final_url });
  }

  await page.waitForFunction(() => {
    const state = document.querySelector('#statecontent');
    return Boolean(state && state.textContent && state.textContent.trim().length > 0);
  }, { timeout: TIMEOUT_MS });
  pass('live-v6-state-rendered', (await page.locator('#statecontent').innerText()).slice(0, 600));

  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth
  }));
  if (overflow.documentScrollWidth > overflow.innerWidth + 1 || overflow.bodyScrollWidth > overflow.innerWidth + 1) {
    defect('page-wide-horizontal-overflow', 'LIVE_PAGE_HORIZONTAL_OVERFLOW', overflow);
  } else {
    pass('page-wide-horizontal-overflow', overflow);
  }

  for (const view of ['historial', 'trabajo', 'organismo', 'estado']) {
    const tab = page.locator(`button.tab[data-view="${view}"]`);
    await tab.click();
    await page.waitForFunction(
      expected => {
        const button = document.querySelector(`button.tab[data-view="${expected}"]`);
        const section = document.getElementById(expected);
        return Boolean(button?.classList.contains('on') && section?.classList.contains('on'));
      },
      view,
      { timeout: 5000 }
    );
  }
  pass('tab-navigation', 'estado → historial → trabajo → organismo → estado');

  const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();

  const livenessSignals = {
    six_minute_threshold: /(?:^|\D)6\s*(?:min|m)(?:\D|$)/i.test(bodyText),
    ten_minute_threshold: /(?:^|\D)10\s*(?:min|m)(?:\D|$)/i.test(bodyText)
  };
  if (livenessSignals.six_minute_threshold && livenessSignals.ten_minute_threshold) {
    pass('liveness-threshold-presentation', livenessSignals);
  } else {
    defect('liveness-threshold-presentation', 'LIVE_V6_LIVENESS_THRESHOLDS_NOT_EXPOSED', livenessSignals);
  }

  const lineageSignals = {
    generation: /\bPIN\s+G\d{6}\b/i.test(bodyText),
    owner: /\b(?:dueño|owner)\b/i.test(bodyText),
    contention: /\b(?:colisi[oó]n|colisiones|collision|collisions)\b/i.test(bodyText),
    recovery: /\b(?:recuperaci[oó]n|recovery)\b/i.test(bodyText)
  };
  if (lineageSignals.generation && lineageSignals.owner && (lineageSignals.contention || lineageSignals.recovery)) {
    result.lineage_text = bodyText.match(/.{0,120}PIN\s+G\d{6}.{0,320}/i)?.[0] ?? null;
    pass('expanded-pin-lineage-evidence', lineageSignals);
  } else {
    defect('expanded-pin-lineage-evidence', 'LIVE_V6_PIN_LINEAGE_SURFACE_ABSENT', lineageSignals);
  }

  if (result.console_errors.length || result.page_errors.length) {
    defect('runtime-errors', 'LIVE_BROWSER_RUNTIME_ERRORS', {
      console_errors: result.console_errors,
      page_errors: result.page_errors
    });
  } else {
    pass('runtime-errors', 'none');
  }

  result.outcome = result.defects.length ? 'BOUNDED_DEFECT' : 'PASS';
  if (result.defects.length) {
    terminalError = new Error(result.failure_code || 'LIVE_V6_BOUNDED_DEFECT');
    terminalError.failureCode = result.failure_code;
  }
} catch (error) {
  terminalError = error;
  result.failure_code = result.failure_code || error?.failureCode || error?.message || 'LIVE_BROWSER_RUNNER_FAILED';
  if (result.outcome !== 'BOUNDED_DEFECT') result.outcome = 'FAIL';
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
