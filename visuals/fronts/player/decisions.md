# 🖐️ Player / Eye Frame · Durable Decisions

Status: CURRENT

- V21 blink remains frozen as the accepted top layer.
- V25 supersedes V24 as current eye-effects candidate.
- Eye effects are now data-driven from eye-effects-v25.json.
- Pupil/scelera/color/media/audio are independent from blink.
- Dilation uses 14 explicit discrete stages before full black.
- Low-FPS visual quantization remains intentional.
- Color families should be variable-driven; hue and fps are URL/config parameters.
- Audio visualization reuses the previous Prometeo pattern: one audio source → AnalyserNode → actual waveform/energy-driven visual.
- The eye itself can act as play/pause control.
- Audio is browser-local procedural for the isolated demo, avoiding external asset dependency.
- Media portal accepts GIF/video URL when supplied.
- Media portal has a procedural moving fallback so the example remains demonstrable without a media asset.
- Do not merge this into Player until public V25 visual review.
