# Multi-surface Control candidate v1

Status: `CANDIDATE_ONLY`
Opportunity: `O-SWARM-CONTROL-SURFACE-CANDIDATE-V1`

## Purpose

Executable/reopenable control-surface candidate for four prepared surfaces:

- `control-plan` — Plan de acción / Universal Control
- `prometeo-mobile` — Prometeo móvil
- `facultad-digital` — Facultad Digital / Study Library
- `alumnos-teacher` — Alumnos / página docente

The candidate is deliberately **not** another Universal Control shell and does not own durable truth. It renders a typed derived-state object. Claims, runs, returns, integration evidence, Current/Human Accepted/Served authority and routes remain external durable inputs.

## Files

- `index.html` — responsive static candidate UI.
- `control-model.mjs` — validator/normalizer + derived telemetry compiler.
- `sample-state.mjs` — visibly fake `SAMPLE_NOT_LIVE` fixture so the candidate can be reopened without a backend.
- `tests/multi-surface-control-v1/control-model.test.mjs` — invariants/falsifiers.

## Input contract

Before the module runs, a host may assign:

```js
window.PROMETEO_CONTROL_STATE = {
  schema: 'prometeo.multi-surface-control-state/v1',
  generatedAt: '...',
  telemetry: { sourceOfTruth: false },
  surfaces: [/* exactly the four required surface ids, plus fields */]
};
```

If absent, the page uses `sample-state.mjs` and labels it `SAMPLE_NOT_LIVE`.

Per-surface fields represented in the UI:

- durable intent summary + thread/evidence reference;
- active workers;
- durable returned changes + unread count;
- local integration state + evidence reference;
- preview/open action, disabled when the route is unresolved;
- useful free-worker capacity + derivation basis;
- authority metadata.

## Fail-closed rules

`control-model.mjs` rejects state when:

1. any of the four required surfaces is missing;
2. Live/telemetry claims to be source of truth;
3. a candidate surface self-promotes `Human Accepted`, `Current` or `Served`;
4. a route marked `UNRESOLVED` carries an href.

Unknown routes are not guessed. The sample intentionally leaves Prometeo móvil, Facultad and Alumnos preview routes unresolved.

## Preserve-first constraints

This candidate preserves the existing Universal Control rule that there is one global shell. It does not inject into served pages, change the served V5 payload, mutate Favorites/Corner Anchor, alter Current/Catalog/Lineage, or create a second message bus.

Live remains a projection of durable control state, not the brain.

## Verification command

When checked out with Node 22+:

```bash
node --test tests/multi-surface-control-v1/control-model.test.mjs
```

Promotion/publication is outside this opportunity. A later integrator must bind this UI to an actual durable state compiler and independently verify served behavior before any authority change.
