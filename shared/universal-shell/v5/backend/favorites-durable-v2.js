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
  let mutationRevision = 0;
  let operationTail = Promise.resolve();

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
      return {
        ...row,
        seq: Number.isSafeInteger(row.seq) && row.seq >= 0 ? row.seq : 0,
        ids: normalizeIds(row.ids),
      };
    } catch { return null; }
  }
  let sequence = readOutbox()?.seq || 0;

  function writeMirrors(ids) {
    const normalized = normalizeIds(ids);
    const raw = JSON.stringify(normalized);
    writeLocal(k.recoveryKey, raw);
    writeLocal(k.legacyKey, raw); // rollback/read-compat mirror; never deleted by V2.
    return normalized;
  }
  function writeOutbox(ids, reason) {
    sequence += 1;
    const row = {
      schema: 'prometeo.universal-control-favorites-outbox/v2',
      seq: sequence,
      ids: normalizeIds(ids),
      reason: String(reason || 'mutation'),
      updated_at: clock(),
    };
    writeLocal(k.outboxKey, JSON.stringify(row));
    return row;
  }
  function clearOutboxIfCurrent(seq) {
    const latest = readOutbox();
    if (!latest) return true;
    if (latest.seq !== seq) return false;
    removeLocal(k.outboxKey);
    return true;
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

  async function setMigrationMarker(api) {
    await api.setMeta(k.metaKey, {
      schema: 'prometeo.universal-control-favorites-migration/v2',
      active: true,
      canonical: 'PrometeoDB',
      legacy_mirror: k.legacyKey,
      recovery_mirror: k.recoveryKey,
      activated_at: clock(),
    });
    canonical = 'PROMETEO_DB';
  }

  // Drain newest pending intent. Every await is followed by a sequence re-check before local
  // state is cleared/published, so an older async write can never erase a newer UI mutation.
  async function drainOutbox(api, reason = 'mutation') {
    let synced = 0;
    for (let guard = 0; guard < 64; guard += 1) {
      const pending = readOutbox();
      if (!pending) return { synced, pending: false };
      const written = await writeCanonical(api, pending.ids, pending.reason || reason);
      const latest = readOutbox();
      if (!latest) {
        // Another path may already have consumed the same intent. Never publish stale bytes.
        return { synced, pending: false };
      }
      if (latest.seq !== pending.seq) {
        // A newer local mutation arrived while IndexedDB was being written. Leave its outbox
        // intact and loop; critically, do not publish the stale `written` projection.
        continue;
      }
      clearOutboxIfCurrent(pending.seq);
      publish(written, 'outbox-flush');
      synced += 1;
      if (!readOutbox()) return { synced, pending: false };
    }
    throw new Error('Favorites outbox failed to settle');
  }

  async function activateMigration(api, reason = 'legacy-migration') {
    // The desired migration payload is chosen as late as possible. Pending UI intent outranks
    // the synchronous recovery cache, and may appear while earlier IndexedDB awaits complete.
    let pending = readOutbox();
    let desired = pending?.ids || cache;
    let desiredSeq = pending?.seq ?? null;
    await writeCanonical(api, desired, pending?.reason || reason);

    // If a mutation landed during the canonical write/readback, migrate its latest value before
    // activating the marker. The marker therefore never points at a knowingly stale row.
    pending = readOutbox();
    if (pending && pending.seq !== desiredSeq) {
      desired = pending.ids;
      desiredSeq = pending.seq;
      await writeCanonical(api, desired, pending.reason || 'concurrent-migration');
    }

    await setMigrationMarker(api);

    // A mutation can also land while the marker itself is being written. Preserve the local
    // cache/outbox and drain it instead of publishing an older migration snapshot over the UI.
    pending = readOutbox();
    if (pending && (desiredSeq == null || pending.seq !== desiredSeq)) {
      await drainOutbox(api, 'post-marker-mutation');
      setState('DB_CANONICAL', { count: cache.length, migrated: true, concurrent_mutation: true });
      return cache.slice();
    }

    if (desiredSeq != null) clearOutboxIfCurrent(desiredSeq);
    publish(desired, 'migration');
    setState('DB_CANONICAL', { count: desired.length, migrated: true });
    return desired;
  }

  async function flushInternal(reason = 'mutation') {
    let api;
    try { api = await ensureDB(); } catch { return { ok: false, deferred: true, canonical }; }
    const marker = await api.getMeta(k.metaKey, null).catch(() => null);
    if (!marker?.active) {
      await activateMigration(api, reason);
      return { ok: true, migrated: true, canonical };
    }
    canonical = 'PROMETEO_DB';
    const pending = readOutbox();
    if (!pending) {
      setState('DB_CANONICAL', { count: cache.length, pending: false });
      return { ok: true, synced: 0, canonical };
    }
    const result = await drainOutbox(api, reason);
    setState('DB_CANONICAL', { count: cache.length, pending: result.pending });
    return { ok: true, synced: result.synced, canonical };
  }

  function enqueue(operation) {
    const run = () => Promise.resolve().then(operation);
    const result = operationTail.then(run, run);
    operationTail = result.catch(() => {});
    return result;
  }

  function flush(reason = 'mutation') {
    return enqueue(() => flushInternal(reason));
  }

  function scheduleFlush(reason) {
    queueMicrotask(() => {
      flush(reason).catch(error => setState('DB_DEGRADED', { reason: String(error?.message || error), pending: !!readOutbox() }));
    });
  }

  function commit(ids, reason) {
    mutationRevision += 1;
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

  async function startInternal() {
    setState('LOCAL_RECOVERY', { count: cache.length });
    const startRevision = mutationRevision;
    let api;
    try { api = await ensureDB(); } catch { return { canonical, ids: list(), degraded: true }; }
    const marker = await api.getMeta(k.metaKey, null).catch(() => null);

    // Any pending intent (including one created while start() was awaiting DB) is newer than a
    // passive hydrate. Resolve it first, then leave the user's current cache intact.
    if (readOutbox()) {
      if (!marker?.active) await activateMigration(api, 'recovery-outbox');
      else {
        canonical = 'PROMETEO_DB';
        await drainOutbox(api, 'recovery-outbox');
        setState('DB_CANONICAL', { count: cache.length, recovered_outbox: true });
      }
      return { canonical, ids: list(), recovered_outbox: true };
    }

    if (!marker?.active) {
      await activateMigration(api, 'legacy-migration');
      return { canonical, ids: list(), migrated: true };
    }

    canonical = 'PROMETEO_DB';
    const row = await api.getKV(k.dbKey, null).catch(() => null);

    // A local mutation may land while getKV is in flight. Never hydrate an older DB snapshot on
    // top of it: flush the now-pending value instead.
    if (readOutbox() || mutationRevision !== startRevision) {
      await drainOutbox(api, 'concurrent-start-mutation');
      setState('DB_CANONICAL', { count: cache.length, concurrent_mutation: true });
      return { canonical, ids: list(), concurrent_mutation: true };
    }

    if (row && Array.isArray(row.ids)) {
      const dbIds = normalizeIds(row.ids);
      publish(dbIds, 'db-hydrate');
      setState('DB_CANONICAL', { count: dbIds.length, hydrated: true });
      return { canonical, ids: list(), hydrated: true };
    }

    // Canonical DB row disappeared but rollback/recovery mirrors survived. Heal DB from the
    // synchronous local projection rather than presenting an empty list or blocking startup.
    const healRevision = mutationRevision;
    const localBeforeHeal = cache.slice();
    await writeCanonical(api, localBeforeHeal, 'recovery-heal');
    if (readOutbox() || mutationRevision !== healRevision) {
      await drainOutbox(api, 'concurrent-heal-mutation');
      setState('DB_CANONICAL', { count: cache.length, healed: true, concurrent_mutation: true });
      return { canonical, ids: list(), healed: true, concurrent_mutation: true };
    }
    publish(localBeforeHeal, 'recovery-heal');
    setState('DB_CANONICAL', { count: localBeforeHeal.length, healed: true });
    return { canonical, ids: list(), healed: true };
  }

  function start() {
    return enqueue(startInternal);
  }

  async function verify() {
    try {
      await operationTail;
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
        mutation_revision: mutationRevision,
      };
    } catch {
      return { ok: false, canonical, count: cache.length, unavailable: true, pending: !!readOutbox(), mutation_revision: mutationRevision };
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
