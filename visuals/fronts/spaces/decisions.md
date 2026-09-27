# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Universal lighting rule · v16
- The dominant brightness rule is **true 3D distance from the camera center**.
- For a point P, illumination primarily follows `hypot(dx, dy, dz)`.
- Nearer points are brighter; farther points are darker.
- Optical-axis alignment is secondary and may shape the beam, but it must never make a physically near pillar inexplicably dark.
- A nonzero axis-weight floor is required.
- Tall objects are evaluated by vertical slices, not one brightness per object.
- Tower tips should be much darker than their bases and may nearly disappear if sufficiently high/far.
- The same camera-center metric applies to floors and walls.

## Map 1 · Green Nave
- Supports meet the actual visible arch springline.
- Wall mass exists behind the support/crown silhouette with an arch opening cut out.
- Render order remains wall -> supports -> crown.
- Camera-center lighting applies to floor, walls and structure.

## Map 2 · Brutalist Palace
- Columns remain wide/heavy and diagonally organized.
- Each cylinder uses vertically segmented lighting.
- Near lower sections must remain readable.
- Upper/far sections fall strongly toward black.
- Curvature shading may sculpt the surface but cannot override proximity.

## Interaction
- W/S forward/back.
- A/D lateral strafe.
- Wheel/trackpad forward/back.
- Touch ↑/↓ buttons forward/back.
- Vertical swipe on scene: up advances, down retreats.
- Camera direction remains fixed.
- Browser selection/callout UI stays disabled.
