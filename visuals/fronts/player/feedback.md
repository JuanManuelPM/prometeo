# 🖐️ Player / Eye Frame · Durable Feedback

Status: CURRENT

## Latest user direction
The eye-content system should become substantially more expressive without generating a new sprite sheet for every effect.

Requested examples:
- eye itself becomes a play button;
- click/tap starts audio and second tap pauses it;
- reuse previous Prometeo audio-motion lines;
- arbitrarily many animations/colors should come from variables rather than new assets;
- pupil can become black or any other state;
- moving GIF/video can appear inside the pupil;
- moving media can be revealed behind a shrinking pupil;
- pupil dilation needs many more intermediate frames because V24 advanced too quickly.

## V25 response
V25 introduces a data-driven interactive eye-scene engine.

The eye is now the play/pause control.

V25 reuses:
- Bent Sticks / local WAV / Web Audio AnalyserNode ideas from `strategy/audio-viz-lines/`;
- independent media-behind-eye-window pattern from `visuals/mask-eye-lab/`.

Scene definitions were separated into `eye-scenes-v25.js`, so FPS, step count, hue, media URL, gaze paths and many visual parameters can change without rewriting the renderer.

## Dilation
Default dilation increased from a short stepped sequence to **24 discrete steps**, followed by a black hold.

## Red contraction
Default contraction uses **22 discrete steps**, revealing red behind the shrinking black pupil.

## Media
Two examples:
- moving media revealed behind a shrinking pupil;
- moving video used as the pupil itself.

A synthetic moving texture is the fallback if remote media is unavailable.

## Audio
The audio example:
- shows play while paused;
- generates the demo WAV locally;
- starts on eye tap;
- uses Web Audio analysis;
- renders a compact low-resolution Bent Sticks family inside the aperture;
- pauses on second tap.

## Local QA
JS syntax was checked.
A contact sheet inspected representative states of audio, dilation, red contraction, shape morph, gaze and hue cycles.
Result: PASS_LOCAL_VISUAL_QA.

## Review boundary
V21 blink remains accepted and unchanged.
Public V25 review is about the inner-eye scene vocabulary and controls.
