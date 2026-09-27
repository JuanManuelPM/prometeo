# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## LATEST LIGHTING CORRECTION · v17
User clarified the intended invariant:
- everything should be lit according to **how far that exact point is from the center of the camera**;
- closer = brighter;
- farther = darker;
- tower tips are much farther from the camera than their bases and should almost disappear;
- approaching a pillar must make its nearby lower surfaces brighter, never paradoxically darker.

## ROOT CAUSES FOUND
v16 was closer, but still had two competing effects:
1. optical-axis weighting could still reduce a nearby surface more than desired;
2. equal-height vertical slices were too coarse, so the lowest tower band sampled a midpoint much higher than the player's eye and could inherit excessive darkness.

## CURRENT UNIVERSAL LIGHT RULE
- Use only true Euclidean world-space distance:
  `dist = hypot(worldX-camX, worldY-cameraY, worldZ-camZ)`.
- No secondary cone or optical-axis multiplier may override that distance.
- Near points must monotonically receive more light than farther equivalent points.
- Curvature may sculpt roundness, but it is secondary and has a high enough floor that a near face cannot collapse to black.
- Tall towers are sampled with **nonlinear vertical slices concentrated near the base**.
- High/far points naturally become almost black because their actual 3D distance is large.

## IMPLEMENTATION v17
- removed optical-axis weighting from `cameraLight3DAt`;
- `cameraLightAt` is now only a thin wrapper around the same 3D rule;
- brutalist columns use 12 vertical slices;
- slice spacing uses a power curve, giving much finer resolution near the base;
- cylinder curvature minimum increased so proximity dominates;
- floors and Map 1 structure use the same camera-center distance metric.

## PRESERVE
- Map 1 supports meet the real visible arch springline.
- Backing walls remain behind the arch/support silhouette.
- Map 2 remains massive, diagonal and brutalist.
- Touch swipe, WASD, wheel and touch buttons remain.
- Browser selection/callout UI remains disabled.
