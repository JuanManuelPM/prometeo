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
- eye content and eye frame remain separate when reintegration eventually happens

## LATEST USER REVIEW
The V13 isolation lab failed visibly: the page appeared completely black and the eye could not be seen.

This is now a hard rejection. Do not reinterpret it as a contrast preference or browser cache issue. The next implementation had to prove visibility first.

## EYE BLINK LAB · V14 CURRENT
Public:
https://juanmanuelpm.github.io/prometeo/visuals/eye-frame-lab/

Current files:
- `visuals/eye-frame-lab/index.html`
- `visuals/eye-frame-lab/eye-blink-grid-v4.webp`

### V14 corrections
- Re-exported the newly generated 2×5 blink grid into a fresh compact WebP.
- Current sprite blob: `edd5a75c63a0dbd8f2a2bc210b63fc0a6da490af`.
- The sprite is exactly 5 columns × 2 rows with ten equal 48×48 cells.
- Runtime uses those cells directly in chronological order 0→9.
- No per-frame trimming, bounding boxes, alpha-keying or inferred crop.
- Page background is intentionally mid-gray with a darker vignette so both the black eye frame and white lower liner remain visible during review.
- Initial frame is drawn immediately after the sprite loads.
- If the sprite fails to load, the page now shows a visible `ERROR CARGANDO OJO` message instead of silently becoming black.
- One pointer handler only.
- One animation only: blink.
- No pupil, no squint, no twitch, no synthetic scaling animation.

## REJECTED HISTORY
- V12: eye crop/alignment visually rejected.
- V13: isolation lab rendered effectively all black for the user and is rejected.
- Binary/hash verification alone is not proof of visible correctness.

## NEXT
- Review only whether V14 is visible and whether the blink itself reads correctly.
- Do not reintegrate into Player before that.
