# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## UNIVERSAL VISUAL RULES
- Camera/player is the dominant light source.
- Near surfaces are readable; far/off-axis surfaces fall nonlinearly toward black.
- Large almost-black areas are intentional when they improve depth/scale.
- Floor and architecture share the same world-space lighting.
- Monumentality comes from mass, occlusion, cropping, darkness and scale.
- No horizontal-row look for the brutalist palace.

## MOBILE INTERACTION · v14
Latest user-reported bugs:
1. Vertical finger swipes on the scene did not move forward/back.
2. Accidental presses/long-presses on the arrow buttons could select the arrow character and open browser copy/paste UI over the visual.

Current rule:
- vertical touch swipe on the canvas is a first-class locomotion input;
- finger up = advance;
- finger down = retreat;
- movement is proportional to actual drag distance and feeds the same camera target as other controls;
- the visual surface and controls are non-selectable;
- browser touch callout, text selection, context menu and drag-selection must not steal interaction.

Implementation v14:
- Pointer Events track touch/pen drag on the canvas;
- pointer capture preserves the swipe even if the finger leaves the initial point;
- CSS applies user-select:none and -webkit-touch-callout:none;
- contextmenu/selectstart/dragstart are prevented globally for this visual.

## OTHER CONTROLS
- W/S = forward/back
- A/D = lateral strafe
- wheel/trackpad = forward/back
- touch ↑/↓ buttons remain
- fixed camera direction, no yaw

## PRESERVE
- v13 camera-source lighting on both maps
- green monumental nave
- massive diagonal brutalist palace
- near-black distance
- no stretched cylinder textures
- no screen-space depth seam
