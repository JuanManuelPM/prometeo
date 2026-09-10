#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V5 = ROOT / 'shared' / 'universal-shell' / 'v5'
BASELINE = V5 / 'candidate' / 'baseline-source.html'
FAVORITES = V5 / 'backend' / 'favorites-store-v1.js'
RUNTIME = V5 / 'backend' / 'runtime-v1.js'
OUT = V5 / 'candidate' / 'backend-facades-source.html'
META = V5 / 'candidate' / 'BACKEND_FACADES_SOURCE_SHA256.txt'
BASELINE_SHA = '67965c4da9161737f06fcf6503d6b73db43eef574796977327c97f165e514d8a'


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
    raw = BASELINE.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != BASELINE_SHA:
        raise SystemExit(f'baseline sha256 {digest} != {BASELINE_SHA}')
    text = raw.decode('utf-8')

    injected = bundle_module(FAVORITES) + bundle_module(RUNTIME) + """const backendStatus=createBackendStatus();
window.__PROMETEO_V5_BACKEND_STATUS__=backendStatus;
backendStatus.set('shell','BOOTING');

"""
    text = replace_once(text, "(async()=>{\nconst FALLBACK_KEY=", "(async()=>{\n" + injected + "const FALLBACK_KEY=", 'backend injection')

    old_import = """let VoiceQueue=FallbackVoiceQueue,PrometeoRemote=FallbackRemote;
try{
 const base=location.hostname==='juanmanuelpm.github.io'?'https://juanmanuelpm.github.io/prometeo/shared/prometeo-shell/':'https://juanmanuelpm.github.io/prometeo/shared/prometeo-shell/';
 const [dbm,vm,sm]=await Promise.all([import(base+'v1/db.js'),import(base+'v1/voice.js'),import(base+'v2/sync.js')]);
 listNotes=dbm.listNotes;putNote=dbm.putNote;removeNote=dbm.removeNote;getNote=dbm.getNote;VoiceQueue=vm.VoiceQueue;PrometeoRemote=sm.PrometeoRemote;
}catch{}
"""
    new_import = """let VoiceQueue=FallbackVoiceQueue,PrometeoRemote=FallbackRemote;
try{
 const base='https://juanmanuelpm.github.io/prometeo/shared/prometeo-shell/';
 const [dbm,vm,sm]=await Promise.all([import(base+'v1/db.js'),import(base+'v1/voice.js'),import(base+'v2/sync.js')]);
 listNotes=dbm.listNotes;putNote=dbm.putNote;removeNote=dbm.removeNote;getNote=dbm.getNote;VoiceQueue=vm.VoiceQueue;PrometeoRemote=sm.PrometeoRemote;
 backendStatus.set('shell-modules','REMOTE_READY');
}catch(error){backendStatus.set('shell-modules','LOCAL_ONLY',String(error?.message||error))}
"""
    text = replace_once(text, old_import, new_import, 'module import status')

    old_favorites = """const FAVORITES_KEY='prometeo.v5.favorites.v1';
function readFavoriteIds(){
  try{
    const raw=JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]');
    return [...new Set((Array.isArray(raw)?raw:[]).filter(x=>typeof x==='string'&&x))];
  }catch{return[]}
}
let favoriteIds=readFavoriteIds();
function saveFavoriteIds(){
  try{localStorage.setItem(FAVORITES_KEY,JSON.stringify(favoriteIds))}catch{}
}
function isFavorite(id){return !!id&&favoriteIds.includes(id)}
"""
    new_favorites = """const FAVORITES_KEY=FAVORITES_LEGACY_KEY;
const favoritesLegacy=createLegacyFavoritesStore({key:FAVORITES_KEY});
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
    text = replace_once(text, old_favorites, new_favorites, 'favorites shadow boundary')

    old_corner_head = """const CORNER_KEY='prometeo.universal-control.corner.v1';
const CORNERS=['top-left','top-right','bottom-left','bottom-right'];
let controlCorner=loadControlCorner();
"""
    new_corner_head = """const CORNER_KEY='prometeo.universal-control.corner.v1';
