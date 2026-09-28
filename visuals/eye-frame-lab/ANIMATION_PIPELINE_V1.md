# PROMETEO · Sprite Animation Pipeline V1
Status: CURRENT · reusable protocol
Date: 2026-09-28

This document records the full engineering path that finally produced a stable blink animation in the eye isolation lab. It exists so the same mistakes are not repeated with eyes, hands, masks, characters, creatures or future generated sprite grids.

## 1. The core lesson

A generated grid is **authoring input**, not runtime truth.

The correct lifecycle is:

**AUTHORING → SPLIT → MASK → MEASURE → SEMANTIC ANCHOR → NORMALIZE → RESIDUAL QA → VISUAL QA → PACK → VALIDATE → RUNTIME → INTEGRATE**

The runtime must consume already-prepared frame data. It must not repair cropping, centering, scaling or geometry while the animation is playing.

## 2. What failed before V21

### V12 · crop/alignment failure
The eye was integrated into the Player too early. The conceptual layer order was reasonable, but the visible frame crop/alignment was wrong.

Lesson:
- byte correctness is not visual correctness;
- do not integrate into the final scene before an isolated sprite passes review.

### V13 · black-screen failure
The isolation lab used an asset/runtime combination that resulted in an effectively black result.

Lesson:
- review backgrounds must contrast with the asset;
- a frame must be visibly rendered immediately after successful load;
- a silent blank canvas is not an acceptable failure mode.

### V14 · visible but unstable
The eye became visible, but frame-to-frame centering was still wrong.

Lesson:
- equal cell dimensions do not guarantee equal visual alignment;
- a spritesheet can be mathematically regular and still jitter badly.

### V15 · alignment pipeline introduced
Frames were processed before runtime:
- split;
- content mask;
- measurements;
- semantic anchor;
- fixed-canvas placement;
- residual re-measure;
- QA.

For the eye, the stable semantic anchor became:
- horizontal center;
- vertical median of the bright lower liner.

Results:
- normalization canvas: 512×512;
- scale normalization: none;
- maximum measured anchor jitter: 1 px;
- tolerance: 3 px;
- QA: PASS.

Lesson:
- alignment should use a meaningful pivot, not blindly the center of the cropped pixels.

### V16 · broken embedded binary transport
A JPEG was embedded in HTML as a large base64 data URI and the committed string became truncated.

Lesson:
- never move large binary image payloads through a text path merely to avoid a file request;
- successful HTML publication does not prove that an embedded binary remained intact.

### V17 · loader validation was not enough
The loader verified HTTP/decode/dimensions, but the public result was still not useful.

Lesson:
- transport validation proves the delivered object is structurally loadable;
- it still does not prove the pixels are the intended pixels;
- visual QA remains a separate gate.

### V18/V19 · remove atlas assumptions
The design moved toward normalized individual frames plus metadata rather than treating a 5×2 sheet as the source of truth.

Lesson:
- atlas/grid geometry is a packing optimization;
- animation logic should operate on frame IDs and timings, not crop rectangles.

### V21 · stable accepted animation baseline
The binary sprite dependency was removed from the runtime entirely.

The current runtime source of truth is:
`sprite-pack-v21.json`

Frames are represented as:
- fixed logical canvas: 128×128;
- indexed black/white + alpha palette;
- RLE byte pairs `[count, palette_index]`;
- RLE transported as base64 **text** inside JSON;
- exact `byte_length`;
- per-frame SHA-256;
- frame ID;
- animation timing in data.

The renderer knows nothing about:
- 5×2 grids;
- rows;
- columns;
- atlas crop rectangles;
- number of frames;
- frame durations.

That information lives in data.

## 3. Why the final alignment works

### 3.1 Split first
Each generated cell/frame is separated before animation.

Never animate directly from the source generation grid.

### 3.2 Build a content mask
When alpha exists, alpha is the primary mask.

If alpha does not exist, estimate the background from known background samples or corners and derive a foreground mask.

The mask is used for measurement, not for runtime repair.

### 3.3 Measure every frame
For each frame record:
- visible bounding box;
- width;
- height;
- centroid;
- semantic landmark candidates;
- distance from all canvas edges.

