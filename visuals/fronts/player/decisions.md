# 🖐️ Retro Player / Eye Frame · Durable Decisions

Status: CURRENT

- The old Player eye implementation is **not visually accepted**.
- The current task is isolated eye-frame validation, not Player reintegration.
- Use the newly generated **2 × 5** blink grid only.
- The production review copy is **640 × 256**, exactly **5 × 2 cells of 128 × 128**.
- Preserve every complete cell. Do not crop around visible pixels.
- Do not use per-frame bounding boxes, alpha-keying, or inferred silhouette bounds.
- One touch = one replay of the same ten-frame blink.
- Use one pointer event path only; do not bind both `pointerdown` and `touchstart`.
- No alternate eye-frame gestures exist in the current lab.
- No pupil/eyeball exists in the current lab.
- When the blink is accepted, the pupil can later return as a separate layer behind this frame source.
- Do not mistake a matching Git blob SHA for visual correctness. It proves bytes, not composition.
- Preserve the Player baseline outside this isolated experiment.

## Session lifecycle
- Reincarnation reads handoff + repo and waits for feedback.
- No implementation until ACTUALIZÁ/equivalent.
- Update persists meaningful feedback/version decisions before delivery.
