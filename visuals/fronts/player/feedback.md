# 🖐️ Player / Eye Frame · Durable Feedback

Status: CURRENT

## Latest user feedback
The user repeatedly observed failures in the public eye lab: bad crop, jitter, all-black output, gray/error states, and later a gray canvas even after loader validation. The user explicitly asked to stop patching symptoms and redesign the animation/publishing strategy like a small reliable game-engine asset pipeline.

## Engineering diagnosis
The previous architecture mixed too many responsibilities:
- generated grid as runtime asset;
- runtime knowledge of atlas geometry;
- crop/alignment concerns leaking into rendering;
- binary image transport through fragile text/plugin paths;
- chained sleeps for animation timing;
- hash equality being treated as if it proved visual correctness.

## V21 current design
V21 deliberately removes the fragile parts.

Pipeline:
**AUTHORING → SPLIT → MASK → MEASURE → SEMANTIC ANCHOR → NORMALIZE → RESIDUAL QA → VISUAL QA → INDEXED/RLE PACK → RUNTIME**

The eye is aligned before runtime:
- semantic vertical anchor: lower white liner median;
- common horizontal center;
- 512×512 normalization canvas;
- no scale normalization;
- residual correction pass;
- measured maximum anchor jitter: 1 px;
- QA tolerance: 3 px.

Runtime:
- fetches one text JSON pack;
- validates schema/logical size/frame IDs/animation references;
- each normalized frame is indexed black/white + alpha palette data;
- RLE byte pairs are transported as base64 **text**, not as PNG/JPEG/WebP;
- every frame has byte length + SHA-256;
- runtime verifies checksum, palette indices, exact 128×128 pixel count;
- frames decode once into offscreen canvases;
- default frame is drawn only after the whole pack passes;
- animation timing comes from data;
- animation advances from performance.now() + requestAnimationFrame;
- renderer has no atlas row/column/crop/frame-count/timing constants.

## Rejected approaches
- raw generated grid as runtime source;
- per-frame crop/center repair in runtime;
- hard-coded 5×2 or 10×10 atlas geometry;
- embedded large binary base64 image data URI;
- external binary sprite transport as the only source of truth;
- chained sleep()/setTimeout frame progression;
- treating branch/blob equality as visual QA.

## Player
The main Player remains untouched. V21 must first be reviewed in isolation.
