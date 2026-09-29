# 🖐️ Player / Eye Frame · Durable Decisions

Status: CURRENT

- V21 remains the accepted blink baseline.
- V23 is the current eye-content candidate.
- Eye content is a separate procedural subsystem behind V21.
- Do not create a sprite grid merely to move a circular pupil.
- Gaze, pupil scale and fill states are parameters.
- V23 derives aperture masks from the real alpha geometry of each V21 blink frame.
- The aperture is not a hard-coded ellipse.
- Largest enclosed transparent connected component is used as the visible opening.
- Closed frames naturally expose zero eye content.
- Eye-content movement must never shift/recenter the blink frames.
- Blink timing and eye-content timing remain independent.
- Current demo modes: neutral, directional gaze, small/large pupil, dilation, automatic wander, vertical slit, all black, inverse, all white.
- Local visual QA passed before publication.
- Player integration remains blocked until public V23 eye-content review.
