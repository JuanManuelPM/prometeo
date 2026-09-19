import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { canonicalToReader, projectTtsChunks } from '../../../.study-system/document-pipeline/v1/canonical-to-reader.mjs';

const execFileAsync = promisify(execFile);
export const CONTRACT = 'prometeo.canonical-document/v1';
export const EXTRACTOR_PROFILE = 'document-default';
export const EXTRACTOR_VERSION = '1.0.0';

export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  const h = createHash('sha256');
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) h.update(value);
  else h.update(typeof value === 'string' ? value : stable(value), 'utf8');
  return h.digest('hex');
}

export function makeSourceArtifact({
  provider,
  provider_item_id,
  provider_version = null,
  runtime_ref,
  visibility = 'private_runtime',
  media_type,
  bytes,
  observed_at = null,
  provider_course_id = null,
  source_locator = null
}) {
  if (!provider || !provider_item_id || !runtime_ref || !media_type || !bytes) throw new Error('source artifact fields');
  const content_sha256 = sha256(bytes);
  return {
    schema: 'prometeo.source-artifact/v1',
    provider,
    provider_item_id,
    provider_version,
    provider_course_id,
    source_locator,
    source_version_id: `srcv1:sha256:${content_sha256}`,
    content_sha256,
    hash_basis: 'raw_bytes',
    media_type,
    byte_length: bytes.byteLength,
    provenance: [{
      provenance_id: `prov:${provider}:${provider_item_id}${provider_version ? `:${provider_version}` : ''}`,
      provider,
      runtime_ref,
      visibility,
      ...(observed_at ? { observed_at } : {})
    }]
  };
}

