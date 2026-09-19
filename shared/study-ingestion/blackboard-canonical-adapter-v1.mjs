const SCHEMA_SOURCE = 'prometeo.study-source-record/v1';
const SCHEMA_DOCUMENT = 'prometeo.study-canonical-document/v1';
const SCHEMA_TEXT = 'prometeo.study-document-text-version/v1';
const SCHEMA_EVENT = 'prometeo.study-derived-event/v1';

const clean = value => value == null ? null : String(value).trim() || null;
const iso = value => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const sourceIdForItem = item => `bb:item:${String(item.item_key || item.id || '').trim()}`;
const documentIdForSource = sourceId => `doc:${sourceId}`;

export function blackboardItemToSourceRecord(item, context = {}) {
  const itemKey = clean(item?.item_key || item?.id);
  if (!itemKey) throw new Error('blackboard item_key is required');
  const sourceId = sourceIdForItem({...item, item_key: itemKey});
  const capturedAt = iso(context.captured_at || item.last_seen_at) || new Date().toISOString();
  const providerCourseId = clean(item.course_key);
  const title = clean(item.title || item.file_name) || 'Blackboard item';
  const bodyText = clean(item.body_text);
  const mirrored = context.mirrored_file || null;
  const privateRef = clean(context.private_ref || mirrored?.private_ref || (mirrored?.storage_path ? `storage:study-blackboard-files/${mirrored.storage_path}` : null));

  const attachments = Array.isArray(context.attachments) ? context.attachments.map((a, i) => ({
    attachment_id: clean(a.attachment_id) || `${sourceId}:attachment:${i + 1}`,
    title: clean(a.title || a.file_name),
    source_url: clean(a.source_url || a.href),
    private_ref: clean(a.private_ref),
    mime_type: clean(a.mime_type),
    size_bytes: Number.isFinite(Number(a.size_bytes)) ? Number(a.size_bytes) : null,
    content_hash: clean(a.content_hash || a.sha256)
  })) : [];

  if ((item.item_type === 'file' || item.file_name) && !attachments.length) {
    attachments.push({
      attachment_id: `${sourceId}:file`,
      title: clean(item.file_name || item.title),
      source_url: clean(item.href),
      private_ref: privateRef,
      mime_type: clean(item.mime_type || mirrored?.mime_type),
      size_bytes: Number.isFinite(Number(mirrored?.size_bytes)) ? Number(mirrored.size_bytes) : null,
      content_hash: clean(mirrored?.sha256)
    });
  }

  return {
    schema: SCHEMA_SOURCE,
    source_id: sourceId,
    provider: 'blackboard',
    provider_course_id: providerCourseId,
    course_id: clean(context.course_id),
    provider_item_id: itemKey,
    item_type: clean(item.item_type || item.type) || 'content',
    title,
    body_text: bodyText,
    due_at: iso(item.due_at),
    modified_at: iso(item.modified_at),
    captured_at: capturedAt,
    source_url: clean(item.href),
    reopen_handle: clean(item.href || item.source_page),
    source_page: clean(item.source_page),
    attachments,
    provenance: {
      provider: 'blackboard',
      capture_method: clean(context.capture_method) || 'authenticated-browser-session',
      session_scope: 'user-visible-content',
      captured_at: capturedAt,
      bridge_version: clean(context.bridge_version),
      raw_record_table: 'study_bb_items'
    },
    raw_metadata: item.raw && typeof item.raw === 'object' ? item.raw : {}
  };
}

export function sourceRecordToCanonicalDocument(sourceRecord, context = {}) {
  if (!sourceRecord?.source_id) throw new Error('source_id is required');
  const documentId = documentIdForSource(sourceRecord.source_id);
  const privateRef = clean(context.private_ref || sourceRecord.attachments?.find(a => a.private_ref)?.private_ref);
  const mimeType = clean(context.mime_type || sourceRecord.attachments?.find(a => a.mime_type)?.mime_type);
  const contentHash = clean(context.content_hash || sourceRecord.attachments?.find(a => a.content_hash)?.content_hash);
  const hasSourceText = !!clean(sourceRecord.body_text);

  const document = {
    schema: SCHEMA_DOCUMENT,
    document_id: documentId,
    source_id: sourceRecord.source_id,
    provider: sourceRecord.provider,
    provider_course_id: sourceRecord.provider_course_id || null,
    provider_item_id: sourceRecord.provider_item_id || null,
    course_id: sourceRecord.course_id || null,
    document_kind: sourceRecord.item_type || 'content',
    title: sourceRecord.title,
    source_url: sourceRecord.source_url || null,
    reopen_handle: sourceRecord.reopen_handle || null,
    private_ref: privateRef,
    mime_type: mimeType,
    source_modified_at: sourceRecord.modified_at || null,
    captured_at: sourceRecord.captured_at,
    content_hash: contentHash,
    canonical_status: hasSourceText ? 'source-text' : privateRef ? 'binary-ready' : 'metadata-only',
    provenance: {
      source_id: sourceRecord.source_id,
      provider: sourceRecord.provider,
      captured_at: sourceRecord.captured_at,
      adapter: 'blackboard-canonical-adapter-v1'
    },
    raw_metadata: sourceRecord.raw_metadata || {}
  };

  const text_version = hasSourceText ? {
    schema: SCHEMA_TEXT,
    document_id: documentId,
    source_id: sourceRecord.source_id,
    text_kind: 'source_text',
    body_text: sourceRecord.body_text,
    extraction_method: 'blackboard-rendered-body-text',
    extraction_status: 'captured',
    captured_at: sourceRecord.captured_at,
    source_locator: {
      source_page: sourceRecord.source_page || null,
      url: sourceRecord.source_url || null
    },
    provenance: document.provenance
  } : null;

  const extraction_request = privateRef && !hasSourceText ? {
    document_id: documentId,
    source_id: sourceRecord.source_id,
    provider: sourceRecord.provider,
    input_ref: privateRef,
    mime_type: mimeType,
    parser_profile: 'document-default',
    status: 'pending',
    reason: 'binary-source-ready'
  } : null;

  return {document, text_version, extraction_request};
}

