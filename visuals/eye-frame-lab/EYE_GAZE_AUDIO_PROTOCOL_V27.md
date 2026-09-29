# Eye Gaze + Audio Protocol V27

Status: CURRENT CANDIDATE

V27 preserves the accepted V21 blink and extends V26 with a stronger gaze model and a wider-spectrum audio source.

## Gaze changes
- default pupil is larger: 0.34 logical radius;
- gaze is global state, not owned by one scene;
- every pointer/touch updates gaze before any click action;
- gaze uses the actual V21 open-aperture mask rather than a small fixed central radius;
- direction is quantized to 24 angular steps and 6 radial steps at about 10 samples/sec;
- the runtime ray-casts from the real aperture centroid to the actual aperture boundary;
- the pupil center may travel beyond that boundary by 58% of its own radius, so side glances can show only part of the pupil while the eyelid mask clips the rest;
- changing color or morphology never resets gaze;
- dilation and contraction start from the active gaze position.

## Audio changes
The older demo was concentrated in the low end. V27 uses a deterministic full-spectrum procedural loop:
- kick/sub around 58-100 Hz;
- bass notes around 98-147 Hz;
- mid plucks around 330-660 Hz;
- chimes around 1.2-4.1 kHz;
- short high clicks around 4.2-5.4 kHz;
- bright noise hats.

The analyser visualization samples logarithmically from about 70 Hz to 8 kHz, so low, mid and high activity can affect different lines.

## Preserved rules
- V21 blink remains independent and unchanged;
- pupil/style/gaze/action remain separate state domains;
- current-frame aperture mask clips all inner-eye visuals;
- Player integration waits for public review.
