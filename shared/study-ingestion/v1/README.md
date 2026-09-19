# Study content ingestion v1

Provider adapters stop at **SOURCE**. File-format adapters start at **SOURCE ARTIFACT**.

```text
Drive ─────┐
           ├─> SOURCE ARTIFACT -> MIME extractor -> prometeo.canonical-document/v1
Blackboard ┘                                      -> canonical-to-reader.mjs
                                                   -> prometeo.reader-payload/v1
                                                   -> TTS chunk projection
```

Authority for Canonical/Reader/TTS contracts is `.study-system/document-pipeline/v1/` on `main`.

## Implemented extractors

- `application/pdf` -> `pdf-poppler-pdftotext`
- DOCX -> `docx-openxml-text`
- PPTX -> `pptx-openxml-slides`
- HTML -> `html-structured-text`
- `text/*` -> `plain-text`
- audio/video -> explicit `transcription_adapter_required` state (no fake extraction)

Extractor selection is MIME-based and has no provider branch. Drive and Blackboard observations of identical bytes converge on the same `source_version_id`.

## Cache boundary

`source_version_id` is computed from exact bytes. Before extraction, `canonical_extraction_version_id` is computed from source identity + canonical schema + extractor id/version/config. A cache hit skips file extraction. Reader and TTS have independent projection identities; changing only voice affects only the audio cache key.

The CLI is `scripts/study-document-extract-v1.mjs`.
