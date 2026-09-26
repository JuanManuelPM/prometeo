# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Interaction invariants
- Movement is forward/backward only.
- Camera view is fixed frontal.
- Continuous ground is invariant.
- No yaw, side-look or strafe unless explicitly requested.

## Map 1
- Preserve the current tall green nave direction.
- Arches dominate over square posts.
- Upper area dissolves into darkness.
- No premature culling.

## Map 2
- Monumental hall of giant round columns.
- Cylinder tops/end caps stay outside the normal frame.
- Cylinder rows must be sparse enough to distinguish near, middle and far layers.
- Far cylinders are darker by world-space Z.
- v11 columns use solid violet shading; do not reintroduce stretched checker imagery on tall faces.
- The floor must cover the full user's visible field on any viewport.

## Critical camera/frustum rule
- Never size a floor or other viewport-covering surface from an arbitrary fixed world width.
- Compute the visible world half-width from camera depth and focal projection:
  visibleHalfWidth ~= (viewportHalfWidth / focal) * cameraDepth
- Apply a safety margin and recompute by depth when rendering a perspective floor.
- Portrait and wide desktop must both remain covered.

## Critical material rule
- Do not stretch one finite texture across extreme world height.
- If UV repetition is not explicitly implemented, use a stable solid/shaded material instead.
- Material simplification is preferable to obvious distortion.

## Critical depth rule
- Near/mid/far separation comes from spacing + world-Z attenuation + perspective.
- Over-dense repetition flattens the scene even if the math is technically 3D.
