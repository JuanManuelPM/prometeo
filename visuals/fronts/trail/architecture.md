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
   - store only small stamp records: x, y, z, angle, yaw, scale, born
   - maintain a bounded preallocated stamp pool
   - expire the oldest stamp
   - keep fast cadence and rebound accumulation
   - adapt internal resolution / stamp budget / cadence before changing the full-stamp identity

The effect therefore does not care whether the asset is WINGS, a mask, a hand, a creature or another cutout.

## Why it is cheap

The engine does NOT create a new image for each trail copy.

One bitmap is loaded. Each stamp is only state:

```js
{x, y, z, angle, yaw, scale, born}
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

## 2.5D yaw / mirrored rear proxy

A single front-facing cutout has no real backside texture. When pseudo-3D motion goes away from the camera, Trail simulates a vertical-axis turn and then reuses a mirrored, darkened version as the rear proxy instead of making the object disappear.

```js
if (depthDirectionChanged) {
  yawFrom = yaw
  yawTravel = 0
}

yawTravel += planarDistance + depthDistanceEquivalent
required = max(72px, spriteWidth * 1.05)
hold = required * 0.16
progress = smoothstep((yawTravel - hold) / (required - hold))
yaw = lerpAngle(yawFrom, yawTarget, progress)
```

Rendering uses:

```js
scaleX = max(profileFloor, abs(cos(yaw)))
mirror = cos(yaw) < 0
rear = clamp(-cos(yaw), 0, 1)
rearAlpha = lerp(1.0, 0.68, rear)
rearBrightness = lerp(0.90, 0.46, rear)
```

This makes rotation **distance-gated rather than time-rate driven**: the sprite must physically travel about one own-width to finish turning, with a short facing hold before the turn begins.

Consequences:
- front view: normal width, full front texture;
- turning: width compresses smoothly;
- profile: nearly edge-on;
- back hemisphere: mirrored/darkened rear proxy remains visible;
- returning: texture reappears while the sprite reopens.

The canvas applies the mirror only after profile, when projected width is already near zero; this avoids an abrupt visible flip.

Each stamp captures yaw when created, so trail history preserves the orientation of that moment.

2D mode fixes yaw at zero.

## Trail spacing / duration

The current tail tuning intentionally separates stamps a little more while keeping them alive longer:

```js
LIFE_MS = 860        // 1040 reduced motion
high.stamp = 30ms
medium.stamp = 35ms
low.stamp = 42ms
```

Previous values were 720ms lifetime and 24/28/34ms cadence.

The goal is a visibly longer trail with more air between copies, without converting the effect into a sparse chain. Pool size and adaptive stamp limits remain bounded.

## Trail brightness hierarchy

The trail has a temporal visual hierarchy, not equal-strength duplicates.

- Current head: full brightness.
- Oldest stamp: approximately 22% brightness.
- Newer stamps: progressively brighter up to roughly 90% before the head.
- In pseudo-3D, larger/farther `z` multiplies in additional darkening.

To keep this cheap, Trail precomputes a small bank of seven shaded sprite canvases once when an asset loads:

```js
SHADE_BRIGHTNESS = [.22,.34,.46,.58,.70,.82,.90]
```

Each stamp selects the closest precomputed shade using its chronological trail position plus depth. No per-stamp blur and no per-stamp canvas filter are required.

This specifically prevents an old/rear face from competing with the current face when ÓRBITA or LOOP turns back toward the viewer.

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
