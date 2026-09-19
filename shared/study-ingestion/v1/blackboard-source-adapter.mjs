const clean = value => value == null ? null : String(value).trim() || null;
const iso = value => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export function blackboardItemToSourceRecord(item, context = {}) {
  const itemKey = clean(item?.item_key || item?.id);
  if (!itemKey) throw new Error('blackboard item_key is required');
  const sourceId = `bb:item:${itemKey}`;
  const capturedAt = iso(context.captured_at || item.last_seen_at) || new Date().toISOString();
  const mirrored = context.mirrored_file || null;
  const privateRef = clean(context.private_ref || mirrored?.private_ref || (mirrored?.storage_path ? `storage:study-blackboard-files/${mirrored.storage_path}` : null));
  const bodyText = clean(item.body_text);
  const mimeType = clean(item.mime_type || mirrored?.mime_type);
  return {
    schema: 'prometeo.study-source-record/v1',
    source_id: sourceId,
    provider: 'blackboard',
    provider_course_id: clean(item.course_key),
    course_id: clean(context.course_id),
    provider_item_id: itemKey,
    provider_version: clean(item.modified_at || item.last_seen_at || capturedAt),
    item_type: clean(item.item_type || item.type) || 'content',
    title: clean(item.title || item.file_name) || 'Blackboard item',
    body_text: bodyText,
    due_at: iso(item.due_at),
    modified_at: iso(item.modified_at),
    captured_at: capturedAt,
    source_url: clean(item.href),
    reopen_handle: clean(item.href || item.source_page),
    source_page: clean(item.source_page),
    private_ref: privateRef,
    mime_type: mimeType,
    content_hash: clean(mirrored?.sha256 || item.content_hash),
    byte_length: Number.isFinite(Number(mirrored?.size_bytes)) ? Number(mirrored.size_bytes) : null,
    extraction_request: privateRef ? {
      source_id: sourceId,
      provider: 'blackboard',
      provider_item_id: itemKey,
      provider_version: clean(item.modified_at || item.last_seen_at || capturedAt),
      input_ref: privateRef,
      mime_type: mimeType,
      parser_profile: 'document-default',
      status: 'pending',
      reason: 'binary-source-ready'
    } : null,
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

export function blackboardRenderedTextInput(sourceRecord) {
  if (!sourceRecord?.body_text) return null;
  return {
    provider: 'blackboard',
    provider_item_id: sourceRecord.provider_item_id,
    provider_version: sourceRecord.provider_version,
    media_type: 'text/plain',
    runtime_ref: `blackboard-rendered:${sourceRecord.source_id}`,
    visibility: 'private_runtime',
    text: sourceRecord.body_text,
    extractor_id: 'blackboard-rendered-body-text'
  };
}