These measurements expose:
- accidental crop shifts;
- clipping;
- size drift;
- wrong frame segmentation.

### 3.4 Choose the correct semantic anchor
There is no universal "center".

Use an anchor appropriate to the object:

- simple icon/symbol → bounding-box center;
- amorphous blob → alpha centroid;
- eye → eye corners / lower liner;
- hand → wrist or palm pivot;
- face → eyes/nose;
- full body → feet, hips or torso;
- weapon/tool → handle/grip point.

For the current eye, bbox center was not robust because blink height changes drastically. The lower liner stays visually stable while the upper lid moves, so it is a better vertical reference.

### 3.5 Normalize to one logical canvas
All source frames are placed into the same fixed canvas.

For V21 source normalization:
- canvas: 512×512;
- one common target anchor;
- translation only;
- no per-frame runtime scaling.

The actor's origin stays constant while its visual pose changes.

This is the same general principle used by old sprite/metasprite systems: the object's logical position and the visual pieces/frames are separate concepts.

### 3.6 Residual correction pass
After initial placement:
1. re-measure every normalized frame;
2. compute remaining anchor error;
3. apply one final translation correction;
4. re-measure.

Do not assume the first alignment pass is exact after integer rounding.

### 3.7 Fail QA before export
The build must reject frames when:
- anchor jitter exceeds tolerance;
- visible content touches an unsafe border;
- expected frame count is wrong;
- frame IDs are duplicated;
- unexpected scale drift appears;
- a frame is empty;
- a frame is malformed.

For this eye:
- max anchor jitter at source QA: 1 px;
- accepted tolerance: 3 px;
- result: PASS.

### 3.8 Visual QA remains mandatory
Numeric QA cannot replace eyes.

Before runtime integration generate:
- aligned contact sheet;
- onion-skin overlay;
- animated preview;
- individual frame review.

Numeric QA catches geometry errors.
Visual QA catches identity, design and temporal errors.

Both are required.

## 4. Packing strategy

Packing happens **after** alignment and QA.

The pack must never define the geometry of the animation.

Current V21 packing:
- indexed palette;
- alpha levels preserved;
- RLE compression;
- base64 used only to transport the small RLE byte stream as JSON text.

Important distinction:
- base64 image data URI = rejected;
- base64 encoded validated RLE data in structured JSON = accepted.

The latter is not pretending an image binary is HTML. It is a deliberate data format with explicit checks.

## 5. Runtime contract

The runtime is intentionally boring.

Boot sequence:
1. fetch one JSON pack;
2. verify schema;
3. verify logical size;
4. verify frame IDs are unique;
5. verify default frame exists;
6. verify animation frame references;
7. verify durations;
8. decode base64 to bytes;
9. verify byte length;
10. verify SHA-256;
11. verify RLE pair structure;
12. verify palette indices;
13. verify decoded pixel count exactly equals width × height;
14. decode each frame once into an offscreen canvas;
15. only after the **entire pack** passes, draw the default frame;
16. only then allow animation input.

There is no partial-success visual state.

## 6. Animation clock

Do not animate with chained `sleep()` or `setTimeout()` calls.

The runtime uses:
- `performance.now()`;
- `requestAnimationFrame()`;
- a start timestamp;
- cumulative frame durations.

Why:
- delays do not accumulate recursively;
- rendering and logical time remain separate;
- browser stalls do not permanently shift the animation timeline;
- timing data remains outside the renderer.

The renderer answers one question:
**which frame should be visible at this elapsed time?**

## 7. Data-driven animation

Animation definitions live in the pack.

Example concept:

```json
{
  "default_frame": "frame_00",
  "animations": {
    "blink": {
      "loop": false,
      "return_to": "frame_00",
      "frames": [
        {"id":"frame_00","duration_ms":78},
        {"id":"frame_01","duration_ms":68}
      ]
    }
  }
}
```

The renderer does not know that blink has ten frames.

This lets future assets change:
- frame count;
- timing;
- sequence;
- loop behavior;

without rewriting renderer code.

