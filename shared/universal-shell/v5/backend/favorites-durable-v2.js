const DEFAULTS = Object.freeze({
  legacyKey: 'prometeo.v5.favorites.v1',
  recoveryKey: 'prometeo.v5.favorites.recovery.v2',
  outboxKey: 'prometeo.v5.favorites.outbox.v2',
  dbKey: 'universal-control/favorites/v2',
  metaKey: 'universal-control/favorites/v2/migration',
});

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(id => typeof id === 'string' && id))];
}

function sameIds(a, b) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function parseIds(raw) {
  try { return normalizeIds(JSON.parse(raw || '[]')); } catch { return []; }
}

function safeStorage(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage || null; } catch { return null; }
}

export function createDurableFavoritesStore({
  storage = null,
  loadDB,
  status = null,
  onHydrate = () => {},
  clock = () => Date.now(),
  keys = {},
} = {}) {
  const k = { ...DEFAULTS, ...keys };
  const local = safeStorage(storage);
  let db = null;
  let readyPromise = null;
  let canonical = 'LOCAL_RECOVERY';

  function readLocal(key) {
    try { return local?.getItem?.(key) ?? null; } catch { return null; }
  }
  function writeLocal(key, value) {
    try { local?.setItem?.(key, value); return true; } catch { return false; }
  }
  function removeLocal(key) {
    try { local?.removeItem?.(key); return true; } catch { return false; }
  }
  function readRecovery() {
    const recoveryRaw = readLocal(k.recoveryKey);
    if (recoveryRaw != null) return parseIds(recoveryRaw);
    return parseIds(readLocal(k.legacyKey));
  }
  function readOutbox() {
    try {
      const row = JSON.parse(readLocal(k.outboxKey) || 'null');
      if (!row || row.schema !== 'prometeo.universal-control-favorites-outbox/v2' || !Array.isArray(row.ids)) return null;
      return { ...row, ids: normalizeIds(row.ids) };
    } catch { return null; }
  }
  function writeMirrors(ids) {
    const normalized = normalizeIds(ids);
    const raw = JSON.stringify(normalized);
    writeLocal(k.recoveryKey, raw);
    writeLocal(k.legacyKey, raw); // rollback/read-compat mirror; never deleted by V2.
    return normalized;
  }
  function writeOutbox(ids, reason) {
    const row = {
      schema: 'prometeo.universal-control-favorites-outbox/v2',
      ids: normalizeIds(ids),
      reason: String(reason || 'mutation'),
      updated_at: clock(),
    };
    writeLocal(k.outboxKey, JSON.stringify(row));
    return row;
  }
  let cache = (() => {
    const pending = readOutbox();
    const initial = pending?.ids || readRecovery();
    return writeMirrors(initial);
  })();

  function setState(state, detail = null) { status?.set?.('favorites', state, detail); }
  function list() { return cache.slice(); }
  function has(id) { return typeof id === 'string' && !!id && cache.includes(id); }
  function publish(ids, source) {
    const next = writeMirrors(ids);
    const changed = !sameIds(next, cache);
    cache = next;
    if (changed) {
      try { onHydrate(cache.slice(), { source }); } catch {}
    }
    return cache.slice();
  }

  async function ensureDB() {
    if (db) return db;
    if (!readyPromise) {
      readyPromise = Promise.resolve().then(() => {
        if (typeof loadDB !== 'function') throw new Error('PrometeoDB loader unavailable');
        return loadDB();
      }).then(api => {
        if (!api?.getKV || !api?.putKV || !api?.getMeta || !api?.setMeta) throw new Error('PrometeoDB API incomplete');
        db = api;
        return api;
      }).catch(error => {
        readyPromise = null;
        setState('LOCAL_RECOVERY', { reason: String(error?.message || error) });
        throw error;
      });
    }
    return readyPromise;
  }

  async function writeCanonical(api, ids, reason) {
    const next = normalizeIds(ids);
    const row = {
      schema: 'prometeo.universal-control-favorites/v2',
      ids: next,
      updated_at: clock(),
      reason: String(reason || 'mutation'),
    };
    await api.putKV(k.dbKey, row);
    const readback = await api.getKV(k.dbKey, null);
    const ok = !!readback && sameIds(normalizeIds(readback.ids), next);
    if (!ok) throw new Error('Favorites PrometeoDB readback mismatch');
    return next;
  }

  async function activateMigration(api, ids, reason = 'legacy-migration') {
    const next = await writeCanonical(api, ids, reason);
    await api.setMeta(k.metaKey, {
      schema: 'prometeo.universal-control-favorites-migration/v2',
      active: true,
      canonical: 'PrometeoDB',
      legacy_mirror: k.legacyKey,
      recovery_mirror: k.recoveryKey,
      activated_at: clock(),
    });
    canonical = 'PROMETEO_DB';
    removeLocal(k.outboxKey);
    publish(next, 'migration');
    setState('DB_CANONICAL', { count: next.length, migrated: true });
    return next;
  }

  async function flush(reason = 'mutation') {
    let api;
    try { api = await ensureDB(); } catch { return { ok: false, deferred: true, canonical }; }
    const marker = await api.getMeta(k.metaKey, null).catch(() => null);
    const pending = readOutbox();
    if (!marker?.active) {
      const desired = pending?.ids || cache;
      await activateMigration(api, desired, pending?.reason || reason);
      return { ok: true, migrated: true, canonical };
    }
    canonical = 'PROMETEO_DB';
    if (!pending) {
      setState('DB_CANONICAL', { count: cache.length, pending: false });
      return { ok: true, synced: 0, canonical };
    }
    const next = await writeCanonical(api, pending.ids, pending.reason || reason);
    publish(next, 'flush');
    removeLocal(k.outboxKey);
    setState('DB_CANONICAL', { count: next.length, pending: false });
    return { ok: true, synced: 1, canonical };
  }

  function scheduleFlush(reason) {
    queueMicrotask(() => { flush(reason).catch(error => setState('DB_DEGRADED', { reason: String(error?.message || error) })); });
  }

  function commit(ids, reason) {
    cache = writeMirrors(ids);
    writeOutbox(cache, reason);
    scheduleFlush(reason);
    return cache.slice();
  }

  function replace(ids) { return commit(ids, 'replace'); }
  function toggle(id) {
    if (typeof id !== 'string' || !id) return { ids: list(), favorite: false, changed: false };
    const was = cache.includes(id);
    const next = was ? cache.filter(value => value !== id) : [...cache, id];
    const ids = commit(next, 'toggle');
    return { ids, favorite: !was, changed: true };
  }
  function move(id, toIndex) {
    const next = cache.slice();
    const fromIndex = next.indexOf(id);
    if (fromIndex < 0 || !Number.isFinite(toIndex)) return { ids: next, changed: false, fromIndex, toIndex: fromIndex };
    const target = Math.max(0, Math.min(next.length - 1, Math.trunc(toIndex)));
    if (target === fromIndex) return { ids: next, changed: false, fromIndex, toIndex: target };
    const [value] = next.splice(fromIndex, 1);
    next.splice(target, 0, value);
    return { ids: commit(next, 'move'), changed: true, fromIndex, toIndex: target };
  }
  function prune(validIds) {
    const valid = validIds instanceof Set ? validIds : new Set(validIds || []);
    const next = cache.filter(id => valid.has(id));
    if (next.length === cache.length) return { ids: list(), changed: false };
    return { ids: commit(next, 'prune'), changed: true };
  }

  async function start() {
    setState('LOCAL_RECOVERY', { count: cache.length });
    let api;
    try { api = await ensureDB(); } catch { return { canonical, ids: list(), degraded: true }; }
    const marker = await api.getMeta(k.metaKey, null).catch(() => null);
    const pending = readOutbox();
    if (pending) {
      if (!marker?.active) await activateMigration(api, pending.ids, pending.reason || 'recovery-outbox');
      else {
        canonical = 'PROMETEO_DB';
        const next = await writeCanonical(api, pending.ids, pending.reason || 'recovery-outbox');
        removeLocal(k.outboxKey);
        publish(next, 'recovery-outbox');
        setState('DB_CANONICAL', { count: next.length, recovered_outbox: true });
      }
      return { canonical, ids: list(), recovered_outbox: true };
    }
    if (!marker?.active) {
      await activateMigration(api, cache, 'legacy-migration');
      return { canonical, ids: list(), migrated: true };
    }

    canonical = 'PROMETEO_DB';
    const row = await api.getKV(k.dbKey, null).catch(() => null);
    if (row && Array.isArray(row.ids)) {
      const dbIds = normalizeIds(row.ids);
      publish(dbIds, 'db-hydrate');
      setState('DB_CANONICAL', { count: dbIds.length, hydrated: true });
      return { canonical, ids: list(), hydrated: true };
    }

    // Canonical DB row disappeared but rollback/recovery mirrors survived. Heal DB from the
    // synchronous local projection rather than presenting an empty list or blocking startup.
    const healed = await writeCanonical(api, cache, 'recovery-heal');
    publish(healed, 'recovery-heal');
    setState('DB_CANONICAL', { count: healed.length, healed: true });
    return { canonical, ids: list(), healed: true };
  }

  async function verify() {
    try {
      const api = await ensureDB();
      const marker = await api.getMeta(k.metaKey, null);
      const row = await api.getKV(k.dbKey, null);
      const dbIds = normalizeIds(row?.ids);
      const recoveryIds = parseIds(readLocal(k.recoveryKey));
      const legacyIds = parseIds(readLocal(k.legacyKey));
      return {
        ok: !!marker?.active && sameIds(dbIds, cache) && sameIds(recoveryIds, cache) && sameIds(legacyIds, cache) && !readOutbox(),
        canonical,
        count: cache.length,
        db_match: sameIds(dbIds, cache),
        recovery_match: sameIds(recoveryIds, cache),
        legacy_match: sameIds(legacyIds, cache),
        pending: !!readOutbox(),
      };
    } catch {
      return { ok: false, canonical, count: cache.length, unavailable: true, pending: !!readOutbox() };
    }
  }

  return Object.freeze({
    schema: 'prometeo.universal-control-favorites-store/v2',
    mode: 'PROMETEO_DB_CANONICAL_WITH_SYNC_RECOVERY',
    keys: Object.freeze({ ...k }),
    list,
    has,
    replace,
    toggle,
    move,
    prune,
    start,
    flush,
    verify,
    canonical: () => canonical,
  });
}
