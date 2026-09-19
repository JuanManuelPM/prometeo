# HANDOFF — Document → Reader data contract v1

Date: 2026-09-19
Repository: `JuanManuelPM/prometeo`
Scope: data contracts/projection only; no Reader visual redesign and no private bibliography publication.

## Persisted paths

- `.study-system/document-pipeline/v1/README.md`
- `.study-system/document-pipeline/v1/CANONICAL_DOCUMENT.schema.json`
- `.study-system/document-pipeline/v1/READER_PAYLOAD.schema.json`
- `.study-system/document-pipeline/v1/TTS_CHUNK_SET.schema.json`
- `.study-system/document-pipeline/v1/canonical-to-reader.mjs`
- `.study-system/document-pipeline/v1/example.synthetic.canonical.json`
- `.study-system/document-pipeline/v1/example.synthetic.reader.json`
- `.study-system/document-pipeline/v1/example.synthetic.tts.json`
- `.study-system/document-pipeline/v1/verify.mjs`

## Existing repo evidence inspected

### VERIFIED FROM REPOSITORY SOURCE

1. `.study-system/v2/README.md`, `AI_BUILD_PROTOCOL.md`, `EXAM_INSTANCE.schema.json`, `BLUEPRINT.md`, `MANIFEST.json`: Study already separates sources/authority from derived content and reusable engine/UI.
2. `pages/study-library/INTEGRATION_MANIFEST.json` and `ASSESSMENT_ADAPTER.contract.md`: Study Library owns course/source/navigation context; reusable subsystems consume data through adapters. Blackboard is subordinate source infrastructure, not UI authority.
3. `integrations/blackboard-bridge/README.md`: Blackboard content/files are private runtime material; mirrored files live in private storage and are opened via short-lived signed URLs. Tokens/credentials are not public frontend state.
4. `gh-pages:r/9f3c1a7d4e62b8c5/v16.html`, `gh-pages:lector/v11.js`, `gh-pages:r/9f3c1a7d4e62b8c5/v16-ui.js`: current Reader prototype hard-codes `BOOK`, derives paragraph/global character offsets, builds deterministic <=500-character sentence chunks, maps chunks back to global visible offsets and caches TTS by deterministic IDs. The contract generalizes that useful mapping without preserving the hard-coded content coupling.
5. `gh-pages:demos/pinterest-push-scroll-v1/index.html`: Push Scroll is a presentation/layout surface with semantic chapter/paragraph structure; it does not need provider-specific source knowledge.
6. Facultad/source-debt evidence keeps product/canonical binding authority unresolved. This work therefore does not promote a UI or Facultad route as canonical product authority.

### VERIFIED LOCALLY BEFORE PERSISTENCE

- Draft 2020-12 schemas accepted the synthetic Canonical Document, Reader Payload and TTS Chunk Set.
- `canonicalToReader()` + `projectTtsChunks()` reproduced the committed fixtures deterministically: 6 segments, 4 paragraphs, 2 TTS chunks.
- Every TTS `chunk_span` mapped to the same exact text as its `reader_span`/`segment_span`.
- Same chunk + same voice spec produced the same audio cache key; changing only `voice_id` changed only the audio cache key.

### NOT LOCATED AS A LITERAL CURRENT ARTIFACT

- No repository/code-search/commit match named exactly `Source Pack` or `Content Pack` was found. The durable equivalents inspected are Study source inventory/authority, exam instance derivations, Blackboard normalized source metadata, and adapter/manifest boundaries above.

### UNVERIFIED / intentionally not claimed

- No live GitHub Pages browser behavior was promoted or re-verified by this worker.
- No real Drive file ingestion was executed.
- No real Blackboard private attachment was extracted or published.
- No PDF/DOCX extractor was added or duplicated.
- No TTS audio was generated.
- No existing Reader UI or Push Scroll UI was changed.

## Exact next

Implement one provider/file-format adapter **outside the Reader** that takes an already-authorized runtime file (start with the existing Blackboard private mirror or a Drive runtime fetch), computes `source_version_id`, invokes the existing appropriate extractor, emits `prometeo.canonical-document/v1`, and passes it through `canonicalToReader()` / `projectTtsChunks()`.

Acceptance for that next step:

1. the same fixture bytes presented through two provenance adapters converge on one `source_version_id` and one `document_id`;
2. changing Reader CSS/Push Scroll physics does not change extraction/projection IDs;
3. changing voice changes only `ttsa1` audio cache keys;
4. visible highlight can resolve every TTS `link.reader_span` back to exact Reader text;
5. private provider URLs/tokens never enter persisted/public payloads.
