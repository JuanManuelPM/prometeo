# BACKLOG-233 — canonical backlog states evidence

Status: IMPLEMENTED

BACKLOG-233 defined the canonical lifecycle vocabulary:

- IDEA
- DESIGNED
- READY
- WORKING
- VALIDATING
- DONE
- SUPERSEDED

Implementation is durable in Supabase as `public.prometeo_backlog_states`.
The catalog stores stable ordering, terminal-state semantics, and rejects any state outside the seven canonical values.

Deterministic verification is exposed by `public.prometeo_backlog_state_catalog_smoke_test()`.
Observed verification after migration: `ok=true`, ordered states exactly match the seven values above, terminal states are `DONE` and `SUPERSEDED`.

Versioned migration:
`supabase/migrations/20260922042515_backlog_state_catalog_v1.sql`

The migration was applied to the active Prometeo Supabase project before this evidence file was written.

A concurrent-write conflict prevented this worker from rewriting the shared `docs/cognitive-forge/backlog.json` item in place; the implementation itself and its migration are complete and independently verifiable.
