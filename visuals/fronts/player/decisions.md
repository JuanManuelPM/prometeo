# 🖐️ Retro Player / Generated Hand Atlas · Durable Decisions

Status: CURRENT

- The Player hand is one visual actor, not a bag of unrelated hand symbols.
- Prefer a designed/generated photographic hand family over scraped icon/SVG mixtures.
- Use an atlas vocabulary: one row = one action, left-to-right columns = temporal progression.
- Planned atlas actions remain: IDLE, REACH, GRAB, POINT, PUSH, ATTACK, OFFER, INSPECT, PANIC, WEIRD.
- The corrected generated source atlas is 1280x1280: every source cell is **128x128**, not 96x96.
- Every source frame must preserve the complete hand silhouette with safe internal padding. Grid-edge cropping is a production failure, not a stylistic choice.
- V7 is a broken/rejected implementation: wrong production atlas binary + wrong 96px crop math produced no visible hand in the user's published-page screenshot.
- V8 production uses 1280x128 row strips for currently active actions: IDLE, GRAB, PUSH, INSPECT, WEIRD.
- V8 converts the dark neutral strip background to alpha once at load time, using luminance/chroma keying, then renders with normal `source-over`.
- Do not restore `screen` compositing as a way to hide bad source backgrounds.
- If runtime keying destroys important dark hand detail, produce authored alpha assets instead.
- Abrupt collage-like cuts remain allowed, but they must describe coherent physical progression.
- Persistent scene consequences remain part of the Player baseline.
- `hand-sequences-v1.js` and the V7 v2 atlas path are legacy; neither is the primary foreground source.

## Session lifecycle
- Reincarnation session reads handoff + repo and WAITs for feedback.
- No implementation until user says ACTUALIZÁ or an unambiguous equivalent.
- Update session must persist all meaningful new decisions before final delivery.
- Accepted baseline may not be silently overwritten by an unreviewed candidate.
