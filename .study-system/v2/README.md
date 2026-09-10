# Study System V2

Canonical, readable study-system contract for Prometeo.

## Purpose

Future AIs must not redesign a study page from scratch for every exam. Study System V2 separates a reusable study engine from exam-specific content.

- **Engine** owns interaction, layout, responsive behavior, two-color themes, progress, persistence, countdown, topic opening/closing, practice surfaces and reusable capabilities such as the whiteboard.
- **Exam instance** owns source-derived knowledge: scope, exam profile, transversal map, modules, explanations, recall atoms, distinctions, applications and practice.
- **Builder AI** reads sources, produces the instance data, runs coverage/QA, and publishes it through the engine. It does not invent a new interface unless the human explicitly requests an experiment.

## Canonical files

- `BLUEPRINT.md` — pedagogical and UI invariants.
- `AI_BUILD_PROTOCOL.md` — required source-to-instance workflow for future AIs.
- `EXAM_INSTANCE.schema.json` — machine-readable content contract.
- `EXAM_INSTANCE.example.json` — minimal reference instance.
- `WHITEBOARD_CAPABILITY.md` — reusable mnemonic-whiteboard contract.
- `REFERENCE_MODELOS_TEORIAS_II.md` — lessons from the first real exam implementation.
- `pages/study-system-v2-lab.html` — working experimental reference for the mnemonic whiteboard.

## Core separation

```text
sources -> exam profile -> coverage map -> exam.json
                                      |
                                      v
                     reusable Study System V2 engine
                                      |
                                      v
                overview / understand / recall / produce
```

The interface is intentionally not a linear study sprint. The overview must remain inspectable at a glance while deeper layers open only when requested.

## Stability rule

V1 remains historical. V2 is additive. Experiments become engine capabilities only after they work across desktop + touch and have explicit persistence/interaction rules.