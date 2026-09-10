#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V5 = ROOT / 'shared' / 'universal-shell' / 'v5'
SOURCE = V5 / 'candidate' / 'durable-favorites-source.html'
OUT = V5 / 'candidate' / 'single-host-source.html'
META = V5 / 'candidate' / 'SINGLE_HOST_SOURCE_SHA256.txt'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def main() -> None:
    text = SOURCE.read_text(encoding='utf-8')
    source_sha = hashlib.sha256(text.encode('utf-8')).hexdigest()

    text = replace_once(
        text,
        '.selector.corner-snapping .puck{pointer-events:none}',
        '.selector.corner-snapping .puck{pointer-events:auto;cursor:grab}',
        'snap pointer ownership',
    )

    text = replace_once(
        text,
        '<iframe id="pageHost" title="Página de Prometeo" src="about:blank"></iframe>',
        '<iframe id="pageHost" name="prometeo-page-host" title="Página de Prometeo" src="about:blank"></iframe>',
        'page host identity',
    )

    text = replace_once(
        text,
        'let closedPuckDrag=null,suppressClosedClickUntil=0,cornerSnapAnimation=null;',
        'let closedPuckDrag=null,suppressNextClosedClick=false,suppressClosedClickUntil=0,cornerSnapAnimation=null;',
        'closed drag state',
    )

    old_drag = """/* Closed-control repositioning. Tap opens; >8px drag owns the pointer and snaps to one semantic corner. */
puck.addEventListener('pointerdown',e=>{if(state.open||e.button!==0)return;const a=cornerAnchor(controlCorner);closedPuckDrag={id:e.pointerId,sx:e.clientX,sy:e.clientY,lastX:a.x,lastY:a.y,dragging:false};try{puck.setPointerCapture(e.pointerId)}catch{}},{capture:true});
puck.addEventListener('pointermove',e=>{const d=closedPuckDrag;if(!d||d.id!==e.pointerId||state.open)return;const dist=Math.hypot(e.clientX-d.sx,e.clientY-d.sy);if(!d.dragging&&dist<8)return;if(!d.dragging){d.dragging=true;selector.classList.add('corner-dragging')}const p=clampClosedPoint(e.clientX,e.clientY);d.lastX=p.x;d.lastY=p.y;setSelectorAnchor(p.x,p.y);e.preventDefault();e.stopImmediatePropagation()},{capture:true,passive:false});
function finishClosedPuckDrag(e,cancel=false){const d=closedPuckDrag;if(!d||d.id!==e.pointerId)return;closedPuckDrag=null;selector.classList.remove('corner-dragging');try{puck.releasePointerCapture(e.pointerId)}catch{}if(!d.dragging||cancel){applyControlCorner(controlCorner);return}suppressClosedClickUntil=performance.now()+360;const c=nearestCorner(d.lastX,d.lastY);applyControlCorner(c,{animate:true,from:{x:d.lastX,y:d.lastY},vibrate:true});e.preventDefault();e.stopImmediatePropagation()}
puck.addEventListener('pointerup',e=>finishClosedPuckDrag(e,false),{capture:true});puck.addEventListener('pointercancel',e=>finishClosedPuckDrag(e,true),{capture:true});
prevBtn.addEventListener('click',e=>{e.stopPropagation();step(-1)});
nextBtn.addEventListener('click',e=>{e.stopPropagation();step(1)});
currentBtn.addEventListener('click',e=>{e.stopPropagation();enter().catch(err=>showToast(err?.message||'No pude abrir'))});
puck.addEventListener('click',e=>{e.stopPropagation();if(performance.now()<suppressClosedClickUntil){e.preventDefault();return}back()});
"""
    new_drag = """/* Closed-control repositioning. Every closed state is re-grabbable, including during snap. */
puck.addEventListener('pointerdown',e=>{
  if(state.open||e.button!==0)return;
  if(cornerSnapAnimation){try{cornerSnapAnimation.cancel()}catch{}cornerSnapAnimation=null}
  selector.classList.remove('corner-snapping');
  const r=puck.getBoundingClientRect();
  const actual={x:r.left+r.width/2,y:r.top+r.height/2};
  setSelectorAnchor(actual.x,actual.y);
  closedPuckDrag={id:e.pointerId,sx:e.clientX,sy:e.clientY,lastX:actual.x,lastY:actual.y,dragging:false};
  try{puck.setPointerCapture(e.pointerId)}catch{}
},{capture:true});
puck.addEventListener('pointermove',e=>{const d=closedPuckDrag;if(!d||d.id!==e.pointerId||state.open)return;const dist=Math.hypot(e.clientX-d.sx,e.clientY-d.sy);if(!d.dragging&&dist<8)return;if(!d.dragging){d.dragging=true;selector.classList.add('corner-dragging')}const p=clampClosedPoint(e.clientX,e.clientY);d.lastX=p.x;d.lastY=p.y;setSelectorAnchor(p.x,p.y);e.preventDefault();e.stopImmediatePropagation()},{capture:true,passive:false});
function finishClosedPuckDrag(e,cancel=false){const d=closedPuckDrag;if(!d||d.id!==e.pointerId)return;closedPuckDrag=null;selector.classList.remove('corner-dragging');try{puck.releasePointerCapture(e.pointerId)}catch{}if(!d.dragging||cancel){applyControlCorner(controlCorner);return}suppressNextClosedClick=true;suppressClosedClickUntil=performance.now()+1000;const c=nearestCorner(d.lastX,d.lastY);applyControlCorner(c,{animate:true,from:{x:d.lastX,y:d.lastY},vibrate:true});e.preventDefault();e.stopImmediatePropagation()}
puck.addEventListener('pointerup',e=>finishClosedPuckDrag(e,false),{capture:true});puck.addEventListener('pointercancel',e=>finishClosedPuckDrag(e,true),{capture:true});
prevBtn.addEventListener('click',e=>{e.stopPropagation();step(-1)});
nextBtn.addEventListener('click',e=>{e.stopPropagation();step(1)});
currentBtn.addEventListener('click',e=>{e.stopPropagation();enter().catch(err=>showToast(err?.message||'No pude abrir'))});
puck.addEventListener('click',e=>{e.stopPropagation();if(suppressNextClosedClick||performance.now()<suppressClosedClickUntil){suppressNextClosedClick=false;e.preventDefault();return}back()});
"""
    text = replace_once(text, old_drag, new_drag, 'repeatable closed puck drag')

    old_route = """function projectPageRoute(route){
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
    new_route = """function projectPageRoute(route){
  if(!route)return;
  hideNativeSurface();
  currentPage=route.page;
  pageHost.src=route.publicUrl;
  syncRoot();
}
function loadPage(page,push=true){projectPageRoute(pageRoute.activate(page,{push}))}
function hostedUrlKey(input){
  try{const u=new URL(input,location.href);u.hash='';u.search='';let p=u.pathname.replace(/\\/index\\.html$/,'/');if(!p.endsWith('/')&&!/\\.[A-Za-z0-9]+$/.test(p))p+='/';return u.origin+p}catch{return''}
}
function isPrometeoRootUrl(input){
  try{const u=new URL(input,location.href);return u.origin===location.origin&&(u.pathname==='/prometeo/'||u.pathname==='/prometeo/index.html')}catch{return false}
}
function pageForHostedUrl(input){
  const key=hostedUrlKey(input);if(!key)return null;
  for(const p of pageRegistry.values())if(hostedUrlKey(p.public_url)===key)return p;
  return null;
}
function returnToHostHome({replace=true}={}){
  currentPage=null;hideNativeSurface();
  if(pageHost.getAttribute('src')!=='about:blank')pageHost.src='about:blank';
  syncRoot();
  if(replace){try{history.replaceState(null,'',location.pathname+location.search)}catch{}}
}
window.__PROMETEO_UNIVERSAL_HOST__=Object.freeze({schema:'prometeo.universal-host/v1',version:'v5',pageHost:'pageHost'});
window.addEventListener('message',e=>{
  if(e.source!==pageHost.contentWindow)return;
  if(e.data?.type==='prometeo:nested-shell'){returnToHostHome({replace:true})}
});
pageHost.addEventListener('load',()=>{
  try{
    const href=pageHost.contentWindow.location.href;
    if(!href||href==='about:blank')return;
    if(isPrometeoRootUrl(href)){returnToHostHome({replace:true});return}
    const p=pageForHostedUrl(href);
    if(p&&p.id!==currentPage?.id){
      currentPage=p;try{localStorage.setItem('prometeo.v5.lastPage',p.id)}catch{}syncRoot();
      try{history.replaceState({pageId:p.id},'',`#/p/${encodeURIComponent(p.id)}`)}catch{}
    }
  }catch{/* cross-origin PAGE HOST remains isolated; outer shell stays authoritative */}
});
window.addEventListener('popstate',async e=>{
  const id=pageRoute.eventId(e);if(!id){returnToHostHome({replace:false});return}
  await ensureCatalog();const p=pageRegistry.get(id);if(p)loadPage(p,false);
});
"""
    text = replace_once(text, old_route, new_route, 'single shell page host routing')

    required = [
        'suppressNextClosedClick=true',
        'puck.getBoundingClientRect()',
        "window.__PROMETEO_UNIVERSAL_HOST__=Object.freeze",
        "e.data?.type==='prometeo:nested-shell'",
        'pageForHostedUrl',
        'name="prometeo-page-host"',
        'PROMETEO_DB_CANONICAL_WITH_SYNC_RECOVERY',
        'prometeo.universal-control.corner.v1',
        'favorites-organizer',
    ]
    missing = [marker for marker in required if marker not in text]
    if missing:
        raise SystemExit(f'single-host candidate missing markers: {missing}')
    if '.selector.corner-snapping .puck{pointer-events:none}' in text:
        raise SystemExit('snap still disables puck pointer events')

    OUT.write_text(text, encoding='utf-8')
    out_sha = hashlib.sha256(text.encode('utf-8')).hexdigest()
    META.write_text(
        f'{out_sha}  single-host-source.html\n'
        f'durable_source_sha256={source_sha}\n'
        'served_authority=false\n'
        'global_shell_owner=TOP_LEVEL_PROMETEO_ONLY\n'
        'page_host=UNCHANGED_PAGE_BYTES_UNDER_OUTER_SHELL\n'
        'closed_puck=REGRABBABLE_AFTER_AND_DURING_SNAP\n',
        encoding='utf-8',
    )
    print(f'built {OUT.relative_to(ROOT)}')
    print(f'sha256 {out_sha}')


if __name__ == '__main__':
    main()
