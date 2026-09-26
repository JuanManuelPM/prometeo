# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Interaction invariants
- **Movement is forward/backward only.**
- Camera view is fixed frontal.
- Do not reintroduce yaw, side-look or strafe unless the user explicitly asks again.
- Continuous ground under/around the camera is invariant.
- No fake/inverted fisheye.

## Map 1 · Green Nave
- One continuous interior mass, not stacked picture frames.
- Target mechanism: **very tall nave + repeated open arches + diagonal/chamfered side transitions + textured side envelope + floor-led depth + central/upper darkness**.
- Arches dominate the rhythm; repeated square columns do not.
- The near-player zone stays vertically open.
- The upper volume may disappear into darkness instead of showing a literal roof.
- Do not leave an ambiguous flat far wall / fake ceiling.
- Side walls may be dark but cannot become accidental black voids.
- Near ribs persist until natural near-plane clipping; never recycle/cull them while still visible.

## Map 2 · Brutalist Cylinders
- Separate second map with its own dominant spatial idea.
- Huge cylindrical pillars must extend beyond the top of frame / lose their tops in darkness.
- Cylinder geometry must read round, not as square posts.
- Strong foreground checker floor progressively darkens toward distance.
- Dark space between pillars is allowed and useful when it communicates enormous scale.
- Map 2 is a monumental hall / forest of columns, not another arch corridor.

## Durable design guardrails
1. The place must read before the rendering trick.
2. Mass, silhouette, height and depth come before texture detail.
3. One dominant spatial mechanism per map.
4. Do not show the entire height of something when cropping/occlusion makes it feel larger.
5. Near-camera architecture should not feel like a lid unless intentionally claustrophobic.
6. Darkness must read as designed depth/shadow, never an unfinished gap.
7. Repetition creates rhythm, not evidence of module boundaries.
8. A visible object is never culled merely because it crossed an arbitrary recycler threshold.
9. Keep old modules until they are safely behind/out of view; prefer over-retention to popping.
10. Floor perspective must pull into depth and may lose contrast with distance.
11. Walls/floor/upper volume can differ, but must belong to one material world.
12. Avoid dominant square/post/card/frame readings unless explicitly requested.
13. Architectural scale must be felt in a screenshot, not only encoded in numeric dimensions.
14. The scene must still read on portrait mobile.
15. A fix is rejected if it creates a new equally dominant defect.

## Session lifecycle
- Reincarnation session reads handoff + repo and WAITs for feedback.
- No implementation until user says ACTUALIZÁ or an unambiguous equivalent.
- Update session persists meaningful new decisions before delivery.
- Accepted baseline may not be silently overwritten by an unreviewed candidate.
