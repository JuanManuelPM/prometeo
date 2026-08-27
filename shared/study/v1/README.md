# Prometeo Study Commons v1

Shared owner for student-facing Study UI. Student repos hold content/state; this directory owns reusable web/design primitives.

## Stable contract

- One component owner; no per-student forks.
- Student data is content/config, not CSS/JS.
- `LOCKED / NEW / 1–99% / DONE` is one subject-state slot.
- Typography roles are semantic and shared.
- Mouse/touch/keyboard share activation semantics; drag/scroll must not become click.
- Printed-math renderers, inline answers, resource links, disclosures, locks and hints are shared.
- Compatible fixes may update v1 in place. Breaking schema/behavior changes require v2 and explicit migration.
- Human-visible regressions outrank synthetic PASS.

## Consumers

- `JuanManuelPM/jose-study` (public projection)
- `JuanManuelPM/prometeo-education` (canonical private education source / student instances)

## Promotion

change → owner → WHERE_USED → regression closure → publish → public smoke.
