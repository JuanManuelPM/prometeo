# BACKLOG-206 · Skill → action traceability evidence

Status reconciled: **HECHO**

## Durable implementation verified

The live Prometeo backend contains an explicit Skill-action trace layer:

- table `public.forge_skill_action_traces`
- `public.forge_skill_trace_action_start(skill_id, version_no, context, dedupe_key)`
- `public.forge_skill_trace_action_finish(action_trace_id, status, action_ref, evidence_refs, output_refs)`
- `public.forge_skill_action_trace(action_trace_id)`
- `public.forge_skill_action_history(...)`
- `public.forge_skill_action_trace_smoke_test()`

The applied Supabase migration registry records:

- `20260922040135_forge_skill_action_trace_v1`

## What is traceable

Each action trace preserves the exact `skill_id` and `skill_version_no`, plus optional execution context:

- project, job, worker and session
- action kind and procedure step
- input references
- action reference
- evidence and output references
- provenance
- dedupe key
- status history
- start/finish timestamps

The allowed action kinds are currently `TOOL_CALL`, `STATE_CHANGE`, `ARTIFACT_WRITE`, `CHECK`, and `OTHER`.

A successful finish requires either an action reference or evidence. Reversal requires evidence. Repeated starts are deduplicated by Skill/version/dedupe key, and repeated identical finishes are idempotent.

## Verification

On 2026-09-22 the live smoke function returned:

- `state = SKILL_ACTION_TRACE_SMOKE_OK`
- `dedupe = PASS`
- `evidence_gate = PASS`
- `missing_version = PASS`
- `reversal_history = PASS`
- `conflict_rejected = PASS`
- `idempotent_finish = PASS`
- `exact_version_history = PASS`
- `fixture_cleaned = true`

At verification time, `forge_skill_action_traces` contained **0 production rows**. That does not invalidate the tracing capability; it means no durable production execution had yet emitted a trace through this contract.

## Boundary

`forge_skill_execution_bundle(skill_id, version_no)` returns the accepted Skill definition and exact version, but it does not silently create action traces. Consumers must explicitly use the trace start/finish contract around actions they attribute to a Skill. This preserves observable provenance rather than guessing attribution after the fact.

## Reconciliation

BACKLOG-206 asked to “Trazar qué Skill produjo qué acción”. The durable schema, exact Skill/version binding, evidence-gated lifecycle, lookup/history API and passing smoke test satisfy that requirement. The historical backlog entry can therefore be marked HECHO.

A separate repository/backend drift remains observable: the migration is registered and active in Supabase, while the corresponding migration file was not present at `supabase/migrations/20260922040135_forge_skill_action_trace_v1.sql` on the checked default branch at reconciliation time. That drift is not evidence that the trace capability is absent; it is a reproducibility concern distinct from BACKLOG-206.
