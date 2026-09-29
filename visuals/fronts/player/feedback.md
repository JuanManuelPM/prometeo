# 🖐️ Player / Eye Frame · Durable Feedback

Status: CURRENT

## Latest user feedback
The user wants the default pupil larger and wants the gaze system to exploit the entire visible white eye.

Specific complaints/direction:
- default pupil should be bigger;
- whenever pointer/touch interaction happens, the eye should look toward that location first;
- some V26 eyes stayed trapped in a small central movement radius;
- the pupil should be allowed to travel to the actual edge of the eye;
- at extreme side glances, only part of the pupil may remain visible;
- click color/type changes must keep the current gaze rather than recentering;
- the procedural audio felt too bass-heavy and needs meaningful treble/high-frequency content.

## V27 implementation

### Bigger default pupil
Pointer baseline changed from roughly 0.24-0.26 to 0.34 logical radius.

### Full-aperture gaze
V26 used a small fixed low-resolution offset.

V27 instead:
1. gets the real open V21 aperture;
2. quantizes pointer direction into 24 angular steps;
3. quantizes distance into 6 radial steps;
4. ray-casts from the actual aperture centroid until the real mask boundary;
5. adds an edge-peek allowance equal to 58% of the pupil radius;
6. lets the current blink/aperture mask naturally crop the pupil.

This means extreme glances can intentionally show only part of the pupil.

### Global gaze authority
Pointer/touch position is updated before click actions.
Color, shape and dilation states do not own or reset gaze.

### Dilation
The click-dilate scene now uses 26 discrete states over about 2.4 seconds.
It grows from the current gaze position toward full black.
A later click contracts it again.

### Audio
V27 replaces the previous low-heavy demo with:
- sub/kick;
- bass;
- mid plucks;
- 1.2-4.1 kHz chimes;
- 4.2-5.4 kHz clicks;
- high-frequency noise hats.

The analyser lines now sample frequencies logarithmically from approximately 70 Hz to 8 kHz instead of mostly reading the lower bins.

## Local QA
- V27 scenes JS syntax: PASS.
- V27 runtime JS syntax: PASS.
- eight extreme gaze directions rendered against the real V21 aperture;
- partial clipping at eye edges is visible and intentional;
- local geometry QA: PASS.

Public browser acceptance remains pending.
