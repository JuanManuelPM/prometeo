# Blackboard ingestion handoff

## Current

- Repo bridge source: 0.5.0.
- Historical browser ingest works; successful receipt is not addon-version-bound.
- Raw Blackboard tables and common `study_source_artifacts` projection are live.
- Canonical document pipeline v1 is deployed and provider-neutral.
- Existing backfill: 36 Blackboard canonical docs; 23 have full source-text versions.
- 105 Drive source artifacts now also have canonical document identity, but remain metadata-only until complete common text/byte input exists.
- Blackboard calendar: 5 direct-date derived events; current course mapping remains intentionally unresolved because no exact alias matches.
- File mirror code exists but current private mirror table has 0 files, so the generic extraction queue is correctly empty.
- No public UI changes.

## Exact next

1. Add addon manifest version to browser sync/probe telemetry and perform one fresh authenticated 0.5.0 sync.
2. During that sync, exercise one legitimately visible document attachment and verify the chain: `study_bb_files` row → private storage → source artifact `private_ref` → `study_document_extraction_queue` pending job.
3. Implement **one shared** `document-default` extraction worker for both Blackboard and Drive inputs; write complete output to `study_canonical_document_text_versions(text_kind='extracted_text')` and mark the canonical doc `extracted`.
4. Run schedule derivation on complete syllabus/cronograma text. Persist only explicit dates with text spans; then run conflict grouping across calendar/syllabus/announcement sources.
5. Resolve calendar course mapping by adding explicit reviewed aliases/crosswalk evidence, not fuzzy matching.
6. Rotate/sanitize legacy secret-bearing Blackboard cron/setup material in Supabase separately; never copy those historical statements into the public repo.

## Acceptance gates

Do not claim FILE_PIPELINE_VERIFIED until a real mirrored file reaches the generic extraction queue. Do not claim BLACKBOARD_0_5_BROWSER_VERIFIED until telemetry binds a successful sync to addon 0.5.0. Do not claim SCHEDULE_COMPLETE until syllabus/cronograma extracted text has been processed and conflicts are represented rather than overwritten.
