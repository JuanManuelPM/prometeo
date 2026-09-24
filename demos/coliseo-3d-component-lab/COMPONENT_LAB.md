# Coliseo Component Lab · V1.2

## Purpose

This lab separates visual review into exactly three surfaces:

1. Structures
2. Workers
3. Signs + fire

The goal is to stop debugging geometry, character animation and effects inside one noisy scene.

## 1. Structures

This is the primary geometry regression surface.

Rules:

- no workers;
- no construction loop;
- no ritual;
- no live/synthetic dependency traffic;
- no effect clutter;
- automatic camera rotation by default;
- manual drag temporarily pauses rotation;
- `?spin=0` disables autorotation.

Every displayed structure is built from the same modular physical primitive.

### Single structure primitive

All structure builders call:

`componentModuleBox(...)`

The primitive decomposes requested solids into modules no larger than approximately:

`0.72 world units`

This intentionally copies the behavior that already works well for construction blocks.

Large bases are not rendered as one monolithic cuboid.

A broad platform is physically represented as many small solids.

This gives the painter local depth information instead of asking one giant object to choose a single global depth.

### Same projection rules everywhere

Every module:

- exists in world space;
- uses the same camera projection;
- generates the same six candidate faces;
- receives the same back-face culling;
- participates in the same internal-face cancellation;
- uses the same opaque face renderer;
- uses the same depth ordering.

Gate, bridge, monument, workshop and archive do not implement private projection rules.

### Face-switch rule

Side-face visibility is determined by the exact camera-facing sign:

`dot(faceNormal, cameraDirection) > 0`

There is no visibility dead-band.

The previous threshold could create a small angular interval where one face disappeared before its opposite became valid.

The intended behavior is mechanical:

- old face compresses toward zero width;
- at edge-on it vanishes;
- opposite face grows from zero width.

### Stable ordering rule

The structures screen deliberately does not use the pair-dependent H4 comparator.

That comparator could produce unstable ordering because A-vs-B, B-vs-C and A-vs-C could select different tie rules.

All component structures are small modules, so ordering can use the same stable concept as the working construction blocks:

1. module camera depth;
2. module base height;
3. face order;
4. stable module ID.

The ordering relation therefore does not change merely because a different third object overlaps on screen.

### Internal faces

Adjacent modules generate matching internal faces.

Matching solid faces cancel before rasterization.

This keeps a modular structure inexpensive while preserving the visual advantages of small blocks.

### Structure gallery

Current prototypes:

- tower / construction blocks;
- broad plinth + central core;
- monumental gate;
- bridge;
- workshop;
- archive tower;
- second tall tower.

The page rotates through all camera angles continuously.

The top badge reports:

- camera angle;
- compiled visible face count.

## 2. Workers

The workers screen contains seven isolated action stations:

- IDLE
- WALK
- DESIGN
- BUILD
- CARRY
- STALE
- DONE

No towers build behind them.

This makes character animation, energy, scale and props independently reviewable.

The workers screen does not autorotate by default because the primary variable under review is animation rather than structure projection.

## 3. Signs + fire

This screen isolates:

- three physical signs at different world angles;
- projected text;
- several torch/fire intensity variants;
- one larger burning-mass experiment.

It exists to review:

- sign perspective;
- text compression;
- edge-on hiding;
- flame shape;
- glow;
- animation timing;

without workers or construction obscuring the result.

## Performance discipline

The static background is cached.

Camera rotation does not repaint the entire backdrop.

Only the small world registration grid and the reviewed components update while rotating.

The structure geometry compiler still exposes:

`window.WORLD_RENDER_STATS`

## Mobile

The forced-landscape presentation from the heavy lab is retained.

Portrait phone viewport:
- renders a virtual landscape viewport;
- rotates the application surface;
- maps touch coordinates back into landscape space.

## Review rule

A structure is not approved because it looks correct from one angle.

Review while it rotates through:

- front;
- 30–45°;
- side;
- almost edge-on;
- rear;
- opposite side.

Reject if any of these happen:

- a rear face appears through a front solid;
- two faces alternate/flicker around an angle;
- an internal wall becomes visible;
- a broad base covers a structure standing above it;
- a face changes state before it geometrically reaches edge-on;
- an object uses different perspective behavior from the standard blocks.

## Integration rule

Do not repair these bugs inside individual structures.

If a gate fails, first determine which shared rule failed.

Only structure-specific geometry may live in the gate builder.

Projection, culling, material opacity and painter order remain shared renderer responsibilities.


## V2 · Universal occlusion fix

The reason some structures looked correct and others did not was structural, not artistic.

### Why the original construction blocks behaved better

The original tower blocks are:
- small;
- locally regular;
- mostly non-interpenetrating;
- drawn from a limited set of neighboring cells.

