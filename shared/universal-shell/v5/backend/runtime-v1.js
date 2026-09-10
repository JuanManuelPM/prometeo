export function createBackendStatus({ clock = () => Date.now() } = {}) {
  const domains = new Map();
  const listeners = new Set();
  function set(domain, state, detail = null) {
    const row = { domain: String(domain), state: String(state), detail, updated_at: clock() };
    domains.set(row.domain, row);
    for (const fn of listeners) { try { fn(snapshot()); } catch {} }
    return row;
  }
  function get(domain) { return domains.get(String(domain)) || null; }
  function snapshot() { return Object.fromEntries([...domains.entries()].map(([k, v]) => [k, { ...v }])); }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  return Object.freeze({ schema: 'prometeo.universal-control-backend-status/v1', set, get, snapshot, subscribe });
}

export function createLegacyPreferencesStore({ storage = null, cornerKey = 'prometeo.universal-control.corner.v1', corners = [] } = {}) {
  function usableStorage() {
    if (storage) return storage;
    try { return globalThis.localStorage || null; } catch { return null; }
  }
  function getCorner(fallback = 'bottom-right') {
    try {
      const value = usableStorage()?.getItem?.(cornerKey);
      return corners.includes(value) ? value : fallback;
    } catch { return fallback; }
  }
  function setCorner(value) {
    if (!corners.includes(value)) return false;
    try { usableStorage()?.setItem?.(cornerKey, value); return true; } catch { return false; }
  }
  return Object.freeze({ schema: 'prometeo.universal-control-preferences/v1', getCorner, setCorner, cornerKey });
}

