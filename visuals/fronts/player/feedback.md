# 🖐️ Player / Eye Frame · Durable Feedback

Status: CURRENT

## Latest user direction
The eye should follow the mouse/pointer.

The user specifically asked:
- pupil should track the mouse;
- clicking the eye can dilate the pupil until the eye turns black;
- clicking can change eye color;
- clicking can change pupil/eye type;
- these style changes must **not** stop gaze tracking;
- the pupil should stay where the pointer is while color/type changes happen.

## V26
V26 extends the current V25 interactive scene engine instead of replacing it.

New pointer scenes:
- pointer_follow
- pointer_dilate
- pointer_color
- pointer_shape
- pointer_combo

## Important behavior
Pointer position is its own authority.

Style state is separate:
- color;
- morphology;
- dilation state.

Therefore changing color or shape does not recenter the pupil.

## Low-FPS pointer language
Pointer tracking is intentionally not raw 60/120 Hz smooth motion.

Default:
- pointer sampling: 9 FPS;
- horizontal gaze lattice: 9 positions;
- vertical gaze lattice: 7 positions.

This preserves the stepped/retro language established by the blink and V24/V25 inner-eye work.

## Click examples
### pointer_dilate
- gaze remains pointer-driven;
- click starts 22 discrete dilation states over ~1.9 s;
- final state is full black.

### pointer_color
- click cycles white, red, blue, yellow, pink, cyan/green, black;
- pointer gaze continues throughout;
- on dark sclera the pupil switches to white so gaze remains visible.

### pointer_shape
- click cycles circle, oval, diamond, slit, cross, star, dot;
- all shapes continue to follow pointer.

### pointer_combo
- click changes both color and pupil morphology;
- gaze remains pointer-controlled.

## QA
- both V26 JavaScript files passed Node syntax checks;
- a local composition sheet was generated for pointer positions, color changes, shape changes and dilation stages;
- local composition QA passed;
- container browser navigation was blocked by environment policy, so no local interactive-browser claim is made.

## Review target
The next review is specifically:
- does the eye point toward the mouse naturally;
- is the stepped tracking pleasant or too coarse;
- are click transformations readable;
- should gaze range be larger/smaller.
