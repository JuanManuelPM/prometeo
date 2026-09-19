import { createHash } from 'node:crypto';

const READER_SCHEMA = 'prometeo.reader-payload/v1';
const TTS_SCHEMA = 'prometeo.tts-chunk-set/v1';
const DEFAULT_TTS = Object.freeze({
  id: 'reader-sentence-pack',
  version: '1',
  max_chars: 500,
  include_kinds: ['heading', 'paragraph', 'list_item', 'quote', 'caption']
});

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : stable(value), 'utf8').digest('hex');
}

function assertCanonical(doc) {
  if (!doc || doc.schema !== 'prometeo.canonical-document/v1') throw new Error('canonical schema');
  if (!doc.document_id || !doc.source?.source_version_id || !doc.extraction?.canonical_extraction_version_id) throw new Error('canonical identity');
  if (!Array.isArray(doc.sections) || !Array.isArray(doc.segments) || !doc.segments.length) throw new Error('canonical structure');
}

export function canonicalToReader(doc) {
  assertCanonical(doc);
  const ordered = [...doc.segments].sort((a,b) => a.order - b.order || a.segment_id.localeCompare(b.segment_id));
  let cursor = 0;
  const segments = ordered.map((s, index) => {
    const start = cursor;
    const end = start + s.text.length;
    cursor = end + (index === ordered.length - 1 ? 0 : 2);
    return {
      segment_id: s.segment_id,
      section_id: s.section_id,
      order: s.order,
      kind: s.kind,
      ...(s.heading_level ? { heading_level: s.heading_level } : {}),
      text: s.text,
      span: { start, end },
      source_locators: s.source_locators,
      ...(s.asset_refs?.length ? { asset_refs: s.asset_refs } : {})
    };
  });
  const readable_text = segments.map(s => s.text).join('\n\n');
  const spanById = new Map(segments.map(s => [s.segment_id, s.span]));
  const paragraphs = segments.filter(s => s.kind === 'paragraph').map((s, i) => ({
    paragraph_id: `p:${s.segment_id}`,
    section_id: s.section_id,
    order: i,
    segment_ids: [s.segment_id],
    span: s.span
  }));
  const sections = [...doc.sections].sort((a,b) => a.order - b.order || a.section_id.localeCompare(b.section_id)).map(s => ({
    section_id: s.section_id,
    order: s.order,
    ...(s.title != null ? { title: s.title } : {}),
    ...(s.level != null ? { level: s.level } : {}),
    segment_ids: s.segment_ids.filter(id => spanById.has(id))
  }));
  const projectionIdentity = {
    contract: READER_SCHEMA,
    projector: 'canonical-to-reader',
    projector_version: '1',
    document_id: doc.document_id,
    canonical_extraction_version_id: doc.extraction.canonical_extraction_version_id,
    context: { title: doc.title, subtitle: doc.subtitle ?? null, author: doc.author ?? null, course_id: doc.course_id ?? null, language: doc.language },
    sections,
    segments: segments.map(({source_locators, ...s}) => s),
    assets: (doc.assets || []).map(({source_locators, content_sha256, ...a}) => a)
  };
  const reader_projection_version_id = `rpv1:sha256:${sha256(projectionIdentity)}`;
  return {
    schema: READER_SCHEMA,
    document_id: doc.document_id,
    title: doc.title,
    subtitle: doc.subtitle ?? null,
    author: doc.author ?? null,
    course_id: doc.course_id ?? null,
    language: doc.language,
    reader_projection_version_id,
    canonical_extraction_version_id: doc.extraction.canonical_extraction_version_id,
    source_version_id: doc.source.source_version_id,
    offset_unit: 'utf16_code_unit',
    sections,
    segments,
    paragraphs,
    readable_text,
    readable_text_length: readable_text.length,
    assets: (doc.assets || []).map(a => ({
      asset_id: a.asset_id,
      kind: a.kind,
      mime_type: a.mime_type,
      alt: a.alt ?? null,
      runtime_ref: a.runtime_ref,
      visibility: a.visibility,
      source_locators: a.source_locators || []
    })),
    provenance_ref: {
      document_id: doc.document_id,
      source_version_id: doc.source.source_version_id,
      canonical_extraction_version_id: doc.extraction.canonical_extraction_version_id,
      provenance_ids: doc.source.provenance.map(p => p.provenance_id)
    }
  };
}

