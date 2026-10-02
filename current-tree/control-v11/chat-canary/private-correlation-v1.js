(function installPrometeoPrimaryChatPrivateCorrelationV1(global) {
  'use strict';
  const SCHEMA = 'prometeo.primary-chat-private-correlation/v1';
  const STORAGE_KEY = 'prometeo.primary-chat.private-correlation.v1';

  function clean(value, max) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text && text.length <= max ? text : null;
  }

  function normalize(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const workItemId = clean(value.work_item_id, 160);
    const returnPath = clean(value.return_path, 360);
    if (!workItemId || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(workItemId)) return null;
    if (!returnPath || !/^coordination\/portfolio\/returns\/[A-Za-z0-9._\/-]+\.json(?:#[A-Za-z0-9._:-]+)?$/.test(returnPath)) return null;
    return Object.freeze({ schema: SCHEMA, work_item_id: workItemId, return_path: returnPath });
  }

  function fromIngressResult(result) {
    if (!result || result.queued !== true) return null;
    const candidate = normalize({ work_item_id: result.work_item_id, return_path: result.return_path || result.ref });
    if (!candidate) return null;
    if (result.ref && String(result.ref).trim() !== candidate.return_path) return null;
    return candidate;
  }

  function save(value, storage = global.sessionStorage) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') throw new Error('CORRELATION_STORAGE_REQUIRED');
    const next = normalize(value);
    if (!next) throw new Error('CORRELATION_INVALID');
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      let existing = null;
      try { existing = normalize(JSON.parse(raw)); } catch {}
      if (!existing) throw new Error('CORRELATION_STORED_INVALID');
      if (existing.work_item_id === next.work_item_id && existing.return_path === next.return_path) return existing;
      if (existing.work_item_id === next.work_item_id || existing.return_path === next.return_path) throw new Error('CORRELATION_CONFLICT');
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function load(storage = global.sessionStorage) {
    if (!storage || typeof storage.getItem !== 'function') return null;
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { return normalize(JSON.parse(raw)); } catch { return null; }
  }

  function clear(storage = global.sessionStorage) {
    if (storage && typeof storage.removeItem === 'function') storage.removeItem(STORAGE_KEY);
  }

  global.PROMETEO_PRIMARY_CHAT_PRIVATE_CORRELATION_V1 = Object.freeze({
    schema: SCHEMA,
    storage_key: STORAGE_KEY,
    normalize,
    fromIngressResult,
    save,
    load,
    clear,
    privacy: Object.freeze({ raw_text_stored: false, transcript_stored: false, credentials_stored: false, token_stored: false })
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
