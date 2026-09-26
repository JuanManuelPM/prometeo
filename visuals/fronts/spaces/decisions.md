# 🌀 Pseudo-3D Spaces · Durable Decisions

Status: CURRENT

## Universal lighting / composition
- Camera/player is the dominant light source.
- Light falloff is nonlinear in world space.
- Near = readable; far/off-axis = strongly dark.
- Floors use the same light model as architecture.
- Almost-black regions are intentional.
- Never fake depth with a hard screen-space band.
- Monumental architecture may disappear partly into darkness/cropping.

## Map 1
- Tall green nave, repeated arches, diagonal/chamfered supports.
- Floor, walls and arches follow camera-source lighting.
- Upper vault stays unresolved in darkness.
- No premature culling.

## Map 2
- Wide/heavy columns, not thin tubes.
- Ordered diagonal placement in Z across X, not obvious horizontal rows.
- Far equivalent columns remain darker than near ones.
- Large zones between colonnades may fall almost fully black.
- Floor shares camera-source falloff.

## Interaction
- W/S forward/back.
- A/D lateral strafe.
- Wheel/trackpad forward/back.
- Touch ↑/↓ buttons forward/back.
- **Vertical swipe on the scene is first-class movement:** swipe up advances, swipe down retreats.
- Camera direction remains fixed.

## Mobile/browser interaction rule
- The visual surface is an interaction canvas, not selectable document text.
- Disable user text selection and mobile touch callouts on the visual and its controls.
- Prevent context-menu/selectstart/dragstart from interrupting gameplay.
- Button glyphs such as ↑/↓ must never trigger copy/paste selection UI.
