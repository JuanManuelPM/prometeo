# 🖐️ Retro Player / Generated Hand Atlas · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- persistent scene/state
- low internal resolution
- touch
- cheap audio/vibration
- image-first foreground
- one coherent scene rather than disconnected demos

## OPEN / NEXT REVIEW
- Review V7 in the actual published Player: the new generated hand must read as one recurring actor, not merely a nicer pose catalog.
- Tune cadence, foreground scale and compositing after seeing the real animation in motion.
- The production atlas must keep every full hand silhouette inside its cell with safe margins.
- If dark source-cell rectangles become visible despite screen compositing, derive a cleaner alpha atlas rather than hiding the defect with more filters.
- Future actions can consume the remaining atlas rows (REACH, POINT, ATTACK, OFFER, PANIC) after the core motion reads correctly.

## LATEST USER DIRECTION
- V6 looked horrible compared with the intended result.
- The main failure was conceptual: unrelated Wikimedia SVGs/cursors/ornaments were being swapped quickly and called animation.
- Generate the hand ourselves so identity, lighting, texture and pose vocabulary are controlled.
- Build a 10x10 library where each row is an action and each column is temporal progression.
- A first generated grid exposed another production error: some hands collided with frame edges and would be unusable when cropped.
- Corrected rule: each frame needs visible internal padding; fingertips, knuckles, wrist and forearm must remain fully contained.
- The corrected generated atlas is the source requested for the current update.

## REJECTED / DO NOT REVIVE
- One nearly invisible dark hand.
- Two/four static poses treated as a finished animation.
- Primitive-drawn hands.
- Unrelated Wikimedia hand SVGs, cursor icons and typographic pointing hands used as the main animation actor.
- Rapid image replacement used as a substitute for coherent physical motion.
- Atlas frames whose hand silhouette touches or crosses the source cell boundary.
