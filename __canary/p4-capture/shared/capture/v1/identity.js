const fail=(code,message,detail={})=>{const e=new Error(message);e.code=code;e.detail=detail;throw e};
const clone=v=>structuredClone(v);

export function normalizeURL(value,base='https://juanmanuelpm.github.io/prometeo/'){
  try{return new URL(String(value||''),base)}catch{return null}
}

function comparable(url){
  if(!url)return null;
  const path=url.pathname.replace(/\/index\.html$/,'/').replace(/\/+$/,'/')||'/';
  return `${url.origin}${path}`;
}

export function catalogEntries(catalog){
  const pages=Array.isArray(catalog)?catalog:(catalog?.pages||[]);
  return pages.map(p=>({
    id:String(p.id||p.page_id||''),
    title:String(p.title||p.id||p.page_id||''),
    href:p.href||p.public_url||null,
    source:p.source||p.source_identity||null,
    writable_target:p.writable_target||null,
    category_path:p.category_path||[]
  })).filter(p=>p.id);
}

export function resolveStandalonePage({locationHref,catalog,baseURL='https://juanmanuelpm.github.io/prometeo/'}={}){
  const current=normalizeURL(locationHref,baseURL);if(!current)fail('PROMETEO_CAPTURE_LOCATION','Invalid location');
  const matches=[];
  for(const page of catalogEntries(catalog)){
    const u=normalizeURL(page.href,baseURL);if(!u)continue;
    if(comparable(u)===comparable(current))matches.push(page);
  }
  if(matches.length===1)return Object.freeze({...matches[0],reason:'catalog-url-exact'});
  if(matches.length>1)fail('PROMETEO_CAPTURE_PAGE_AMBIGUOUS','Multiple Catalog pages match the current URL',{ids:matches.map(x=>x.id)});
  return Object.freeze({id:null,title:documentTitleFallback(current),href:current.href,source:null,writable_target:null,category_path:[],reason:'unresolved-location'});
}

export function resolveV53Page({api,catalog}={}){
  const state=api?.getState?.();if(!state)fail('PROMETEO_CAPTURE_V53_STATE','V53 state unavailable');
  const pages=catalogEntries(catalog);
  const ids=[state.currentNode,state.selected?.id,state.selected].filter(x=>typeof x==='string');
  for(const id of ids){const p=pages.find(x=>x.id===id);if(p)return Object.freeze({...p,reason:'v53-semantic-id'});}
  const path=[...(state.path||[])].reverse();for(const id of path){const p=pages.find(x=>x.id===id);if(p)return Object.freeze({...p,reason:'v53-path-id'});}
  fail('PROMETEO_CAPTURE_V53_TARGET_UNRESOLVED','V53 semantic target is not a Catalog page',{currentNode:state.currentNode,path:state.path||[]});
}

export function semanticNavigatorSnapshot({api,shellAdapter=null}={}){
  if(shellAdapter?.semanticSnapshot){const snap=shellAdapter.semanticSnapshot();if(snap)return Object.freeze(clone(snap));}
  const s=api?.getState?.();if(!s)return null;
  return Object.freeze({
    schema:'prometeo.capture-v53-context/v1',
    build:globalThis.__PROMETEO_BUILD__||null,
    currentNode:s.currentNode||null,
    path:[...(s.path||[])],
    selectedIndex:Number(s.selectedIndex||0),
    selected:clone(s.selected||null),
    paletteOffset:Number(s.paletteOffset||0),
    history:(s.history||[]).map(x=>({node:x.node,selectedIndex:Number(x.selectedIndex||0),paletteOffset:Number(x.paletteOffset||0)})),
    terminalOpen:!!s.terminalOpen
  });
}

export function createContextSnapshot({page,locationHref,documentTitle='',viewport=null,navigator=null,route=null,at=null}={}){
  const u=normalizeURL(locationHref||page?.href);const vp=viewport||{
    width:globalThis.innerWidth||0,
    height:globalThis.innerHeight||0,
    orientation:globalThis.matchMedia?.('(orientation: portrait)')?.matches?'portrait':'landscape'
  };
  if(!page?.id&&!u)fail('PROMETEO_CAPTURE_CONTEXT_IDENTITY','Cannot create context without page or URL');
  return Object.freeze({
    page_id:page?.id||null,
    source_path:u?.pathname||null,
    source_href:u?.href||null,
    source_title:documentTitle||page?.title||'',
    navigator:navigator?clone(navigator):null,
    route:route?clone(route):null,
    viewport:{width:Number(vp.width)||0,height:Number(vp.height)||0,orientation:String(vp.orientation||'unknown')},
    captured_at:new Date(at||Date.now()).toISOString()
  });
}

export function assertWritableTarget(page){
  if(!page?.id)fail('PROMETEO_CAPTURE_TARGET_UNKNOWN','Page identity unresolved');
  if(!page.writable_target)fail('PROMETEO_CAPTURE_TARGET_READONLY','Catalog page has no writable target',{page_id:page.id});
  const t=page.writable_target;
  if(t.kind!=='repo_path'||!t.repository||!t.path)fail('PROMETEO_CAPTURE_TARGET_INVALID','Writable target is incomplete',{page_id:page.id,target:t});
  return Object.freeze(clone(t));
}

function documentTitleFallback(url){return url?.pathname?.split('/').filter(Boolean).at(-1)||'Prometeo'}
