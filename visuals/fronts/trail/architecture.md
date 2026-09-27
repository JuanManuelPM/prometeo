# Trail Engine · Architecture Notes

Status: CURRENT
Updated: 2026-09-27

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
- `orbit`: racetrack/hairpin circulation with explicit approach, turn, retreat and return phases.
- `loop`: hairpin circulation with additional vertical weaving while preserving the same turn/retreat invariants.

For 3D modes, stamps are depth-sorted far-to-near before drawing. With a bounded pool of roughly a few dozen stamps, insertion sorting is intentionally cheap and allocation-free.

## 2.5D turning is trajectory geometry

Yaw remains part of the trajectory, but the turn geometry is now a **broad racetrack in X/Z** instead of a flattened screen-space hairpin.

For ORBIT/LOOP:

```text
left straight toward camera, yaw 0°
→ broad near semicircle in X/Z, yaw 0→180°
→ right straight away from camera, yaw 180°
→ broad far semicircle in X/Z, yaw 180→0°
→ left straight again
```

Turn radius is responsive:

```js
radiusPx = clamp(min(W * 0.30, H * 0.46), 130, 230)
depthScale = clamp(min(W, H) * 0.30, 92, 140)
radiusZ = radiusPx / depthScale
```

That means the curve consumes real horizontal space and real depth-equivalent distance. It is not allowed to rotate in place or make a tight screen-space U.

Constant speed is preserved:

```js
pathDistance += PATH_SPEED * dt
angleOnTurn = distanceIntoTurn / turnMetricRadius
```

A larger radius therefore takes longer solely because the semicircle is longer. There is no easing, pause, or acceleration at the straight↔turn joins.

LOOP may add a vertical lane transition during the semicircle, but `turnMetricRadius` includes that vertical component so the same constant-distance rule still applies.

The key invariant remains:

> **The retreat/backward straight starts only after the near semicircle is complete and yaw is already 180°.**

### Curved sprite surface

Whole-sprite horizontal compression is no longer used for 3D yaw. That paper-thin model is superseded.

During a visible turn, the sprite is split into vertical source strips and projected over a curved 2.5D surface:

```js
SURFACE_CURVE = 1.05
sliceCount = qualityLow ? 7 : qualityMedium ? 9 : 11
x = radius * (sin(sideAngle + localPhi) - sin(sideAngle))
```

Important consequences:
- front/rear face-on states still use one whole-image draw call;
- during yaw, strips wrap around a curved surface rather than globally collapsing width;
- at ~90° yaw, the projected surface keeps visible profile thickness;
- strip height and alpha vary slightly by local facing to reinforce volume;
- rear hemisphere reverses source-strip order and keeps the existing darker rear treatment;
- adaptive quality lowers strip count to contain mobile cost.

This is deliberately a cheap 2.5D cylinder/sphere-like illusion, not WebGL or a mesh asset pipeline.

## Dragon / worm body

ORBIT/LOOP no longer treat the body as a historical trail.

The body is a deterministic set of delayed samples from the **same trajectory function as the head**:

```js
head = hairpinPose(pathDistance)

for (i = 1; i <= bodyCount; i++) {
  body[i] = hairpinPose(pathDistance - i * DRAGON_SPACING)
}
```

This means every segment enters the straight, semicircle, depth reversal and return at exactly the same spatial points as the head. There is no independent sine offset, no shortcut path, and no tail drift.

Current adaptive body:

```js
DRAGON_SPACING = 18px       // 20px reduced-motion
bodyCount = 26 / 32 / 38    // low / medium / high quality
```

At high quality the body spans roughly **684 px of trajectory** behind the head. Reduced-motion low quality spans ~520 px.

The ORBIT/LOOP endpoint hierarchy is:

```js
brightness = oldest ? 0 : ...
scale = lerp(.16, .98, pow(trailT,.62)) * depthScale
```

So the tail terminates in a tiny black segment rather than another competing face.

### Rendering / performance

ORBIT/LOOP use a preallocated 40-slot body buffer. They do **not** create historical stamps and do not run stamp aging for the worm body.

Each frame:
1. advance one `pathDistance`;
2. sample 26–38 delayed positions from cached `hairpinPose()`;
3. depth-sort the preallocated references;
4. draw the newest ~16% with curved strips;
5. draw the older small/dark majority with one `drawImage` each.

This is both more faithful and cheaper than maintaining a separate animated tail. The accepted 2D mechanism remains unchanged; CERCA/LEJOS keep their historical distance-stamp trail.

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

## Coupled trail darkness + size

The tail hierarchy is now two-dimensional: brightness and size move together.

```js
ageCurve = pow(trailT, 0.72)
brightness = oldest ? 0 : lerp(0, 0.92, ageCurve) * depthDarkening
scale = orbitOrLoop ? lerp(0.16, 0.98, pow(ageT,.62)) * depthScale : pseudo3D ? lerp(0.22,0.98,pow(ageT,.62))*depthScale : lerp(0.56,0.97,ageCurve)
```

Therefore:
- oldest/rearmost stamp = literal black silhouette;
- oldest/rearmost stamp = smallest temporal stamp;
- newer stamps get both brighter and larger;
- far 3D depth can reduce size further through projection.

The precomputed shade bank now includes a true black endpoint:

```js
SHADE_BRIGHTNESS = [0, .12, .24, .38, .52, .68, .82, .92]
```

This avoids per-stamp filter work while making the visual hierarchy unambiguous.

## Trail brightness hierarchy

The trail has a temporal visual hierarchy, not equal-strength duplicates.

- Current head: full brightness.
- Oldest stamp: 0% brightness (black).
- Newer stamps: progressively brighter and larger up to roughly 92% brightness / 97% temporal scale before the head.
- In pseudo-3D, larger/farther `z` multiplies in additional darkening.

To keep this cheap, Trail precomputes a small bank of seven shaded sprite canvases once when an asset loads:

```js
SHADE_BRIGHTNESS = [0,.12,.24,.38,.52,.68,.82,.92]
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
