(() => {
  'use strict';

  const global = typeof globalThis !== 'undefined' ? globalThis : window;
  const SCHEMA = 'prometeo.primary-chat-continuity-capsule/v1';
  const STORAGE_KEY = 'prometeo.primary-chat.continuity-capsule.v1';
  const SESSION_INDEX_URL = '../../../coordination/chat-sessions/INDEX.json';
  const RECOVERY_INDEX_URL = '../../../coordination/chat-recovery/INDEX.json';
  const DEFAULT_CHAT_OBJECT_ID = 'chat-object-prometeo-chat-control-main';
  const MAX_RECOVERY_LOCATORS = 8;

  const clean = (value, max = 4000) => String(value ?? '').trim().slice(0, max);
  const arr = value => Array.isArray(value) ? value : [];
  const parseTime = value => Date.parse(value || '') || 0;

  function publicSession(row) {
    if (!row || typeof row !== 'object') return null;
    return Object.freeze({
      session_id: clean(row.session_id, 160) || null,
      session_pin: clean(row.session_pin, 160) || null,
      chat_object_id: clean(row.chat_object_id, 200) || null,
      context_key: clean(row.context_key, 240) || null,
      title: clean(row.title, 500) || null,
      status: clean(row.status, 120) || null,
      current_summary: clean(row.current_summary, 6000) || null,
      next_action: clean(row.next_action, 4000) || null,
      current_stage: clean(row.current_stage, 240) || null,
      last_checkpoint_ref: clean(row.last_checkpoint_ref, 1200) || null,
      session_url: clean(row.session_url, 1200) || null,
      journal_url: clean(row.journal_url, 1200) || null,
      continue_url: clean(row.continue_url, 1200) || null,
      last_activity_at: clean(row.last_activity_at, 80) || null,
      last_progress_at: clean(row.last_progress_at, 80) || null,
      repo_head_seen: clean(row.repo_head_seen, 120) || null
    });
  }

  function selectSession(index, chatObjectId = DEFAULT_CHAT_OBJECT_ID) {
    const sessions = arr(index?.sessions)
      .filter(row => row && String(row.chat_object_id || '') === chatObjectId)
      .sort((a, b) => {
        const activeDelta = Number(String(b?.status || '').toUpperCase() === 'ACTIVE') -
          Number(String(a?.status || '').toUpperCase() === 'ACTIVE');
        if (activeDelta) return activeDelta;
        return Math.max(parseTime(b?.last_activity_at), parseTime(b?.last_progress_at), parseTime(b?.started_at)) -
          Math.max(parseTime(a?.last_activity_at), parseTime(a?.last_progress_at), parseTime(a?.started_at));
      });
    return publicSession(sessions[0] || null);
  }

  function recoveryLocators(index, session) {
    const sessionId = session?.session_id || null;
    return arr(index?.entries)
      .filter(row => row && (
        (sessionId && row.adopted_session_id === sessionId) ||
        String(row.project || '').toLowerCase() === 'prometeo'
      ))
      .sort((a, b) => parseTime(b?.source_last_material_at || b?.observed_at) - parseTime(a?.source_last_material_at || a?.observed_at))
      .slice(0, MAX_RECOVERY_LOCATORS)
      .map(row => Object.freeze({
        chat_locator_id: clean(row.chat_locator_id, 220) || null,
        title: clean(row.title, 500) || null,
        project: clean(row.project, 120) || null,
        status: arr(row.status).map(value => clean(value, 120)).filter(Boolean).slice(0, 12),
        entry_ref: clean(row.entry_ref, 1200) || null,
        reopenability_class: clean(row.reopenability_class, 180) || null,
        adopted_session_id: clean(row.adopted_session_id, 180) || null
      }));
  }

  function localPrivateMetadata(inputApi = global.PROMETEO_CHAT_CANARY_INPUT_V1) {
    const storage = global.localStorage;
    const localState = inputApi?.local_state || {};
    let draftLength = 0;
    let privateContextEntries = 0;
    let outboxPending = 0;
    try {
      const draft = storage?.getItem?.(localState.draft_key || '') || '';
      draftLength = String(draft).length;
    } catch {}
    try {
      const rows = JSON.parse(storage?.getItem?.(localState.private_context_key || '') || '[]');
      privateContextEntries = Array.isArray(rows) ? rows.length : 0;
    } catch {}
    try {
      const rows = inputApi?.outbox?.read?.();
      outboxPending = Array.isArray(rows) ? rows.length : 0;
    } catch {}
    return Object.freeze({
      draft_present: draftLength > 0,
      draft_length: draftLength,
      private_context_entries: privateContextEntries,
      outbox_pending: outboxPending
    });
  }

  function buildCapsule({ sessionIndex, recoveryIndex, inputApi, now = new Date().toISOString() } = {}) {
    const session = selectSession(sessionIndex || {}, DEFAULT_CHAT_OBJECT_ID);
    return Object.freeze({
      schema: SCHEMA,
      authority: 'NON_AUTHORITATIVE_RECOVERY_PROJECTION',
      generated_at: clean(now, 80),
      chat_object_id: DEFAULT_CHAT_OBJECT_ID,
      session,
      recovery_locators: recoveryLocators(recoveryIndex || {}, session),
      local_private_state: localPrivateMetadata(inputApi),
      owner_refs: Object.freeze([
        'coordination/chat-sessions/INDEX.json',
        'coordination/chat-recovery/INDEX.json',
        'current-tree/control-v11/chat-canary/input-module-v1.js'
      ]),
      privacy: Object.freeze({
        raw_prompt_text_in_capsule: false,
        raw_draft_in_capsule: false,
        raw_private_context_in_capsule: false,
        raw_outbox_in_capsule: false,
        local_private_values_projected_as_counts_only: true
      }),
      next_action: session?.next_action || null
    });
  }

  function buildReincarnationPrompt(capsule = read()) {
    if (!capsule?.session) return '';
    const session = capsule.session;
    const refs = [
      session.session_url,
      session.journal_url,
      session.continue_url,
      session.last_checkpoint_ref
    ].filter(Boolean);
    const lines = [
      'Continuá Prometeo desde la cápsula durable de continuidad, sin reconstruir desde cero ni publicar prompts privados.',
      `Sesión: ${session.session_id || 'desconocida'} · estado ${session.status || 'desconocido'}.`,
      session.current_summary ? `Resumen público durable: ${session.current_summary}` : null,
      session.next_action ? `Próxima acción durable: ${session.next_action}` : null,
      refs.length ? `Refs exactas: ${refs.join(' | ')}` : null,
      'Recuperá CURRENT real desde esas fuentes antes de modificar autoridad. Reutilizá Work Graph/allocator/worker pipeline existentes; no inventes scheduler, queue ni CURRENT paralelo.',
      'La cápsula sólo contiene refs/metadatos sanitizados. El draft, contexto privado y outbox raw permanecen locales y no deben publicarse.'
    ].filter(Boolean);
    return lines.join('\n');
  }

  function read() {
    try {
      const value = JSON.parse(global.localStorage?.getItem?.(STORAGE_KEY) || 'null');
      return value?.schema === SCHEMA ? value : null;
    } catch {
      return null;
    }
  }

  function write(capsule) {
    try {
      global.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(capsule));
      return true;
    } catch {
      return false;
    }
  }

  async function readJson(url, fetchImpl = global.fetch) {
    if (typeof fetchImpl !== 'function') throw new Error('CONTINUITY_FETCH_UNAVAILABLE');
    const response = await fetchImpl(url, { cache: 'no-store' });
    if (!response?.ok) throw new Error(`CONTINUITY_HTTP_${response?.status || 'NO_RESPONSE'}`);
    return response.json();
  }

  async function refresh(options = {}) {
    const fetchImpl = options.fetchImpl || global.fetch;
    const [sessionIndex, recoveryIndex] = await Promise.all([
      readJson(options.sessionIndexUrl || SESSION_INDEX_URL, fetchImpl),
      readJson(options.recoveryIndexUrl || RECOVERY_INDEX_URL, fetchImpl)
    ]);
    const capsule = buildCapsule({
      sessionIndex,
      recoveryIndex,
      inputApi: options.inputApi || global.PROMETEO_CHAT_CANARY_INPUT_V1,
      now: options.now || new Date().toISOString()
    });
    write(capsule);
    return capsule;
  }

  global.PROMETEO_PRIMARY_CHAT_CONTINUITY_V1 = Object.freeze({
    schema: SCHEMA,
    storage_key: STORAGE_KEY,
    session_index_url: SESSION_INDEX_URL,
    recovery_index_url: RECOVERY_INDEX_URL,
    buildCapsule,
    buildReincarnationPrompt,
    selectSession,
    localPrivateMetadata,
    read,
    refresh,
    privacy: Object.freeze({
      raw_prompt_public: false,
      raw_private_state_public: false,
      public_sources_only: true
    })
  });
})();