That means a coarse painter order often happens to be sufficient.

### Why ARCHIVE / GATE exposed the bug

ARCHIVE has:
- changing footprint by height;
- many vertically overlapping modules;
- broad top surfaces underneath smaller upper levels.

GATE has:
- thick walls/pylons;
- thin bars behind those walls;
- multiple pieces overlapping the same screen pixels at different heights and depths.

A face-level painter still assigns one order to an entire polygon.

That cannot universally solve a case where different pixels of the same polygon have different visibility relationships.

### New universal rule

Opaque solid visibility is now solved per pixel with a real depth buffer.

The structures screen uses an off-screen WebGL surface only for opaque physical solids.

The 2D illustrated layer remains responsible for:
- background;
- labels;
- workers;
- fire;
- semantic effects;
- analog post-processing.

### Projection compatibility

The WebGL renderer does NOT introduce a new camera.

Screen coordinates use the exact existing projection:

```
screenX = centerX + rotatedX * scale
screenY = centerY + forward * scale * 0.35 - height * scale * 0.57
```

The missing depth coordinate is the orthogonal companion:

```
cameraDepth = forward * 0.57 + height * 0.35
```

This is crucial.

The old renderer mostly ordered by forward distance alone.
That is why a low foreground base could incorrectly cover a taller object standing above it.

The new depth value includes both:
- horizontal forward distance;
- world height.

### Z-buffer behavior

For every opaque triangle:
- vertices receive screen X/Y;
- vertices receive camera depth;
- depth is interpolated across the triangle;
- each pixel keeps only the nearest solid fragment.

Therefore:
- gate bars behind a stone pylon cannot leak through it;
- rear blocks cannot appear over front blocks;
- a lower platform cannot paint over a tower standing above it;
- overlapping archive tiers resolve locally per pixel;
- object creation order becomes irrelevant.

### Structural edges

Physical ink edges are rendered in the same WebGL depth buffer after fills.

Hidden edges therefore cannot appear through opaque walls.

### Fallback

If WebGL is unavailable, the component lab falls back to the previous CPU face painter.

The fallback is retained for compatibility, not as the target renderer.

### Architectural consequence

The geometry author now only declares:
- box dimensions;
- position;
- rotation basis;
- material.

It does NOT decide:
- which object is in front;
- which wall should hide a bar;
- whether a higher block should win;
- draw order.

Those are renderer responsibilities.

This is the universal mechanism to carry forward into WORLD.


## V3 · One-page lab

The preferred review surface is now the Component Lab itself.

It contains four tabs:

- structures;
- workers;
- effects;
- maps.

The standalone experimental map/effect pages are not the preferred review path.

### Maps

The Maps tab embeds the exact canonical Coliseo implementation from:

`/demos/coliseo-3d/`

Pinned canonical content marker:

`8ef25c0a`

Reason:

The simplified experimental map renderer introduced visual regressions that were already solved in the canonical Coliseo. The lab must reuse the known-good map instead of reimplementing it.

Future maps should be added to the Maps tab/registry only after they inherit the same renderer rules.

### Effects

The Effects tab keeps the existing physical sign/fire test scene and adds a fullscreen WebGL post-process pass.

Presets:

- clean;
- pixel crunch;
- PSX wobble;
- dither fog;
- tape damage;
- nightmare.

Implemented techniques:

- low-resolution pixel crunch;
- color quantization;
- ordered 4×4 Bayer dithering;
- screen-space wobble / tracking tears;
- RGB channel separation;
- temporal grain;
- scan modulation;
- vignette;
- posterized luma response;
- optional projection snapping for the PSX preset.

The geometry scene is still generated normally first.

Then the whole frame is uploaded as one texture and processed in one fullscreen shader pass.

This keeps the weird-camera look separate from geometry correctness.

### Research basis

The effect vocabulary is based on techniques repeatedly used in contemporary retro/indie rendering:

- camera-level pixel crunch and distortion;
- low color depth;
- ordered dithering;
- vertex/projection snapping;
- fog / visibility reduction;
- CRT/VHS-style tracking and color damage.

The goal is not to reproduce one game's exact style. The lab exposes the underlying techniques as reusable controls.


## V4 · Mobile-first one-page shell

The Component Lab is now a true single-page switcher.

### Mobile layout fix

The portrait fallback no longer rotates the entire application.

Only the world surface (`#wrap`) rotates into virtual landscape.

The UI remains upright in physical screen space.

This fixes the previous mobile failure where:
- the top navigation became a vertical stack after rotation;
- effect controls overlapped the scene;
- controls consumed too much of the narrow phone viewport.

### Swipe picker

One horizontally scrollable bottom picker replaces the stacked navigation bars.

It switches in place between:
- Structures
- Workers
- Effects
- Maps

