# 🖐️ Retro Player / Eye Frame · Durable Decisions

Status: CURRENT

- The eye must be normalized **before** animation.
- Runtime is not responsible for solving frame geometry.
- V15 uses a reusable pipeline: split → mask → measure → anchor → normalize → residual correction → QA → export.
- For this eye, `lower_liner_median` is the semantic anchor because the lower white liner stays visually stable during blinking.
- Horizontal placement is anchored to the frame center.
- Normalized source frames use a fixed 512×512 transparent canvas.
- Local QA limit is 3 px anchor jitter; V15 measured 1 px and passed.
- No scale normalization was applied. Only translation was corrected.
- The published 128×128 cells are created **after** alignment.
- The public lab must only replay final normalized frames.
- V12/V13/V14 are not accepted eye baselines.
- Do not reintegrate the eye into Player and do not restore the separate pupil until V15 is visually accepted.
- The normalization protocol/tool should be reused for future generated grids rather than inventing one-off crop logic.

## Session lifecycle
- Reincarnation reads handoff + repo and waits for feedback.
- No implementation until ACTUALIZÁ/equivalent.
- On update persist meaningful feedback/version decisions and verify relevant files across main and gh-pages.
