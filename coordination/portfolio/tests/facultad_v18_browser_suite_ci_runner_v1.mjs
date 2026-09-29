#!/usr/bin/env node
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TARGET_URL = process.env.FACULTAD_V18_TARGET_URL || 'https://juanmanuelpm.github.io/prometeo/pages/study-library/';
const EXPECTED_BLOB = process.env.FACULTAD_V18_EXPECTED_BLOB || null;
const OUT_DIR = process.env.FACULTAD_V18_ARTIFACT_DIR || 'artifacts/facultad-v18-browser-suite-ci';
const ASSET_WAIT_MS = Number(process.env.FACULTAD_V18_ASSET_WAIT_MS || 180000);

const views = [
  { id: 'desktop', viewport: { width: 1365, height: 900 }, isMobile: false, hasTouch: false },
  { id: 'narrow', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const norm = value => String(value || '').replace(/\s+/g, ' ').trim();
const gitBlobSha = bytes => createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');

async function pollAsset() {
  const assetUrl = new URL('study-v18.js?v=184', TARGET_URL).href;
  const started = Date.now();
  let last = null;
  do {
    try {
      const response = await fetch(assetUrl, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
      const bytes = Buffer.from(await response.arrayBuffer());
      last = {
        url: assetUrl,
        http_status: response.status,
        observed_blob: response.ok ? gitBlobSha(bytes) : null,
        bytes: bytes.length,
        expected_blob: EXPECTED_BLOB,
        matched_expected: response.ok && (!EXPECTED_BLOB || gitBlobSha(bytes) === EXPECTED_BLOB)
      };
      if (last.matched_expected) return last;
    } catch (error) {
      last = { url: assetUrl, error: error?.message || String(error), expected_blob: EXPECTED_BLOB, matched_expected: false };
    }
    await sleep(5000);
  } while (Date.now() - started < ASSET_WAIT_MS);
  return last || { url: assetUrl, expected_blob: EXPECTED_BLOB, matched_expected: false, error: 'asset_poll_no_result' };
}

async function bridgeSnapshot(page, courseId, title) {
  return page.evaluate(async ({ courseId, title }) => {
    try {
      const ensure = window.__STUDY_ENSURE_LEGACY;
      if (typeof ensure !== 'function') return { ok: false, reason: 'legacy_bridge_unavailable' };
      await ensure();
      const api = window.PrometeoStudyCalendarV11;
      if (!api) return { ok: false, reason: 'calendar_api_unavailable' };
      const [notes, schedule] = await Promise.all([
        typeof api.courseSessions === 'function' ? api.courseSessions(courseId, title) : Promise.resolve(null),
        typeof api.courseSchedule === 'function' ? api.courseSchedule(courseId, title) : Promise.resolve(null)
      ]);
      return { ok: true, notes, schedule };
    } catch (error) {
      return { ok: false, reason: error?.message || String(error) };
    }
  }, { courseId, title });
}

function expectedScheduleTitles(schedule) {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 1);
  return (schedule?.events || [])
    .filter(event => {
      const d = new Date(event.starts_at || event.date);
      return !Number.isNaN(d.getTime()) && d >= cutoff;
    })
    .slice(0, 10)
    .map(event => norm(event.title || 'Evento'));
}

async function waitPanelSettled(page, loadingPattern, timeoutMs = 9000) {
  try {
    await page.waitForFunction(pattern => {
      const panel = document.querySelector('[data-v18-panel]');
      return panel && !(new RegExp(pattern, 'i')).test(panel.innerText || '');
    }, loadingPattern.source, { timeout: timeoutMs });
  } catch {}
}

async function runView(browser, view) {
  const context = await browser.newContext({
    viewport: view.viewport,
    isMobile: view.isMobile,
    hasTouch: view.hasTouch,
    locale: 'es-AR'
  });
  const page = await context.newPage();
  const runtime = { page_errors: [], console_errors: [], request_failures: [] };

  page.on('pageerror', error => runtime.page_errors.push(error?.message || String(error)));
  page.on('console', message => {
    if (message.type() === 'error') runtime.console_errors.push(message.text());
  });
  page.on('requestfailed', request => {
    runtime.request_failures.push({ url: request.url(), error: request.failure()?.errorText || 'request_failed' });
  });

  const result = {
    view: view.id,
    viewport: view.viewport,
    target_url: TARGET_URL,
    course: null,
    notes: {},
    login: {},
    schedule: {},
    version_anterior: {},
    runtime,
    criteria: {}
  };

  try {
    const url = new URL(TARGET_URL);
    url.searchParams.set('ci_browser', view.id);
    url.searchParams.set('ci_nonce', process.env.GITHUB_SHA || 'manual');
    await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('[data-v18-course]', { timeout: 20000 });
    await page.screenshot({ path: path.join(OUT_DIR, view.id + '-home.png'), fullPage: true });

    const first = page.locator('[data-v18-course]').first();
    const courseId = await first.getAttribute('data-v18-course');
    const title = norm(await first.locator('.v18CourseTitleBar').textContent().catch(() => first.textContent()));
    result.course = { course_id: courseId, title };
    await first.click();
    await page.waitForSelector('[data-v18-panel]', { timeout: 10000 });

    const bridge = await bridgeSnapshot(page, courseId, title);
    result.bridge = bridge;

    await waitPanelSettled(page, /Cargando clases/);
    const notesText = norm(await page.locator('[data-v18-panel]').innerText());
    const noteRows = await page.locator('[data-v18-panel] .v18NoteItem').evaluateAll(nodes => nodes.map(node => ({
      title: (node.querySelector('summary span')?.textContent || '').trim(),
      date: (node.querySelector('summary small')?.textContent || '').trim()
    })));
    result.notes = { text: notesText.slice(0, 4000), rows: noteRows };
    await page.screenshot({ path: path.join(OUT_DIR, view.id + '-notes.png'), fullPage: true });

    const syntheticNotes = /Fecha por definir|Clase 0[1-4]/i.test(notesText);
    const expectedSessions = bridge.ok && Array.isArray(bridge.notes?.sessions) ? bridge.notes.sessions : null;
    let notesTruth = false;
    if (expectedSessions) {
      if (bridge.notes?.status === 'degraded' && expectedSessions.length === 0) {
        notesTruth = /No pude cargar las clases guardadas|No voy a inventar fechas ni notas/i.test(notesText);
      } else if (expectedSessions.length === 0) {
        notesTruth = /No hay clases guardadas para esta materia/i.test(notesText);
      } else {
        const renderedTitles = noteRows.map(row => norm(row.title));
        const expectedTitles = expectedSessions.map(item => norm(item.title || 'Clase registrada'));
        notesTruth = expectedTitles.every(item => renderedTitles.includes(item)) && noteRows.every(row => row.date && !/Fecha por definir/i.test(row.date));
      }
    } else {
      notesTruth = /Cargando clases|No pude cargar las clases guardadas|No hay clases guardadas para esta materia/i.test(notesText) || noteRows.length > 0;
    }
    result.criteria.notes_real_or_honest = !syntheticNotes && notesTruth;

    const menu = page.locator('[data-v18-menu]').first();
    await menu.click();
    const login = page.locator('[data-v18-login]').first();
    const loginText = norm(await login.textContent());
    const disabled = await login.isDisabled().catch(() => false);
    const ariaDisabled = await login.getAttribute('aria-disabled');
    const loginTitle = await login.getAttribute('title');
    result.login = { text: loginText, disabled, aria_disabled: ariaDisabled, title: loginTitle };
    result.criteria.generic_login_honest_disabled =
      (disabled || ariaDisabled === 'true') &&
      /Inicio de sesión no configurado/i.test(loginText) &&
      /proveedor de autenticación/i.test(loginTitle || '');

    const legacy = page.locator('a').filter({ hasText: /versión anterior/i }).first();
    const legacyHref = await legacy.getAttribute('href');
    let legacyStatus = null;
    if (legacyHref) {
      const absolute = new URL(legacyHref, page.url()).href;
      try {
        const response = await context.request.get(absolute, { timeout: 15000 });
        legacyStatus = response.status();
      } catch {}
    }
    result.version_anterior = { href: legacyHref, http_status: legacyStatus };
    result.criteria.version_anterior_reachable = !!legacyHref && /legacy=1/.test(legacyHref) && legacyStatus !== null && legacyStatus < 400;

    await page.locator('[data-v18-tab="schedule"]').click();
    await waitPanelSettled(page, /Cargando cronograma/);
    const scheduleText = norm(await page.locator('[data-v18-panel]').innerText());
    const scheduleRows = await page.locator('[data-v18-panel] .v18NoteItem').evaluateAll(nodes => nodes.map(node => ({
      title: (node.querySelector('summary span')?.textContent || '').trim(),
      date: (node.querySelector('summary small')?.textContent || '').trim(),
      body: (node.querySelector('.v18NoteBody')?.textContent || '').trim()
    })));
    result.schedule = { text: scheduleText.slice(0, 4000), rows: scheduleRows };
    await page.screenshot({ path: path.join(OUT_DIR, view.id + '-schedule.png'), fullPage: true });

    const staleSchedule = /Acá se va a conectar el cronograma real/i.test(scheduleText);
    let scheduleTruth = false;
    if (bridge.ok && bridge.schedule) {
      const expectedTitles = expectedScheduleTitles(bridge.schedule);
      const renderedTitles = scheduleRows.map(row => norm(row.title));
      if (expectedTitles.length === 0) {
        scheduleTruth = /No hay próximas fechas confirmadas para esta materia/i.test(scheduleText);
      } else {
        scheduleTruth = expectedTitles.every(item => renderedTitles.includes(item));
      }
    } else {
      scheduleTruth = /No pude cargar las fechas/i.test(scheduleText);
    }
    result.criteria.schedule_source_match_or_honest_empty = !staleSchedule && scheduleTruth;
    result.criteria.runtime_errors_captured = true;
    result.criteria.no_uncaught_page_errors = runtime.page_errors.length === 0;
  } catch (error) {
    result.fatal_error = error?.stack || error?.message || String(error);
    try {
      await page.screenshot({ path: path.join(OUT_DIR, view.id + '-fatal.png'), fullPage: true });
    } catch {}
  } finally {
    await context.close();
  }

  const checks = Object.values(result.criteria);
  result.pass = !result.fatal_error && checks.length >= 6 && checks.every(Boolean);
  return result;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const asset = await pollAsset();
  const evidence = {
    schema: 'prometeo.facultad-v18-browser-suite-ci/v1',
    generated_at: new Date().toISOString(),
    target_url: TARGET_URL,
    expected_deployed_blob: EXPECTED_BLOB,
    deployed_asset: asset,
    authority: 'TECHNICAL_VERIFICATION_ONLY_NO_CURRENT_HUMAN_ACCEPTED_OR_SERVED_PROMOTION',
    views: [],
    status: 'PENDING'
  };

  const browser = await chromium.launch({ headless: true });
  try {
    for (const view of views) evidence.views.push(await runView(browser, view));
  } finally {
    await browser.close();
  }

  const assetOk = !!asset?.matched_expected;
  const viewOk = evidence.views.length === views.length && evidence.views.every(view => view.pass);
  evidence.status = assetOk && viewOk ? 'PASS' : 'FAIL';
  evidence.summary = {
    asset_matches_expected: assetOk,
    desktop_pass: evidence.views.find(view => view.view === 'desktop')?.pass || false,
    narrow_pass: evidence.views.find(view => view.view === 'narrow')?.pass || false
  };

  await writeFile(path.join(OUT_DIR, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(evidence, null, 2));
  process.exit(evidence.status === 'PASS' ? 0 : 1);
}

await main();
