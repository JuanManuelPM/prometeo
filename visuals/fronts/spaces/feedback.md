# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v31 · BLACK NAVE FLOOR + DEEPER TUNNEL + THINNER/FARTHER RITUAL CORRIDOR

Latest user direction combines three explicit map decisions.

## MAP 1 · ARCOS
- Temporarily remove the visible green floor.
- Keep the floor geometry so the scene structure does not break.
- Render the floor pure black.
- Do not draw the green floor texture/material overlay.
- Preserve arches, supports, backing walls and depth.

## MAP 3 · CALZADA
- User likes it.
- Leave it as-is.
- v31 verification: renderMap3 is exactly unchanged from the v30 blob.

## MAP 4 · TÚNEL
- User likes the current tunnel composition and motion.
- Preserve world-anchored segments, ribs, end wall, floor and longitudinal guides.
- Strengthen optical depth only:
  - near surfaces clearer/brighter;
  - far surfaces darker;
  - throat more swallowed by black.
- v31 adds an explicit nonlinear depth factor to tunnel wall/roof material and structural ribs.
- v31 also adds a soft radial darkness veil centered on the vanishing throat, strongest at center and almost absent in the near field.

## MAP 5 · RITUAL / MEGATOWERS
Pending feedback from the immediately previous turn is also applied:
- bridge thinner again:
  - RITUAL_ROAD_HALF .95 → .65;
  - full bridge width 1.9 → 1.3;
  - lateral limit .68 → .42.
- towers farther from player laterally:
  - RITUAL_COLUMN_GAP 1.20 → 1.90.
- preserve tower radius 3.20 and extreme height.
- new geometry:
  - bridge edge ±0.65;
  - tower center ±5.75;
  - nearest tower surface ±2.55;
  - real abyss gap 1.90.

## PRESERVE
- Map 5 dark industrial background and distant megastructures;
- Map 5 no lateral floor;
- signs → columns → bridge painter order;
- bridge-last lower-tower occlusion;
- pure-black deep tower bases;
- max two visible/opening signs;
- v20 mobile map selector.

## SELF-CRITIQUE / REVIEW RISKS
- Map 1 floor is intentionally absolute black; if the nave loses too much spatial footing, the next adjustment should be a near-black edge cue, not a return to the green material.
- Map 4 extra depth veil is screen-space by design and could be too strong on very narrow displays; review visually before increasing it.
- Map 5 1.3-unit full bridge is deliberately extreme; camera lateral clamp is reduced accordingly.
