# GitHub-native storage/recovery base v1

Status: **CANDIDATE_RUN_SCOPED** for `PROMETEO-MP10-01 / S010`.

This directory materializes the storage/privacy base without creating a scheduler, queue, CURRENT, persistence authority, or destructive database procedure.

## What exists

- `CLOSURE_PACK_CONTRACT.json`: strict public metadata contract. Unknown fields, nested payloads and sensitive key classes are rejected.
- `export-closure-pack.mjs`: dependency-free fail-closed exporter. It emits only fixed metadata and durable refs. Arbitrary free text is intentionally excluded.
- `ZERO_WRITE_AUDIT.json`: concrete read/poll surfaces that must remain zero-write. Targets are **not certified** merely because they are listed.
- `RETENTION_ELIGIBILITY.json`: semantic eligibility rules for compact terminal evidence. No guessed TTL and no deletion authority.
- `self-test.mjs`: executable checks for safe export plus rejection of transcript/free-text/signed-query examples.

## Closure pack rule

Archive terminal closures and compact evidence refs. Do not archive heartbeat, polling, presence, intermediate-progress or retry exhaust as public durable history.

The closure pack is a projection. Existing task/claim/RETURN/verification authority remains unchanged.

## Privacy rule

Public export is allowlist-first and fail-closed. There is no "best effort redaction" fallback. If an input contains an unknown field, nested object, sensitive key class, arbitrary free text, or unsafe ref syntax, export fails.

Raw prompts, transcripts, audio, attachments, private packets, provider payloads, credentials, authorization material, signed URLs and private PII are forbidden.

## Retention rule

This RUN performs **no DELETE, VACUUM, pruning, TTL enforcement or migration**. Future deletion/compaction requires read-only measurement after backend recovery, reconstruction tests, privacy review and explicit authority.

## Zero-write rule

Observation does not create durable work. GET/static reads, refreshes, status rendering and receipt inspection must not append heartbeat/progress/view/poll events or fabricate fresh numeric zero when a source is unavailable.

## Local deterministic check

```bash
node coordination/storage-recovery/github-native-v1/self-test.mjs
```

A PASS proves only the exporter contract checks exercised by that script. It does not certify every zero-write target or promote this candidate to CURRENT.
