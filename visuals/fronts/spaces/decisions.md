# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Universal lighting rule · v17
- Brightness is governed by **true Euclidean 3D distance from the camera center**.
- Use `hypot(dx, dy, dz)` as the single distance source of truth.
- No optical-axis/cone multiplier is allowed to make a physically near point darker than a farther equivalent point.
- Nearer equivalent points are always brighter; farther equivalent points are always darker.
- Tall structures are evaluated by vertical slices.
- Vertical slice spacing is nonlinear and denser near the base, because that is where close-range interaction occurs.
- Tower tips may become almost invisible because their Y distance alone can be enormous.
- Curvature shading is secondary to distance and has a strong minimum response.
- Floors and walls follow the same camera-center distance model.

## Map 1 · Green Nave
- Supports meet the actual visible arch springline.
- Wall mass exists behind the support/crown silhouette with an arch opening cut out.
- Render order stays wall -> supports -> crown.
- Camera-center lighting applies to floor, walls and structure.

## Map 2 · Brutalist Palace
- Columns remain wide/heavy and diagonally organized.
- Each cylinder uses 12 nonlinear vertical light slices.
- Lower nearby sections must brighten strongly as the player approaches.
- Upper/far sections fall aggressively toward black.
- The highest tips should be almost invisible.
- No stretched textures and no horizontal-row composition.

## Interaction
- W/S forward/back.
- A/D lateral strafe.
- Wheel/trackpad forward/back.
- Touch ↑/↓ buttons forward/back.
- Vertical swipe on scene: up advances, down retreats.
- Camera direction remains fixed.
- Browser selection/callout UI stays disabled.
