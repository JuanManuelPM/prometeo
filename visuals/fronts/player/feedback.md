# 🖐️ Retro Player / One Hand + Eye Pet · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- persistent scene/state
- 320x180 internal resolution
- touch
- cheap audio/vibration
- image-first foreground
- one coherent scene
- one coherent generated photographic hand identity
- exactly one lower-right player hand
- carried pet has no human hands

## LATEST USER DIRECTION
- Apply the newly generated retro black/white eye-frame animation to the Player page.
- Add a pupil **behind** that image.
- The eye-frame animation and the eyeball/pupil are separate layers.
- The frame itself is hollow/transparent through the center.
- Do not confuse pupil/look direction with frame/eyelid animation.

## V12 IMPLEMENTATION
- The old mask face remains removed from current runtime.
- The pet body remains the heart asset.
- The pet face is the generated monochrome eye-frame sprite.
- Production currently consumes only the BLINK row from the generated 10x10 grid.
- Correct production strip: `visuals/player-lab/player-eye-blink-v2.webp`.
- Strip geometry: 640x64, ten 64x64 frames.
- Exact production blob SHA: `326ca3ed8f714daddefa970ac13eac22091a1f2e`.
- That SHA was verified against the locally derived source bytes before publishing.
- Layer order is explicit:
  1. eyeball/sclera;
  2. dark pupil + tiny highlight;
  3. generated eye-frame/liner sprite.
- Eye contents are clipped by an aperture whose height follows blink openness, so the pupil is physically hidden as the lids close rather than merely floating through the frame.
- Automatic blink cadence remains sparse: roughly one blink every 2.3–5.3 seconds.
- PET forces one blink/recoil.
- One lower-right player hand and its minimal PET sequence are preserved.

## TRANSIENT V11 FAILURE
- A first V11 publication used an incorrectly transported eye WebP binary.
- The code/layering idea was valid, but that binary could not be trusted as the generated source.
- V12 supersedes it with a smaller lossless WebP whose Git blob SHA was verified exactly before publication.
- Do not revive `player-eye-blink-v1.webp`.

## OPEN / NEXT REVIEW
- Confirm the pupil visually reads behind the frame.
- Confirm the blink closes without pupil leakage.
- Confirm the monochrome frame has enough contrast over the room.
- Confirm the pet still feels simple rather than over-animated.
- Do not activate more grid rows until the BLINK layer is accepted.

## REJECTED / DO NOT REVIVE
- nearly invisible dark hand
- static pose collection treated as finished animation
- unrelated Wikimedia/icon hand actor
- random rapid pose replacement
- mixed camera ownership
- right/left hand alternation
- human hands belonging to the carried pet
- large action vocabularies before the basic scene language works
- baking pupil/look-around behavior into the eyelid/frame sprite
- `player-eye-blink-v1.webp` from transient V11 binary transport
