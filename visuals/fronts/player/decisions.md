# 🖐️ Player / Eye Frame · Durable Decisions

Status: CURRENT

- V21 blink remains accepted and unchanged.
- V27 supersedes V26 as the current gaze/audio review candidate.
- Default pupil radius is now 0.34.
- Do not use a small fixed central movement radius for gaze.
- Gaze limit must derive from the actual V21 aperture mask.
- Pointer gaze is global state.
- Pointer/touch updates happen before click actions.
- Color/shape/combo changes must preserve gaze.
- Dilation/contract transformations must use the active gaze position.
- Extreme gaze is allowed to clip part of the pupil behind the eyelid.
- Current edge-peek allowance is 0.58 pupil radii.
- Gaze remains stepped/low-FPS: 10 samples/sec, 24 angle steps, 6 radial steps.
- Audio demo must contain lows, mids and highs rather than mostly bass.
- Audio analyser visualization uses logarithmic frequency sampling from about 70 Hz to 8 kHz.
- Player integration remains blocked until public V27 review.
