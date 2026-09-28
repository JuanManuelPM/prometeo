# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## v34 · visual review infrastructure

v33 scene visuals remain the current visual direction. v34 changes how future visual iterations are verified.

### Deterministic review mode
Spaces supports:
`?review=1&map=<1|3|4|5>&x=<number>&z=<number>&t=<ms>`

Review mode rules:
- hide selector, movement controls, hint, tag and loading UI;
- select an explicit internal map id;
- pin camera X/Z;
- freeze animation time to `t`;
- pre-stabilize Map 5 sign state;
- expose `window.PrometeoSpacesReview.ready`.

The same URL must render the same composition closely enough for screenshot comparison.

### GitHub capture workflow
Canonical workflow:
`.github/workflows/spaces-visual-review.yml`

Use `browser-actions/setup-chrome` + headless Chrome against the exact checked-out source.
Do not add Playwright/npm merely for screenshot capture unless Chrome CLI becomes insufficient.

Capture set:
- ARCOS desktop/mobile;
- CALZADA desktop/mobile;
- TÚNEL desktop/mobile;
- TORRES desktop at entry/mid/near;
- TORRES mobile.

### Published review evidence
Canonical surfaces:
- `visuals/review/spaces/index.html` = contact sheet;
- `visuals/review/spaces/latest.json` = generated capture manifest;
- `visuals/review/spaces/latest/*.png` = generated screenshots;
- `visuals/fronts/spaces/current-review.json` = small durable pointer for future reincarnation.

The workflow commits evidence to main and mirrors review evidence to gh-pages.

### Acceptance rule
A visual change is not visually accepted merely because:
- JS parses;
- a commit exists;
- main and gh-pages match;
- numeric geometry is correct.

Before declaring completion, inspect generated screenshots for:
- composition;
- scale;
- clipping;
- contrast;
- depth;
- integration of moving/attached elements.

For TORRES always inspect more than one camera depth.

### Accepted references
v34 deliberately leaves `accepted_reference=null`.
Do not invent an accepted baseline. A future human-approved screenshot may be promoted explicitly and used for image-diff/reference comparison.

## Preserve scene decisions from v33
- visible scenes: ARCOS / CALZADA / TÚNEL / TORRES;
- ARCOS current look;
- CALZADA current look;
- TÚNEL v32 layered stone and depth;
- TORRES .36 full-width hairline path;
- TORRES tower gap 3.00 and radius 3.20;
- sparse neon architecture;
- dark industrial void;
- bridge-last occlusion;
- max two deployable signs.


## v34 review execution architecture · CURRENT

The initial idea of capturing directly from every `main` push is superseded for Spaces.

Reason:
- this repository has a very large global Actions workload;
- a main-branch trigger competes with unrelated workflow storms;
- visual review should be isolated and cheap.

Current trigger:
- dedicated branch: `visual-review-spaces`;
- after publishing a Spaces visual source commit, advance that branch ref to the exact source commit;
- only the Spaces review workflow listens to this branch;
- evidence is then published back to `main` and `gh-pages`.

Current capture implementation:
- one headless Chromium process;
- Chrome DevTools Protocol controls all 10 screenshots;
- browser cache/session reused across captures;
- deterministic map / camera / animation query;
- no npm/Playwright dependency for capture itself;
- workflow artifact retained for 30 days;
- stable PNGs + latest.json + current-review.json published.

Verified run:
- run id `36496687583`;
- source `6cbba21e6057f678a828fe40d957311a0b666620`;
- SUCCESS;
- roughly 42 seconds end-to-end.

The earlier multiple-Chromium-process capture path is superseded because it took about 168 seconds and could time out on the last mobile screenshot.

### Review-before-delivery law

For Spaces visual edits, a fresh incarnation should prefer:
`handoff -> current-review.json -> generated screenshots -> HTML/code`.

If the screenshot evidence exposes an obvious visual failure, do not call the iteration done merely because code and publication checks passed.
