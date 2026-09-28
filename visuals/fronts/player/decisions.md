# 🖐️ Retro Player / Eye Frame · Durable Decisions

Status: CURRENT

- V13 is rejected because the user saw a completely black page.
- Current review target is V14 only.
- Use one 2×5 blink source, one animation, one pointer action.
- Current sprite geometry is 240×96 = 5×2 cells of 48×48.
- Preserve complete cells. No per-frame trimming or inferred visible bounds.
- The review background must not be black because the eye frame itself is largely black.
- The page must render frame 0 immediately after load.
- A failed asset load must be visible as an explicit error, never a silent black screen.
- No pupil or other eye-content layer in this lab.
- No alternate eye-frame gestures.
- Do not reintegrate into Player until the isolated blink is positively reviewed.
- Hash equality proves bytes, not visual acceptance.

## Session lifecycle
- Reincarnation reads handoff + repo and waits for feedback.
- No implementation until ACTUALIZÁ/equivalent.
- On update persist meaningful feedback/version decisions and verify relevant front files across main and gh-pages.
