# Eye Content Animation Protocol V2
Status: CURRENT CANDIDATE · V24
Date: 2026-09-28

V24 preserves the accepted V21 blink exactly and changes only the independent eye-content subsystem.

## Core visual decision
Do not render the pupil as a continuously interpolated perfect circle.

The inner eye now uses a deliberately low-resolution logical surface (24×16) and nearest-neighbor enlargement into the real aperture. This creates visible stepped changes compatible with the low-FPS blink language.

## Two independent clocks
- V21 blink clock controls eyelid/frame only.
- Eye-content sequence clock controls pupil/sclera states only.

Neither system changes the other system's pivot or geometry.

## Current discrete eye sequences

### look_scan
Stepped center → left-mid → left → center → right-mid → right → center → up → down.

### dilate_to_black
Small black pupil → medium → large → extra large → almost full aperture → entire inner eye black.

### contract_reveal_red
Starts fully black, then the black pupil contracts in discrete sizes while the newly exposed sclera becomes red. The pupil remains centered rather than re-centering against the newly exposed ring.

### slit_breathe
Circle → oval → vertical slit → thin slit → slit → oval.

### inverse_scan
Black sclera with white pupil. The white pupil jumps through discrete gaze positions and can become a slit.

## Rendering pipeline
1. Decode and validate V21 blink pack.
2. Derive per-frame aperture from real V21 alpha.
3. Render inner-eye state on a 24×16 low-res buffer.
4. Upscale with image smoothing disabled into the default eye aperture geometry.
5. Clip the result with the current blink frame's derived aperture mask.
6. Draw current V21 blink frame above it.

## Why low resolution is intentional
This is not a compression workaround. The lower internal resolution acts as a visual quantizer:
- discrete pupil radii;
- discrete gaze positions;
- visible pixel-step shape transitions;
- no web-like smooth vector easing.

## Debug hooks
- ?seq=<sequence_id>
- ?step=<zero_based_step>
- ?noblink=1

These exist only to inspect deterministic states without changing the runtime architecture.
