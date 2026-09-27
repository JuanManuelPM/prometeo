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
- User says the turn is still too tight: the path must use a much wider turning radius.
- User also wants the image itself to curve, as if wrapped around a sphere/cylinder, so the side view does not collapse into a paper-thin line.
- Current candidate replaces the flattened hairpin with a broad **true semicircle in X/Z**, responsive radius **130–230 px**, while preserving constant path speed.
- Current candidate removes whole-sprite `scaleX = cos(yaw)` collapse and renders the image through **7–11 vertical curved-surface strips** during the turn.
- Near face-on views still use one draw call; the more expensive strip projection is mainly active during yaw.

## PREVIOUS USER FEEDBACK
- User says the current turn still looks like it pauses/counts and then accelerates.
- Required behavior: **constant speed at all times**, including while entering/exiting the hairpin.
- User also requires the last/oldest rear trail copy to be **black** and **smaller**.
- As copies get darker farther back, they must also get progressively smaller.
- Current candidate advances ORBIT/LOOP by constant travelled distance (`PATH_SPEED * dt`) and uses an arc-length LUT for the curved turn.
- Current candidate couples trail darkness and size: oldest = black + smallest, then both recover progressively toward the current head.

## PREVIOUS USER FEEDBACK
- User corrected the previous interpretation: the sprite must **not** rotate independently while already beginning to travel backward.
- The turn itself must consume horizontal space, like a tail making a circular U-turn.
- By the time the backward straight starts, the sprite must already be fully reversed.
- Current candidate replaces the independent yaw accumulator with trajectory-coupled hairpins in ORBIT/LOOP: approach straight → lateral turn at fixed near depth → retreat straight already at 180° → lateral far turn → approach.
- The longer/spacier tail from the previous patch is preserved.

## PREVIOUS USER FEEDBACK
- User wants the rotation slower and physically weighted, "as if it needed a certain width to rotate."
- User also wants a little more spacing between image copies so the tail reads longer.
- Current candidate implements distance-gated yaw: after a direction change it holds briefly and needs about one sprite width of travel to complete the turn.
- Stamp spacing is ~25% wider and lifetime is longer, extending the trail without turning it into a sparse chain.

## PREVIOUS USER FEEDBACK
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
- Removed smoothstep/easing from ORBIT/LOOP movement.
- Added constant path-distance progression: `pathDistance += PATH_SPEED * dt`.
- Added 64-sample ellipse arc-length lookup for the hairpin so equal travelled distances produce uniform motion through the curve.
- PATH_SPEED is 230 px/s normal and 150 px/s under reduced-motion.
- Expanded precomputed shade bank to include brightness 0, so the oldest trail stamp is a literal black silhouette.
- Added a coupled scale hierarchy: oldest stamp starts at 56% scale and grows toward ~97% before the current head.
- Far depth still reduces projection/visual dominance on top of that hierarchy.
- Removed independent width/distance-gated yaw from the 3D turn.
- Added `hairpinPose()`: ORBIT/LOOP now have explicit straight and turn phases.
- Near turn keeps z at the near extreme while the figure moves laterally and yaw advances 0→180°.
- Retreat/backward straight begins only after the turn phase ends and yaw is already 180°.
- Far turn keeps z at the far extreme while the figure moves laterally back and yaw advances 180→0°.
- Approach and Retreat dedicated modes start already at the correct facing.
- Existing mirrored/dark rear proxy, brightness hierarchy, wider stamp spacing and longer lifetime remain.
- Replaced time-rate yaw with travel-distance yaw.
- A facing change captures the current yaw, holds for ~16% of required travel, then smoothsteps across ~1.05 sprite widths.
- Combined planar movement plus a small depth-distance equivalent drives turn progress, so CERCA/LEJOS still rotate even with little lateral travel.
- Stamp intervals changed high/medium/low: 24/28/34 ms → 30/35/42 ms.
- Trail lifetime changed 720 ms → 860 ms; reduced-motion 880 ms → 1040 ms.
- Pool size and adaptive quality limits remain bounded.
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
