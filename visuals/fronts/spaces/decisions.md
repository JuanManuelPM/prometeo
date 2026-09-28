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
