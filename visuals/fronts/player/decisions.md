# 🖐️ Retro Player / One Hand + Eye Pet · Durable Decisions

Status: CURRENT

- Exactly **one visible human hand** remains in the Player.
- The hand stays lower-right and only performs the minimal PET interaction.
- The carried entity remains a **handless pet**.
- V11 replaces the previous mask head with the newly generated **retro black/white eye frame**.
- The eye is deliberately split into layers:
  1. **EYEBALL / PUPIL** rendered behind.
  2. **EYE FRAME / EYELIDS / LINER** rendered from the generated sprite above.
- Never bake look-around/pupil movement into the frame atlas. Those are different animation systems.
- The eye-frame center must remain transparent.
- Current production uses only the first row of the 10x10 generated grid: **BLINK**.
- BLINK uses 10 frames at 96x96 each.
- The pupil/eyeball fades with eyelid openness during blink so it cannot leak through a closed frame.
- Automatic blink is sparse rather than continuous.
- PET may force one blink as a reaction.
- Do not activate the remaining grid rows until the basic layered eye is visually accepted.
- Preserve 320x180, persistent state, touch, cheap audio/vibration and image-first foreground.

## Session lifecycle
- Reincarnation reads handoff + repo and waits for feedback.
- No implementation until ACTUALIZÁ/equivalent.
- Update persists meaningful feedback/version decisions before delivery.
