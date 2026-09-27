# 🖐️ Retro Player / One Hand + Eye Pet · Durable Decisions

Status: CURRENT

- Exactly **one visible human hand** remains in the Player.
- The hand stays lower-right and only performs the minimal PET interaction.
- The carried entity remains a **handless pet**.
- The pet face uses the newly generated **retro black/white eye frame**.
- The eye is split into layers:
  1. **EYEBALL / PUPIL** behind.
  2. **EYE FRAME / EYELIDS / LINER** above.
- Never bake look-around/pupil movement into the frame atlas.
- The frame center remains transparent.
- Current production activates only the first row of the 10x10 generated grid: **BLINK**.
- Current verified production strip uses ten 64x64 cells in `player-eye-blink-v2.webp`.
- Exact eye strip Git blob SHA is `326ca3ed8f714daddefa970ac13eac22091a1f2e`.
- Eye contents are clipped by blink openness so the pupil disappears behind closing lids.
- Automatic blink is sparse.
- PET may force one blink as a reaction.
- Do not activate remaining eye-frame rows until basic layered-eye behavior is visually accepted.
- `player-eye-blink-v1.webp` is a broken transient asset and must not be restored.
- Preserve 320x180, persistent state, touch, cheap audio/vibration and image-first foreground.

## Session lifecycle
- Reincarnation reads handoff + repo and waits for feedback.
- No implementation until ACTUALIZÁ/equivalent.
- Update persists meaningful feedback/version decisions before delivery.
