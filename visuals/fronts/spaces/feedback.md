# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v32 · REMOVE CYLINDERS + HAIRLINE PATH + RICHER TUNNEL STONE

Latest user feedback:
- Map 1 / arcos is liked a lot: preserve it.
- Random-cylinder scene is disliked: remove it from the visible experience.
- Calzada is liked: preserve it.
- Tunnel composition is liked, but wall textures need improvement.
- Megatower path is still far too wide: it must read almost like a drawn line.

## MAP 1 · ARCOS
- renderMap1 is unchanged from v31.
- Keep the blacked-out floor and current architecture.

## REMOVED VISIBLE SCENE · RANDOM CYLINDERS
- the selector no longer exposes the old `2 CILINDROS` scene.
- visible selector is now:
  1. ARCOS
  2. CALZADA
  3. TÚNEL
  4. TORRES
- internal renderMap2 code remains dormant only to minimize unrelated refactor risk.
- selector buttons now carry explicit `data-map` ids so UI numbering can differ safely from internal map ids.
- keyboard 1–4 follows the visible selector.

## CALZADA
- renderMap3 is unchanged from v31.

## TÚNEL
- geometry, world-Z anchoring, ribs, end wall, floor and v31 depth falloff are preserved.
- added a second finer warm real-stone atlas (`tunnelDetail`) from the existing real stone source.
- walls and roof now receive a restrained second texture pass.
- detail strength still follows depth attenuation, so far tunnel stays darker instead of becoming noisy.

## TORRES / HAIRLINE PATH
- RITUAL_ROAD_HALF: .65 → .18.
- full path width: 1.30 → .36.
- lateral limit: .42 → .08.
- removed six-stripe deck treatment.
- removed bright edge rims.
- added one center hairline with half-width .018.
- the dark structural deck still exists and still renders after towers so lower-tower occlusion is preserved.
- RITUAL_COLUMN_GAP remains 1.90.
- tower radius remains 3.20.

## SELF-CRITIQUE / REVIEW RISKS
- .36 full width is intentionally extreme. If it still reads broad, the remaining cause is perspective/deck body, not stripe decoration.
- the new tunnel detail is deliberately restrained; if texture still feels weak, next step should be a better source asset, not simply more opacity.
- dormant cylinder code is not user-visible; removing the function itself would be cleanup, not a visual improvement.
