# 🖐️ Retro Player / Generated Hand Atlas · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- persistent scene/state
- low internal resolution
- touch
- cheap audio/vibration
- image-first foreground
- one coherent scene rather than disconnected demos
- one coherent generated photographic hand identity

## OPEN / NEXT REVIEW
- Verify V8 in the actual published Player: a hand must be visibly present during IDLE immediately after the row asset loads.
- Judge the current 125ms IDLE / 90ms action cadence by motion, not by isolated frames.
- Tune scale and placement only if the visible hand is too small/large after the rendering bug is confirmed fixed.
- Current V8 keys the dark row-strip background into alpha once at load time. If this damages important dark hand detail, replace it with authored alpha assets.
- Future actions can consume the remaining planned atlas rows only after the core hand loop reads correctly.

## LATEST USER DIRECTION
- V6 looked horrible compared with the intended result.
- The main failure was conceptual: unrelated Wikimedia SVGs/cursors/ornaments were being swapped quickly and called animation.
- Generate the hand ourselves so identity, lighting, texture and pose vocabulary are controlled.
- Build a 10x10 library where each row is an action and each column is temporal progression.
- A first generated grid exposed another production error: some hands collided with frame edges and would be unusable when cropped.
- Corrected rule: each frame needs visible internal padding; fingertips, knuckles, wrist and forearm must remain fully contained.
- The corrected generated atlas became the intended source.

## OBSERVED V7 FAILURE
- User supplied a screenshot of the published V7 and explicitly reported: "no veo las manos".
- This was not a subjective styling complaint: the hand layer was effectively absent.
- Diagnosis found two concrete implementation errors:
  - the repository contained the wrong production atlas binary rather than the corrected 1280x1280 generated source;
  - the manifest/render path assumed 96px cells even though the real corrected 10x10 atlas uses 128px cells.
- V7 therefore cannot be treated as a visually reviewable success.

## V8 CORRECTION
- Production now uses row strips derived from the real corrected 1280x1280 atlas.
- Every frame crop is 128x128.
- Current required rows are IDLE, GRAB, PUSH, INSPECT and WEIRD.
- The dark neutral strip background is converted into alpha on load using luminance/chroma keying.
- Rendering uses normal source-over compositing; the old screen-compositing workaround is removed.
- V8 preserves persistent scene consequences, touch, 320x180 resolution, audio/vibration and mask/heart scene logic.

## REJECTED / DO NOT REVIVE
- One nearly invisible dark hand.
- Two/four static poses treated as a finished animation.
- Primitive-drawn hands.
- Unrelated Wikimedia hand SVGs, cursor icons and typographic pointing hands used as the main animation actor.
- Rapid image replacement used as a substitute for coherent physical motion.
- Atlas frames whose hand silhouette touches or crosses the source cell boundary.
- V7 wrong-binary + 96px-cell implementation that produced no visible hand.
- Screen compositing as a substitute for a usable transparent foreground hand.
