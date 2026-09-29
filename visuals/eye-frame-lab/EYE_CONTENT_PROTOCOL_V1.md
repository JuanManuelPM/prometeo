# Eye Content Protocol V1

Status: CURRENT CANDIDATE · V23

V21 blink stays as the accepted top layer. V23 adds a separate procedural eye-content layer behind it.

## Core rule
Blink geometry and eye-content motion are independent systems.

## Aperture masking
V23 derives the visible opening from every real V21 frame instead of hard-coding an ellipse:
1. decode the real V21 frame alpha;
2. treat visible frame pixels as barriers;
3. dilate the barrier by one pixel to close antialias gaps;
4. find transparent connected components;
5. discard components touching the canvas edge;
6. use the largest enclosed component as the eye aperture;
7. if none exists, the eye is closed.

This makes the content follow the actual accepted eyelid shape automatically.

## Procedural eye state
The inner eye is parameters, not another sprite animation:
- fill / sclera color;
- pupil color;
- normalized x/y gaze;
- normalized pupil radius;
- pupil shape.

Modes currently available:
neutral, left, right, up, down, small, large, dilate, wander, slit, all_black, inverse, all_white.

Movement limits and pupil scale are derived from the default aperture geometry.

## Composition
1. procedural content
2. current-frame aperture mask
3. accepted V21 frame/blink above

## Rules
- never bake gaze into blink frames;
- never move the blink to compensate for pupil motion;
- never regenerate blink just to change pupil behavior;
- keep blink timing data-driven from V21;
- keep eye content parametric and independent.
