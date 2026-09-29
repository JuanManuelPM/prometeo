# 🖐️ Player / Eye Frame · Durable Decisions

Status: CURRENT

- V21 remains the accepted blink baseline.
- V25 supersedes V24 for eye-content exploration.
- The eye itself is a play/pause control in the lab.
- Blink remains independent and keeps running even when inner-eye playback is paused.
- Scene definitions must live in data/config rather than renderer branches whenever practical.
- Dilation defaults to 24 discrete frames and may be changed by one step-count variable.
- Contraction/red reveal defaults to 22 discrete frames.
- Color variation is parameterized by hue rather than requiring new assets.
- Audio-reactive motion reuses the Bent Sticks design language from the existing audio visual lab.
- The audio demo is locally generated and does not depend on Supabase/TTS.
- Video/GIF-style moving content may live behind the aperture or inside the pupil as a separate media layer.
- External media must have a visual fallback.
- Eye-content scenes remain clipped by the per-frame aperture derived from V21.
- Eye-content FPS remains intentionally quantized / low-FPS.
- Player integration remains blocked until V25 public review.
