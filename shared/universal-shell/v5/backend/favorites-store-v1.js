export const FAVORITES_LEGACY_KEY = 'prometeo.v5.favorites.v1';

function normalizeLegacyValue(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(item => typeof item === 'string' && item))];
}

function sameArray(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function createLegacyFavoritesStore({
  storage = globalThis.localStorage,
  key = FAVORITES_LEGACY_KEY,
} = {}) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('FavoritesStore requires a Storage-compatible object');
  }

  function list() {
    try {
      const raw = storage.getItem(key);
      const parsed = raw == null ? [] : JSON.parse(raw);
      return normalizeLegacyValue(parsed);
    } catch {
      return [];
    }
  }

  function replace(ids) {
    const next = normalizeLegacyValue(ids);
    storage.setItem(key, JSON.stringify(next));
    return next.slice();
  }

  function has(id) {
    return typeof id === 'string' && id.length > 0 && list().includes(id);
  }

  function toggle(id) {
    if (typeof id !== 'string' || id.length === 0) {
      return { ids: list(), favorite: false, changed: false };
    }
    const ids = list();
    const wasFavorite = ids.includes(id);
    const next = wasFavorite ? ids.filter(value => value !== id) : [...ids, id];
    replace(next);
    return { ids: next.slice(), favorite: !wasFavorite, changed: true };
  }

  function move(id, toIndex) {
    const ids = list();
    const fromIndex = ids.indexOf(id);
    if (fromIndex < 0 || !Number.isFinite(toIndex)) {
      return { ids, changed: false, fromIndex, toIndex: fromIndex };
    }
    const target = Math.max(0, Math.min(ids.length - 1, Math.trunc(toIndex)));
    if (target === fromIndex) {
      return { ids, changed: false, fromIndex, toIndex: target };
    }
    const [value] = ids.splice(fromIndex, 1);
    ids.splice(target, 0, value);
    replace(ids);
    return { ids: ids.slice(), changed: true, fromIndex, toIndex: target };
  }

  function prune(validIds) {
    const valid = validIds instanceof Set ? validIds : new Set(validIds || []);
    const before = list();
    const after = before.filter(id => valid.has(id));
    if (after.length !== before.length) replace(after);
    return { ids: after.slice(), changed: after.length !== before.length };
  }

  return Object.freeze({
    schema: 'prometeo.universal-control-favorites-store/v1',
    mode: 'LEGACY_LOCALSTORAGE_COMPAT',
    key,
    list,
    replace,
    has,
    toggle,
    move,
    prune,
  });
}
