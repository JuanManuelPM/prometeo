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
- Rear hemisphere uses an alpha-derived detail-free backface silhouette. The frontal texture is forbidden on back-facing strips.
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

## Orientation comes from path tangent
- ORBIT/LOOP geometry owns **position only**. Do not hand-code yaw values for straight/near-turn/retreat/far-turn phases.
- `compilePath()` samples the path and derives yaw from the x/z tangent: `atan2(dx, -dz)`.
- Unwrap yaw continuously so a complete circuit advances approximately **0 → π → 2π**.
- The far turn must continue rotation from π toward 2π; **π → 0 is rejected** because it makes the face reappear from the wrong side.
- The renderer must preserve yaw handedness. Folding with `acos(cos(yaw))` is rejected.
- Head and body use the same `samplePath(distance)`; body segments differ only by distance offset.
- Compile/caching belongs outside the frame loop when possible. Current path LUT = **384 samples** per viewport/mode.

## Backface is always pure black
- Every rear-facing surface uses **exact `#000000`**.
- Rear color never depends on trail brightness, depth, age, body segment, or head/body status.
- Do not compute a rear gray value.
- Do not select a rear shade index from brightness.
- Durable source rule: `backSource = backShadeSprites[0]`.
- Front hierarchy may still vary brightness normally; this rule applies only to the rear side.

## Rear resource simplification
- Since rear material is invariant `#000000`, a rear shade bank is unnecessary.
- Keep one `blackBackSprite` generated from source alpha.
- All rear-facing strips/full-rear draws use that one bitmap.

## True backface, no frontal texture on retreat
- A darkened or mirrored frontal image is **not** a valid rear side.
- Trail must generate a separate rear silhouette from the sprite alpha; it contains no eyes, mouth or internal frontal detail.
- During curved yaw, each strip decides its source from its local normal:
  `localFacing = cos(yaw + localPhi)`.
- `localFacing >= 0` → frontSource.
- `localFacing < 0` → backSource.
- At full retreat (`yaw = π`) **zero visible strips may sample frontSource**.
- Cheap/far body rendering follows the same hemisphere rule: rear → backSource only.
- Back silhouettes are generated once per asset load; do not add external rear assets or per-frame filters.

## Worm body follows the head path
- ORBIT/LOOP body is **not** a free trail and must not have an independent wobble.
- Every body segment uses the exact same trajectory function as the head.
- Durable rule: `segment(i) = hairpinPose(pathDistance - i * DRAGON_SPACING)`.
- Current adaptive counts: **26 / 32 / 38** segments for low/medium/high quality.
- Current spacing: **18 px** normal, **20 px** reduced-motion.
- High quality therefore spans roughly **684 px** of path behind the head.
- The oldest segment is exact black and approximately **16%** temporal scale.
- ORBIT/LOOP do not need historical stamp creation or aging for their body; recomputing delayed trajectory samples is cheaper and guarantees path fidelity.
- 2D keeps the accepted old-redraw stamp mechanism. CERCA/LEJOS may keep historical distance stamps.

## Dragon-tail hierarchy / optimization
- Pseudo-3D trail pieces must not use yaw/depth transparency. The cutout may retain its source alpha edge/background transparency, but the rendered body itself stays opaque.
- Oldest ORBIT/LOOP body segment = exact black + approximately **16%** temporal scale.
- Size and darkness remain coupled, but brightness recovers somewhat faster than scale so the black tip is concentrated at the end of the tail.
- Pseudo-3D stamps are created by **distance travelled**, not elapsed milliseconds: **12 px** normal / **14 px** reduced motion.
- SUPERSEDED: independent tail sine/wobble is rejected for ORBIT/LOOP because every segment must follow the exact head trajectory.
- Curved 7–11-slice projection is reserved for the head and newest ~18% of trail.
- Old small/dark stamps use one `drawImage` with a side-profile width floor around 30%, preserving volume while removing most slice draws.
- 2D baseline keeps its existing time-based stamp cadence and prior hierarchy.

## Coupled darkness / size hierarchy
- The oldest/rearmost trail copy must be **black**.
- The same copy must also be the **smallest**.
- Darkness and scale are coupled progressively: farther/older copies are darker + smaller; newer/front copies are brighter + larger.
- In pseudo-3D the temporal scale ramp now starts around **22%** on the oldest stamp and reaches roughly **98%** on the newest trail stamp before the full-size head. 2D keeps the prior hierarchy.
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
