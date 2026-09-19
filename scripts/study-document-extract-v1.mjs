#!/usr/bin/env node
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  makeSourceArtifact,
  extractorForMime,
  canonicalExtractionIdentity,
  extractFileText,
  textToCanonical,
  EXTRACTOR_VERSION
} from '../shared/study-ingestion/v1/document-pipeline.mjs';
import { canonicalToReader, projectTtsChunks } from '../.study-system/document-pipeline/v1/canonical-to-reader.mjs';

function args(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    out[key.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}
const a = args(process.argv);
for (const k of ['file','provider','provider-item-id','runtime-ref','media-type','title']) {
  if (!a[k]) throw new Error(`missing --${k}`);
}
const bytes = await readFile(a.file);
const source = makeSourceArtifact({
  provider: a.provider,
  provider_item_id: a['provider-item-id'],
  provider_version: a['provider-version'] || null,
  runtime_ref: a['runtime-ref'],
  visibility: a.visibility || 'private_runtime',
  media_type: a['media-type'],
  observed_at: a['observed-at'] || null,
  provider_course_id: a['provider-course-id'] || null,
  bytes
});
const selected = extractorForMime(source.media_type);
if (!selected.supported) {
  console.log(JSON.stringify({ status: selected.state, source_version_id: source.source_version_id, adapter: selected.id }, null, 2));
  process.exit(2);
}
const extractor = { id: selected.id, version: EXTRACTOR_VERSION };
const identity = canonicalExtractionIdentity(source, extractor);
const cacheDir = a['cache-dir'] || '.study-cache/document-extraction-v1';
await mkdir(cacheDir, { recursive: true });
const cacheFile = join(cacheDir, `${identity.canonical_extraction_version_id.replace(/:/g,'_')}.json`);
let payload;
let cache_hit = false;
try {
  await access(cacheFile);
  payload = JSON.parse(await readFile(cacheFile, 'utf8'));
  cache_hit = true;
} catch {
  const extraction = await extractFileText(a.file, source.media_type);
  if (extraction.status !== 'extracted') throw new Error(extraction.state || extraction.status);
  const canonical = textToCanonical({
    source,
    title: a.title,
    subtitle: a.subtitle || null,
    author: a.author || null,
    course_id: a['course-id'] || null,
    language: a.language || 'es-AR',
    extracted_text: extraction.text,
    extractor
  });
  const reader = canonicalToReader(canonical);
  const tts = projectTtsChunks(reader);
  payload = {
    canonical,
    reader,
    tts,
    extraction: {
      status: extraction.status,
      extractor_id: extraction.id,
      page_count: extraction.page_count,
      extracted_character_count: extraction.text.length
    }
  };
  await writeFile(cacheFile, JSON.stringify(payload));
}
if (a.output) await writeFile(a.output, JSON.stringify(payload.canonical, null, 2) + '\n');
if (a['reader-output']) await writeFile(a['reader-output'], JSON.stringify(payload.reader, null, 2) + '\n');
if (a['tts-output']) await writeFile(a['tts-output'], JSON.stringify(payload.tts, null, 2) + '\n');
console.log(JSON.stringify({
  status: 'ok',
  file: basename(a.file),
  cache_hit,
  extraction_skipped: cache_hit,
  source_version_id: source.source_version_id,
  canonical_extraction_version_id: payload.canonical.extraction.canonical_extraction_version_id,
  document_id: payload.canonical.document_id,
  reader_projection_version_id: payload.reader.reader_projection_version_id,
  tts_projection_version_id: payload.tts.tts_projection_version_id,
  segment_count: payload.reader.segments.length,
  tts_chunk_count: payload.tts.chunks.length,
  page_count: payload.extraction.page_count,
  extracted_character_count: payload.extraction.extracted_character_count,
  cache_file: cacheFile
}, null, 2));
