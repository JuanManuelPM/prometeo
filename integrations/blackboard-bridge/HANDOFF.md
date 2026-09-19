# Blackboard canonical ingestion handoff — reconciled

Snapshot: 2026-09-19. The old `blackboard-canonical-ingestion-v1` branch was inspected, not blindly merged.

## Integrated

- `study-source-record` remains the provider-facing record boundary.
- Blackboard rendered `body_text` remains source-captured text, not derived metadata.
- Mirrored attachments continue to use private storage and submit `parser_profile=document-default`.
- Calendar / syllabus / announcement dates remain **derived events** with provenance; conflicts preserve every source value.
- The shared file extractor lives in `shared/study-ingestion/v1/document-pipeline.mjs` and selects by MIME, never by provider.

## Reconciled contract

The branch-local `prometeo.study-canonical-document/v1` / `doc:<source_id>` model is **not** promoted as the Reader contract. The authoritative document contract is the one already in `main`:

`prometeo.canonical-document/v1` -> `prometeo.reader-payload/v1` -> `prometeo.tts-chunk-set/v1`.

Historical Supabase rows are preserved. `study_document_contract_v1_derivatives` is an additive private mapping/cache bridge carrying official `srcv1/cex1/doc1/rpv1/ttsp1` identities without rewriting legacy rows.

## Still not claimed

- No fresh Firefox 0.5.0 authenticated sync was performed in this integration run.
- No real Blackboard file is currently mirrored in `study_bb_files`; therefore Blackboard binary attachment extraction is code-integrated but not live-file-verified.
- Existing Blackboard page text and calendar state remain historically/live-database present, but that is not equivalent to a fresh browser receipt.
