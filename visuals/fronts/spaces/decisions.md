# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Map 5 · Ritual Avenue · v19 interaction rule
- Every violet pointed spire may own one road-facing ritual sign.
- Signs are hidden below the floor by default.
- A sign only rises when the player is physically close to that individual spire.
- Proximity is evaluated independently per left/right spire.
- Use hysteresis: open below 11.2 world units, close above 13.4.
- Do not use a single threshold that can flicker while the player hovers near the boundary.
- Rise should be smooth and relatively quick.
- Retract should be smooth and slightly slower.
- The sign emerges toward the road-facing inner side, not outward away from the path.
- Do not block the central avenue.
- Signs are architectural/ritual objects, not generic web UI cards.
- Current visual treatment: gold outer frame, violet inset face, minimal geometric glyph, telescoping post.

## Preserve
- Map 5 axial striped road, orange/red sky, paired violet spires and stepped temple.
- Universal true Euclidean camera-distance lighting.
- Existing movement and mobile interaction rules.
