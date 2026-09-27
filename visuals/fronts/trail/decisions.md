# 🐉 Motion Trail · Durable Decisions

Status: CURRENT

- Baseline is an accepted visual mechanism, not disposable scaffolding.
- **1 BASE must remain available and visually intact.**
- **2 WINGS is the current user favorite and the primary visual benchmark.**
- WINGS is favored because it has color, reads as a real image, has an open/winged shape and leaves a visually strong repeated trail.
- The user liked the new **mask direction**, while explicitly flagging dirty crop/base-gray residue on some masks. Mask direction is kept; imperfect individual cuts are not accepted as final.
- Complete image stamps are the identity of this lab: fast cadence, overlap, oldest-copy removal and rebound accumulation stay.
- New candidates should prioritize **color + strong cutout silhouette + creepy/iconic presence**, especially masks, faces, creatures, strange objects, eyes, horns, ritual forms and winged/open shapes.
- Black-line / white-sheet art is no longer the main candidate direction even if technically cut out.
- Visible white rectangles, square photo backgrounds, gray pedestal residue and plate-like mattes are rejected.
- Production Trail assets must live in the repository under `visuals/trail-lab/assets/`; runtime external image hotlinks are prohibited.
- External sources may be used only during controlled build/localization with recorded provenance and license.
- Never abruptly mirror the sprite when motion direction changes.
- Orientation may be fixed or rotate continuously/smoothly. It must not snap-flip.

## Reusable engine decision
Trail is conceptually split into:
1. **`compileTrailAsset(image)`**: image → clean transparent bounded sprite.
2. **`TrailEngine(asset, trajectory)`**: sprite + movement function → stamps.

The engine must not require separate animation code for WINGS vs a mask vs a future user-supplied image.

Each stamp is lightweight state:
`{x,y,z,angle,yaw,scale,born}`.

One sprite is loaded and reused for all stamps.

Durable architecture detail:
`visuals/fronts/trail/architecture.md`.

## Pseudo-3D decision
- Depth is implemented as pseudo-3D projection of the same 2D sprite.
- No WebGL or mesh is required for this experiment.
- `z` controls projected position/scale and subtle distance opacity.
- 3D modes draw far-to-near.
- Supported experimental trajectories: 2D, approach/CERCA, retreat/LEJOS, ÓRBITA, LOOP.
- 2D remains the accepted bounce baseline and must not be silently replaced by a 3D mode.

## 2.5D facing / yaw
- Rear disappearance is rejected.
- The preferred illusion is continuous rotation: front → profile → mirrored/darker rear → profile → front.
- A single front image is reused as the rear proxy by horizontal mirroring only after profile.
- The side switch must occur when the projected width is near zero, so the mirror is not perceived as a snap.
- Rear representation stays darker and slightly more transparent than the front to distinguish it from a second active face.
- A front-facing 2D image must not remain visibly frontal while its pseudo-3D trajectory moves behind the camera plane.
- In 3D modes, z velocity controls a smooth vertical-axis yaw target:
  - approaching camera -> yaw 0°;
  - moving away -> yaw 180°.
- Rotation is continuous. Never use an instantaneous horizontal mirror.
- Sprite width compresses toward profile with `abs(cos(yaw))`; a small nonzero floor avoids numerical collapse.
- Because there is only a front image, the rear hemisphere uses a mirrored and darkened proxy rather than disappearing.
- Every stamp stores the yaw it had when created, preserving orientation history in the trail.
- 2D mode keeps yaw = 0 and remains unchanged.

## Wide-radius turn geometry
- A turn may not read as a tight screen-space U or abrupt steering correction.
- ORBIT/LOOP now turn through **true semicircles in X/Z**, not flattened X/Y ellipses at fixed depth.
- Responsive turn radius: `clamp(min(W*0.30, H*0.46), 130px, 230px)`.
- The turn therefore consumes substantially more horizontal/depth-equivalent distance.
- Constant path speed remains non-negotiable. A larger turn takes longer only because its arc is longer.
- Retreat still begins only after the near semicircle finishes and yaw reaches 180°.

## Curved sprite surface
- Do not simulate yaw by collapsing the entire sprite width with `abs(cos(yaw))`; that makes the image look like paper.
- During 3D turns, project the sprite as a curved surface split into vertical strips.
- Current surface curvature = **1.05 rad** from center to edge mapping, rendered with **7 / 9 / 11 strips** at low/medium/high quality.
- The curved projection must retain visible side-profile thickness at ~90° yaw.
- Rear hemisphere still uses the inverse/reversed image direction and the existing darker rear hierarchy.
- Near face-on front/rear states should fall back to one whole-image draw to avoid wasting mobile GPU/CPU time.

