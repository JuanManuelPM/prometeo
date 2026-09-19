# Prometeo Document → Reader contract v1

Status: additive data contract. This package does **not** redesign or promote a Reader UI.

## Boundary

```text
SOURCE / provider binding
  Drive item | Blackboard attachment | local/private runtime object
        ↓ ingestion/extractor adapter (provider-specific, outside Reader)
CANONICAL DOCUMENT
        ↓ deterministic projection
READER PAYLOAD
        ↓ Reader engine/UI (provider-agnostic)
        └→ deterministic TTS chunk projection → audio cache (derivative)
```

Historical Study law is preserved: **SOURCE ≠ CONTENT / DERIVATION ≠ ENGINE / UI**. Drive/Blackboard/PDF/DOCX knowledge stops before `Canonical Document`. The Reader applies its own typography/layout and must not treat original styling as authority.

## Contracts

- `CANONICAL_DOCUMENT.schema.json` — normalized semantic document emitted by an existing/new extractor adapter. This contract does not prescribe PDF/DOCX extraction.
- `READER_PAYLOAD.schema.json` — minimum provider-neutral input for reading surfaces.
- `TTS_CHUNK_SET.schema.json` — deterministic, voice-neutral chunks with reversible links to visible text.
- `canonical-to-reader.mjs` — minimal projection prototype plus TTS projector/cache-key helper.
- `example.synthetic.*.json` — synthetic, non-private end-to-end fixture.

## Reader Payload invariants

1. `segments` are ordered semantic text blocks. `kind=heading` carries semantic heading level; `kind=paragraph` creates explicit `paragraphs` boundaries.
2. `readable_text` is the exact projection joined with `\n\n`. Every segment `span` points into it using `utf16_code_unit`, matching browser/JS string and DOM Range offsets.
3. `source_locators` are provider-neutral locators (`page`, `block`, source text range or opaque). No Google/Blackboard URL is required.
4. `provenance_ref` contains only opaque IDs back to runtime provenance. Resolution/authentication stays outside the Reader.
5. Assets use opaque `runtime_ref`; they may remain private. A Reader Payload is an in-memory/runtime value and is **not presumed publishable JSON**.
6. No font, color, margin, page CSS or original-document visual styling is authoritative here.
7. Academic dates/events do not belong in this payload unless the document itself is displaying them as document content.

## TTS invariants

`Canonical segments → Reader Payload → deterministic TTS chunks`.

- Chunking is a derivation, never authority.
- Default prototype preserves the existing Reader family ceiling of 500 characters and uses deterministic sentence packing.
- Each chunk contains `links[]` with both `reader_span` and `segment_span`, plus the corresponding `chunk_span`. Therefore `audio chunk → chunk text span → visible segment/span` is reversible.
- Voice/model settings do not participate in chunk identity. They only participate in `ttsAudioCacheKey()`.
- Audio URLs/blobs do not belong in canonical content and may be evicted/regenerated freely.

## Identity and invalidation

All hashes are SHA-256 over deterministic UTF-8 serialization (stable/JCS-style sorted object keys; array order is semantic).

### Source version

`source_version_id = srcv1:sha256:<sha256 exact ingested bytes>` when bytes exist. For non-file sources, hash a provider-neutral normalized source envelope and mark `hash_basis=normalized_source_envelope`.

A provider observation (`Drive item`, `Blackboard attachment`) is **provenance**, not source identity. Two providers with identical bytes resolve to the same `source_version_id`. Different wrappers that extract to identical canonical semantic content can additionally converge on the same `document_id`.

### Canonical extraction version

`canonical_extraction_version_id = cex1:sha256:<hash({source_version_id, canonical_schema, extractor_id, extractor_version, extractor_config_sha256})>`.

`document_id = doc1:sha256:<canonical_content_sha256>`, where the content digest covers normalized semantic structure/text/assets but excludes provider binding, private runtime references and course placement. This permits deduplication across Drive/Blackboard provenance.

Changing only Reader CSS/layout **does not** change source or canonical extraction IDs.

### Reader projection version

`reader_projection_version_id = rpv1:sha256:<hash(content-affecting Reader projection)>`.

It includes canonical extraction identity plus projected semantic/context data. It excludes typography, palette, viewport, scroll physics, UI controls and voice choice. A pure Reader redesign therefore reuses the same payload/extraction.

### TTS chunk projection

`tts_projection_version_id = ttsp1:sha256:<hash({reader_projection_version_id, chunker id/version/config})>`.

`chunk_id = ttsc1:sha256:<hash({tts_projection_version_id, order, text, links})>`.

Changing chunking rules invalidates TTS chunks/audio only; it does not invalidate canonical extraction or Reader content.

### Voice/audio cache

`audio_cache_key = ttsa1:sha256:<hash({chunk_id, engine_id, model_version, voice_id, voice_revision, synthesis_config})>`.

Changing only voice/model/speed baked into synthesis creates a new audio cache key while preserving canonical document, Reader Payload and chunk set. Playback-only speed that does not change synthesized bytes must stay out of this key.

## Layer invalidation matrix

| Change | Source | Canonical extraction | Reader projection | TTS chunks | TTS audio |
|---|---:|---:|---:|---:|---:|
| Reader CSS / Push Scroll physics | keep | keep | keep | keep | keep |
| Reader content projection rule | keep | keep | rebuild | rebuild | rebuild |
| TTS chunk algorithm/max chars | keep | keep | keep | rebuild | rebuild |
| Voice/model | keep | keep | keep | keep | rebuild |
| Extractor version/config | keep | rebuild | rebuild | rebuild | rebuild |
| Source bytes | new | rebuild | rebuild | rebuild | rebuild |

## Duplicate source example

The synthetic canonical fixture carries two provenance observations — one `drive`, one `blackboard` — bound to one `source_version_id`. They are two observations of one content object, not two document authorities.

## Privacy

- Never serialize workspace tokens, cookies, signed URLs or provider credentials into these contracts.
- Private provider URLs remain in the source adapter/runtime resolver.
- `runtime_ref` may resolve to an authenticated fetch only while the user/session has access.
- Publishing a schema/prototype is safe; publishing a real private `Canonical Document` or `Reader Payload` is not implied or required.
