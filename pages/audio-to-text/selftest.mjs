import assert from 'node:assert/strict';
import { AsyncJobQueue, CAPTURE_CONFIG, FILE_CAPTURE_CONFIG, fuzzyTrim, mergeSegments, planWindows, qualityGate, transcriptDocument } from './core.mjs';

const long = planWindows(2 * 60 * 60 * 1000, FILE_CAPTURE_CONFIG);
assert.equal(FILE_CAPTURE_CONFIG.windowMs, 90000, 'file windows should stay short enough for reliable long-class transcription');
assert.equal(FILE_CAPTURE_CONFIG.windowMs - FILE_CAPTURE_CONFIG.stepMs, 5000, 'file cuts must share exactly 5 seconds at each boundary');
assert.equal(long.length, 85, '2 h fixture should be split into 85 canonical windows with 5 s overlap');
assert.deepEqual(long[0], {
  id: null, seq: 1, segment_no: 1, start_ms: 0, end_ms: 90000, overlap_ms: 0,
  capture_window_ms: 90000, capture_version: 'file-canonical-v4-wav16k-overlap5s', status: 'pending', transcript: '', quality: null,
  source: null, error: null, audio_key: null
});
assert.equal(long[1].start_ms, FILE_CAPTURE_CONFIG.stepMs);
assert.equal(long[1].overlap_ms, FILE_CAPTURE_CONFIG.overlapMs);
assert.equal(long.at(-1).end_ms, 7200000);

const trimmed = fuzzyTrim(
  'la memoria se reconstruye cada vez que recordamos una experiencia importante',
  'recordamos una experiencia importante y por eso puede cambiar con el tiempo',
  5000,
  150000
);
assert.match(trimmed, /^y por eso/i, 'overlap should be reconciled instead of duplicated');

const bad = qualityGate('hola mundo hola mundo hola mundo hola mundo hola mundo hola mundo');
assert.equal(bad.bad, true, 'consecutive n-gram degeneration must be rejected');
const good = qualityGate('La memoria cambia cuando una experiencia nueva modifica el contexto desde el que recordamos.');
assert.equal(good.bad, false, 'normal Spanish must pass the client quality gate');

const merged = mergeSegments([
  {seq:1,start_ms:0,end_ms:150000,overlap_ms:0,capture_window_ms:150000,status:'ready',transcript:'primera parte con una explicación suficientemente clara sobre memoria y aprendizaje'},
  {seq:2,start_ms:135000,end_ms:285000,overlap_ms:15000,capture_window_ms:150000,status:'error',transcript:''},
  {seq:3,start_ms:270000,end_ms:420000,overlap_ms:15000,capture_window_ms:150000,status:'ready',transcript:'tercera parte retoma el tema después del fragmento que no pudo transcribirse'}
], {durationMs:420000});
assert.match(merged, /Audio sin transcribir: 02:30–04:30/, 'uncovered failed audio must be explicit, never invented');

const doc = transcriptDocument({
  id:'00000000-0000-4000-8000-000000000001', title:'Clase larga', language:'es-AR', created_at:'2026-09-20T20:00:00-03:00',
  updated_at:'2026-09-20T22:00:00-03:00', duration_ms:420000,
  source:{kind:'file',ref:'indexeddb://source'},
  segments:[{id:'s1',seq:1,start_ms:0,end_ms:150000,overlap_ms:0,status:'ready',transcript:'texto listo',source:'whisper-large-v3',quality:{bad:false}}]
});
assert.equal(doc.schema, 'prometeo.transcript-document/v1');
assert.equal(doc.timestamps.word_level, false);
assert.equal(doc.segments[0].text, 'texto listo');

let active = 0, maxActive = 0, order = [];
const queue = new AsyncJobQueue(async value => {
  active += 1; maxActive = Math.max(maxActive, active);
  await new Promise(resolve => setTimeout(resolve, value === 1 ? 12 : 2));
  order.push(value); active -= 1;
}, 2);
queue.push(1); queue.push(2); queue.push(3); queue.push(4);
await queue.whenIdle();
assert.equal(maxActive, 2, 'canonical queue must respect concurrency');
assert.equal(order.length, 4, 'canonical queue must drain every job');

console.log(JSON.stringify({
  ok:true,
  checks:15,
  long_file_fixture:{duration_hours:2,windows:long.length},
  merge_gap_marker:true,
  quality_gate:true,
  queue_concurrency:maxActive,
  transcript_document:doc.schema
}, null, 2));
