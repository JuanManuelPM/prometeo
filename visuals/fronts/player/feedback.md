# 🖐️ Retro Player / Self Hand + Carried Pet · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- persistent scene/state
- low internal resolution
- touch
- cheap audio/vibration
- image-first foreground
- one coherent scene rather than disconnected demos
- one coherent generated photographic hand identity

## LATEST USER DIRECTION
- The hand atlas was mixing camera roles.
- Hands/palms facing toward the viewer do not make sense as the player's default hand.
- Separate animations by actor:
  - PLAYER_HAND = our own first-person hand.
  - FRONT_ACTOR_HANDS = hands belonging to somebody/something in front of us.
- Do not use a generic hand catalog as if all frames were interchangeable.
- The object carried in front should read as a **pet**, not a passive relic/prop.

## V9 IMPLEMENTATION
- PLAYER_HAND now uses only a curated subset of the generated INSPECT row.
- PLAYER_HAND is anchored to the lower-right edge; the wrist continues off-screen and the interaction moves inward toward the pet.
- Default player animation no longer consumes the palm-forward IDLE row.
- FRONT_ACTOR_HANDS are explicitly represented as a separate disabled category in `hand-atlas-v4.js`.
- The carried mask + heart has become a living pet:
  - stable front-center placement;
  - breathing/bobbing idle;
  - mask head + heart body;
  - heartbeat scale;
  - recoil/tilt response when petted;
  - persistent bond level inherited from previous scene state.
- Touch/Space/Enter performs a PET interaction rather than cycling unrelated hand actions.

## OPEN / NEXT REVIEW
- Confirm visually that the hand reads as ours.
- Confirm the pet is legible as a small living companion and does not block the scene.
- Check whether any selected self-hand frame still feels like a hand aimed back at the camera.
- Tune pet scale/recoil and hand approach only after real page feedback.
- FRONT_ACTOR_HANDS should stay off unless a separate character/creature in front is intentionally introduced.

## REJECTED / DO NOT REVIVE
- one nearly invisible dark hand
- two/four static poses treated as finished animation
- primitive-drawn hands
- unrelated Wikimedia SVG/cursor/typographic hands as the primary actor
- rapid random image replacement as a substitute for coherent motion
- atlas frames clipped by source-cell borders
- V7 wrong binary + wrong 96px cell implementation
- screen compositing used to hide source defects
- mixing player-owned hand frames with palm-forward/front-actor hand frames
- a floating centered hand sprite with no clear camera ownership
