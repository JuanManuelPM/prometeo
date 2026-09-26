# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- fixed frontal camera orientation
- continuous ground
- Map 1 = green monumental arch nave
- Map 2 = brutalist giant-cylinder hall
- visible near structures persist until naturally behind/out of view
- monumental scale comes from distance, cropping, occlusion and out-of-frame height

## LATEST MAP 2 CORRECTIONS CONSUMED IN v12

### Lateral occupancy
The user reviewed v11 on wide desktop and found the architecture compressed into the center while the left/right sides were mostly empty.

Exact rule:
- Pillar placement must occupy the visible **hall volume**, not just a central corridor.
- Important depth rows need architectural presence at left, center and right.
- Some outer cylinders should enter partially from frame edges so the hall feels wider than the viewport.
- Large empty side regions are only valid when clearly intentional.

Implementation in v12:
- broader world-space cylinder lanes reaching roughly ±40 world units;
- staggered layouts across rows;
- outer pillars create partial edge occupancy rather than a central-only cluster.

### Distance hierarchy
The user reiterated that cylinders farther away must be darker.

Exact rule:
- equivalent farther cylinders must not read brighter than nearer ones unless there is an explicit local light source;
- depth tone must be monotonic with world Z;
- spacing + perspective + Z-darkening work together to separate near/mid/far layers.

Implementation in v12:
- earlier fog onset;
- lower far-depth minimum;
- nonlinear darkening inside the cylinder material.

## CONTROLS · LATEST OVERRIDE
The earlier "forward/back only" movement rule is superseded.

Current controls:
- W = forward
- S = backward
- A = strafe left
- D = strafe right
- mouse wheel / trackpad scroll = forward/back
- touch ↑/↓ remains forward/back
- camera **orientation remains fixed**; A/D moves the player laterally, it does not yaw/look sideways.

Map 1 lateral range is intentionally small to preserve the nave.
Map 2 allows substantially wider lateral movement.

## PRESERVE FROM PRIOR ITERATIONS
- Map 2 floor covers the camera frustum rather than a fixed world width.
- No screen-space black distance band.
- No stretched checker texture on tall cylinders.
- Cylinder tops remain outside normal framing.
- Map 1 keeps its tall arches, diagonal supports and upper darkness.

## REJECTED / DO NOT REVIVE
- central-only cylinder distribution on wide screens
- equal brightness for near/far cylinders
- stretched tall-cylinder image textures
- fixed-width floor exposing side gaps
- screen-space distance seam
- yaw/look controls unless explicitly requested again
- premature culling
