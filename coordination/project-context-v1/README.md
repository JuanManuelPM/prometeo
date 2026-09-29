# Project Context V1

A compact **non-authoritative** orientation projection compiled from public durable Project Guide `STATE.json` files.

- Source Project Guide state and referenced owner receipts remain authority.
- This directory never owns work, claims, routing, acceptance, promotion, or CURRENT.
- The compiler copies an explicit allowlist only: identity/status, objective/focus, blockers, frontier refs, owner refs, and freshness.
- It does **not** ingest chat transcripts, audio, credentials, tokens, signed URLs, attachments, or arbitrary source fields.
- Missing/stale source remains visible as source metadata; this projection must not manufacture liveness or success.

Rebuild deterministically for a receipt timestamp:

```bash
PROMETEO_COMPILED_AT=2026-09-29T03:18:00Z node coordination/project-context-v1/compiler.mjs
node coordination/project-context-v1/self-test.mjs
```

Primary manifest: `coordination/project-context-v1/INDEX.json`.
