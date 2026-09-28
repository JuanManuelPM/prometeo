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


## v34 LIVE PROOF · FIRST AUTOMATED VISUAL AUDIT

The review pipeline was executed successfully, not merely configured.

Successful optimized run:
- workflow run: `36496687583`;
- source: `6cbba21e6057f678a828fe40d957311a0b666620`;
- result: SUCCESS;
- duration: ~42 seconds;
- 10 deterministic screenshots generated and published;
- main/gh-pages review manifest and pointer are byte-identical.

Optimization:
- capture trigger moved off noisy `main` onto dedicated branch `visual-review-spaces`;
- future visual updates trigger review by advancing that branch to the exact source commit;
- one persistent Chromium process is driven over CDP for all screenshots;
- browser/cache are reused across frames;
- this replaced the earlier multi-process capture that took ~168 seconds and could time out on the final mobile frame.

### Actual visual findings from generated screenshots

ARCOS:
- composition reads coherently;
- black floor and repeated arch depth are working;
- preserve unless explicitly changed.

CALZADA:
- current composition remains coherent with the user's liked direction;
- preserve unless explicitly changed.

TÚNEL:
- near stone is clearly readable;
- depth falls toward a dark throat as intended;
- geometry/motion direction should remain;
- future improvement target is texture character/repetition, not a structural rewrite.

TORRES:
- current scene is visibly not acceptable despite correct numeric geometry;
- the `.36` world-width bridge still projects as a large purple triangular wedge in both desktop and mobile;
- nearby towers fill too much of the frame and read as segmented cylindrical walls rather than distant colossal buildings;
- horizontal shade bands reinforce a "stacked tube" look;
- micro-lights read as isolated colored pixels rather than architectural lights;
- neon blade signs look pasted onto the surfaces instead of embedded/mounted;
- orbital cyan ring reads as a broken floating arc;
- the automated entry/mid/near captures expose these failures consistently.

This is exactly the class of problem the review system is now meant to catch before asking the user for another screenshot.

### Operational rule

For the next visual edit:
1. edit/publish Spaces;
2. advance `visual-review-spaces` to the exact source commit;
3. wait for the review run;
4. read `current-review.json`;
5. load the generated screenshots/artifact;
6. visually critique them;
7. fix obvious failures before final delivery.

Do not treat the screenshot workflow itself as aesthetic approval.
