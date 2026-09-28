# 🖐️ Player / Eye Frame · Durable Decisions

Status: CURRENT

- V21 is the current isolated eye candidate.
- The generated grid is authoring input, never runtime truth.
- Alignment happens before export.
- Semantic eye anchor remains `lower_liner_median` plus horizontal center.
- Normalization uses a fixed 512×512 canvas and translation only.
- Residual alignment QA must pass before packing.
- Runtime logical frame size is 128×128.
- Runtime no longer consumes PNG/JPEG/WebP for the eye.
- Runtime source is one text-only indexed/RLE JSON pack.
- RLE payloads are base64 text byte streams with exact byte length and SHA-256.
- Runtime verifies the entire pack before enabling interaction.
- Runtime has no hard-coded atlas rows, columns, crop rectangles, frame count, or frame durations.
- Blink timing lives in data.
- Animation uses `performance.now()` + `requestAnimationFrame`, not chained sleeps.
- Hash equality is transport evidence, not visual acceptance.
- The Player scene remains unchanged until V21 is positively reviewed.
- The pupil remains intentionally absent from the isolation lab.
