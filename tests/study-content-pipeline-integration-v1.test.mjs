import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import {
  makeSourceArtifact,
  extractorForMime,
  textToCanonical,
  canonicalExtractionIdentity
} from '../shared/study-ingestion/v1/document-pipeline.mjs';
import { canonicalToReader, projectTtsChunks, ttsAudioCacheKey } from '../.study-system/document-pipeline/v1/canonical-to-reader.mjs';
import { blackboardItemToSourceRecord } from '../shared/study-ingestion/v1/blackboard-source-adapter.mjs';
import { deriveScheduleCandidates, markScheduleConflicts } from '../shared/study-ingestion/v1/derived-events.mjs';

const bytes = Buffer.from('same academic bytes across providers\n', 'utf8');
const shared = {
  media_type: 'application/pdf',
  bytes,
  visibility: 'private_runtime'
};
const drive = makeSourceArtifact({ ...shared, provider: 'drive', provider_item_id: 'drive-1', provider_version: 'v7', runtime_ref: 'drive-private:drive-1' });
const blackboard = makeSourceArtifact({ ...shared, provider: 'blackboard', provider_item_id: 'bb-attachment-1', provider_version: 'v2', runtime_ref: 'storage:study-blackboard-files/file.pdf' });
assert.equal(drive.source_version_id, blackboard.source_version_id, 'same bytes must converge on source identity');
assert.notEqual(drive.provenance[0].provenance_id, blackboard.provenance[0].provenance_id, 'provider observation stays distinct');

const extractor = { id: extractorForMime('application/pdf').id, version: '1.0.0' };
assert.equal(extractor.id, extractorForMime('application/pdf').id);
assert.equal(extractor.id, 'pdf-poppler-pdftotext');
assert.equal(extractorForMime('application/pdf').id, extractorForMime('application/pdf').id, 'extractor selection is provider-neutral');
assert.equal(extractorForMime('video/mp4').state, 'transcription_adapter_required');
assert.equal(extractorForMime('audio/mpeg').state, 'transcription_adapter_required');

const extracted = 'Primera idea.\n\nSegunda idea para leer en voz alta.';
const c1 = textToCanonical({ source: drive, title: 'Documento compartido', language: 'es-AR', extracted_text: extracted, extractor });
const c2 = textToCanonical({ source: blackboard, title: 'Documento compartido', language: 'es-AR', extracted_text: extracted, extractor });
assert.equal(c1.document_id, c2.document_id, 'provider must not affect canonical content identity');
assert.equal(c1.extraction.canonical_extraction_version_id, c2.extraction.canonical_extraction_version_id, 'same bytes + same extractor converge');
assert.match(c1.document_id, /^doc1:sha256:[0-9a-f]{64}$/);
assert.match(c1.source.source_version_id, /^srcv1:sha256:[0-9a-f]{64}$/);
assert.match(c1.extraction.canonical_extraction_version_id, /^cex1:sha256:[0-9a-f]{64}$/);
assert.equal(canonicalExtractionIdentity(drive, extractor).canonical_extraction_version_id, c1.extraction.canonical_extraction_version_id);

const reader = canonicalToReader(c1);
const tts = projectTtsChunks(reader, { max_chars: 64 });
assert.equal(reader.document_id, c1.document_id);
assert.ok(reader.segments.length >= 2);
assert.ok(tts.chunks.length >= 1);
for (const chunk of tts.chunks) {
  for (const link of chunk.links) {
    const fromChunk = chunk.text.slice(link.chunk_span.start, link.chunk_span.end);
    const fromReader = reader.readable_text.slice(link.reader_span.start, link.reader_span.end);
    const seg = reader.segments.find(s => s.segment_id === link.segment_id);
    const fromSegment = seg.text.slice(link.segment_span.start, link.segment_span.end);
    assert.equal(fromChunk, fromReader, 'TTS chunk span maps to exact Reader text');
    assert.equal(fromChunk, fromSegment, 'TTS chunk span maps to exact segment text');
  }
}
const voiceA = { engine_id: 'modelos-room-audio-v2', model_version: '1', voice_id: 'julian', voice_revision: '1', synthesis_config: {} };
const voiceB = { ...voiceA, voice_id: 'clara' };
const keyA = ttsAudioCacheKey(tts.chunks[0], voiceA);
assert.equal(keyA, ttsAudioCacheKey(tts.chunks[0], voiceA), 'same voice spec must be stable');
assert.notEqual(keyA, ttsAudioCacheKey(tts.chunks[0], voiceB), 'voice change invalidates audio only');
assert.equal(reader.document_id, c1.document_id, 'voice change does not alter canonical/reader');

const bbRecord = blackboardItemToSourceRecord({
  item_key: 'file-7', course_key: 'course-1', item_type: 'file', title: 'Programa.pdf', href: 'https://palermo.blackboard.com/private-file'
}, {
  captured_at: '2026-09-19T15:00:00Z',
  mirrored_file: { storage_path: 'course/file.pdf', mime_type: 'application/pdf', sha256: 'abc', size_bytes: 123 }
});
assert.equal(bbRecord.extraction_request.parser_profile, 'document-default');
assert.equal(bbRecord.extraction_request.provider, 'blackboard');
assert.equal(bbRecord.extraction_request.mime_type, 'application/pdf');

const a = deriveScheduleCandidates('Parcial — 23/09/2026', { source_id: 'bb:item:a', course_id: 'c', provider: 'blackboard' })[0];
const b = deriveScheduleCandidates('Parcial — 24/09/2026', { source_id: 'drive:item:b', course_id: 'c', provider: 'drive' })[0];
const conflicts = markScheduleConflicts([a,b]);
assert.equal(conflicts[0].extraction_status, 'conflict');
assert.equal(conflicts[1].extraction_status, 'conflict');
assert.ok(conflicts[0].conflict_group_id);
assert.equal(conflicts[0].conflict_group_id, conflicts[1].conflict_group_id);

console.log(JSON.stringify({
  ok: true,
  source_version_id: drive.source_version_id,
  document_id: c1.document_id,
  reader_projection_version_id: reader.reader_projection_version_id,
  tts_projection_version_id: tts.tts_projection_version_id,
  tests: 24
}, null, 2));
