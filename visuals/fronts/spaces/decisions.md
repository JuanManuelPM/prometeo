# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Universal floor rule · v22
- Renderer segmentation is implementation detail and must not be visible.
- Accidental horizontal floor seams are forbidden.
- Longitudinal lines are allowed and encouraged when they strengthen forward-motion perspective.
- Prefer continuous world surfaces; if repeated structure is visible, it must be intentional architecture anchored to world coordinates.

## Map 1
- Floor is one continuous corridor plane.
- Do not return to repeated full-texture Z bands.
- Preserve v15 arch/support/backing-wall structure.

## Map 4
- Tunnel must produce strong optical flow.
- Camera-relative repeated bands are not sufficient.
- Structural ribs are fixed in world Z and pass the camera during movement.
- Tunnel end is a real world-space wall at Z=170, not a screen-space throat overlay.
- Floor remains continuous and may use longitudinal guide lines.
- Intentional tunnel ribs may cross the view transversely because they physically move with the world; accidental static floor lines may not.

## Map 5
- Keep strict straight longitudinal road stripes.
- Lateral floor is continuous with no horizontal band seams.
- Spires are no longer paired opposite each other.
- Use one-and-one alternating rhythm: left, right, left, right.
- Current spacing: RITUAL_STEP = 7.4.
- Signs are deliberately large, screen-like cardboard panels.
- Current pole length: 7.15.
- Current deployment band: ahead and within 24 Z units, raised again at <=8 Z units.
- Physical hinge behavior from v21 remains: far up, medium-distance down, very-close up.

## Preserve
- v20 horizontal finger-scroll scene selector.
- fixed frontal camera, mobile movement, WASD/wheel and camera-distance lighting.
