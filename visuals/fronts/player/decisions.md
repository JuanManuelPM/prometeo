# 🖐️ Player / Eye Frame · Durable Decisions

Status: CURRENT

- V21 is the **accepted blink animation baseline**.
- User explicitly reviewed it as "excelente, muchísimo mejor" and moved the work forward to the actual eye/pupil.
- The generated grid is authoring input, never runtime truth.
- Alignment happens before export.
- Semantic eye anchor remains `lower_liner_median` plus horizontal center.
- Normalization uses a fixed 512×512 source canvas and translation only.
- Residual alignment QA must pass before packing.
- Runtime logical frame size is 128×128.
- Runtime eye-frame source is the text-only indexed/RLE JSON pack.
- Runtime verifies the entire pack before enabling interaction.
- Renderer has no hard-coded atlas rows, columns, crop rectangles, frame count or frame durations.
- Blink timing lives in data.
- Animation uses `performance.now()` + `requestAnimationFrame()`.
- Hash equality is transport evidence, not visual acceptance.
- Full reusable engineering record: `visuals/eye-frame-lab/ANIMATION_PIPELINE_V1.md`.
- Next layer: actual eyeball/pupil behind V21 frame animation.
- Pupil/eye-content movement must not alter frame pivot or blink alignment.
- Test eye contents in isolation before reintegrating into Player.
