# Visual QA harness

This directory is an isolated Playwright capture harness for rendered Prometeo surfaces. It does not modify the Coliseo and it does not treat a successful screenshot command as a visual PASS.

## Evidence contract

The default smoke matrix is 12 frames per route:

- desktop 1440×900
- TV 1920×1080
- mobile portrait 390×844
- yaw targets 0°, 90°, 180°, 270°

Every PNG has a sibling `.png.json` sidecar. The aggregate `visual-qa-artifacts/manifest.json` records route, source commit, served HTML hash, viewport, requested yaw, observed camera state when a QA hook exists, `prometeo-rev`, monitor metadata, timestamp and PNG SHA-256.

`source_commit`, served bytes and `prometeo-rev` are deliberately separate. GitHub Pages may still be serving a different revision while a workflow runs. If the renderer does not expose an observable camera hook, fallback pointer drags are labeled `TARGETED`, never `OBSERVED`.

## Run locally

Install the pinned dependency used by CI and Chromium:

```bash
npm install --no-save --ignore-scripts playwright@1.55.0
npx playwright install chromium
VISUAL_QA_ROUTES="demos/coliseo-3d/" \
VISUAL_QA_SOURCE_COMMIT="$(git rev-parse HEAD)" \
node scripts/visual-qa/capture.mjs
```

Multiple routes, including isolated labs, are comma-separated:

```bash
VISUAL_QA_ROUTES="demos/coliseo-3d/,demos/example-lab/" node scripts/visual-qa/capture.mjs
```

The default mode is `LIVE_TRUTH`. Set `VISUAL_QA_MODE=DETERMINISTIC_REGRESSION` only when the target route itself supplies a deterministic fixture, fixed time/seed and stable camera contract. This harness does not pretend live telemetry is a golden baseline.

## Optional camera hook

A route may expose `globalThis.__PROMETEO_VISUAL_QA__` with:

```js
{
  async setYaw(radians) {},
  getCamera() { return { yaw, zoom }; }
}
```

When absent, the runner uses pointer-drag targets where a canvas exists and marks yaw evidence as `TARGETED`. The harness never upgrades that to an observed angle.

## CI artifact

`.github/workflows/visual-qa.yml` installs pinned Playwright + Chromium, captures the matrix, performs syntax/provenance checks, and uploads `visual-qa-artifacts/` as a GitHub Actions artifact even if capture fails. A later independent visual critic must receive the PNG bytes as actual images before it can issue visual PASS/FAIL.
