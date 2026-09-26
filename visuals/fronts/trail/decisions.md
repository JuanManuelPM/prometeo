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
`{x,y,z,angle,scale,born}`.

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

## Performance decision
- Performance degradation must preserve identity in this order: reduce internal render scale / stamp budget / cadence before changing the complete-image-stamp mechanism.
- Mobile rendering intentionally uses controlled internal resolution and adaptive quality instead of device-pixel-ratio oversampling.
- Stamp storage remains bounded through the preallocated pool.
- Depth sorting for the small pool should remain bounded/allocation-light rather than introducing a scene graph.
- On portrait mobile, promoted variants and motion modes must remain visibly discoverable.

## Session lifecycle
- Reincarnation session reads handoff + repo and WAITS for feedback.
- No implementation until user says ACTUALIZÁ or an unambiguous equivalent.
- Update session persists all meaningful new decisions before final delivery.
- Accepted baseline/favorite may not be silently overwritten by an unreviewed candidate.
