# BACKLOG-070 · Historical Cognitive Utility Spec

Status: DESIGNED
Source backlog: docs/cognitive-forge/BACKLOG.md item 70
Canonical backlog JSON: docs/cognitive-forge/backlog.json item 70
Created from Prometeo job: WORK-RESERVOIR-01 / AUTO-Q01007

## Need

Prometeo has durable Cognitive Cards, Plumas, Tools, Recipes and emerging Skills, but item 70 is still pending: there is no durable, queryable record of which cognitive objects actually contributed to useful work. Selection counts alone are insufficient because an object can be attached to a job without affecting the result.

The implementation must make utility observable without turning usage frequency into truth or automatically promoting knowledge.

## Scope

Add a durable evidence trail that links a cognitive object to a concrete execution and records whether the object was used, whether the worker judged it useful, and whether downstream evidence supports that judgment.

This spec does not change knowledge maturity, ranking, promotion or deletion policies. It only creates evidence that those systems may consume later.

## Minimal data contract

Create a durable relation or equivalent event-backed projection named conceptually `cognitive_utility_observations` with these fields:

- `observation_id`: stable unique id.
- `object_type`: CARD | PLUMA | TOOL | RECIPE | SKILL.
- `object_id`: durable cognitive-object id.
- `project_id`, `job_key`, `worker_code`: execution provenance.
- `phase`: optional phase/operation name.
- `selected`: boolean; object was supplied or selected.
- `used`: boolean; worker reports it materially influenced the work.
- `utility_signal`: HELPED | NEUTRAL | HURT | UNKNOWN.
- `evidence_ref`: nullable durable reference to output, receipt, checkpoint, test or review.
- `reason_code`: compact machine-readable reason.
- `created_at`: server timestamp.

Uniqueness must prevent duplicate observations for the same object + execution + phase + evidence reference.

## Write path

1. When a job is published, inspect the cognitive objects actually attached to that execution.
2. Emit one observation per object with `selected=true`.
3. Set `used=true` only when the published result explicitly identifies the object as materially applied.
4. `utility_signal=HELPED` requires either:
   - a worker explanation tied to a concrete output section, or
   - downstream verification/review/test evidence.
5. `HURT` records an object that caused rework, contradiction or a failed approach.
6. Missing evidence remains `UNKNOWN`; never coerce UNKNOWN to NEUTRAL.

Writes must be idempotent and fenced by the current lease/publication identity where available.

## Read model

Provide a deterministic aggregate view or RPC per cognitive object with:

- selections
- uses
- helped_count
- hurt_count
- unknown_count
- distinct_projects
- distinct_jobs
- last_used_at
- evidence_coverage = observations with non-null evidence_ref / used observations

Do not produce a single opaque score in v1. Consumers may sort by transparent counters, but frequency must not be treated as quality.

## Acceptance criteria

A. A fixture job using two cognitive objects creates exactly two durable observations.
B. Replaying the same publish path creates no duplicate observations.
C. An attached-but-unused object is distinguishable from a used object.
D. HELPED without an evidence reference or explicit grounded reason is rejected or downgraded to UNKNOWN.
E. Aggregates are reproducible from raw observations.
F. Existing knowledge maturity states remain unchanged.
G. A worker/reviewer can trace any aggregate count back to project, job and evidence.

## Verification fixture

Create three synthetic executions for one object:

1. selected + used + HELPED + evidence
2. selected + used + HURT + evidence
3. selected + not used + UNKNOWN

Expected aggregate: selections=3, uses=2, helped_count=1, hurt_count=1, unknown_count=1, distinct_jobs=3. Re-run fixture #1 and confirm counts do not change.

## Out of scope

- automatic ACCEPTED promotion
- recommendation ranking
- model-generated global utility score
- deleting low-utility knowledge
- UI redesign

## Provenance

This specification materializes BACKLOG item 70, whose durable statement is “Medir utilidad histórica — Registrar qué objetos cognitivos realmente ayudaron.” Repository searches for “Medir utilidad histórica”, “knowledge utility cognitive”, “cognitive object usage” and “utility_score” returned no implementation/spec match before creation. P4 Capture was explicitly excluded because state/PENDING.json shows it already PREPARED with its own plan and human start gate.
