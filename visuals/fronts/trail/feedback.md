# 🐉 Motion Trail · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- Complete-image stamps.
- Fast cadence and overlap.
- Oldest-copy removal.
- Rebound accumulation.
- Flat strong background.
- Keep **1 BASE** available and visually intact; it is the accepted old-redraw baseline and is not disposable scaffolding.
- **2 WINGS is the current user favorite** and the primary reference for new assets.
- What works in WINGS is not merely transparency: it has **color**, reads as a real image, has an open/winged silhouette, strong presence, and creates a dense interesting trail when repeated.
- Production direction is genuinely isolated/cut-out imagery with no visible rectangular image background.
- Do not abruptly mirror/flip the image. Fixed orientation or smooth continuous rotation only.
- Preserve adaptive quality, bounded stamp storage and controlled internal resolution before sacrificing the complete-stamp identity.

## CURRENT VISUAL DIRECTION
New candidates should move toward:
- color imagery;
- creepy masks / faces / creatures / strange objects;
- strong outer silhouettes;
- wings, eyes, horns, ritual forms or iconic presence when useful;
- visible photographic/painted/material character rather than black line art on a white sheet.

The current promoted comparison set is:
1. BASE
2. WINGS
3. ONI
4. HANNYA
5. SHISHI
6. SHIKAMI

WINGS is the benchmark. A future candidate should not be promoted merely because it is new.

## OPEN / NEXT REVIEW
- Review ONI / HANNYA / SHISHI / SHIKAMI against WINGS as the visual benchmark.
- Verify the new repo-local build on the target phone, especially adaptive quality and portrait discoverability.
- If a future mask/creature/object is visually weaker than WINGS or the strongest current mask, leave it out rather than filling the selector.

## RESOLVED IN CURRENT CANDIDATE
- Runtime image hotlinks removed: every production Trail variant now loads a repo-local asset from `visuals/trail-lab/assets/`.
- BASE and WINGS localized with build-time treatment matching their previous runtime raster/cutout treatment.
- Black/white PSF line-art candidates removed from the promoted selector.
- Added four color Japanese creepy-mask candidates: ONI, HANNYA, SHISHI and SHIKAMI.
- Museum/photo backgrounds are segmented to alpha before runtime; runtime no longer depends on white-matte removal or remote CORS behavior.
- WINGS remains variant 2 and is now the default displayed candidate.
- BASE remains variant 1 and the accepted mechanism is unchanged.
- No abrupt horizontal flip.
- Full-image stamps, fast cadence, oldest-copy removal and rebound fan remain.
- Adaptive quality / low internal canvas resolution / preallocated stamp pool remain.
- Portrait UI exposes all six variants in a visible 3×2 grid.

## REJECTED / DO NOT REVIVE
- Black-line / white-sheet imagery as the main asset direction.
- Raw PSF line-art that reads like a white rectangle or textbook plate.
- Visible white or square image backgrounds.
- Fragile external runtime image URLs, redirects or hotlinks.
- Hidden approved variants in an ambiguous horizontal mobile strip.
- Fragmented rectangular glitch / missing chunks.
- Soft blur replacing complete redraw stamps.
- The prior square-backed mantis/photo direction.
- Abrupt horizontal mirror flips.
