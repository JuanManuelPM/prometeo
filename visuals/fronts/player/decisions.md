# 🖐️ Retro Player / Self Hand + Carried Pet · Durable Decisions

Status: CURRENT

- Every hand animation has explicit **actor ownership**.
- `PLAYER_HAND` means our first-person hand:
  - enters from a screen edge, currently lower-right;
  - wrist continues beyond the camera frame;
  - points/reaches into the world;
  - must not default to a centered palm facing the viewer.
- `FRONT_ACTOR_HANDS` means a different actor located in front of us:
  - palm-forward / camera-facing poses can live here;
  - these frames are never silently mixed into PLAYER_HAND.
- V9 uses a curated subset of the generated INSPECT row for PLAYER_HAND because its middle frames read side/back rather than palm-forward.
- The old generated atlas remains useful as source material, but **role beats quantity**: a technically valid frame is rejected if its camera ownership is wrong.
- The foreground mask/heart is now a **carried pet**, not a passive relic.
- The pet is image-first and built from existing approved assets: mask head + heart body.
- The pet owns its own animation language: breathing/bobbing idle and recoil/heartbeat response.
- Player interaction is currently PET: the self hand approaches from lower-right, touches/pets the creature, then returns.
- Persistent state is now pet bond/evolution level; old scene state is migrated.
- Keep 320x180, touch, cheap audio/vibration and persistent state.
- Do not reintroduce generic HUD cards or procedural body parts.

## Session lifecycle
- Reincarnation session reads handoff + repo and waits for feedback.
- No implementation until user says ACTUALIZÁ or equivalent.
- Update session persists meaningful feedback and versions before delivery.
