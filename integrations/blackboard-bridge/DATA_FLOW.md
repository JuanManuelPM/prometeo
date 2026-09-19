# Blackboard → Study data flow

## Real flow after canonicalization

```text
palermo.blackboard.com (authenticated user-visible session)
  ├─ rendered/crawled HTML
  │    → Firefox bridge 0.5 source capture
  │    → study-blackboard-v1?action=ingest
  │    → study_bb_courses / study_bb_items / study_bb_changes / study_bb_sync_runs   [RAW SOURCE]
  │    → existing study_sync_bb_item_to_source_graph()
  │    → study_source_artifacts                                                     [SOURCE RECORD GRAPH]
  │    → study_sync_source_artifact_to_canonical_document()
  │    → study_canonical_documents                                                  [CANONICAL IDENTITY/METADATA]
  │    → study_sync_bb_item_text_to_canonical()
  │    → study_canonical_document_text_versions(text_kind=source_text)              [SOURCE TEXT VERSION]
  │
  ├─ accessible file bytes
  │    → authenticated browser fetch
  │    → study-blackboard-files-v1?action=upload
  │    → private Storage: study-blackboard-files
  │    → study_bb_files
  │    → existing study_mark_bb_file_preserved()
  │    → study_source_artifacts.private_ref + content_hash
  │    → canonical document update
  │    → study_document_extraction_queue(parser_profile=document-default)           [COMMON EXTRACTOR HANDOFF]
  │    → shared PDF/DOCX/PPTX/XLSX extractor (NEXT; not Blackboard-specific)
  │    → study_canonical_document_text_versions(text_kind=extracted_text)
  │
  └─ Blackboard calendar feed
       → study-blackboard-v1?action=calendar-sync
       → study_bb_events                                                            [RAW SOURCE]
       → study_derived_events (only when starts_at exists)                           [DERIVATION]
```

Drive converges at the same source graph:

```text
Google Drive provider
  → study_source_artifacts
  → study_canonical_documents
  → private_ref / complete source text when provider supplies it
  → study_document_extraction_queue(parser_profile=document-default)
  → shared extractor
  → canonical text versions
```

No Reader/TTS/Search consumer needs to know whether the source was Blackboard, Drive, PDF or DOCX. Consumers should eventually read canonical documents/text/events only.

## Mapping Blackboard course → Study course

`study_bb_items.course_key` is provider identity. `study_courses.course_id` is Study identity. They are not the same key.

Resolution order in the existing server trigger:

1. exact `study_course_aliases(source_kind='blackboard', source_key=course_key)`
2. exact `blackboard_course_code` alias for the `course_key`
3. controlled fallback: longest known `blackboard_course_code` found in captured source title/body/href
4. if still unmatched: preserve `provider_course_id` and leave `course_id = null`

No new fuzzy title matcher was added.

## Source Record → Canonical Document

Source Record preserves provider facts:

- stable `source_id`
- provider course/item IDs
- Study `course_id` only when resolved
- item type/title
- verbatim captured body text (separate field)
- source URL/reopen handle/source page
- due/modified/capture timestamps
- attachments
- provenance
- raw provider metadata

Canonical Document preserves identity/location/provenance but does **not** absorb source/derived text into metadata. Text lives in version rows. Binary files enter a provider-neutral extraction queue only after a private byte reference exists.

## Cronograma / syllabus strategy

Authority order is not a winner-selection order. Each source remains independently preserved.

1. Preserve syllabus/cronograma/page/file as Source Record + Canonical Document.
2. Obtain complete source/extracted text through the common document pipeline.
3. Derive event candidates only when the text contains an explicit supported date. Missing dates produce no event.
4. Every event records `source_id`, `document_id`, source text locator/span, extraction confidence/status and provenance.
5. Blackboard calendar events use their direct source date and remain separate from syllabus/announcement events.
6. Compare semantically equivalent events across sources. Different dates from different source IDs form a conflict group; all versions remain present and status becomes `conflict`.
7. Human/source review can later resolve a conflict by adding authority metadata; ingestion never silently overwrites competing evidence.

Event types currently modeled: `exam`, `makeup_exam`, `assignment_due`, `no_class`, `class`, `important_date`.
