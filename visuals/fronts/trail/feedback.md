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

## LATEST USER FEEDBACK
- User rejected the previous rear-hemisphere disappearance.
- Preferred behavior: simply continue the turn into an inverse/mirrored version.
- Current candidate now keeps the object present through the entire turn: front → profile → mirrored dark rear → profile → front.
- The mirror switch occurs at near-zero width, so it should read as continuous rotation rather than an abrupt flip.

## PREVIOUS USER FEEDBACK
- After the darkness hierarchy, user identified the next 3D illusion break: the face itself did not turn.
- Requested behavior: rotate smoothly so that when the object goes backward the frontal face is not visible.
- Current candidate implements smooth yaw, profile compression and backface hiding without a mirror flip.

## PREVIOUS USER FEEDBACK
- Pseudo-3D result was reviewed positively ("muy bueno").
- Problem found: when ÓRBITA/LOOP turns back, the last/old face stays too visible and creates two competing faces.
- Requested behavior: the oldest/rear image should always be much darker, then copies should become progressively clearer as they approach the current/front image.
- This is now implemented in the current candidate with a chronological brightness ramp plus extra far-depth darkening.

## OPEN / NEXT REVIEW
- Judge whether CERCA / LEJOS / ÓRBITA / LOOP actually feel spatial and whether any mode deserves tuning/removal.
- Some masks currently have gray/base residue or imperfect crop edges. Improve the source/segmentation before treating them as final.
- Make `compileTrailAsset(image)` robust enough that a supplied user image can be processed automatically without bespoke animation logic.
- Once crop quality is reliable, expand toward a larger (~20) curated candidate pool with color/creepy/iconic silhouettes and an in-page selection workflow.
- Verify the new mode controls and adaptive quality on target mobile.

## RESOLVED IN CURRENT CANDIDATE
- Replaced rear disappearance with a mirrored rear representation.
- Yaw still compresses width smoothly toward profile.
- Once the yaw passes profile, the canvas flips the sprite horizontally while keeping positive draw dimensions.
- Rear side is darker and slightly more transparent than the front.
- Existing temporal/depth darkness hierarchy remains active.
- Added smooth vertical-axis yaw driven by z velocity: toward camera = front-facing target, away from camera = back-facing target.
- Yaw compresses sprite width toward profile using |cos(yaw)| and fades the frontal texture out past profile/back hemisphere.
- Historical stamps store yaw, so the trail preserves actual orientation history instead of redrawing all copies front-facing.
- 2D remains unchanged; no snap mirror was reintroduced.
- Added a temporal brightness hierarchy across the trail: oldest stamp ≈ darkest, newest trail stamp ≈ brightest, current head = full brightness.
- Added an extra distance-darkening factor in pseudo-3D so rear/far stamps recede further.
- Precomputed seven shaded sprite canvases once per asset load, avoiding a per-stamp filter cost every frame.
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
