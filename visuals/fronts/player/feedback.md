# 🖐️ Player / Eye Frame · Durable Feedback

Status: CURRENT

## Latest user direction
The eye-content system should become much richer and more reusable:
- many more animations and color variations;
- colors should be variable-driven rather than one-off hard-coded versions;
- pupil may become black, red, white, slit, dot, or other forms;
- dilation should contain more frames because V24 advanced too quickly;
- the eye itself should be able to become a play/pause button;
- clicking play should reproduce audio, clicking again should pause;
- previous audio visualization language should be reused: waveform / bend-stick / line-boil behavior linked to actual audio amplitude;
- GIF/video may appear inside the eye aperture as the pupil contracts or as a portal state.

## Recovered audio design precedent
Prometeo previously established:
- one real PLAY/audio source feeds shared visualization;
- Web Audio AnalyserNode provides waveform/energy data;
- visual activity follows amplitude/silence;
- line-boil is intentionally quantized at roughly low FPS even if audio analysis runs continuously.

V25 reuses those principles rather than inventing unrelated audio chrome.

## V25
V25 externalizes effect definitions into:
`visuals/eye-frame-lab/eye-effects-v25.json`

The renderer keeps V21 blink independent.

Effects:
- dilate_long: 14 discrete pupil sizes ending in full black;
- contract_red: centered black contraction revealing red;
- scan: stepped low-FPS gaze;
- chromatic: parameterized hue animation;
- audio_player: eye becomes play/pause, browser-local audio loop + AnalyserNode waveform halo;
- media_portal: GIF/video surface inside aperture, with procedural moving fallback;
- glitch: discrete color/shape/gaze changes.

## Fast variables
URL/config overrides:
- effect
- hue
- fps
- media

This allows whole families of examples to change by data/variables instead of renderer rewrites.

## Current review
V25 has been implemented and published for public review. Do not treat it as visually accepted until the user inspects it.
