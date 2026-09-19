# Study content pipeline integration — test report

Date: 2026-09-19

## Unit/integration contract test

Executed: `node tests/study-content-pipeline-integration-v1.test.mjs`

Result: PASS. Verified same bytes across Drive/Blackboard observations converge on SOURCE and Canonical identity; MIME chooses extractor; Canonical -> Reader -> TTS offsets are reversible; voice-only change changes audio cache key; Blackboard queue requests `document-default`; conflicting schedule dates preserve both sources.

## Real Drive PDF

A real PDF in the provided Modelos II Drive folder was fetched with the connected Drive account and independently processed from its raw bytes. The repository evidence file stores only safe metadata/hashes/counts.

- raw bytes: 65,008
- pages: 6
- SHA-256: `4ccbe2157d4b0906d0af9b91bc52e493a12d5a33ae1c5d5dd74732f259a652c6`
- shared extractor: `pdf-poppler-pdftotext@1.0.0`
- extracted chars: 21,933
- Canonical segments: 28
- TTS chunks: 49
- second run: `cache_hit=true`, `extraction_skipped=true`

The real extracted text, real Canonical payload, Reader payload and TTS chunk text are intentionally not committed.

## Public canary

`demos/study-content-pipeline-v1/` is built from a synthetic safe fixture through the same Canonical -> Reader -> TTS projection code. The page renders `demo.reader.json`; it does not hardcode document paragraphs in HTML. Playback sends the committed TTS chunks to the already-existing `modelos-room-audio-v2` backend/cache.
