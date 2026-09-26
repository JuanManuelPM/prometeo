# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- forward/backward only
- fixed frontal view
- continuous ground
- Map 1 = green monumental arch nave
- Map 2 = brutalist checker-cylinder hall
- visible near structures persist until naturally behind/out of view
- monumental scale comes from architecture, distance, cropping and occlusion

## MAP 1 · GREEN NAVE
- Preserve current tall-cavity direction.
- Arches dominate more than square posts.
- Diagonal/chamfered side supports.
- Upper volume may dissolve into darkness rather than show a literal roof.
- No premature popping.

## MAP 2 · BRUTALIST CYLINDERS
- User explicitly liked v9 much more, but identified a major depth-compositing error:
  - a horizontal black band/line crossed the middle of the scene **in front of distant cylinders**.
- Exact cause/rule:
  - distance fog must NOT be simulated with a screen-space horizontal rectangle/gradient drawn over world geometry;
  - floor fade must be calculated from world depth (Z), so distant floor segments lose contrast progressively without masking cylinders;
  - background/atmospheric darkness must never create a hard seam that crosses visible geometry.
- Cylinders must feel enormous:
  - tops/end caps should not be visible in normal framing;
  - geometry should extend far beyond the upper viewport;
  - upper disappearance should come from crop/height and smooth darkness, not from showing a clear endpoint.
- Cylinder roundness should remain legible; avoid square-prism read.
- Floor checker is strongest in foreground and progressively disappears with distance.

## REJECTED / DO NOT REVIVE
- screen-space black band used as distance fog
- horizontal seam crossing in front of world geometry
- visible cylinder tops/endings that make the columns feel finite/small
- black hole under camera
- left/right controls
- premature culling/popping
- square-post corridor dominating Map 1
- fake ceiling / flat background wall
- fisheye tricks

## DESIGN GUARDRAILS
- Depth effects belong to world depth whenever they interact with world geometry.
- Do not use a 2D overlay to fake Z-distance if that overlay can cut across objects.
- If an object is still visible, atmosphere should attenuate it gradually, not mask it with a hard screen-space boundary.
- Monumental columns may extend absurdly high in world coordinates if that keeps their tops outside the frame.
- If showing the full object makes it feel smaller, do not show the full object.
- A visual fix is invalid if it trades one dominant compositing error for another.
