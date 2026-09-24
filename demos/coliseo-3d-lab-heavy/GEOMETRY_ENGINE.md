# Coliseo Heavy · Geometry Engine H4.1

## Purpose

Turn the heavy visual branch from hand-drawn scene order into a mechanical solid-geometry pipeline.

## Core rule

Semantic objects do not draw themselves.

They register physical solids.

The renderer compiles those solids into visible faces.

## Pipeline

WORLD / fixture semantics
→ world objects
→ solid boxes
→ six candidate faces
→ exact internal-face cancellation
→ back-face culling
→ screen/frustum culling
→ adaptive face subdivision
→ shared opaque painter
→ transparent/effect pass
→ analog post-process

## Solid primitive

Current heavy objects reduce to one reusable solid:

- x / z
- base height
- width
- depth
- height
- local horizontal basis
- material
- seed

Axis-aligned objects and oriented board/gate objects both compile to the same box model.

## Material rule

Solid materials are opaque by default.

A solid stone or structural object is never made visually soft by reducing alpha.

Printmaking character comes from:
- face shading;
- outlines;
- ragged edges;
- restrained surface variation.

Transparency is reserved for semantic transparent primitives such as ghost/blueprint geometry.

## Face generation

Each box generates candidate:
- four side faces;
- top;
- bottom.

The compiler then removes:
- exact coincident internal faces;
- bottom faces;
- side faces pointing away from camera;
- off-screen faces.

## Large-surface subdivision

Large faces are subdivided into smaller quads only when their projected size warrants it.

Current thresholds:
- very small projected face: one quad;
- medium: coarse subdivision;
- large: approximately 0.72 world-unit tiles;
- hard limit: 5×5 tiles per base face.

This exists so one large platform can correctly pass in front of and behind other vertical structures.

## Shared painter

Opaque face items are merged with canonical:
- blocks;
- blueprints;
- workers;
- banners;
- trophies.

Ordering uses:
1. non-overlapping depth intervals;
2. vertical stacking when depth is nearly equal and screen bounds overlap;
3. mean depth;
4. height / projected-Y tie breakers.

This fixes the class of error where the top of a broad base painted over a tower physically standing above it.

## Transparent pass

Ghost/wireframe structures never enter the opaque solid painter.

They are queued separately and rendered after opaque geometry.

The same rule should be used later for:
- blueprints;
- smoke;
- fire;
- glow.

## Resource budget

Current heavy opaque face budget:
- 2400 compiled faces.

Compiler exposes:

`window.WORLD_RENDER_STATS`

including:
- boxes;
- baseFaces;
- culledInternal;
- culledBack;
- faces;
- transparent;
- budget;
- pressure;
- visual mode.

When pressure approaches 1, future geometry must lose detail before the budget grows.

## Dedicated regression scene

Use:

`?visual=occlusion`

The torture scene contains:
- three broad stacked plinths;
- one tall central tower;
- four pillars;
- two crossing beams at different heights;
- front/rear test blocks.

It is designed to reveal:
- wrong face ordering;
- vertical-stack mistakes;
- back-face leakage;
- whole-object sorting regressions.

## Mobile rule

The H3 forced-landscape system remains active:
- portrait viewport becomes virtual landscape;
- app surface rotates;
- pointer coordinates are inversely mapped;
- visualViewport resize is tracked.

## Future extension

The next safe renderer improvements are:
- partial internal-face clipping for overlapping solids with different footprints;
- cached static geometry packets;
- coarse world spatial bins for collision/selection/expensive overlap tests;
- material IDs everywhere instead of ad-hoc hex colors;
- automatic LOD tiers for distant persistent structures.
