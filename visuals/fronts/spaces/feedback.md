# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## LATEST LIGHTING CORRECTION · v16
User reported that the v15 lighting still violated the intended physical rule:
- approaching a pillar could leave it too dark;
- tower tips were not dark enough relative to their bases;
- lighting should be determined by how far each point is from the **center of the camera**.

## CURRENT UNIVERSAL LIGHT RULE
For any sampled point on floor / wall / pillar / tower:

1. Compute true 3D distance from camera center:
   - dx = worldX - camX
   - dy = worldY - cameraY
   - dz = worldZ - camZ
   - dist = hypot(dx, dy, dz)
2. Distance is the primary lighting term:
   - physically near = brighter
   - physically far = darker
3. Optical-axis alignment is only secondary:
   - centered points receive somewhat more light
   - it must NOT overpower proximity
   - a nearby pillar should not become inexplicably black just because it is slightly off-axis
4. Tall geometry is sampled vertically:
   - bases are closer and therefore brighter
   - tips are much farther and therefore darker
   - extremely high/far tips may nearly disappear

## IMPLEMENTATION v16
- `cameraLight3DAt` now uses full Euclidean distance from the camera center as its primary falloff.
- The old cone-style attenuation that could overpower near-field proximity was removed.
- Optical-axis weighting remains but with a nonzero floor, so it cannot annihilate nearby surfaces.
- Brutalist columns use 9 vertical lighting slices.
- Cylinder curvature now has a stronger minimum light response, preventing near faces from going absurdly black.
- Both floors and walls now use the same camera-center 3D light metric rather than separate 2D distance logic.

## PRESERVE
- Map 1 supports reach the visible crown springline.
- Backing wall remains behind the arch/support figure.
- Map 2 remains massive, diagonal and brutalist.
- Touch swipe, WASD, wheel and touch buttons remain.
- Browser text-selection/callout UI remains disabled.
