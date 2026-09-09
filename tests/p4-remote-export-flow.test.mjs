import test from 'node:test';
import assert from 'node:assert/strict';
import { CaptureRemote, CaptureRemoteContract } from '../shared/capture/v1/remote.js';
import { createCapture, attachDurableAudio, transitionProcessing, appendTranscriptRevision, revisionRef } from '../shared/capture/v1/capture-core.js';

function makeCapture() {
  let capture = createCapture({
    id: 'CAP-REMOTE-1',
    created_at: '2026-09-09T12:00:00Z',
    context: {
      page_id: 'calendar',
      source_path: '/prometeo/pages/calendar/',
      source_href: 'https://juanmanuelpm.github.io/prometeo/pages/calendar/',
      source_title: 'Calendar',
      viewport: { width: 360, height: 780, orientation: 'portrait' },
      captured_at: '2026-09-09T12:00:00Z'
    }
  });
  capture = attachDurableAudio(capture, {
    digest: 'audio-digest-1',
    mime: 'audio/webm',
    size: 2048,
    local_ref: 'idb:CAP-REMOTE-1:audio'
  });
  capture = transitionProcessing(capture, 'QUEUED');
  capture = appendTranscriptRevision(capture, {
    text: 'Mover el botón de captura sin bloquear la navegación',
    state: 'MACHINE',
    source: 'whisper',
    model: 'test-whisper',
    digest: 'transcript-digest-1'
  });
  return capture;
}

test('remote export freezes exact revision, records explicit approval, then creates Patent from the same scope', async () => {
  const originalFetch = globalThis.fetch;
  const originalNavigator = globalThis.navigator;
  const originalLocalStorage = globalThis.localStorage;
  const calls = [];
  const storage = new Map();
  const localStorageMock = {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  };
  localStorageMock.setItem(CaptureRemoteContract.secret_storage, 'x'.repeat(48));
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorageMock });

  globalThis.fetch = async (_url, init = {}) => {
    const body = JSON.parse(init.body || '{}');
    calls.push({ body, headers: init.headers });
    const responses = {
      workspace: { workspace_id: 'WS-1' },
      preview_export: { proposal_id: 'PROP-1', preview: { count: 1 }, pages: ['calendar'] },
      approve_export: { id: 'EXP-1', schema: 'prometeo.capture-export-receipt/v1', human_approved: true },
      create_patent_v2: { patent_code: 'PAT-1', patent_url: '/patents/PAT-1' }
    };
    const payload = responses[body.action];
    if (!payload) return new Response(JSON.stringify({ error: 'unexpected_action' }), { status: 400, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const capture = makeCapture();
    const exact = revisionRef(capture);
    const remote = new CaptureRemote({ endpoint: 'https://example.invalid/capture' });
    const receipt = await remote.prepareExport([capture]);
    assert.equal(receipt.id, 'EXP-1');

    const patent = await remote.createPatent({
      captures: [capture],
      export_receipt_id: receipt.id,
      seed: { id: 'SEED-1', request: exact.text, privacy: 'PROJECT', source_refs: [exact.ref] },
      work_item: { id: 'WORK-1', state: 'WORK_ITEM', target: { page_ids: ['calendar'] }, dependencies: ['calendar'] },
      current_binding: { revision: 18, digest: 'current-digest' },
      catalog_binding: { identity: 'catalog-test', digest: 'catalog-digest' },
      page_bindings: [{ page_id: 'calendar', source_identity: 'calendar-source', writable_target: { kind: 'repo_path', repository: 'JuanManuelPM/prometeo', path: 'pages/calendar/index.html' } }],
      protocol_binding: { id: 'PROMETEO_EXHAUSTIVE_100/v2', digest: 'protocol-digest' }
    });
    assert.equal(patent.patent_code, 'PAT-1');

    assert.deepEqual(calls.map(c => c.body.action), ['workspace', 'preview_export', 'approve_export', 'create_patent_v2']);
    const preview = calls[1].body;
    assert.deepEqual(preview.selection, [{ capture_id: capture.id, revision: exact.revision, ref: exact.ref, digest: exact.digest }]);
    const approval = calls[2].body;
    assert.equal(approval.proposal_id, 'PROP-1');
    assert.equal(approval.human_approved, true);
    const create = calls[3].body;
    assert.equal(create.export_receipt_id, 'EXP-1');
    assert.deepEqual(create.selection, preview.selection);
    assert.equal(create.seed.source_refs[0], exact.ref);
    assert.match(String(calls[0].headers.authorization), /^Bearer x{48}$/);
  } finally {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: originalNavigator });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalLocalStorage });
  }
});