const CORNERS=['top-left','top-right','bottom-left','bottom-right'];
const preferencesStore=createLegacyPreferencesStore({cornerKey:CORNER_KEY,corners:CORNERS});
let controlCorner=loadControlCorner();
"""
    text = replace_once(text, old_corner_head, new_corner_head, 'preferences boundary')
    text = replace_once(text,
        "function loadControlCorner(){try{const v=localStorage.getItem(CORNER_KEY);return CORNERS.includes(v)?v:'bottom-right'}catch{return'bottom-right'}}",
        "function loadControlCorner(){return preferencesStore.getCorner('bottom-right')}", 'corner read')
    text = replace_once(text,
        "function saveControlCorner(){try{localStorage.setItem(CORNER_KEY,controlCorner)}catch{}}",
        "function saveControlCorner(){preferencesStore.setCorner(controlCorner)}", 'corner write')

    service_marker = """const voice=new VoiceQueue({
  workerURL:'https://juanmanuelpm.github.io/prometeo/shared/prometeo-shell/v1/prometeo-voice-worker.js?v=1',
  onChange:async()=>{await refreshNotes();reconcileNotesView();scheduleSync();},
  onRecording:renderRecording
});


const CORNER_KEY="""
    service_replacement = """const voice=new VoiceQueue({
  workerURL:'https://juanmanuelpm.github.io/prometeo/shared/prometeo-shell/v1/prometeo-voice-worker.js?v=1',
  onChange:async()=>{await refreshNotes();reconcileNotesView();scheduleSync();},
  onRecording:renderRecording
});
const linkProvider=createLinkProvider({remote});
const pageRoute=createPageRouteController();
const pageForNote=note=>note.pageId===currentPage?.id?currentPage:{id:note.pageId,source_repo:'JuanManuelPM/prometeo'};
const contextProvider=createContextProvider({remote,putNote:note=>putNote(note),pageForNote});
const captureSync=createCaptureSyncQueue({remote,getNote:id=>getNote(id),listNotes:()=>listNotes(),pageForNote,onState:renderSyncState});