function xmlEntities(text) {
  return text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function xmlText(xml) {
  return xmlEntities(xml
    .replace(/<w:tab\/?\s*>/g, '\t')
    .replace(/<w:br\/?\s*>/g, '\n')
    .replace(/<a:br\/?\s*>/g, '\n')
    .replace(/<\/w:p>/g, '\n\n')
    .replace(/<\/a:p>/g, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function canonicalExtractionIdentity(source, extractor) {
  if (!source?.source_version_id || !extractor?.id) throw new Error('extraction identity input');
  const extractor_config = extractor.config || { profile: EXTRACTOR_PROFILE, whitespace: 'blocks-v1' };
  const extractor_config_sha256 = sha256(extractor_config);
  const canonical_extraction_version_id = `cex1:sha256:${sha256({
    source_version_id: source.source_version_id,
    canonical_schema: CONTRACT,
    extractor_id: extractor.id,
    extractor_version: extractor.version || EXTRACTOR_VERSION,
    extractor_config_sha256
  })}`;
  return { canonical_extraction_version_id, extractor_config_sha256, extractor_config };
}

export function extractorForMime(mediaType) {
  const mime = String(mediaType || '').toLowerCase().split(';')[0].trim();
  if (mime === 'application/pdf') return { id: 'pdf-poppler-pdftotext', kind: 'document', supported: true };
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return { id: 'docx-openxml-text', kind: 'document', supported: true };
  if (mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return { id: 'pptx-openxml-slides', kind: 'slides', supported: true };
  if (mime === 'text/html' || mime === 'application/xhtml+xml') return { id: 'html-structured-text', kind: 'html', supported: true };
  if (mime.startsWith('text/')) return { id: 'plain-text', kind: 'text', supported: true };
  if (mime.startsWith('audio/')) return { id: 'audio-transcription-adapter', kind: 'audio', supported: false, state: 'transcription_adapter_required' };
  if (mime.startsWith('video/')) return { id: 'video-audio-transcription-adapter', kind: 'video', supported: false, state: 'transcription_adapter_required' };
  return { id: 'unsupported-document-adapter', kind: 'unknown', supported: false, state: 'unsupported_media_type' };
}

export async function extractFileText(filePath, mediaType) {
  const adapter = extractorForMime(mediaType);
  if (!adapter.supported) return { ...adapter, status: 'blocked', text: null, page_count: null };
  if (adapter.id === 'pdf-poppler-pdftotext') {
    const { stdout } = await execFileAsync('pdftotext', ['-enc', 'UTF-8', '-layout', filePath, '-'], { maxBuffer: 64 * 1024 * 1024 });
    const pages = stdout.replace(/\f+$/u, '').split('\f');
    return { ...adapter, status: 'extracted', text: stdout, page_count: pages.length };
  }
  if (adapter.id === 'docx-openxml-text') {
    const { stdout } = await execFileAsync('unzip', ['-p', filePath, 'word/document.xml'], { maxBuffer: 64 * 1024 * 1024 });
    return { ...adapter, status: 'extracted', text: xmlText(stdout), page_count: null };
  }
  if (adapter.id === 'pptx-openxml-slides') {
    const { stdout: names } = await execFileAsync('unzip', ['-Z1', filePath], { maxBuffer: 8 * 1024 * 1024 });
    const slides = names.split(/\r?\n/).filter(x => /^ppt\/slides\/slide\d+\.xml$/.test(x)).sort((a,b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
    const text = [];
    for (const slide of slides) {
      const { stdout } = await execFileAsync('unzip', ['-p', filePath, slide], { maxBuffer: 16 * 1024 * 1024 });
      text.push(xmlText(stdout));
    }
    return { ...adapter, status: 'extracted', text: text.join('\f'), page_count: slides.length };
  }
  const raw = await readFile(filePath, 'utf8');
  if (adapter.id === 'html-structured-text') {
    const text = xmlEntities(raw.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<\/(p|div|li|h[1-6]|section|article)>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
      .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return { ...adapter, status: 'extracted', text, page_count: null };
  }
  return { ...adapter, status: 'extracted', text: raw, page_count: null };
}

function normalizeBlock(block) {
  return block.split(/\r?\n/).map(x => x.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function textToCanonical({ source, title, subtitle = null, author = null, course_id = null, language = 'es-AR', extracted_text, extractor }) {
  if (!source?.source_version_id || !extracted_text || !extractor?.id) throw new Error('canonical input');
  const rawPages = String(extracted_text).replace(/\f+$/u, '').split('\f');
  const pages = rawPages.length ? rawPages : [String(extracted_text)];
  const sections = [];
  const segments = [];
  let order = 0;
  pages.forEach((page, pageIndex) => {
    const section_id = `sec-${String(pageIndex + 1).padStart(4, '0')}`;
    const segment_ids = [];
    const blocks = page.split(/(?:\r?\n)[ \t]*(?:\r?\n)+/).map(normalizeBlock).filter(Boolean);
    const safeBlocks = blocks.length ? blocks : [normalizeBlock(page)].filter(Boolean);
    for (const block of safeBlocks) {
      const segment_id = `seg-${String(order + 1).padStart(6, '0')}`;
      segment_ids.push(segment_id);
      segments.push({
        segment_id,
        section_id,
        order,
        kind: 'paragraph',
        text: block,
        source_locators: [{ kind: 'page', page: pageIndex + 1 }]
      });
      order++;
    }
    if (segment_ids.length) sections.push({ section_id, order: sections.length, segment_ids });
  });
  if (!segments.length) throw new Error('extractor produced no text');

  const semantic = {
    language,
    title: String(title || 'Documento').trim(),
    subtitle: subtitle ?? null,
    author: author ?? null,
    sections,
    segments: segments.map(({ source_locators, ...segment }) => segment),
    assets: []
  };
  const canonical_content_sha256 = sha256(semantic);
  const { canonical_extraction_version_id, extractor_config_sha256 } = canonicalExtractionIdentity(source, extractor);

  return {
    schema: CONTRACT,
    document_id: `doc1:sha256:${canonical_content_sha256}`,
    title: semantic.title,
    subtitle,
    author,
    course_id,
    language,
    source: {
      source_version_id: source.source_version_id,
      content_sha256: source.content_sha256,
      hash_basis: source.hash_basis,
      media_type: source.media_type,
      byte_length: source.byte_length,
      provenance: source.provenance
    },
    extraction: {
      canonical_extraction_version_id,
      extractor_id: extractor.id,
      extractor_version: extractor.version || EXTRACTOR_VERSION,
      extractor_config_sha256,
      canonical_content_sha256
    },
    sections,
    segments,
    assets: []
  };
}

export async function buildDocumentPipeline({ filePath, sourceObservation, title, subtitle = null, author = null, course_id = null, language = 'es-AR' }) {
  const bytes = await readFile(filePath);
  const source = makeSourceArtifact({ ...sourceObservation, bytes });
  const extraction = await extractFileText(filePath, source.media_type);
  if (extraction.status !== 'extracted') return { source, extraction, canonical: null, reader: null, tts: null };
  const canonical = textToCanonical({ source, title, subtitle, author, course_id, language, extracted_text: extraction.text, extractor: { id: extraction.id, version: EXTRACTOR_VERSION } });
  const reader = canonicalToReader(canonical);
  const tts = projectTtsChunks(reader);
  return { source, extraction, canonical, reader, tts };
}