function sentenceUnits(segment, maxChars) {
  const units = [];
  const re = /[^.!?…]+[.!?…]+(?:[”»"])?|[^.!?…]+$/gu;
  let m;
  while ((m = re.exec(segment.text))) {
    let a = m.index, b = m.index + m[0].length;
    while (a < b && /\s/u.test(segment.text[a])) a++;
    while (b > a && /\s/u.test(segment.text[b - 1])) b--;
    if (a === b) continue;
    let start = a;
    while (b - start > maxChars) {
      const hardEnd = start + maxChars;
      let cut = hardEnd;
      for (let i = hardEnd; i > start + Math.floor(maxChars * 0.55); i--) {
        if (/\s/u.test(segment.text[i])) { cut = i; break; }
      }
      let end = cut;
      while (end > start && /\s/u.test(segment.text[end - 1])) end--;
      units.push({ segment_id: segment.segment_id, segment_start: start, segment_end: end, text: segment.text.slice(start, end) });
      start = cut;
      while (start < b && /\s/u.test(segment.text[start])) start++;
    }
    if (start < b) units.push({ segment_id: segment.segment_id, segment_start: start, segment_end: b, text: segment.text.slice(start, b) });
  }
  return units;
}

export function projectTtsChunks(reader, overrides = {}) {
  if (!reader || reader.schema !== READER_SCHEMA) throw new Error('reader schema');
  const chunker = { ...DEFAULT_TTS, ...overrides };
  chunker.include_kinds = [...(overrides.include_kinds || DEFAULT_TTS.include_kinds)];
  if (!Number.isInteger(chunker.max_chars) || chunker.max_chars < 32) throw new Error('max_chars');
  const tts_projection_version_id = `ttsp1:sha256:${sha256({
    reader_projection_version_id: reader.reader_projection_version_id,
    chunker
  })}`;
  const byId = new Map(reader.segments.map(s => [s.segment_id, s]));
  const chunks = [];
  let pending = [];
  let pendingLen = 0;

  const flush = () => {
    if (!pending.length) return;
    let text = '';
    const links = [];
    for (const unit of pending) {
      if (text) text += ' ';
      const chunkStart = text.length;
      text += unit.text;
      const chunkEnd = text.length;
      const seg = byId.get(unit.segment_id);
      links.push({
        segment_id: unit.segment_id,
        reader_span: { start: seg.span.start + unit.segment_start, end: seg.span.start + unit.segment_end },
        segment_span: { start: unit.segment_start, end: unit.segment_end },
        chunk_span: { start: chunkStart, end: chunkEnd }
      });
    }
    const order = chunks.length;
    const reader_span = { start: links[0].reader_span.start, end: links[links.length - 1].reader_span.end };
    const identity = { tts_projection_version_id, order, text, links };
    chunks.push({ chunk_id: `ttsc1:sha256:${sha256(identity)}`, order, text, reader_span, links });
    pending = [];
    pendingLen = 0;
  };

  for (const segment of reader.segments) {
    if (!chunker.include_kinds.includes(segment.kind)) { flush(); continue; }
    for (const unit of sentenceUnits(segment, chunker.max_chars)) {
      const nextLen = pending.length ? pendingLen + 1 + unit.text.length : unit.text.length;
      if (pending.length && nextLen > chunker.max_chars) flush();
      pending.push(unit);
      pendingLen = pending.length === 1 ? unit.text.length : pendingLen + 1 + unit.text.length;
    }
  }
  flush();
  return {
    schema: TTS_SCHEMA,
    document_id: reader.document_id,
    reader_projection_version_id: reader.reader_projection_version_id,
    tts_projection_version_id,
    language: reader.language,
    offset_unit: 'utf16_code_unit',
    chunker,
    chunks
  };
}

export function ttsAudioCacheKey(chunk, voiceSpec) {
  if (!chunk?.chunk_id) throw new Error('chunk');
  const required = ['engine_id', 'model_version', 'voice_id', 'voice_revision'];
  for (const k of required) if (!voiceSpec?.[k]) throw new Error(`voiceSpec.${k}`);
  return `ttsa1:sha256:${sha256({
    chunk_id: chunk.chunk_id,
    engine_id: voiceSpec.engine_id,
    model_version: voiceSpec.model_version,
    voice_id: voiceSpec.voice_id,
    voice_revision: voiceSpec.voice_revision,
    synthesis_config: voiceSpec.synthesis_config || {}
  })}`;
}

export const internals = { stable, sha256, DEFAULT_TTS };