export function adaptBlackboardItem(item, context = {}) {
  const source_record = blackboardItemToSourceRecord(item, context);
  return {source_record, ...sourceRecordToCanonicalDocument(source_record, context)};
}

export function classifyEventType(text = '') {
  const s = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/recuperatorio|recuperacion/.test(s)) return 'makeup_exam';
  if (/parcial|examen|evaluacion|final/.test(s)) return 'exam';
  if (/entrega|trabajo practico|tp\b|assignment/.test(s)) return 'assignment_due';
  if (/feriado|sin clase|no hay clase|no-class/.test(s)) return 'no_class';
  if (/clase/.test(s)) return 'class';
  return 'important_date';
}

export function blackboardCalendarEventToDerivedEvent(event, context = {}) {
  const startsAt = iso(event?.starts_at);
  if (!startsAt) return null;
  const uid = clean(event.uid);
  if (!uid) throw new Error('calendar uid is required');
  const sourceId = clean(context.source_id) || `bb:calendar:${uid}`;
  return {
    schema: SCHEMA_EVENT,
    event_id: `event:${sourceId}`,
    title: clean(event.title) || 'Blackboard event',
    starts_at: startsAt,
    ends_at: iso(event.ends_at),
    all_day: !!event.all_day,
    event_type: classifyEventType(`${event.title || ''} ${event.description || ''}`),
    course_id: clean(context.course_id),
    source_id: sourceId,
    document_id: clean(context.document_id),
    source_locator: {kind: 'blackboard-calendar', uid, href: clean(event.href)},
    extraction_confidence: 'direct-source-date',
    extraction_status: context.course_id ? 'derived' : 'derived-unmapped-course',
    conflict_group_id: null,
    provenance: {
      provider: 'blackboard',
      source_kind: 'calendar',
      source_id: sourceId,
      authority: 'source-event-preserved'
    }
  };
}

const MONTHS = new Map([
  ['enero',0],['febrero',1],['marzo',2],['abril',3],['mayo',4],['junio',5],
  ['julio',6],['agosto',7],['septiembre',8],['setiembre',8],['octubre',9],['noviembre',10],['diciembre',11]
]);

function parseExplicitDate(line) {
  let m = line.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/);
  if (m) return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]))).toISOString();
  m = line.toLowerCase().match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(20\d{2})\b/);
  if (m) return new Date(Date.UTC(Number(m[3]), MONTHS.get(m[2]), Number(m[1]))).toISOString();
  return null;
}

export function deriveScheduleCandidates(bodyText, context = {}) {
  const sourceId = clean(context.source_id);
  if (!sourceId) throw new Error('source_id is required for schedule provenance');
  const lines = String(bodyText || '').split(/\r?\n/);
  const out = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const startsAt = parseExplicitDate(line);
    if (startsAt) {
      const title = clean(line.replace(/\s+/g, ' ')) || 'Fecha importante';
      out.push({
        schema: SCHEMA_EVENT,
        event_id: `event:${sourceId}:line:${i + 1}`,
        title,
        starts_at: startsAt,
        ends_at: null,
        all_day: true,
        event_type: classifyEventType(line),
        course_id: clean(context.course_id),
        source_id: sourceId,
        document_id: clean(context.document_id),
        source_locator: {kind: 'text-span', line: i + 1, start: offset, end: offset + line.length},
        extraction_confidence: 'explicit-full-date',
        extraction_status: 'candidate',
        conflict_group_id: null,
        provenance: {
          provider: clean(context.provider),
          source_id: sourceId,
          derivation: 'schedule-derive-v1',
          document_authority_preserved: true
        }
      });
    }
    offset += line.length + 1;
  }
  return out;
}

function semanticKey(event) {
  const title = String(event.title || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b\d{1,2}[\/-]\d{1,2}[\/-]20\d{2}\b/g, '')
    .replace(/\b\d{1,2}\s+de\s+[a-z]+\s+(?:de\s+)?20\d{2}\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  return `${event.course_id || 'unmapped'}|${event.event_type || 'important_date'}|${title}`;
}

export function markScheduleConflicts(events) {
  const groups = new Map();
  events.forEach((event, index) => {
    const key = semanticKey(event);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({event, index});
  });
  const result = events.map(event => ({...event}));
  for (const [key, rows] of groups) {
    const dates = new Set(rows.map(x => iso(x.event.starts_at)).filter(Boolean));
    const sources = new Set(rows.map(x => x.event.source_id).filter(Boolean));
    if (rows.length > 1 && dates.size > 1 && sources.size > 1) {
      const groupId = `conflict:${key}`;
      for (const row of rows) {
        result[row.index].conflict_group_id = groupId;
        result[row.index].extraction_status = 'conflict';
      }
    }
  }
  return result;
}
