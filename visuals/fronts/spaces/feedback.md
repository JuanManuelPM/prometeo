# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## UNIVERSAL RULES · CURRENT
These rules now apply to **both maps**, not only the violet hall.

- The dominant light behaves as if it comes from the camera/player.
- Near surfaces are readable; far/off-axis surfaces fall strongly and nonlinearly toward black.
- Large areas may be almost 100% dark when that strengthens scale and atmosphere.
- Floor and architecture share the same world-space lighting logic.
- Distance/lighting that interacts with geometry is computed from world position/depth, never as a hard screen-space band.
- Monumentality comes from mass, occlusion, cropping, darkness and scale, not from showing every surface.
- Repetition must create architecture, not expose horizontal rows or a recycler.

## MAP 1 · GREEN NAVE
v13 updates the previously flatter/older tunnel so it shares the current visual language:
- camera-source light on floor, walls and arch sequence;
- far arches/walls become much darker;
- floor falls into darkness by world distance and lateral angle;
- upper vault remains unresolved in near-black darkness;
- arches remain the dominant rhythm, with no fake roof and no premature popping.

## MAP 2 · BRUTALIST PALACE
Latest user direction consumed in v13:
- columns must be **wider / more massive** to read as brutalism;
- columns must not form obvious horizontal rows;
- layout should feel like a palace / ordered diagonal colonnade;
- far columns must be clearly darker than near ones;
- there should be genuinely almost-black regions;
- floor must share the same light falloff.

Implementation:
- cylinder radius increased to roughly 2.2–2.5 world units;
- 28-sided shading for roundness;
- row positions are staggered diagonally in Z across X;
- alternating slant produces ordered palace-like diagonals rather than horizontal lines;
- camera-light falloff is nonlinear and includes lateral/off-axis falloff;
- floor is subdivided in world space and lit with the same camera-source model.

## CONTROLS
- W/S = forward/back
- A/D = lateral strafe
- wheel/trackpad = forward/back
- touch ↑/↓ remains
- camera orientation stays fixed; A/D does not yaw.

## REJECTED / DO NOT REVIVE
- uniform/flat lighting
- horizontal pillar rows
- thin tube-like brutalist columns
- equal visibility at all depths
- bright distant floor/columns
- screen-space black depth bands
- stretched tall textures
- fake ceiling / flat background wall
- premature culling
