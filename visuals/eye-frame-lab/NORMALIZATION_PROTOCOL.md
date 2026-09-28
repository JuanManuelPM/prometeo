# Sprite normalization protocol

Use this before any sprite-grid animation is integrated into a visual.

## Stages
1. **Ingest / split**: identify rows and columns, then separate frames without animating them.
2. **Mask / detect**: derive the visible-content mask from alpha when available; otherwise estimate background from corners.
3. **Measure**: record content bbox, centroid, size and candidate semantic landmarks.
4. **Choose anchor**:
   - simple symbols: bbox center;
   - organic blobs: alpha centroid;
   - eye frames: lower liner / eye corners;
   - hands: wrist or palm pivot;
   - bodies: feet, hips or torso pivot;
   - faces: eye/nose landmarks.
5. **Normalize**: translate each frame into one fixed canvas against one common target anchor. Do not scale unless size drift is a real source defect and the correction is explicitly bounded.
6. **Residual pass**: re-measure normalized frames and correct the remaining translation error.
7. **QA before animation**:
   - anchor jitter within tolerance;
   - no clipping at canvas edges;
   - stable scale unless intended;
   - onion-skin inspection;
   - individual-frame grid inspection.
8. **Export**: only after QA passes, generate a grid/strip and runtime animation.

## Eye V15
The current eye uses `lower_liner_median` as the semantic anchor because the lower white liner stays visually stable while the upper lid changes during the blink.

The local QA result before publication was:
- 10 frames;
- normalized canvas: 512×512 per frame;
- maximum anchor jitter: 1 px;
- scale normalization: none;
- QA: PASS.

The published review sprite is a downsampled 5×2 sheet with 128×128 cells. Downsampling happens only after alignment, never before measurement.