## Constant-speed trajectory
- ORBIT/LOOP must not use easing that slows at segment endpoints and accelerates again.
- One scalar `pathDistance` advances at a fixed rate: **230 px/s** normal, **150 px/s** reduced-motion.
- Straight and hairpin phases are selected by cumulative path length, not equal time slices.
- The elliptical hairpin uses a small arc-length lookup table so progress through the curve is based on travelled distance rather than raw angle percentage.
- No `smoothstep`/ease-in/ease-out is allowed in the current ORBIT/LOOP path.
- Constant speed is a durable visual rule, not a tuning preference.

## Trajectory-coupled turning
- Turning is a **movement geometry problem**, not an independent sprite-rotation problem.
- ORBIT/LOOP use a four-phase racetrack/hairpin path: approach straight → near lateral hairpin → retreat straight → far lateral hairpin.
- During the near hairpin, z is held at the near extreme while the figure crosses laterally and yaw progresses 0→180°.
- The backward/retreat straight may begin **only after** yaw has reached 180°.
- During the far hairpin, z is held at the far extreme while the figure crosses back laterally and yaw progresses 180→0°.
- The next approach straight may begin only after yaw is back at 0°.
- This is the durable interpretation of “it needs width to turn”: the object must physically travel through a curve; it must not rotate on itself.

## SUPERSEDED · independent turn inertia / width gate
- SUPERSEDED: yaw must not be driven as an independent response to a `vz` sign change.
- A change in depth direction starts a turn but the figure must travel spatially before completing it.
- SUPERSEDED: the prior ~1.05 sprite-width yaw accumulator is replaced by explicit lateral hairpin geometry.
- This makes the turn feel like the image has physical width/inertia rather than snapping to a target orientation.
- The mirrored rear representation remains the endpoint; disappearance remains rejected.

## Trail length / spacing
- Slightly wider gaps between complete stamps are preferred if the trail also lives longer.
- Current cadence high/medium/low: **30 / 35 / 42 ms**.
- Current lifetime: **860 ms** normal, **1040 ms** reduced motion.
- Do not achieve length by increasing pool without bound. Tail length must remain compatible with the fixed pool and adaptive quality.

## Coupled darkness / size hierarchy
- The oldest/rearmost trail copy must be **black**.
- The same copy must also be the **smallest**.
- Darkness and scale are coupled progressively: farther/older copies are darker + smaller; newer/front copies are brighter + larger.
- Current temporal scale ramp starts around **56%** on the oldest stamp and reaches roughly **97%** on the newest trail stamp before the full-size head.
- 3D projection/depth may make far copies smaller still.
- The black endpoint is produced from a precomputed brightness-0 sprite, not a runtime filter.

## Trail visibility hierarchy
- The current/head sprite is the visual authority and remains full brightness/full size.
- Trail copies are not equal-strength duplicates: the oldest copy is black and smallest; brightness and scale rise progressively toward the newest copy.
- In pseudo-3D, far/rear depth darkens stamps further.
- This hierarchy exists specifically to prevent the returning/back section of an orbit from reading as a second active face.
- Prefer darkness hierarchy over simply deleting the rear trail, because the residue should remain visible as depth/history.
- Do not use a runtime blur to solve this.

## Performance decision
- Performance degradation must preserve identity in this order: reduce internal render scale / stamp budget / cadence before changing the complete-image-stamp mechanism.
- Mobile rendering intentionally uses controlled internal resolution and adaptive quality instead of device-pixel-ratio oversampling.
- Stamp storage remains bounded through the preallocated pool.
- Depth sorting for the small pool should remain bounded/allocation-light rather than introducing a scene graph.
- Shade variants are precomputed once when the sprite loads; avoid per-stamp filter effects that would repeat work every frame.
- On portrait mobile, promoted variants and motion modes must remain visibly discoverable.

## Session lifecycle
- Reincarnation session reads handoff + repo and WAITS for feedback.
- No implementation until user says ACTUALIZÁ or an unambiguous equivalent.
- Update session persists all meaningful new decisions before final delivery.
- Accepted baseline/favorite may not be silently overwritten by an unreviewed candidate.
