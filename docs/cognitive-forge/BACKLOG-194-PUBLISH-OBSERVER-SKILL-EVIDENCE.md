# BACKLOG-194 · Skill PUBLISH_OBSERVER

## Outcome

IMPLEMENTED.

The durable Skill `PUBLISH_OBSERVER` v1 is registered in `forge_skills` / `forge_skill_versions` and promoted to `ACCEPTED`.

## Backend evidence

- Supabase migration: `20260922105749_forge_publish_observer_skill_v1`
- Registry status: `ACTIVE`
- Version: `1`
- Maturity: `ACCEPTED`
- Definition hash: `md5:e916051b9c5eb79ee0aceb18fe0bdd4a`
- Smoke: `PUBLISH_OBSERVER_SKILL_SMOKE_OK`
- Positive fixture: `PASS`
- Missing acceptance receipt rejection: `PASS`
- Execution bundle: `PASS`
- Skill authority grant: `false`

## Contract

The Skill requires real `source_refs`, an `observer_target`, a `publish_target`, explicit `authority_ref`, and non-empty `acceptance_checks`.

A successful output must:

1. be `prometeo.publish-observer-result/v1`;
2. preserve complete source coverage;
3. carry artifact, publication, and rollback references;
4. include build and publish receipts;
5. include fresh PASS verification evidence for every acceptance check;
6. validate with `forge_publish_observer_result_validate`.

A local build alone is explicitly insufficient publication evidence.

## Rollback

The contract preserves a `rollback_ref` to the prior publication and keeps Skill history versioned; versions are superseded instead of deleted.

## Repository evidence

- Migration: `supabase/migrations/20260922105749_forge_publish_observer_skill_v1.sql`
- Migration commit: `06aaaeb45adaa715a607c9c54987a764be7e91ce`
