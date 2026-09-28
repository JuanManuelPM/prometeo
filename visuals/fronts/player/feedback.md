# 🖐️ Player / Eye Frame · Durable Feedback

Status: CURRENT

## Latest user feedback
The user reviewed V21 as **"excelente, muchísimo mejor"** and said the project can now move on to the actual eye.

This is the first positive acceptance after the sequence of crop, jitter, black-screen, gray-state and transport failures.

Interpretation:
- V21 blink animation is accepted as the baseline.
- Do not redesign the blink pipeline again without new evidence.
- The next work is the eyeball/pupil layer behind the already-stable frame animation.

## Why V21 finally worked

The previous architecture mixed:
- generated grids as runtime assets;
- crop/alignment concerns with rendering;
- hard-coded atlas geometry;
- binary image transport through fragile paths;
- chained delays;
- transport checks being confused with visual QA.

V21 separates responsibilities.

Pipeline:
**AUTHORING → SPLIT → MASK → MEASURE → SEMANTIC ANCHOR → NORMALIZE → RESIDUAL QA → VISUAL QA → INDEXED/RLE PACK → RUNTIME**

Alignment:
- semantic anchor: lower white liner median + horizontal center;
- normalization canvas: 512×512;
- translation only;
- residual alignment correction;
- max measured anchor jitter: 1 px;
- tolerance: 3 px;
- QA PASS.

Runtime:
- one text JSON pack;
- fixed logical frame canvas: 128×128;
- indexed black/white + alpha palette;
- RLE byte pairs transported as base64 text;
- per-frame byte length and SHA-256;
- whole-pack validation before first draw;
- frames decoded once to offscreen canvases;
- timings live in data;
- animation uses performance.now() + requestAnimationFrame;
- renderer knows no atlas rows/columns/crops/frame count/timing constants.

## Permanent documentation
The complete reusable explanation is stored in:
`visuals/eye-frame-lab/ANIMATION_PIPELINE_V1.md`

Use it for future eyes, hands, masks, creatures and generated animation grids.

## Next
Preserve V21 blink.

Build the actual eye contents as a separate subsystem behind the frame:
- sclera / eyeball;
- iris/pupil if desired;
- its own pivot/coordinate space;
- independent movement;
- eyelid/frame stays above it.

Do not let pupil motion modify frame alignment.
