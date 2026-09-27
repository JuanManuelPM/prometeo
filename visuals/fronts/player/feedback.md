# 🖐️ Retro Player / One Hand + Eye Pet · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- persistent scene/state
- low internal resolution
- touch
- cheap audio/vibration
- image-first foreground
- one coherent scene
- one coherent generated photographic hand identity
- exactly one player hand
- carried pet has no human hands

## LATEST USER DIRECTION
- The pet face should use the newly generated retro black/white eye-frame design.
- The eye-frame animation and the actual eyeball/pupil are separate layers.
- The frame itself must remain hollow/transparent in the middle.
- Add a pupil behind the generated frame.
- The generated 10x10 grid is the source vocabulary for future eyelid/frame animation.
- Do not confuse frame motion with pupil/look-around motion.

## V11 IMPLEMENTATION
- The old mask head is removed from the current Player runtime.
- The pet still keeps the heart body.
- The generated eye grid was normalized for production; V11 currently consumes only the first row as a 10-frame BLINK strip.
- Production eye strip: `visuals/player-lab/player-eye-blink-v1.webp`.
- Each frame is 96x96; the strip is 960x96.
- The eye frame is transparent through its center and stays monochrome black/gray/white.
- The actual eye content is rendered underneath:
  - muted pale eyeball ellipse;
  - dark pupil;
  - tiny highlight.
- The pupil/eyeball layer has its own rendering path and is not baked into the eyelid sprite.
- Blink frames also drive an openness mask so the pupil fades away as the lids close instead of unrealistically showing through.
- Automatic blink cadence is deliberately sparse: one blink every roughly 2.3–5.3 seconds.
- PET interaction forces one blink/reaction, then returns to the same minimal idle.
- The one lower-right player hand and its single PET sequence are preserved.

## SOURCE GRID
The user generated a 10x10 black/white eye-frame animation grid.
Current production intentionally uses only the first BLINK row. Other rows remain unactivated until the basic layered eye reads correctly on the actual page. This avoids repeating the previous mistake of enabling a whole animation vocabulary before the core visual language is accepted.

## OPEN / NEXT REVIEW
- Confirm the pupil sits visually behind the frame.
- Confirm the blink closes cleanly without the pupil leaking through.
- Confirm the black/white frame has enough contrast over the room.
- Confirm the pet still feels simple rather than becoming another over-animated system.
- Do not activate more eye-frame rows until V11 is reviewed.

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
- hands belonging to the carried pet
- large action vocabularies before the basic scene language works
- baking pupil/look-around behavior into the eyelid/frame sprite
