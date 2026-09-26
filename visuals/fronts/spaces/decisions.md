# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Universal lighting / composition rules
- Treat the camera/player as the dominant light source.
- Light falloff is nonlinear in world space: near = readable, far/off-axis = strongly dark.
- Almost-black regions are intentional and desirable when they reinforce scale/depth.
- Floors use the same light model as architecture.
- Never fake depth with a hard screen-space band crossing geometry.
- The image should feel sculpted by light and darkness, not uniformly exposed.
- Monumental architecture does not need to be fully visible; partial occlusion and lost detail increase scale.

## Map 1 · Green Nave
- The tunnel/nave must follow the same current rules as Map 2.
- Floor, walls and arches darken with camera distance/off-axis angle.
- Distant arches can approach black.
- Upper vault stays unresolved/dark instead of becoming a visible flat ceiling.
- Keep the tall green nave, diagonal supports and natural culling.

## Map 2 · Brutalist Palace
- Columns are wide/heavy; thin tubes are rejected.
- Approximate radius target is now roughly 2.2–2.5 world units unless later feedback overrides it.
- Columns must not align as obvious horizontal rows.
- Use ordered diagonal placement in Z across X to suggest a palace/colonnade.
- Alternating diagonal slant is allowed; random scatter is not the goal.
- Farther equivalent columns are always darker without an explicit local light.
- Large zones between colonnades may fall almost fully black.
- Floor light/darkness must match the columns' camera-source falloff.

## Interaction
- W/S forward/back.
- A/D lateral strafe.
- Wheel/trackpad forward/back.
- Touch ↑/↓ remains.
- View direction remains fixed; no yaw unless explicitly requested.
