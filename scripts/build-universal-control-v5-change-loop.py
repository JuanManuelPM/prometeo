#!/usr/bin/env python3
"""Surgically add Page Change Loop to the verified single-host V5 source.

The Universal Control remains the only global shell. This builder only adds the
Change Loop adapter, unread projection and host-routed page/result deep links.
Child pages never own or mount global Prometeo navigation.
"""
from __future__ import annotations
import hashlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
V5=ROOT/'shared'/'universal-shell'/'v5'
SOURCE=V5/'candidate'/'single-host-source.html'
OUT=V5/'candidate'/'change-loop-source.html'
META=V5/'candidate'/'CHANGE_LOOP_SOURCE_SHA256.txt'
BASELINE_SHA='5e1d5a1e8239e1d33f5c6b3a9347422e901fdb12c91da86c79796b89f6783475'

def one(text,old,new,label):
    c=text.count(old)
    if c!=1: raise SystemExit(f'{label}: expected 1 marker, found {c}')
    return text.replace(old,new,1)

def main():
    raw=SOURCE.read_bytes(); digest=hashlib.sha256(raw).hexdigest()
    if digest!=BASELINE_SHA: raise SystemExit(f'single-host baseline {digest} != {BASELINE_SHA}')
    text=raw.decode('utf-8')

    css=".puck:active{box-shadow:0 4px 7px rgba(0,0,0,.13),inset 0 7px 11px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.025)}"
    text=one(text,css,css+"\n.puck[data-change-unread=\"1\"]::after{content:\"\";position:absolute;right:3px;top:3px;width:8px;height:8px;border-radius:50%;background:var(--surface);box-shadow:0 0 0 2px var(--face);pointer-events:none}",'unread css')

    host="window.__PROMETEO_UNIVERSAL_HOST__=Object.freeze({schema:'prometeo.universal-host/v1',version:'v5',pageHost:'pageHost'});"
    enhanced="""window.__PROMETEO_UNIVERSAL_HOST__=Object.freeze({
  schema:'prometeo.universal-host/v2',version:'v5',pageHost:'pageHost',
  getPage:()=>currentPage?{id:currentPage.id,title:currentPage.title||currentPage.id,href:currentPage.public_url||currentPage.href||null,served_identity:null}:{id:'prometeo-universal-shell-v5',title:'Prometeo',href:location.href,served_identity:null},
  routeUrl:(pageId,workItemId=null)=>{const u=new URL('/prometeo/',location.origin);if(pageId)u.searchParams.set('page',String(pageId));if(workItemId)u.searchParams.set('changes',String(workItemId));return u.href},
  navigatePage:async(pageId,{push=true}={})=>{await ensureCatalog();const p=pageRegistry.get(String(pageId||''));if(!p)return false;loadPage(p,push);return true},
  previewUrl:url=>{if(!url)return false;hideNativeSurface();pageHost.src=String(url);return true},
  refreshPage:()=>{if(!currentPage)return false;const u=new URL(currentPage.public_url||currentPage.href,location.href);u.searchParams.set('_prometeo_refresh',Date.now());pageHost.src=u.href;return true}
});"""
    text=one(text,host,enhanced,'host api')

    marker="const captureSync=createCaptureSyncQueue({remote,getNote:id=>getNote(id),listNotes:()=>listNotes(),pageForNote,onState:renderSyncState});"
    add=marker+"""

let changeLoopPromise=null;
function setChangeUnread(count){puck.dataset.changeUnread=Number(count||0)>0?'1':'0'}
async function createTextCaptureForChangeLoop(text,targetPage){
  const p=targetPage?.id?targetPage:(currentPage||{id:'prometeo-universal-shell-v5',title:'Prometeo'});
  const now=Date.now();
  const note={
    id:crypto.randomUUID?.()||`txt-${now}-${Math.random().toString(36).slice(2)}`,
    created:now,status:'done',text:String(text||'').trim(),audio:null,error:'',
    sourcePath:p.public_url||p.href||location.pathname,
    sourceHref:p.public_url||p.href||location.href,
    sourceTitle:p.title||p.id,
    viewport:`${innerWidth}x${innerHeight}`,pageId:p.id,transcriptRevision:1
  };
  if(!note.text)return null;
  await putNote(note);await refreshNotes();captureSync.reconcile?.();scheduleSync(0);
  try{await syncAll()}catch{}
  return note;
}
function openLegacyNotesFromLoop(){
  refreshNotes().then(()=>{state.stack=[ROOT,buildNotesHome()];state.index=0;state.armed=null;openSelector();render()}).catch(()=>{});
}
async function loadPageChangeLoop(){
  if(globalThis.__PROMETEO_CHANGE_LOOP__)return globalThis.__PROMETEO_CHANGE_LOOP__;
  if(changeLoopPromise)return changeLoopPromise;
  const url=location.hostname==='juanmanuelpm.github.io'?'/prometeo/shared/capture/v1/change-loop.js?v=2':'/shared/capture/v1/change-loop.js?v=2';
  changeLoopPromise=import(url).then(m=>m.mountPageChangeLoop({adapter:{
    getPage:()=>window.__PROMETEO_UNIVERSAL_HOST__?.getPage?.(),
    syncNow:async()=>{try{await syncAll()}catch{}},
    createTextCapture:createTextCaptureForChangeLoop,
    previewUrl:url=>window.__PROMETEO_UNIVERSAL_HOST__?.previewUrl?.(url),
    hostUrl:(pageId,workItemId)=>window.__PROMETEO_UNIVERSAL_HOST__?.routeUrl?.(pageId,workItemId),
    navigatePage:(pageId,opts)=>window.__PROMETEO_UNIVERSAL_HOST__?.navigatePage?.(pageId,opts),
    openLegacyNotes:openLegacyNotesFromLoop,
    onUnread:setChangeUnread,
    onClose:()=>{}
  }})).catch(error=>{changeLoopPromise=null;backendStatus.set('page-change-loop','DEGRADED',String(error?.message||error));return null});
  return changeLoopPromise;
}
"""
    text=one(text,marker,add,'change loop loader')

    old="""    if(it.action==='notes'){
      await refreshNotes();
      state.stack.push(buildNotesHome());
      state.index=0;state.armed=null;render();return;
    }"""
    new="""    if(it.action==='notes'){
      const loop=await loadPageChangeLoop();
      if(loop){state.stack=[ROOT];state.index=0;closeSelector();const opened=await loop.open(currentPage||null);if(opened)return}
      await refreshNotes();state.stack.push(buildNotesHome());state.index=0;state.armed=null;render();return;
    }"""
    text=one(text,old,new,'notes action')

    old_start="""const hashId=pageRoute.hashId();
if(hashId){
  ensureCatalog().then(()=>{const p=pageRegistry.get(hashId);if(p)loadPage(p,false)}).catch(()=>{});
}"""
    new_start="""const launchParams=new URLSearchParams(location.search);
const launchPageId=launchParams.get('page')||'';
const launchWorkItem=launchParams.get('changes')||'';
const hashId=pageRoute.hashId();
const requestedPageId=launchPageId||hashId;
if(requestedPageId){
  ensureCatalog().then(async()=>{
    const p=pageRegistry.get(requestedPageId);if(!p)return;
    loadPage(p,false);
    if(launchWorkItem){
      const loop=await loadPageChangeLoop();
      await loop?.openResult?.(p,launchWorkItem,{markSeen:true});
    }
  }).catch(error=>backendStatus.set('host-deeplink','DEGRADED',String(error?.message||error)));
}"""
    text=one(text,old_start,new_start,'host deep link startup')

    ready="backendStatus.set('shell','READY');render();closeSelector(true);requestAnimationFrame(frame);"
    text=one(text,ready,"loadPageChangeLoop().then(loop=>loop?.pollUnread?.()).catch(()=>{});\n"+ready,'startup unread')

    required=['loadPageChangeLoop','createTextCaptureForChangeLoop','data-change-unread','getPage:()=>currentPage','routeUrl:(pageId,workItemId=null)','navigatePage:async(pageId','launchWorkItem','openResult?.(p,launchWorkItem','previewUrl:url','openLegacyNotesFromLoop','suppressNextClosedClick=true','__PROMETEO_UNIVERSAL_HOST__']
    missing=[x for x in required if x not in text]
    if missing: raise SystemExit(f'missing markers {missing}')
    if text.count("if(it.action==='notes')")!=1: raise SystemExit('notes action duplicated')
    OUT.write_text(text,encoding='utf-8')
    outsha=hashlib.sha256(text.encode()).hexdigest()
    META.write_text(f'{outsha}  change-loop-source.html\nbaseline_sha256={BASELINE_SHA}\nchange=PAGE_CHANGE_LOOP_HOST_ROUTING_V2\nsingle_global_shell=true\n',encoding='utf-8')
    print('built',OUT.relative_to(ROOT),outsha)

if __name__=='__main__':main()
