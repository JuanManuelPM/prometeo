# 👾 Workers / Avatars · Durable Decisions

Status: CURRENT

- Avatar identity must not be circles/rectangles/sticks.
- Stable assignment: a worker must not randomly mutate every frame.
- Population personality matters more than anatomical correctness.
- The default human review surface is ONE large avatar at a time, not a mass wall.
- Horizontal swipe is the primary way to move between curated avatar candidates.
- A short curated set is preferred while avatar quality is unresolved.
- Curated morphology may include full body, no legs, or head + hands only.
- The accepted mass/layout engine must survive, but mass stress is a diagnostic rather than the default review presentation.
- Current hidden mass diagnostic: \`demos/coliseo-workers/?mass=1\`.

## Session lifecycle
- Reincarnation session reads handoff + repo and WAITs for feedback.
- No implementation until user says ACTUALIZÁ or an unambiguous equivalent.
- Update session must persist all meaningful new decisions before final delivery.
- Accepted baseline may not be silently overwritten by an unreviewed candidate.
