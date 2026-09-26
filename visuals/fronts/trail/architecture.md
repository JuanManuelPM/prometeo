# Trail Engine · Architecture Notes

Status: CURRENT
Updated: 2026-09-26

## Core model

Trail is no longer treated as an animation authored separately for each image.

It is two reusable layers:

1. `compileTrailAsset(image)`
   - decode one source image
   - isolate foreground / preserve existing alpha
   - remove gray/white residue and small islands
   - feather only the alpha edge
   - crop transparent bounds
   - resize to a bounded working resolution
   - emit one repo-local transparent production asset

2. `TrailEngine(asset, trajectory)`
   - load that image once
   - reuse the same sprite for every visible copy
   - store only small stamp records: x, y, z, angle, scale, born
   - maintain a bounded preallocated stamp pool
   - expire the oldest stamp
   - keep fast cadence and rebound accumulation
   - adapt internal resolution / stamp budget / cadence before changing the full-stamp identity

The effect therefore does not care whether the asset is WINGS, a mask, a hand, a creature or another cutout.

## Why it is cheap

The engine does NOT create a new image for each trail copy.

One bitmap is loaded. Each stamp is only state:

```js
{x, y, z, angle, scale, born}
```

The pool is fixed-size, so old slots are reused instead of growing memory and triggering unnecessary garbage collection.

The renderer uses controlled internal resolution. Adaptive quality reduces internal scale, maximum active stamps and stamp cadence before sacrificing the visual rule of complete-image copies.

## Pseudo-3D

Pseudo-3D adds one coordinate, `z`, to the same stamp structure.

Projection:

```js
perspective = focalLength / (focalLength + z)
screenX = centerX + (x - centerX) * perspective
screenY = centerY + (y - centerY) * perspective
screenScale = perspective
```

No WebGL or 3D mesh is required.

Depth modes are trajectories that produce `{x,y,z}` over time:

- `2d`: accepted rectangular rebound behavior.
- `approach`: far → near.
- `retreat`: near → far.
- `orbit`: elliptical x/z circulation, passing behind and in front.
- `loop`: figure-eight style trajectory with depth variation.

For 3D modes, stamps are depth-sorted far-to-near before drawing. With a bounded pool of roughly a few dozen stamps, insertion sorting is intentionally cheap and allocation-free.

## Visual rules that remain non-negotiable

- complete-image stamps
- BASE remains available and visually intact
- WINGS remains current favorite / reference
- no sudden horizontal flip
- repo-local production assets
- no visible white/gray rectangles
- fixed or smooth orientation only
- adaptive degradation must preserve the redraw identity

## Current weak point / next reusable function

Asset compilation is the less-general part today.

The target is a robust `compileTrailAsset(image)` that automatically chooses:

- preserve existing alpha when good
- uniform-background color-distance removal when appropriate
- foreground segmentation for complex photographs
- island cleanup
- gray-halo cleanup
- alpha feather
- transparent crop
- bounded resize
- quality checks such as corner alpha and background leakage

Once that is reliable, supplying a new image should be a data operation, not a new animation implementation.