Effects expose their presets inside the same picker.

No page reload is required for mode/preset changes; URL state is updated with history.replaceState.

### Effect framing

The effects gallery now recomputes its camera framing from the gallery world bounds at every yaw.

It calculates the projected bounds first, then derives scale and center so the whole scene stays inside a safe viewport region.

This removes the old bottom-left drift/cropping on narrow mobile screens.

### Effect renderer additions

The fullscreen pass now also supports:
- mild barrel / lens curvature;
- moving tracking-roll bands.

Existing:
- screen-space pixel crunch;
- color quantization;
- Bayer dithering;
- projection snapping;
- chroma separation;
- temporal grain;
- scan modulation;
- posterization;
- vignette.

### Maps

Maps remains inside Component Lab.

The currently approved map is the existing canonical Coliseo, embedded without its duplicate outer UI.

Future maps should join this same selector rather than creating separate standalone labs.


## V5 · Shared renderer enforcement

### Correction

Earlier documentation overstated renderer unification.

Before V5:
- Structures used the WebGL depth renderer.
- Effects still built physical signs/pedestals with older 2D cuboid routines.
- Fire was a screen-space overlay.
- Worker props also used older 2D cuboids.
- Maps intentionally embedded the legacy canonical Coliseo.

That meant the claim that every Component Lab physical object used the same renderer was not yet true.

### V5 contract

All **new Component Lab physical solids** now use:

`componentModuleBox -> addWorldBox -> renderWorldSolidsGL`

This covers:
- Structures;
- effect sign posts;
- effect sign panels;
- torch pedestals;
- burning fuel blocks;
- worker physical props.

Runtime contract marker:

`prometeo.component_renderer/v1`

### Fire / emissive rule

Fire is no longer drawn as a 2D overlay in the Effects screen.

Emissive flames:
- exist at world coordinates;
- use the same camera projection;
- are drawn into the same WebGL depth buffer after opaque solids;
- use blending with depth writes disabled;
- are therefore hidden automatically by walls/solid geometry in front of them.

This prevents the repeated class of bug where fire or a bar visually leaked through a nearer wall.

### Mobile landscape shell

In portrait the **entire logical application** rotates as one landscape surface:
- world;
- UI;
- picker;
- badges.

The logical viewport dimensions are still width=physical-height and height=physical-width.

The previous V4 split, where only the world rotated and the UI stayed portrait, has been removed.

### Stable effect selection

Changing an effect preset no longer calls resize or resets camera framing.

Only the shader configuration changes.

### Legacy map exception

Maps still embeds the exact canonical Coliseo implementation.

It is deliberately preserved because that renderer is already visually approved.

Do not describe it as using `prometeo.component_renderer/v1` yet.

Future newly-authored maps should use the shared Component renderer unless/until the canonical Coliseo is explicitly migrated.


## V6.1 · Circular Coliseo world contract

The Component Lab returns to the canonical circular Coliseo as the shared visual world.

### Canonical shell

The lab now reuses the last approved pre-branch Coliseo backdrop logic:
- elliptical arena;
- terraced stands;
- rear wall;
- arches;
- pilasters;
- rotating open/cut front section;
- cut edges.

The previous neutral flat component floor is removed.

### Ring layout

Structures, workers and effect stations no longer use linear rows.

They occupy stable angular slots around the interior edge of the arena.

Shared helpers:

- `slotFrame()`
- `slotPoint()`
- `slotBox()`
- `slotFrontness()`

Every slot supplies:
- angle;
- radius;
- tangent orientation;
- inward radial direction.

The camera rotates around the same world, so near sectors become readable while far sectors naturally recede.

### One camera

All modes use:
- the same `yaw`;
- the same `zoom`;
- the same `cx/cy`;
- the same `scale`;
- the same projection equations.

Changing modes does not reset zoom.

The special Effects camera / `fitEffectsCamera()` has been deleted.

### Shared physical path

All newly-authored physical Component objects use:

`slotBox -> componentModuleBox -> addWorldBox -> renderWorldSolidsGL`

This includes:
- circular structure prototypes;
- worker station platforms and props;
- effect panels;
- effect posts;
- torch/fuel blocks.

### Shared emissive path

World fire uses:
- world coordinates;
- the same projection;
- the same depth buffer;
- depth-tested additive blending.

### Shared effects rule

Effects do not own a camera.

Projection snapping, when enabled by an effect preset, happens inside the shared solid projection rather than through a parallel renderer.

Fullscreen post effects still happen after the complete world frame.

### Maps

Maps is no longer a separate iframe.

The Maps mode displays the same canonical Coliseo shell inside the same page and same camera contract.

Future maps must plug into the same world contract rather than creating separate pages/renderers.

### Runtime contract

`prometeo.component_world/v2`
