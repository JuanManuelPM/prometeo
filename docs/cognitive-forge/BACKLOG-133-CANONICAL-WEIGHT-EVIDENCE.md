# BACKLOG-133 — peso Canonical ≈32,7%

Status: ALREADY_DONE / reconciled evidence

BACKLOG-133 estimated that CANONICAL should represent roughly 32.7% of the expected work inside one Blueprint point.

The active observer already weights each job from the midpoint of its durable `min_words`/`max_words` budget. A backend calculation over `FORGE-BLUEPRINT-84-01` produced these expected per-point weights:

- ARCHITECT: 1800 → 13.8462%
- DEEP_DEVELOPMENT: 3750 → 28.8462%
- ADVERSARIAL: 2000 → 15.3846%
- CANONICAL: 4250 → 32.6923%
- LEARNING: 1200 → 9.2308%

Therefore CANONICAL is already weighted at 32.6923%, matching the ~32.7% design target without a separate hard-coded constant.

Observer implementation: `pages/forge-blueprint/index.html`, where `jobWeight(j)` uses the midpoint of each job budget and `estimator()` sums those values.
