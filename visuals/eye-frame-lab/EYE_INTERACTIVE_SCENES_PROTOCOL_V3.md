# Eye Interactive Scenes Protocol V3
Status: CURRENT CANDIDATE · V25
Date: 2026-09-28

V25 turns the eye-content layer into a small scene engine while preserving the accepted V21 blink as a completely independent top layer.

## Interaction contract
- The eye itself is the play/pause control.
- When paused, the current eye scene displays a play symbol inside the aperture.
- Tap/click/Space/Enter toggles play/pause.
- Left/right navigation changes examples without modifying V21.
- Blink continues independently from inner-scene playback.

## Reused Prometeo antecedents

### Audio visualization
V25 reuses the design language from `strategy/audio-viz-lines/`:
- locally generated demo WAV;
- Web Audio `AnalyserNode`;
- few thick bent vertical lines;
- energy/frequency-driven motion.

The V25 audio scene compresses that idea into the eye aperture and quantizes it to the same low-FPS visual language as the pupil.

### Media in eye windows
V25 reuses the media strategy already proven in `visuals/mask-eye-lab/`:
- image/video content can live behind a transparent/clipped eye window;
- media playback is independent from the mask/frame;
- external video is optional and has a synthetic moving fallback.

## Scene engine
Scene definitions live in `eye-scenes-v25.js`.

The runtime should not require code changes for basic variations such as:
- number of dilation steps;
- FPS;
- colors;
- hue cycles;
- pupil shape;
- gaze path;
- media URL;
- line count.

Useful URL overrides:
- `?scene=<scene_id>`
- `?fps=<number>`
- `?steps=<number>`
- `?hue=<degrees>`
- `?media=<video_url>`

## Current examples

### play_audio
The paused eye is visibly a play button.
Playing starts a locally generated demo WAV.
The inner eye becomes an audio-reactive Bent Sticks visualization.
Second tap pauses audio and restores the play state.

### dilate_slow
24 discrete dilation frames by default.
The black pupil grows slowly from small to full aperture.
Final state is an entirely black inner eye.
The step count is data-driven and can be overridden.

### contract_red
22 discrete contraction frames by default.
The black pupil starts almost full-size and shrinks while revealing red sclera behind it.

### media_reveal
A moving video/fallback texture exists behind the black pupil.
As the pupil contracts, the moving media is revealed in the released area.

### video_pupil
The sclera remains white while the pupil itself becomes a moving video window.

### hue_cycle
The sclera cycles through arbitrarily many hues using one base hue and one hue-step variable.
This demonstrates that color families do not need new sprite assets.

### shape_morph
The iris/pupil morphs through discrete dot, circle, oval, diamond, slit, cross and star states.

### scan_8way
Discrete low-FPS gaze movement over an explicit path.

### inverse_audio
Black sclera + white audio-reactive bent lines.

## Low-FPS rule
Eye content is intentionally rendered on a small 32×20 logical surface and enlarged with nearest-neighbor sampling.

Temporal motion is also quantized:
`frame = floor(elapsed_ms / frame_ms)`

This keeps inner-eye animation visually compatible with the accepted stepped blink.

## Layer order
1. eye-content scene
2. per-frame aperture mask derived from real V21 alpha
3. accepted V21 blink/frame

## Media/audio independence
- Audio playback does not own blink timing.
- Video playback does not own blink timing.
- Pausing the eye scene does not freeze the eyelid system.
- Eye-content state never shifts V21 pivots.

## Permanent design rule
If a visual effect can be represented as parameters or a small logical layer, do not generate a new sprite grid for it.
Use sprite frames only where frame-authored shape change is genuinely needed.
