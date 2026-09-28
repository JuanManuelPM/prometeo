# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v27 · LOW CAMERA + BRIDGE OCCLUSION

User screenshot showed that v26 still failed visually even though the road/column X ranges no longer overlapped.

Observed failure:
- the violet path still read as continuing below/between the columns;
- columns painted on top of the road because the canvas renderer drew them after the bridge;
- the camera felt too high;
- the bridge lacked enough foreground mass to hide the lower shaft portions.

## v27 FIX

### Low camera
- Camera eye remains world Y=0.
- Map 5 road moved to Y=-0.38.
- This reduces eye height above the deck to 0.38 world units.
- Sign hinge uses the same road Y.

### Bridge as foreground occluder
- New helper: `renderRitualBridge()`.
- Bridge has visible vertical side body down to Y=-5.6.
- The bridge is now rendered AFTER signs and columns.
- Because this engine is a painter-style canvas renderer with no depth buffer, render order is the actual occlusion rule.
- Drawing bridge last causes its near deck/body to mask lower projected column pixels.

### Columns
- Keep bottom Y=-38.
- Keep top Y=42/50.
- Keep pure-black deepest section and violet emergence upward.
- Keep real 0.65 world-unit abyss gap from road edge to nearest column surface.

### Signs
- Sign still renders before its column so the column hides the hinge/storage.
- Bridge then renders after both.
- Max two visible/opening signs remains.

## REVIEW RISK
The requested effect depends on projected occlusion, so visual browser/user screenshot review remains necessary. Code now enforces the correct painter order and low eye height.