## 8. Position, pivot and animation are separate systems

This is critical for later Player integration.

The pet has a world/screen position.

The eye frame has a pivot relative to the pet.

The pupil will have a position relative to the eye.

Blink changes only the eyelid/frame state.

Blink must **not**:
- move the pet;
- reposition the whole eye to hide jitter;
- alter the pupil's coordinate system;
- modify the actor's world position.

Later:
- pet bob = actor transform;
- pupil look = pupil transform;
- blink = eye-frame animation.

These systems compose; they do not correct one another.

## 9. Hard-coded values removed from the renderer

Rejected renderer constants:
- atlas width;
- atlas height;
- `CELL=128` as crop geometry;
- `COLS=5`;
- `ROWS=2`;
- `FRAME_COUNT=10`;
- hand-written source rectangles;
- hand-written timing arrays.

Allowed runtime facts:
- canvas dimensions obtained from pack;
- frame IDs obtained from pack;
- timings obtained from pack;
- palette/encoding declared by schema.

A renderer may implement an encoding format, but it must not encode knowledge of one particular animation.

## 10. Publication rules learned the hard way

### Bytes
Verify exact created Git blob SHA where possible.

### Structure
Verify text/JSON schema and referenced paths.

### Runtime validation
The browser validates the pack before interaction.

### Branch parity
Verify relevant files match between `main` and `gh-pages`.

### Visual result
A hash can prove that two branches contain the same wrong thing.

Therefore visual review is an independent final gate.

The evidence hierarchy is:

**bytes ≠ structure ≠ decode ≠ visual correctness**

All four matter.

## 11. Reusable pipeline for future generated grids

When receiving a new grid:

### Phase A · Authoring ingest
- preserve original;
- record dimensions;
- record expected grid/sequence when known;
- never overwrite the original.

### Phase B · Segmentation
- identify actual frame regions;
- prefer transparent gutters/content analysis when reliable;
- use equal-grid fallback only when appropriate;
- record how the split was derived.

### Phase C · Measurement
Generate metadata for every frame:
- bbox;
- centroid;
- size;
- margins;
- candidate pivots.

### Phase D · Semantic alignment
Select a stable anchor based on the object.

### Phase E · Normalization
Translate into a common large logical canvas.

Do not resize merely to make frames appear centered.

### Phase F · Residual QA
Re-measure and correct integer-rounding drift.

### Phase G · Visual QA
Contact sheet + onion skin + animation.

### Phase H · Runtime export
Downsample only after alignment if needed.
Encode into the chosen runtime data representation.

### Phase I · Runtime validation
Validate every frame before exposing the actor.

### Phase J · Integration
Only after isolated acceptance add the sprite to the Player/world.

## 12. Current accepted baseline

The user reviewed V21 and said it was **"excelente, muchísimo mejor"** and that the next step can now be the actual eye/pupil work.

Therefore:
- V21 blink animation architecture is the accepted baseline;
- the blink preparation/runtime pipeline must be preserved;
- the next task is not to redesign blink again;
- the next task is to introduce the actual eyeball/pupil as a separate layer behind the already-stable frame animation.

## 13. Non-negotiable rules going forward

1. Never animate the raw generation grid.
2. Never use runtime crop repair as normal behavior.
3. Never use bbox center blindly when a semantic pivot exists.
4. Never let trim change the actor origin.
5. Never pack before normalization.
6. Never integrate before isolated QA.
7. Never treat checksum success as visual acceptance.
8. Never transport large image binaries through fragile text embedding.
9. Never hard-code one animation's atlas geometry in a generic renderer.
10. Never put frame timing in renderer logic when it belongs in data.
11. Never couple actor position, pupil position and eyelid animation.
12. Preserve a reproducible build/QA path for every future sprite.

## 14. Next step

Keep V21's frame animation unchanged.

Add the eye contents as a second subsystem:
- eyeball/sclera behind the frame;
- pupil/iris behind the frame;
- independent eye-content coordinate system;
- frame/mask above;
- blink determines visible aperture but does not own pupil movement.

That next subsystem should be tested in this same isolation lab before returning to the full Player scene.
