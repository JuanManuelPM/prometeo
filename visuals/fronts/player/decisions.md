# 🖐️ Retro Player / One Hand + Carried Pet · Durable Decisions

Status: CURRENT

- **One visible human hand only.**
- That hand is `PLAYER_HAND`, owned by the first-person player.
- It is always anchored to the **lower-right** camera edge.
- Do not alternate visual handedness or side during one animation.
- V10 only uses generated strip frames **5, 6, 7, 8**, which belong to the same lower-right family.
- Idle is one fixed frame plus tiny positional movement. Do not animate idle by cycling unrelated poses.
- The only current player action is **PET**.
- PET sequence: **8 → 7 → 6 → 5 → 6 → 7 → 8**.
- No GRAB, PUSH, POINT, ATTACK, OFFER, PANIC or WEIRD runtime until the minimal interaction is visually accepted.
- The carried foreground entity is a **pet**, not another hand actor.
- The pet has **no human hands** and never points toward the camera.
- Pet animation vocabulary is only **IDLE + REACT**.
- Preserve 320x180, image-first rendering, touch, cheap audio/vibration and persistent state.
- Prefer deleting conceptual branches over keeping unused systems around “just in case”. Humans have already invented enough drawers full of adapters.

## Session lifecycle
- Reincarnation reads handoff + repo and waits for feedback.
- No implementation until ACTUALIZÁ/equivalent.
- Update persists all meaningful feedback/version decisions before delivery.
