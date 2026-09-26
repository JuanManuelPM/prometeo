# 🖐️ Retro Player / Generated Hand Atlas · Durable Decisions

Status: CURRENT

- The Player hand is one visual actor, not a bag of unrelated hand symbols.
- Prefer a designed/generated photographic hand family over scraped icon/SVG mixtures.
- Use an atlas vocabulary: one row = one action, left-to-right columns = temporal progression.
- Current atlas actions: IDLE, REACH, GRAB, POINT, PUSH, ATTACK, OFFER, INSPECT, PANIC, WEIRD.
- Every source frame must preserve the complete hand silhouette with safe internal padding. Grid-edge cropping is a production failure, not a stylistic choice.
- Abrupt collage-like cuts remain allowed, but they must describe coherent physical progression.
- Persistent scene consequences remain part of the Player baseline.
- The current renderer keeps the low-resolution 320x180 scene and uses screen compositing for the dark-background photographic atlas.
- If the source-cell background becomes visibly rectangular in the published scene, replace the production derivative with a real alpha extraction rather than masking the issue with extra effects.
- `hand-sequences-v1.js` is legacy and unused by V7; do not use it as the primary foreground source.

## Session lifecycle
- Reincarnation session reads handoff + repo and WAITs for feedback.
- No implementation until user says ACTUALIZÁ or an unambiguous equivalent.
- Update session must persist all meaningful new decisions before final delivery.
- Accepted baseline may not be silently overwritten by an unreviewed candidate.
