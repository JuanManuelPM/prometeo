# BACKLOG-251 · Skill work-context integration evidence

Source: `docs/cognitive-forge/backlog.json#251` — **Skills mejoran Prometeo**.

## Verified gap

On 2026-09-22 the backend had one durable Skill version in `ACTIVE/ACCEPTED` state (`FORGE_SECTION_INTEGRATOR@1`), but no `prometeo_*` function referenced the Skill registry. Counts at inspection time were: 1 Skill, 1 version, 1 ACCEPTED version, 0 action traces, 0 regression cases, 0 regression runs. The knowledge object existed, but the worker runtime did not surface it.

## Implemented slice

Migration: `supabase/migrations/20260922043330_prometeo_skill_work_context_v1.sql`.

It adds:

- `prometeo_skill_context(job, limit)`: deterministic relevance selection over only `ACTIVE/ACCEPTED` Skill versions, capped at 3.
- Version-pinned execution bundles via `forge_skill_execution_bundle(skill_id, version_no)`.
- `prometeo_contract_response` enrichment for every `WORK` response, including nested `PUBLISHED_AND_NEXT.next` WORK packets through the existing recursive contract path.
- `prometeo_skill_work_context_smoke_test()`: verifies selection, pinned bundle resolution and actual contract injection.

This does **not** change job assignment, leases, project routing or mutation authority. The injected bundle preserves the Skill contract's own `authority_granted=false`; the invoking job remains the authority source.

## Verification

Applied migration successfully to the connected Supabase project.

Smoke receipt:

```json
{
  "ok": true,
  "state": "SKILL_WORK_CONTEXT_SMOKE_OK",
  "matched_skill_id": "FORGE_SECTION_INTEGRATOR",
  "matched_version_no": 1,
  "contract_has_skill_context": true
}
```

Repository commit introducing the migration: `bdee075f0c100360d47645c1a258d813c7e0473d`.

## Remaining frontier

The loop now reaches **accepted Skill → relevant WORK packet**. A later independent slice can close **Skill actually used → action trace / outcome → utility/regression evidence → evidence-driven evolution**, so relevance can be learned rather than remaining deterministic text matching.
