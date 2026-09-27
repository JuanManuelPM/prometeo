# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Universal engine rules
- Fixed frontal camera.
- W/S, wheel and vertical touch swipe move forward/back.
- A/D strafes within scene-specific bounds.
- Light intensity is governed by true Euclidean 3D distance from each world point to camera center.
- Browser text selection / touch callout remains disabled on the visual controls.

## Map 1 · Green Nave
- Preserve v15 structural continuity and backing wall behind arches.

## Map 2 · Brutalist Palace
- Preserve massive diagonal columns and v17 camera-distance lighting.

## Map 3 · Straight paired-column road
- Central road is straight and axial.
- Column rows are parallel.
- Every left column has an exact right partner at the same world Z.
- Do not turn this scene into diagonal/random placement.
- Rectangular monumental columns are intentionally distinct from Map 2 cylinders.

## Map 4 · Tunnel
- Must read as an enclosing barrel tunnel, not a flat corridor.
- Use side walls + semicircular vault.
- Warm stone texture is generated from the existing stone asset.
- The center ends in a strong dark throat.
- Keep strafe tightly limited so the player remains inside the tunnel envelope.

## Map 5 · Ritual Avenue
- Strong central vanishing road.
- Alternating longitudinal floor stripes.
- Paired pointed spires on both sides.
- Orange/red sky.
- Stepped temple/monument is a fixed world destination.
- Render far temple before nearer repeated spires for correct occlusion.
- Composition is axial and ceremonial, not random.

## Navigation
- Five map buttons are horizontally scrollable on narrow screens.
- Keyboard keys 1–5 switch scenes.