const CORNER_KEY="""
    text = replace_once(text, service_marker, service_replacement, 'backend service assembly')

    old_route = """function loadPage(page,push=true){
  if(!page?.public_url)return;
  hideNativeSurface();
  currentPage=page;
  pageHost.src=page.public_url;
  localStorage.setItem('prometeo.v5.lastPage',page.id);
  syncRoot();
  if(push){
    try{history.pushState({pageId:page.id},'',`#/p/${encodeURIComponent(page.id)}`)}catch{}
  }
}
window.addEventListener('popstate',async e=>{
  const id=e.state?.pageId||decodeURIComponent((location.hash.match(/^#\\/p\\/(.+)$/)||[])[1]||'');
  if(!id)return;
  await ensureCatalog();const p=pageRegistry.get(id);if(p)loadPage(p,false);
});
"""
    new_route = """function projectPageRoute(route){
  if(!route)return;
  hideNativeSurface();
  currentPage=route.page;
  pageHost.src=route.publicUrl;
  syncRoot();
}
function loadPage(page,push=true){projectPageRoute(pageRoute.activate(page,{push}))}
window.addEventListener('popstate',async e=>{
  const id=pageRoute.eventId(e);if(!id)return;
  await ensureCatalog();const p=pageRegistry.get(id);if(p)loadPage(p,false);
});
"""
    text = replace_once(text, old_route, new_route, 'page route boundary')

    old_context = """async function prepareContextFor(chosen){
  chosen=(chosen||[]).filter(n=>n?.status==='done'&&String(n.text||'').trim()&&!n.patentedIn);
  if(!chosen.length){showToast('No hay capturas nuevas');return}
  try{
    for(const n of chosen){
      await remote.syncCapture(
        n,
        n.pageId===currentPage?.id
          ? currentPage
          : {id:n.pageId,source_repo:'JuanManuelPM/prometeo'}
      );
    }
    const result=await remote.createPatent(chosen.map(n=>n.id));
    for(const n of chosen){
      n.patentedIn=result.patent_code;n.patentedAt=Date.now();await putNote(n);
    }
    contextResult={
      command:result.command||'',
      code:result.patent_code||'',
      expires_at:result.expires_at||null,
      count:chosen.length
    };
    contextExpanded=false;
    await refreshNotes();
    state.stack.push(buildContextNode());state.index=0;render();
  }catch(e){showToast(e?.message||'No pude preparar contexto')}
}
"""
    new_context = """async function prepareContextFor(chosen){
  try{
    const result=await contextProvider.prepare(chosen);
    if(result.empty){showToast('No hay capturas nuevas');return}
    contextResult={command:result.command,code:result.code,expires_at:result.expires_at,count:result.count};
    contextExpanded=false;
    await refreshNotes();scheduleSync(80);
    state.stack.push(buildContextNode());state.index=0;render();
  }catch(e){showToast(e?.message||'No pude preparar contexto')}
}
"""
    text = replace_once(text, old_context, new_context, 'context provider boundary')

    text = text.replace('remote.linkCode()', 'linkProvider.code()')
    text = text.replace('remote.importLinkCode(nativeCode.value)', 'linkProvider.importCode(nativeCode.value)')
    if 'remote.linkCode()' in text or 'remote.importLinkCode(nativeCode.value)' in text:
        raise SystemExit('link provider replacement incomplete')

    text = replace_once(text,
        "  await removeNote(note.id);remote.deleteCapture(note.id).catch(()=>{});",
        "  captureSync.markDelete(note.id);await removeNote(note.id);scheduleSync(20);", 'durable delete outbox')

    old_sync = """function scheduleSync(delay=700){clearTimeout(syncTimer);syncTimer=setTimeout(syncAll,delay)}
async function syncAll(){
  if(!navigator.onLine)return renderSyncState({online:false});
  try{
    renderSyncState({online:true,syncing:true});
    for(const note of [...await listNotes()].reverse()){
      if(!note.id)continue;
      await remote.syncCapture(
        note,
        note.pageId===currentPage?.id
          ? currentPage
          : {id:note.pageId,source_repo:'JuanManuelPM/prometeo'}
      );
    }
    renderSyncState({online:true,synced:true});
  }catch(e){renderSyncState({online:true,synced:false,error:e})}
}
"""
    new_sync = """function scheduleSync(delay=700){clearTimeout(syncTimer);syncTimer=setTimeout(syncAll,delay)}
async function syncAll(){
  if(!navigator.onLine)return renderSyncState({online:false});
  try{await captureSync.flush()}
  catch(e){renderSyncState({online:true,synced:false,error:e})}
}
"""
    text = replace_once(text, old_sync, new_sync, 'capture outbox sync')

    text = replace_once(text,
        "remote.init().then(()=>scheduleSync(80)).catch(()=>{});\nensureCatalog().catch(()=>{});\nconst hashId=decodeURIComponent((location.hash.match(/^#\\/p\\/(.+)$/)||[])[1]||'');",
        "remote.init().then(()=>{backendStatus.set('remote-sync','REMOTE_READY');scheduleSync(80)}).catch(error=>backendStatus.set('remote-sync',navigator.onLine?'DEGRADED':'LOCAL_ONLY',String(error?.message||error)));\nfavoritesStore.start().catch(()=>{});\nensureCatalog().catch(()=>{});\nconst hashId=pageRoute.hashId();", 'startup status/shadow')

    text = replace_once(text, "render();closeSelector(true);requestAnimationFrame(frame);",
        "backendStatus.set('shell','READY');render();closeSelector(true);requestAnimationFrame(frame);", 'ready status')

    required = [
        "window.__PROMETEO_V5_BACKEND_STATUS__=backendStatus",
        "LEGACY_CANONICAL_SHADOW_DB",
        "const captureSync=createCaptureSyncQueue",
        "const contextProvider=createContextProvider",
        "const linkProvider=createLinkProvider",
        "const pageRoute=createPageRouteController",
        "const preferencesStore=createLegacyPreferencesStore",
        "prometeo.universal-control.corner.v1",
        "favorites-organizer",
        "nearestCorner",
        "localVector",
    ]
    missing = [m for m in required if m not in text]
    if missing:
        raise SystemExit(f'candidate missing markers: {missing}')

    OUT.write_text(text, encoding='utf-8')
    out_sha = hashlib.sha256(text.encode('utf-8')).hexdigest()
    META.write_text(
        f'{out_sha}  backend-facades-source.html\n'
        f'baseline_sha256={BASELINE_SHA}\n'
        'served_authority=false\n'
        'favorites_owner=LEGACY_LOCALSTORAGE\n'
        'favorites_shadow=PrometeoDB_KV\n'
        'capture_sync=DURABLE_ID_OUTBOX_PLUS_FINGERPRINTS\n'
        'runtime_dependencies=LAZY_OR_EXISTING_ONLY\n',
        encoding='utf-8',
    )
    print(f'built {OUT.relative_to(ROOT)}')
    print(f'sha256 {out_sha}')


if __name__ == '__main__':
    main()
