# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Camera / movement
- Camera orientation remains fixed frontal.
- Latest user override: movement is no longer forward/back-only.
- W/S = forward/back.
- A/D = lateral strafe without yaw.
- Scroll/wheel = forward/back.
- Touch ↑/↓ remains forward/back.
- Do not convert A/D into camera rotation unless explicitly requested.
- Map 1 has a narrow lateral movement clamp; Map 2 allows a wider strafe range.

## Map 1
- Preserve tall green nave, repeated arches, diagonal/chamfered supports, upper darkness.
- No premature culling.
- Small lateral movement must not let the player escape the nave envelope.

## Map 2
- The hall must occupy the **full lateral composition**, not a narrow central band.
- Use broad world-space lanes, including outer columns that can enter partially from the frame edges.
- Keep enough spacing in Z that near/mid/far layers remain readable.
- Farther equivalent cylinders are monotonically darker by world Z.
- Cylinder tops remain out of frame.
- Solid violet shading remains preferred over stretched image textures.
- Floor follows the current camera X and viewport frustum.

## Critical layout rule
- Do not confuse sparse with centrally compressed.
- Sparse rows still require left/center/right architectural occupancy.
- The hall should imply continuation beyond both screen edges.
- A wide viewport must reveal more architecture, not more accidental emptiness.

## Critical depth rule
- Distance hierarchy is encoded by perspective + spacing + Z-based tone.
- If two equivalent columns differ mainly by depth, the farther one should not be brighter than the nearer one without an intentional light source.
