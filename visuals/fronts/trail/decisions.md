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

## Turn inertia / width gate
- Yaw should not begin and finish merely because `vz` changed sign.
- A change in depth direction starts a turn but the figure must travel spatially before completing it.
- Current rule: hold facing for ~16% of the turn distance, then complete the rotation over roughly **1.05 sprite widths** of combined planar/depth-equivalent travel.
- This makes the turn feel like the image has physical width/inertia rather than snapping to a target orientation.
- The mirrored rear representation remains the endpoint; disappearance remains rejected.

## Trail length / spacing
- Slightly wider gaps between complete stamps are preferred if the trail also lives longer.
- Current cadence high/medium/low: **30 / 35 / 42 ms**.
- Current lifetime: **860 ms** normal, **1040 ms** reduced motion.
- Do not achieve length by increasing pool without bound. Tail length must remain compatible with the fixed pool and adaptive quality.

## Trail visibility hierarchy
- The current/head sprite is the visual authority and remains full brightness.
- Trail copies are not equal-strength duplicates: the oldest copy is deliberately much darker, and brightness rises progressively toward the newest copy.
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
