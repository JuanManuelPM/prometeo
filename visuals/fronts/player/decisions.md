# 🖐️ Player / Eye Frame · Durable Decisions

Status: CURRENT

- V21 blink remains accepted and unchanged.
- V26 supersedes V25 only as the current review target; V25 audio/media scenes remain preserved inside V26.
- Pointer gaze is an independent subsystem.
- Pointer gaze must survive color, morphology and click-state changes.
- Do not encode mouse direction into blink frames.
- Pointer motion is quantized to preserve low-FPS visual language.
- Default quantization: 9 FPS, 9 horizontal positions, 7 vertical positions.
- Clicking may mutate style without changing gaze authority.
- pointer_dilate uses 22 discrete dilation states before full black.
- Dark-background pointer styles switch pupil to white for visibility.
- Full-black dilation is allowed to hide the pupil intentionally.
- Mouse movement works globally across the page; touch drag also updates gaze.
- V25 audio, media, hue and shape examples remain available after the new pointer examples.
- Player integration remains blocked until public V26 review.
