# Sprite runtime protocol V21

The eye runtime no longer consumes a generated grid, PNG sequence, JPEG atlas, or binary image file.

Pipeline:
AUTHORING → SPLIT → MASK → MEASURE → SEMANTIC ANCHOR → NORMALIZE → RESIDUAL QA → VISUAL QA → INDEXED/RLE PACK → RUNTIME.

Runtime source of truth:
- `sprite-pack-v21.json`: logical size, pivot, palette, normalized frame data, checksums and animation timing.

Frame representation:
- indexed black/white palette with alpha levels;
- RLE stored as base64 text containing `[count, palette_index]` byte pairs;
- exact byte length and SHA-256 for every frame;
- 128×128 logical canvas;
- pivot `[64,86]`;
- semantic source anchor `lower_liner_median`;
- no runtime crop, centering, scaling or atlas slicing.

Runtime behavior:
1. Fetch one JSON pack.
2. Validate schema, logical size, frame IDs and animation references.
3. Decode each base64 RLE byte stream.
4. Verify byte length, SHA-256, palette indices and exact pixel count.
5. Decode frames once to offscreen canvases.
6. Draw the default frame only after the whole pack passes.
7. Advance animation using `performance.now()` + `requestAnimationFrame`.

This removes the binary transport class of failures that broke earlier versions and also removes hard-coded atlas rows, columns, frame rectangles, frame count and durations from the renderer.
