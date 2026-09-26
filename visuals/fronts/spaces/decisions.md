# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Interaction invariants
- Movement is forward/backward only.
- Camera view is fixed frontal.
- Do not reintroduce yaw, side-look or strafe unless explicitly requested.
- Continuous ground is invariant.
- No fisheye shortcut.

## Map 1 · Green Nave
- One continuous interior mass, not stacked picture frames.
- Very tall nave + repeated open arches + diagonal/chamfered side transitions + textured envelope + upper/central darkness.
- Near ribs persist until actual near-plane/out-of-view disappearance.
- No square-post corridor dominance.
- No ambiguous flat far wall / fake ceiling.

## Map 2 · Brutalist Cylinders
- Separate monumental hall of giant round columns.
- Cylinder tops/end caps should not resolve in normal framing.
- Columns deliberately extend far above the viewport; showing the full height is a failure of scale.
- Roundness must be visible through enough cylindrical side segments and shading.
- Checker floor is strongest near the player and fades with world distance.
- Dark spaces between pillars are valid when they communicate enormous scale.

## Critical depth/compositing rule
- **Never use a screen-space horizontal black band/gradient to simulate world distance when it can cross world geometry.**
- Distance fog/fade that interacts with objects or floor must be computed from world-space Z/depth.
- Distant floor sections attenuate by Z before/while they are rendered.
- Distant objects attenuate by their own Z.
- Screen-space overlays are allowed only for genuinely screen-space atmospheric effects that do not create a visible seam through geometry.
- If a line can be described as "drawn across the picture", it is probably the wrong abstraction for depth.

## Durable design guardrails
1. Place before technique.
2. Mass/silhouette/height before detail.
3. One dominant spatial mechanism per map.
4. Monumental objects may and often should extend outside the frame.
5. Darkness is designed depth/shadow, never missing geometry.
6. Repetition may never expose the recycler.
7. Visible near objects are never culled early.
8. Perspective/fog should be tied to world depth, not arbitrary screen Y.
9. Floor contrast may fall with Z, but without hard screen-space seams.
10. Do not show a cylinder endpoint merely because the geometry has one.
11. A fix is rejected if it introduces a new dominant compositing artifact.
