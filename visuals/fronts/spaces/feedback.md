# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v34 · DETERMINISTIC SCREENSHOT REVIEW PIPELINE

v33 visual direction is preserved. v34 changes the review process so obvious visual failures can be caught from real screenshots before another human iteration.

## LAB REVIEW MODE
Spaces now accepts deterministic query parameters:

`?review=1&map=<1|3|4|5>&x=<number>&z=<number>&t=<ms>`

When review mode is active:
- map/camera are fixed from the URL;
- animation clock is frozen to `t`;
- UI/HUD controls are hidden;
- Map 5 sign state is pre-set deterministically;
- `window.PrometeoSpacesReview.ready` exposes material readiness.

This makes screenshots comparable across commits instead of depending on manual navigation and random animation timing.

## GITHUB AUTOMATION
Workflow:
`.github/workflows/spaces-visual-review.yml`

Trigger:
- any push changing `visuals/spaces-lab/**`;
- workflow changes;
- manual dispatch.

It:
1. serves the exact main checkout locally;
2. uses headless Chrome already available through `browser-actions/setup-chrome`;
3. captures deterministic PNG evidence;
4. uploads the exact evidence as a 30-day workflow artifact;
5. commits stable latest screenshots + manifest to main;
6. syncs the review evidence to gh-pages.

No Playwright/npm install is required for this capture path, deliberately reducing CI overhead.

## CAPTURE SET
Desktop:
- ARCOS
- CALZADA
- TÚNEL
- TORRES entry
- TORRES middle
- TORRES near

Mobile:
- ARCOS
- CALZADA
- TÚNEL
- TORRES

The extra three TORRES distances exist because one screenshot can hide bad scale, clipping, signage or perspective.

## REVIEW SURFACES
- contact sheet:
  https://juanmanuelpm.github.io/prometeo/visuals/review/spaces/
- generated manifest:
  `visuals/review/spaces/latest.json`
- durable pointer:
  `visuals/fronts/spaces/current-review.json`

A future chat can read HTML + handoff + current-review, download the public PNGs, inspect them visually, and only then decide whether a visual iteration is credible.

## REVIEW RULE
Do not call a Spaces visual change complete from:
- JS syntax;
- commit SHA;
- main/gh-pages equality;
- numeric geometry alone.

Before visual acceptance inspect generated screenshots for:
- composition;
- scale;
- clipping;
- contrast;
- depth;
- element integration.

## SELF-CRITIQUE / CURRENT LIMIT
v34 automates capture/publication, not aesthetic judgment inside GitHub Actions. The AI visual critique still happens in the reviewing chat by loading the generated PNGs. Accepted-reference promotion and automated image-diff remain a future optional layer.
