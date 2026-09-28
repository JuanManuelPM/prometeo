# 🖐️ Retro Player / Eye Frame · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- persistent scene/state
- 320x180 internal Player resolution
- touch
- cheap audio/vibration
- image-first foreground
- exactly one lower-right player hand
- carried pet has no human hands
- eye content and eye frame remain conceptually separate when reintegration eventually happens

## LATEST USER REVIEW
The previous eye implementation was still wrong because the visual frames were badly cropped/aligned. The user explicitly simplified the task before any further Player integration:

- stop trying to support many eye-frame animations;
- build **one blink only**;
- use the newly generated **2 × 5 grid** with ten chronological blink frames;
- preserve the black/white design;
- first validate it on a page containing only the eye frame;
- every touch should replay the same blink;
- do not add pupil or other eye-content behavior in this isolation lab.

## EYE BLINK LAB · CURRENT
Public:
https://juanmanuelpm.github.io/prometeo/visuals/eye-frame-lab/

Implementation:
- `visuals/eye-frame-lab/index.html`
- `visuals/eye-frame-lab/eye-blink-grid-v3.webp`

### What changed after the cropping failures
- The new source was generated as a simple 2 × 5 grid, not a dense 10 × 10 atlas.
- The **entire generated grid is resized as one image** to exactly 640 × 256.
- It is therefore exactly **5 columns × 2 rows of 128 × 128 cells**.
- Runtime frame extraction uses those fixed grid cells directly.
- There is **no content-aware trimming**, alpha-keying, bounding-box recrop, or attempt to reconstruct missing edges.
- Frame order is simply top-left → top-right, then bottom-left → bottom-right.
- One pointer handler is used; the old pointerdown + touchstart duplication is removed.
- Every touch plays the same ten-frame blink and returns to frame 0.
- No CSS squint/stretch/twitch fake animations remain.
- No pupil exists in this lab.

## WHY V12 IS NOT ACCEPTED
V12's conceptual layering was reasonable, but the user rejected what was actually visible because the eye imagery/cropping was wrong. Do not use the fact that the asset had a verified Git SHA as evidence that its **visual crop** was correct. Byte integrity and visual correctness are different things, a distinction humanity apparently needed a few attempts to rediscover.

## NEXT
- Review the standalone blink only.
- If accepted, then derive the Player eye frame from this exact fixed-cell source.
- Only after that restore the separate pupil/eyeball layer behind it.
- Do not expand the animation vocabulary before the blink itself is accepted.

## REJECTED / DO NOT REVIVE
- dense 10x10 eye atlas as production source
- per-frame content trimming
- wrong cell geometry
- using binary verification as a substitute for visual geometry verification
- multiple fake eye-frame gestures made from scaling/twitch transforms
- duplicate pointer + touch handlers
- reintegrating into Player before the isolated blink is visually approved
