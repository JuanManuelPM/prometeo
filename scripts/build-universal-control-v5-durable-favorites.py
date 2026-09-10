#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V5 = ROOT / 'shared' / 'universal-shell' / 'v5'
MODULAR = V5 / 'candidate' / 'backend-facades-source.html'
DURABLE = V5 / 'backend' / 'favorites-durable-v2.js'
OUT = V5 / 'candidate' / 'durable-favorites-source.html'
META = V5 / 'candidate' / 'DURABLE_FAVORITES_SOURCE_SHA256.txt'


def bundle_module(path: Path) -> str:
    text = path.read_text(encoding='utf-8')
    text = text.replace('export const ', 'const ').replace('export function ', 'function ').replace('export class ', 'class ')
    if 'export ' in text:
        raise SystemExit(f'unexpected export remains in {path}')
    return text.rstrip() + '\n\n'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def main() -> None:
    text = MODULAR.read_text(encoding='utf-8')
    durable = bundle_module(DURABLE)
    marker = "const backendStatus=createBackendStatus();\n"
    text = replace_once(text, marker, durable + marker, 'durable module injection')

    old = """const favoritesLegacy=createLegacyFavoritesStore({key:FAVORITES_KEY});
async function loadPrometeoDBForShadow(){
  if(globalThis.PrometeoDB)return globalThis.PrometeoDB;
  const url=location.hostname==='juanmanuelpm.github.io'?'/prometeo/shared/storage/v1/prometeo-db.js':'/shared/storage/v1/prometeo-db.js';
  await import(url);
  if(!globalThis.PrometeoDB)throw new Error('PrometeoDB no disponible');
  return globalThis.PrometeoDB;
}
const favoritesStore=createFavoritesShadowAdapter({legacy:favoritesLegacy,loadDB:loadPrometeoDBForShadow,status:backendStatus});
function readFavoriteIds(){return favoritesStore.list()}
let favoriteIds=readFavoriteIds();
function saveFavoriteIds(){favoriteIds=favoritesStore.replace(favoriteIds)}
function isFavorite(id){return !!id&&favoriteIds.includes(id)}
"""
    new = """async function loadPrometeoDBForFavorites(){
  if(globalThis.PrometeoDB)return globalThis.PrometeoDB;
  const url=location.hostname==='juanmanuelpm.github.io'?'/prometeo/shared/storage/v1/prometeo-db.js':'/shared/storage/v1/prometeo-db.js';
  await import(url);
  if(!globalThis.PrometeoDB)throw new Error('PrometeoDB no disponible');
  return globalThis.PrometeoDB;
}
let favoriteIds=[];
const favoritesStore=createDurableFavoritesStore({
  loadDB:loadPrometeoDBForFavorites,
  status:backendStatus,
  onHydrate:ids=>{
    favoriteIds=ids;
    refreshFavoritesNodeInStack();
    syncRoot();
    if(nativeMode==='favorites-organizer')renderFavoritesOrganizer();
    if(state.open)render();
  }
});
function readFavoriteIds(){return favoritesStore.list()}
favoriteIds=readFavoriteIds();
function saveFavoriteIds(){favoriteIds=favoritesStore.replace(favoriteIds)}
function isFavorite(id){return !!id&&favoriteIds.includes(id)}
"""
    text = replace_once(text, old, new, 'Favorites durable cutover')

    # `start()` now activates/migrates PrometeoDB ownership. The UI remains synchronous because
    # favoriteIds is already hydrated from the rollback/recovery projection before this awaits.
    text = replace_once(
        text,
        "favoritesStore.start().catch(()=>{});",
        "favoritesStore.start().then(()=>backendStatus.set('favorites-owner','PROMETEO_DB_CANONICAL')).catch(error=>backendStatus.set('favorites-owner','LOCAL_RECOVERY',String(error?.message||error)));",
        'Favorites startup ownership',
    )

    required = [
        "prometeo.universal-control-favorites-store/v2",
        "PROMETEO_DB_CANONICAL_WITH_SYNC_RECOVERY",
        "prometeo.v5.favorites.recovery.v2",
        "prometeo.v5.favorites.outbox.v2",
        "universal-control/favorites/v2",
        "window.__PROMETEO_V5_BACKEND_STATUS__=backendStatus",
        "const captureSync=createCaptureSyncQueue",
        "const contextProvider=createContextProvider",
        "const pageRoute=createPageRouteController",
        "prometeo.universal-control.corner.v1",
        "favorites-organizer",
        "nearestCorner",
        "localVector",
    ]
    missing = [m for m in required if m not in text]
    if missing:
        raise SystemExit(f'durable candidate missing markers: {missing}')

    OUT.write_text(text, encoding='utf-8')
    out_sha = hashlib.sha256(text.encode('utf-8')).hexdigest()
    modular_sha = hashlib.sha256(MODULAR.read_bytes()).hexdigest()
    META.write_text(
        f'{out_sha}  durable-favorites-source.html\n'
        f'modular_candidate_sha256={modular_sha}\n'
        'served_authority=false\n'
        'favorites_owner=PrometeoDB_AFTER_VERIFIED_MIGRATION\n'
        'rollback_mirror=prometeo.v5.favorites.v1\n'
        'recovery_projection=prometeo.v5.favorites.recovery.v2\n'
        'durable_outbox=prometeo.v5.favorites.outbox.v2\n',
        encoding='utf-8',
    )
    print(f'built {OUT.relative_to(ROOT)}')
    print(f'sha256 {out_sha}')


if __name__ == '__main__':
    main()
