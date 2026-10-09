// Authenticated by the existing workspace(req) boundary; no new store or queue.
export function createOneTurnCaptureService({db, sha, fail, nowISO}: any) {
  function identity(body: any) {
    const page = String(body.page_id || '').trim(), request = String(body.request_id || '').trim();
    if (!page || page.length > 300) fail('PAGE_ID_REQUIRED', 400);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(request)) fail('REQUEST_ID_INVALID', 400);
    return {page, request};
  }
  async function captureId(ws: any, page: string, request: string) {
    return 'one-turn-' + await sha([ws.id, page, request]);
  }
  async function receipt(ws: any, body: any) {
    const {page, request} = identity(body), id = await captureId(ws, page, request);
    const cap = await db.from('prometeo_captures').select('*').eq('workspace_id', ws.id).eq('page_id', page).eq('id', id).maybeSingle();
    if (cap.error) throw cap.error;
    if (!cap.data || cap.data.archive_state !== 'ACTIVE') fail('CAPTURE_NOT_FOUND', 404);
    const rev = await db.from('prometeo_capture_revisions').select('*').eq('workspace_id', ws.id).eq('capture_id', id).eq('revision', 1).maybeSingle();
    if (rev.error) throw rev.error;
    const digest = await sha(String(cap.data.transcript || ''));
    if (!rev.data || rev.data.transcript !== cap.data.transcript || rev.data.transcript_digest !== digest ||
        cap.data.transcript_digest !== digest || cap.data.transcript_revision !== 1 ||
        cap.data.metadata?.one_turn_request_id !== request || cap.data.privacy !== 'PROJECT' || rev.data.privacy !== 'PROJECT') fail('CAPTURE_NOT_DURABLE', 409);
    return {schema: 'prometeo.capture-ack/v1', durable: true, workspace_id: ws.id, page_id: page,
      request_id: request, capture_id: id, revision: 1, revision_ref: `capture:${id}:rev:1`, digest, execute: cap.data.metadata?.one_turn_execution === true};
  }
  async function save(ws: any, body: any) {
    const {page, request} = identity(body), text = String(body.text || '').trim();
    if (!text || text.length > 60000) fail('TEXT_INVALID', 400);
    const execute=body.execute!==false;const id = await captureId(ws, page, request), digest = await sha(text), created = nowISO();
    const row = {workspace_id: ws.id, id, page_id: page, created_at: created, updated_at: created,
      status: 'pending', transcript: text, transcript_revision: 1, transcript_digest: digest,
      transcript_state: 'CONFIRMED', processing_state: 'READY', archive_state: 'ACTIVE', privacy: 'PROJECT',
      metadata: {source_kind: 'HUMAN_TEXT', one_turn_request_id: request, one_turn_execution: execute}, context_snapshot: {}};
    const cap = await db.from('prometeo_captures').insert(row);
    if (cap.error && cap.error.code !== '23505') throw cap.error;
    // Re-read the winning immutable input before repairing a partial revision write.
    const winner = await db.from('prometeo_captures').select('*').eq('workspace_id', ws.id).eq('page_id', page).eq('id', id).maybeSingle();
    if (winner.error) throw winner.error;
    if (!winner.data || winner.data.transcript !== text || winner.data.transcript_digest !== digest ||
        winner.data.archive_state !== 'ACTIVE' || winner.data.transcript_revision !== 1 || winner.data.metadata?.one_turn_execution !== execute) fail('REQUEST_CONFLICT', 409);
    const revision = await db.from('prometeo_capture_revisions').insert({workspace_id: ws.id, capture_id: id, revision: 1,
      transcript: text, transcript_digest: digest, transcript_state: 'CONFIRMED', privacy: 'PROJECT',
      created_at: winner.data.created_at, source_ref: `capture:${id}:rev:1`});
    if (revision.error && revision.error.code !== '23505') throw revision.error;
    return receipt(ws, body);
  }
  return {save, receipt};
}