export function createPageRouteController({ historyRef = globalThis.history, locationRef = globalThis.location, storage = null, lastPageKey = 'prometeo.v5.lastPage' } = {}) {
  function usableStorage() {
    if (storage) return storage;
    try { return globalThis.localStorage || null; } catch { return null; }
  }
  function hashId() {
    try { return decodeURIComponent((String(locationRef?.hash || '').match(/^#\/p\/(.+)$/) || [])[1] || ''); } catch { return ''; }
  }
  function activate(page, { push = true } = {}) {
    if (!page?.id || !page?.public_url) return null;
    try { usableStorage()?.setItem?.(lastPageKey, page.id); } catch {}
    if (push) {
      try { historyRef?.pushState?.({ pageId: page.id }, '', `#/p/${encodeURIComponent(page.id)}`); } catch {}
    }
    return { page, pageId: page.id, publicUrl: page.public_url };
  }
  function eventId(event) { return event?.state?.pageId || hashId(); }
  return Object.freeze({ schema: 'prometeo.universal-control-page-route/v1', activate, eventId, hashId, lastPageKey });
}

export function createLinkProvider({ remote }) {
  return Object.freeze({
    schema: 'prometeo.universal-control-link-provider/v1',
    code() { return remote.linkCode(); },
    async importCode(code) { return remote.importLinkCode(code); },
  });
}

export function createContextProvider({ remote, putNote, pageForNote, clock = () => Date.now() }) {
  async function prepare(chosen) {
    const eligible = (chosen || []).filter(n => n?.status === 'done' && String(n.text || '').trim() && !n.patentedIn);
    if (!eligible.length) return { empty: true, chosen: [] };
    for (const note of eligible) await remote.syncCapture(note, pageForNote(note));
    const result = await remote.createPatent(eligible.map(n => n.id));
    for (const note of eligible) {
      note.patentedIn = result.patent_code;
      note.patentedAt = clock();
      await putNote(note);
    }
    return {
      empty: false,
      chosen: eligible,
      command: result.command || '',
      code: result.patent_code || '',
      expires_at: result.expires_at || null,
      count: eligible.length,
    };
  }
  return Object.freeze({ schema: 'prometeo.universal-control-context-provider/v1', prepare });
}

function normalizeOutbox(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { version: 1, ops: {}, fingerprints: {} };
  return {
    version: 1,
    ops: raw.ops && typeof raw.ops === 'object' && !Array.isArray(raw.ops) ? { ...raw.ops } : {},
    fingerprints: raw.fingerprints && typeof raw.fingerprints === 'object' && !Array.isArray(raw.fingerprints) ? { ...raw.fingerprints } : {},
  };
}

export function createCaptureSyncQueue({
  storage = null,
  key = 'prometeo.v5.capture.outbox.v1',
  remote,
  getNote,
  listNotes,
  pageForNote,
  online = () => globalThis.navigator?.onLine !== false,
  onState = () => {},
} = {}) {
  function usableStorage() {
    if (storage) return storage;
    try { return globalThis.localStorage || null; } catch { return null; }
  }
  function read() {
    try { return normalizeOutbox(JSON.parse(usableStorage()?.getItem?.(key) || '{}')); } catch { return normalizeOutbox(null); }
  }
  function write(state) { try { usableStorage()?.setItem?.(key, JSON.stringify(state)); } catch {} return state; }
  function fingerprint(note) {
    const value = {
      id: note?.id || '', created: note?.created || 0, status: note?.patentedIn ? 'patented' : (note?.status || ''),
      text: String(note?.text || ''), revision: note?.transcriptRevision || 1,
      sourcePath: note?.sourcePath || '', sourceHref: note?.sourceHref || '', sourceTitle: note?.sourceTitle || '',
      viewport: note?.viewport || '', pageId: note?.pageId || '', patentedIn: note?.patentedIn || null,
    };
    return JSON.stringify(value);
  }
  async function reconcile(notes = null) {
    const rows = notes || await listNotes();
    const state = read();
    const seen = new Set();
    for (const note of rows || []) {
      if (!note?.id) continue;
      seen.add(note.id);
      const fp = fingerprint(note);
      if (state.fingerprints[note.id] !== fp) state.ops[note.id] = 'put';
    }
    for (const id of Object.keys(state.fingerprints)) if (!seen.has(id)) state.ops[id] = 'delete';
    write(state);
    return state;
  }
  function markDelete(id) {
    if (!id) return;
    const state = read(); state.ops[id] = 'delete'; write(state);
  }
  async function flush() {
    if (!online()) { onState({ online: false, pending: Object.keys(read().ops).length }); return { deferred: true }; }
    const state = await reconcile();
    const ids = Object.keys(state.ops);
    onState({ online: true, syncing: ids.length > 0, pending: ids.length });
    for (const id of ids) {
      const op = state.ops[id];
      if (op === 'delete') {
        await remote.deleteCapture(id);
        delete state.fingerprints[id];
      } else {
        const note = await getNote(id);
        if (!note) {
          await remote.deleteCapture(id);
          delete state.fingerprints[id];
        } else {
          await remote.syncCapture(note, pageForNote(note));
          state.fingerprints[id] = fingerprint(note);
        }
      }
      delete state.ops[id];
      write(state);
    }
    onState({ online: true, synced: true, pending: 0 });
    return { deferred: false, synced: ids.length };
  }
  return Object.freeze({ schema: 'prometeo.universal-control-capture-outbox/v1', key, reconcile, flush, markDelete, inspect: read });
}

function sameOrderedStrings(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
}

export function createFavoritesShadowAdapter({
  legacy,
  loadDB,
  dbKey = 'universal-control/favorites/v1',
  status = null,
  onMismatch = () => {},
} = {}) {
  let db = null;
  let ready = null;
  let revision = 0;
  function setState(state, detail = null) { status?.set?.('favorites-shadow', state, detail); }
  async function ensureDB() {
    if (db) return db;
    if (!ready) ready = Promise.resolve().then(loadDB).then(api => { db = api; setState('SHADOW_READY'); return api; }).catch(error => { ready = null; setState('SHADOW_UNAVAILABLE', String(error?.message || error)); throw error; });
    return ready;
  }
  async function writeProjection(ids, reason = 'mutation') {
    const myRevision = ++revision;
    try {
      const api = await ensureDB();
      const projection = { schema: 'prometeo.universal-control-favorites-shadow/v1', ids: [...ids], revision: myRevision, reason };
      await api.putKV(dbKey, projection);
      const readback = await api.getKV(dbKey, null);
      const ok = !!readback && sameOrderedStrings(readback.ids, ids);
      if (!ok) {
        const detail = { expected_count: ids.length, actual_count: Array.isArray(readback?.ids) ? readback.ids.length : null, reason };
        setState('SHADOW_MISMATCH', detail); onMismatch(detail);
      } else setState('SHADOW_PARITY', { count: ids.length, revision: myRevision, reason });
      return ok;
    } catch { return false; }
  }
  function schedule(ids, reason) { queueMicrotask(() => { writeProjection(ids, reason).catch(() => {}); }); }
  async function start() { const ids = legacy.list(); schedule(ids, 'start'); return ids; }
  function replace(ids) { const result = legacy.replace(ids); schedule(result, 'replace'); return result; }
  function toggle(id) { const result = legacy.toggle(id); schedule(result.ids, 'toggle'); return result; }
  function move(id, toIndex) { const result = legacy.move(id, toIndex); if (result.changed) schedule(result.ids, 'move'); return result; }
  function prune(validIds) { const result = legacy.prune(validIds); if (result.changed) schedule(result.ids, 'prune'); else schedule(result.ids, 'verify'); return result; }
  async function verify() {
    const ids = legacy.list();
    try {
      const api = await ensureDB();
      const readback = await api.getKV(dbKey, null);
      const ok = !!readback && sameOrderedStrings(readback.ids, ids);
      setState(ok ? 'SHADOW_PARITY' : 'SHADOW_MISMATCH', { count: ids.length, verify: true });
      return { ok, legacy: ids, shadow: Array.isArray(readback?.ids) ? readback.ids : null };
    } catch { return { ok: false, legacy: ids, shadow: null, unavailable: true }; }
  }
  return Object.freeze({
    schema: 'prometeo.universal-control-favorites-shadow/v1',
    mode: 'LEGACY_CANONICAL_SHADOW_DB',
    list: legacy.list,
    has: legacy.has,
    replace,
    toggle,
    move,
    prune,
    start,
    verify,
    dbKey,
  });
}
