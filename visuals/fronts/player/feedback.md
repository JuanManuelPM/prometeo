# 🖐️ Retro Player / Eye Frame · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- persistent Player scene/state
- 320x180 internal Player resolution
- touch
- cheap audio/vibration
- image-first foreground
- exactly one lower-right player hand
- carried pet has no human hands
- eye contents and eye frame remain separate when reintegration eventually happens

## LATEST USER DIRECTION
After repeated crop/alignment failures, the user asked for a reusable preparation pipeline that works **before** animation:
1. split the grid;
2. detect the visible content;
3. measure frames;
4. choose an anchor appropriate to the asset;
5. align every frame to a common target;
6. verify the normalized frames;
7. only then animate/export.

The user then explicitly asked to run this locally first, confirm readiness, and only publish after approval to update GitHub.

## V15 · CURRENT EYE ISOLATION LAB
Public:
https://juanmanuelpm.github.io/prometeo/visuals/eye-frame-lab/

Files:
- `visuals/eye-frame-lab/index.html`
- `visuals/eye-frame-lab/eye-blink-aligned-grid-v15.jpg`
- `visuals/eye-frame-lab/normalization-manifest.json`
- `visuals/eye-frame-lab/NORMALIZATION_PROTOCOL.md`
- `visuals/eye-frame-lab/tools/sprite_prepare.py`

### What V15 does differently
- The source grid was processed locally **before** runtime integration.
- Frames were segmented first; runtime no longer tries to repair geometry.
- Each frame was measured for bbox, centroid and semantic anchor candidates.
- For this eye, the chosen semantic anchor is the **median of the bright lower liner** plus horizontal center.
- Each frame was translated into a fixed 512×512 transparent canvas against the same target anchor.
- Frames were re-measured after placement and one residual translation correction pass was applied.
- No scale normalization was used.
- Local QA measured maximum anchor jitter of **1 px at 512×512** with a 3 px tolerance: **PASS**.
- Onion-skin and aligned-grid previews were generated locally before publication.
- Only after QA passed was the review sheet downsampled to a 5×2 sheet of 128×128 cells.
- The public page simply plays those already-normalized frames; it does not crop, align or deform them at runtime.

## REUSABLE RULE
Do not animate a raw generated grid directly.

Preparation must be:
**SPLIT → MASK → MEASURE → ANCHOR → NORMALIZE → RESIDUAL QA → VISUAL QA → EXPORT → ANIMATE**

Anchor strategies:
- simple symbols: bbox center;
- blobs: alpha centroid;
- eyes: lower liner / eye corners;
- hands: wrist or palm pivot;
- bodies: feet / hips / torso;
- faces: eye / nose landmarks.

## REJECTED HISTORY
- V12: crop/alignment visually rejected.
- V13: user saw effectively all black.
- V14: made the asset visible but did not solve inter-frame centering.
- Do not restore runtime hacks in place of asset normalization.

## NEXT
Review only whether V15 remains centered and stable through the blink. Player reintegration is still blocked on that visual review.


## V15 PUBLIC FAILURE → V16
The user opened V15 and saw a gray square plus a load error. Therefore V15 is rejected as a deployment result even though its local alignment QA passed.

This distinguishes two independent questions:
- **Geometry:** were the frames aligned correctly before export? V15 local QA said yes.
- **Delivery:** did the public browser actually receive and decode the sprite? V15 public behavior said no.

V16 keeps the same aligned frames but removes the fragile delivery path: the sprite is embedded directly in the HTML as a JPEG data URI. The runtime verifies the decoded dimensions (640×256) before drawing frame 0. No animation is enabled if that assertion fails.
