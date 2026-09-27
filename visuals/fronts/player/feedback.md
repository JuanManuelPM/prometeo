# 🖐️ Retro Player / One Hand + Carried Pet · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- persistent scene/state
- low internal resolution
- touch
- cheap audio/vibration
- image-first foreground
- one coherent scene
- one coherent generated photographic hand identity

## LATEST USER DIRECTION
- There are too many animations.
- Do not alternate between a right-side hand and a left-side hand.
- The player should have one clear owned hand only.
- The carried object/pet must not sprout human hands pointing back at the viewer.
- Simplify aggressively instead of maintaining extra actor/action taxonomies.

## V10 IMPLEMENTATION
- Exactly one PLAYER_HAND runtime.
- It is anchored lower-right and uses only the same-side family from the generated INSPECT strip.
- Idle is a single fixed source frame: frame 8.
- PET is the only action and uses a short same-family sequence: 8 → 7 → 6 → 5 → 6 → 7 → 8.
- No left/right alternation.
- No palm-forward endpoints.
- No FRONT_ACTOR_HANDS runtime or manifest category.
- The carried mask-heart pet has no human hands.
- The pet only has:
  - IDLE: tiny breathing/bob;
  - REACT: small recoil/tilt when touched.
- Touch/Space/Enter performs PET and returns to the same idle.
- Persistent touch count remains for continuity but does not unlock extra visual animation states.

## OPEN / NEXT REVIEW
- Confirm visually that the player hand never flips side.
- Confirm it reads as our own hand rather than somebody reaching toward us.
- Confirm the pet remains handless.
- Confirm the reduced motion feels cleaner rather than lifeless.
- Do not add GRAB / PUSH / POINT / ATTACK / PANIC / WEIRD until the minimal interaction is accepted.

## REJECTED / DO NOT REVIVE
- nearly invisible dark hand
- static pose collection treated as finished animation
- primitive-drawn hands
- unrelated Wikimedia/icon hand actor
- random rapid pose replacement
- clipped atlas frames
- V7 wrong binary / wrong cell geometry
- screen compositing used to hide source defects
- mixed camera ownership
- right/left hand alternation inside one player animation
- hands belonging to the carried pet or pointing from the pet toward the viewer
- large action vocabularies before the basic scene language works
