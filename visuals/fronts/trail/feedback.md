# 🐉 Motion Trail · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- Complete-image stamps.
- Fast cadence and overlap.
- Oldest-copy removal.
- Rebound accumulation.
- Flat strong background.
- Keep **1 BASE** available and visually intact; it is the accepted old-redraw baseline and is not disposable scaffolding.
- **2 WINGS is the current user favorite** and the primary visual benchmark.
- What works in WINGS is not merely transparency: it has **color**, reads as a real image, has an open/winged silhouette, strong presence, and creates a dense interesting trail when repeated.
- The user explicitly liked the **mask direction** after the WINGS-led revision.
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

The current promoted comparison set remains:
1. BASE
2. WINGS
3. ONI
4. HANNYA
5. SHISHI
6. SHIKAMI

WINGS remains the benchmark. The masks are a liked direction, but not every current mask crop is final-quality.

## NEW TECHNICAL DIRECTION
Trail is now treated as a reusable system rather than a bespoke animation per image:

- `compileTrailAsset(image)` prepares the transparent sprite.
- `TrailEngine(asset, trajectory)` performs movement / stamping / projection.
- One image is loaded once; trail copies are small records, not duplicate image objects.
- Current stamp state is `{x,y,z,angle,scale,born}`.
- A bounded pool reuses stamp slots.
- Pseudo-3D is a projection layer on the same renderer, not a separate 3D asset pipeline.
- Durable technical detail lives in `visuals/fronts/trail/architecture.md`.

## CURRENT PSEUDO-3D EXPERIMENT
In-page movement modes:
- **2D**: accepted bounce behavior.
- **CERCA**: far → near.
- **LEJOS**: near → far.
- **ÓRBITA**: circulation through x/z, passing behind and in front.
- **LOOP**: figure-eight-ish x/y path with changing depth.

For 3D modes, z changes projected scale/position and distant stamps are slightly less opaque. Stamps are drawn far-to-near. There is still only one 2D sprite; no WebGL/mesh is required.

## OPEN / NEXT REVIEW
- Judge whether CERCA / LEJOS / ÓRBITA / LOOP actually feel spatial and whether any mode deserves tuning/removal.
- Some masks currently have gray/base residue or imperfect crop edges. Improve the source/segmentation before treating them as final.
- Make `compileTrailAsset(image)` robust enough that a supplied user image can be processed automatically without bespoke animation logic.
- Once crop quality is reliable, expand toward a larger (~20) curated candidate pool with color/creepy/iconic silhouettes and an in-page selection workflow.
- Verify the new mode controls and adaptive quality on target mobile.

## RESOLVED IN CURRENT CANDIDATE
- Added visible **NOTAS** panel inside Trail explaining the reusable engine, performance strategy and next asset-compiler step.
- Added z to the existing stamp state and implemented pseudo-3D projection.
- Added CERCA / LEJOS / ÓRBITA / LOOP while preserving 2D.
- Reused the existing single-sprite renderer and bounded pool; did not duplicate images per stamp.
- 3D depth ordering uses a bounded, allocation-free insertion order rather than a heavyweight scene graph.
- Runtime image hotlinks remain removed: production variants stay repo-local.
- BASE and WINGS remain intact and available.
- No abrupt horizontal flip.
- Full-image stamps and adaptive rendering remain the visual/performance identity.

## REJECTED / DO NOT REVIVE
- Black-line / white-sheet imagery as the main asset direction.
- Raw PSF line-art that reads like a white rectangle or textbook plate.
- Visible white or square image backgrounds.
- Gray pedestal/base residue on supposedly isolated masks.
- Fragile external runtime image URLs, redirects or hotlinks.
- Hidden approved variants in an ambiguous horizontal mobile strip.
- Fragmented rectangular glitch / missing chunks.
- Soft blur replacing complete redraw stamps.
- The prior square-backed mantis/photo direction.
- Abrupt horizontal mirror flips.
- Heavy WebGL/mesh machinery merely to get depth from a 2D cutout.
