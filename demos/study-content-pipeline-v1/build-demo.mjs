import { Buffer } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { makeSourceArtifact, textToCanonical } from '../../shared/study-ingestion/v1/document-pipeline.mjs';
import { canonicalToReader, projectTtsChunks } from '../../.study-system/document-pipeline/v1/canonical-to-reader.mjs';

const fixture = `Cómo se transforma un documento\n\nPrometeo separa la fuente original de la forma en que se lee. El proveedor identifica el archivo y conserva su procedencia, pero el lector nunca necesita saber si llegó desde Drive o Blackboard.\n\nUna sola extracción convierte el archivo en texto y estructura normalizada. A partir de ese documento canónico se proyectan los párrafos que ves en pantalla y los fragmentos que usa la voz.\n\nCuando cambia la voz, el documento no se extrae de nuevo. Cuando cambia la interfaz, tampoco. Cada capa tiene una identidad propia para reutilizar el trabajo que ya está hecho.\n\nEsta página usa un fixture público y seguro, pero atraviesa el mismo contrato Canonical Document → Reader Payload → TTS Chunk Set que usa el pipeline real.`;
const bytes = Buffer.from(fixture, 'utf8');
const source = makeSourceArtifact({
  provider: 'fixture', provider_item_id: 'public-study-pipeline-canary-v1', provider_version: '1',
  runtime_ref: 'public-fixture:study-content-pipeline-v1', visibility: 'public', media_type: 'text/plain', bytes
});
const canonical = textToCanonical({
  source,
  title: 'Del archivo a una lectura reproducible',
  subtitle: 'Canary público del pipeline académico',
  author: 'Prometeo · fixture sintético',
  course_id: 'modelos-teorias-ii',
  language: 'es-AR',
  extracted_text: fixture,
  extractor: { id: 'plain-text', version: '1.0.0' }
});
const reader = canonicalToReader(canonical);
const tts = projectTtsChunks(reader);
await writeFile(new URL('./demo.canonical.json', import.meta.url), JSON.stringify(canonical, null, 2) + '\n');
await writeFile(new URL('./demo.reader.json', import.meta.url), JSON.stringify(reader, null, 2) + '\n');
await writeFile(new URL('./demo.tts.json', import.meta.url), JSON.stringify(tts, null, 2) + '\n');
console.log(JSON.stringify({document_id: canonical.document_id, reader_projection_version_id: reader.reader_projection_version_id, tts_projection_version_id: tts.tts_projection_version_id, segments:reader.segments.length,chunks:tts.chunks.length}, null, 2));
