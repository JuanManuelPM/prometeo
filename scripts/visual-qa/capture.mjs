import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.VISUAL_QA_BASE_URL || 'https://juanmanuelpm.github.io/prometeo/';
const SOURCE_COMMIT = process.env.VISUAL_QA_SOURCE_COMMIT || process.env.GITHUB_SHA || 'unknown';
const MODE = process.env.VISUAL_QA_MODE || 'LIVE_TRUTH';
const OUT_DIR = process.env.VISUAL_QA_OUT_DIR || 'visual-qa-artifacts';
const ROUTES = (process.env.VISUAL_QA_ROUTES || 'demos/coliseo-3d/')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

const VIEWPORTS = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'tv', width: 1920, height: 1080 },
  { key: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true }
];
const YAWS = [0, 90, 180, 270];

const sha256 = value => createHash('sha256').update(value).digest('hex');
const safeName = value => value.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'root';

async function semanticReadiness(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    return !canvas || (canvas.clientWidth > 0 && canvas.clientHeight > 0);
  }, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(350);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function readRuntimeIdentity(page) {
  return page.evaluate(() => {
    const metaRev = document.querySelector('meta[name="prometeo-rev"]')?.content || null;
    const hook = globalThis.__PROMETEO_VISUAL_QA__ || globalThis.PROMETEO_VISUAL_QA || null;
    let observed = null;
    try {
      if (hook && typeof hook.getCamera === 'function') observed = hook.getCamera();
      else if (hook && hook.camera) observed = hook.camera;
    } catch {}
    return {
      title: document.title,
      meta_prometeo_rev: metaRev,
      camera_observed: observed,
      monitor_schema: globalThis.PROMETEO_MONITOR_DATA?.schema || null,
      monitor_generated_at: globalThis.PROMETEO_MONITOR_DATA?.generated_at || null,
      monitor_seen_at: globalThis.PROMETEO_MONITOR_AT || null
    };
  });
}

async function setYaw(page, degrees) {
  const hookResult = await page.evaluate(async deg => {
    const hook = globalThis.__PROMETEO_VISUAL_QA__ || globalThis.PROMETEO_VISUAL_QA || null;
    if (!hook || typeof hook.setYaw !== 'function') return { used: false, observed: null };
    await hook.setYaw((deg * Math.PI) / 180);
    let observed = null;
    try {
      if (typeof hook.getCamera === 'function') observed = hook.getCamera();
      else if (hook.camera) observed = hook.camera;
    } catch {}
    return { used: true, observed };
  }, degrees).catch(() => ({ used: false, observed: null }));

  if (hookResult.used) {
    await page.waitForTimeout(250);
    return { method: 'qa_hook', observed: hookResult.observed, confidence: hookResult.observed ? 'OBSERVED' : 'TARGETED' };
  }

  if (degrees !== 0) {
    const box = await page.locator('canvas').first().boundingBox().catch(() => null);
    if (box) {
      const x = box.x + box.width * 0.5;
      const y = box.y + box.height * 0.5;
      const travel = Math.max(40, Math.min(box.width * 0.42, (degrees / 270) * box.width * 0.42));
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + travel, y, { steps: 24 });
      await page.mouse.up();
      await page.waitForTimeout(250);
      return { method: 'pointer_drag_target', observed: null, confidence: 'TARGETED' };
    }
  }

  return { method: degrees === 0 ? 'initial_view' : 'unsupported', observed: null, confidence: degrees === 0 ? 'INITIAL' : 'UNVERIFIED' };
}

const browser = await chromium.launch({ headless: true });
const runStartedAt = new Date().toISOString();
const frames = [];
let hardFailures = 0;

try {
  for (const route of ROUTES) {
    const resolved = new URL(route, BASE_URL).toString();

    for (const viewport of VIEWPORTS) {
      for (const yaw of YAWS) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 1,
          isMobile: Boolean(viewport.isMobile),
          hasTouch: Boolean(viewport.hasTouch)
        });
        const page = await context.newPage();
        const consoleErrors = [];
        page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
        page.on('pageerror', err => consoleErrors.push(String(err)));

        const response = await page.goto(resolved, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await semanticReadiness(page);
        const camera = await setYaw(page, yaw);
        const identity = await readRuntimeIdentity(page);
        const html = await page.content();
        const servedUrl = page.url();
        const status = response?.status() ?? null;
        const bodyBox = await page.locator('body').boundingBox().catch(() => null);
        const overflow = await page.evaluate(() => ({
          horizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          vertical: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          clientWidth: document.documentElement.clientWidth,
          clientHeight: document.documentElement.clientHeight
        }));

        const stem = [safeName(route), viewport.key, 'yaw-' + String(yaw).padStart(3, '0')].join('__');
        const dir = path.join(OUT_DIR, safeName(SOURCE_COMMIT), MODE.toLowerCase());
        await mkdir(dir, { recursive: true });
        const pngPath = path.join(dir, stem + '.png');
        const png = await page.screenshot({ path: pngPath, fullPage: false });
        const pngSha = sha256(png);

        const frame = {
          evidence_schema: 'prometeo.visual_qa.frame/v1',
          route_requested: route,
          route_resolved: resolved,
          route_observed: servedUrl,
          source_commit: SOURCE_COMMIT,
          served_content_sha256: sha256(html),
          png_sha256: pngSha,
          http_status: status,
          viewport: { name: viewport.key, width: viewport.width, height: viewport.height, dpr: 1 },
          camera_requested: { yaw_degrees: yaw },
          camera_observed: camera.observed,
          camera_evidence: camera.confidence,
          camera_method: camera.method,
          mode: MODE,
          build_rev: identity.meta_prometeo_rev,
          monitor_schema: identity.monitor_schema,
          monitor_generated_at: identity.monitor_generated_at,
          monitor_seen_at: identity.monitor_seen_at,
          body_box: bodyBox,
          overflow,
          console_errors: consoleErrors,
          captured_at: new Date().toISOString(),
          png: path.basename(pngPath)
        };

        if (!status || status >= 400 || !png.length) hardFailures++;
        await writeFile(pngPath + '.json', JSON.stringify(frame, null, 2) + '\n');
        frames.push(frame);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

const manifest = {
  evidence_schema: 'prometeo.visual_qa.bundle/v1',
  source_commit: SOURCE_COMMIT,
  base_url: BASE_URL,
  mode: MODE,
  routes: ROUTES,
  matrix: { viewports: VIEWPORTS.map(({ key, width, height }) => ({ key, width, height })), yaw_degrees: YAWS },
  started_at: runStartedAt,
  finished_at: new Date().toISOString(),
  frame_count: frames.length,
  expected_frame_count: ROUTES.length * VIEWPORTS.length * YAWS.length,
  hard_failures: hardFailures,
  provenance_note: 'source_commit, served_content_sha256 and build_rev are distinct identities; TARGETED yaw is not claimed as observed yaw.',
  frames
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ state: hardFailures ? 'FAIL' : 'CAPTURED', frames: frames.length, output: OUT_DIR, hardFailures }));
if (hardFailures) process.exitCode = 1;
