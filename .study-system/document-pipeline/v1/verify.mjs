import fs from 'node:fs';
import assert from 'node:assert/strict';
import { canonicalToReader, projectTtsChunks, ttsAudioCacheKey } from './canonical-to-reader.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL(`./${n}`,import.meta.url),'utf8'));
const canonical=read('example.synthetic.canonical.json');
const expectedReader=read('example.synthetic.reader.json');
const expectedTts=read('example.synthetic.tts.json');
const reader=canonicalToReader(canonical);
const tts=projectTtsChunks(reader);
assert.deepEqual(reader,expectedReader);
assert.deepEqual(tts,expectedTts);
assert.equal(reader.readable_text.length,reader.readable_text_length);
for(const s of reader.segments) assert.equal(reader.readable_text.slice(s.span.start,s.span.end),s.text);
for(const c of tts.chunks) for(const link of c.links){
 const seg=reader.segments.find(s=>s.segment_id===link.segment_id); assert(seg);
 assert.equal(reader.readable_text.slice(link.reader_span.start,link.reader_span.end),seg.text.slice(link.segment_span.start,link.segment_span.end));
 assert.equal(c.text.slice(link.chunk_span.start,link.chunk_span.end),seg.text.slice(link.segment_span.start,link.segment_span.end));
}
const voiceA={engine_id:'demo-engine',model_version:'1',voice_id:'voice-a',voice_revision:'1',synthesis_config:{format:'mp3'}};
const voiceB={...voiceA,voice_id:'voice-b'};
assert.equal(ttsAudioCacheKey(tts.chunks[0],voiceA),ttsAudioCacheKey(tts.chunks[0],voiceA));
assert.notEqual(ttsAudioCacheKey(tts.chunks[0],voiceA),ttsAudioCacheKey(tts.chunks[0],voiceB));
console.log(`PASS document-reader-v1: ${reader.segments.length} segments, ${reader.paragraphs.length} paragraphs, ${tts.chunks.length} TTS chunks`);
