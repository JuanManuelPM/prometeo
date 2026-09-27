# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## UNIVERSAL VISUAL RULES
- Camera/player is the dominant light source.
- Lighting/darkness must respond to **full 3D distance**, including vertical distance, when rendering tall structures.
- Near surfaces are readable; far, high and off-axis surfaces can approach black.
- Floor and architecture share the same world-space lighting language.
- Monumentality comes from mass, occlusion, cropping, darkness and scale.
- No screen-space depth seams.

## MAP 1 · v15 STRUCTURAL FIX
Latest user correction:
- the columns/supports did not visually reach the upper arch;
- wall mass was missing behind the arch/figure.

Root cause of the floating arch:
- the crown sprite intentionally clears its bottom 20%;
- supports ended at `shoulderY`, while the first visible crown pixels start higher;
- therefore there was a real world-space gap even though the nominal values looked adjacent.

Current rule/implementation:
- compute `springY = shoulderY + (ceilY - shoulderY) * .20`;
- supports rise to `springY`, the **actual visible springline** of the crown;
- the support top remains aligned with the inner arch width;
- every rib gets a wall plane rendered **behind** the support + crown;
- the backing wall has an arch-shaped opening cut out, so it creates architectural mass without blocking the passage;
- render order is backing wall first, then supports, then arch crown.

## TALL PILLARS / TOWERS · 3D LIGHT RULE
Latest user correction:
- towers must get darker not only as they move away in the horizontal plane, but also as their parts get vertically farther from the player.

Current implementation:
- tower faces are divided into vertical slices;
- each slice computes camera light from X + Y + Z distance;
- high/far slices receive less light than low/near slices;
- side/back curvature still reduces light further;
- the result is a tower that can disappear upward into darkness instead of carrying one uniform brightness for its full height.

## MOBILE INTERACTION · PRESERVE
- swipe up/down on canvas = forward/back;
- W/S = forward/back;
- A/D = strafe;
- wheel/trackpad = forward/back;
- touch ↑/↓ buttons remain;
- selection/callout/context-menu UI stays disabled on the visual surface.
