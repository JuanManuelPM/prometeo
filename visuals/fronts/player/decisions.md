# 🖐️ Retro Player / Eye Frame · Durable Decisions

Status: CURRENT

- V16 is REJECTED_BROKEN because its embedded base64 JPEG was truncated in committed HTML.
- Large binary assets must stay as repository files, not be copied into HTML as data URIs through text tooling.
- V17 loads `eye-blink-aligned-grid-v15.jpg` by same-origin relative URL.
- V17 validates HTTP response, non-empty blob, image decoding, and exact 640×256 dimensions before enabling animation.
- The alignment pipeline from V15 remains CURRENT.
- The public runtime must consume already-normalized frames and must not perform geometry repair.
- For this eye, `lower_liner_median` remains the semantic alignment anchor.
- Player reintegration remains blocked until the isolated blink is visually accepted.
