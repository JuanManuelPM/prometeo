# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Universal lighting / composition
- Camera/player is the dominant light source.
- Tall geometry uses **3D distance**, not only planar X/Z distance.
- A higher point on the same distant tower may be substantially darker because it is farther from the player.
- Near = readable; far/high/off-axis = strongly dark.
- Floors use the same overall light language.
- Almost-black regions are intentional.
- Never fake world depth with a hard screen-space band.

## Map 1 · Green Nave
- The visible arch must be structurally supported. No gap is allowed between support and visible crown.
- Crown art clears its bottom 20%, so the structural support target is the derived `springY`, not raw `shoulderY`.
- Wall mass exists behind the arch/support silhouette.
- Backing wall is rendered first and has an arch-shaped doorway cut out.
- Supports render in front of that wall; crown renders in front of both.
- Preserve tall nave, green material, diagonal/chamfered supports, camera light and upper darkness.
- No premature culling.

## Map 2 · Brutalist Palace
- Columns stay wide/heavy and diagonally organized.
- Tall columns are vertically segmented for lighting.
- Each segment derives illumination from X/Y/Z distance to the player.
- Upper/far sections can become almost black while lower/near sections remain legible.
- No stretched textures and no obvious horizontal-row composition.

## Interaction
- W/S forward/back.
- A/D lateral strafe.
- Wheel/trackpad forward/back.
- Touch ↑/↓ buttons forward/back.
- Vertical swipe on the scene: up advances, down retreats.
- Camera direction remains fixed.
- Browser selection/callout UI stays disabled on the visual controls.
