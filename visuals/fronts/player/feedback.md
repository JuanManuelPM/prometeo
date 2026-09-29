# 🖐️ Player / Eye Frame · Durable Feedback

Status: CURRENT

## Latest user direction
The user rejected the overly smooth procedural-circle feel.

Desired visual language:
- inner-eye animation should feel stepped / low-FPS like the accepted blink;
- pupil does not need to remain a perfect circle;
- pupil and sclera can animate independently;
- black-eye transformation should happen by pupil dilation until it occupies the whole opening;
- inverse transformation can shrink the black pupil while revealing another color, explicitly red as an example;
- all of this must remain independent from V21 blink.

## V24
V24 keeps V21 blink untouched and replaces smooth eye-content interpolation with discrete state sequences rendered on a deliberately low-resolution 24×16 inner surface.

Current sequences:
- look_scan: discrete gaze jumps;
- dilate_to_black: pupil grows by visible steps until full black;
- contract_reveal_red: black contracts while red is revealed in the freed area;
- slit_breathe: circle → oval → slit → thin slit;
- inverse_scan: black sclera + stepped white pupil.

The low-res inner surface is enlarged with nearest-neighbor sampling and then clipped by the real aperture mask derived from each current V21 frame.

## Local review
A contact sheet of every V24 sequence step was generated and visually inspected before publication.

Observed result:
- gaze movement reads as discrete rather than smoothly interpolated;
- dilation visibly advances in size stages;
- red reveal preserves the centered shrinking pupil idea;
- slit transformations read as distinct morphology states;
- inverse mode remains legible.

Result: PASS_LOCAL_VISUAL_QA.

## Current review target
Review the public V24 vocabulary. Do not reopen the accepted V21 blink unless new evidence shows a blink defect.
