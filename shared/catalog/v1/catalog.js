/* Prometeo Catalog Truth v1 — Part 2 candidate.
   Validates tree/pages bytes before Current Graph may consume them. */
((global)=>{
  'use strict';
  if(global.PrometeoCatalog) return;
  const D=()=>global.PrometeoDurable;
  const STATES=new Set(['SOURCE','RECOVERED','RECONSTRUCTED','CANDIDATE','TESTED_CANDIDATE','HUMAN_ACCEPTED','SERVED','ARCHIVED']);
  const LIVE=new Set(['live','candidate','archived','disabled','missing']);
  function err(code,msg,detail={}){const e=new Error(msg);e.code=code;e.detail=detail;return e;}
  function collectTree(tree){
    const ids=new Set(),refs=[],paths=new Map(),visiting=new Set();
    function walk(node,path=[]){
      if(!node||typeof node!=='object')throw err('PROMETEO_CATALOG_TREE_NODE','Invalid tree node',{path});
      if(!node.id)throw err('PROMETEO_CATALOG_TREE_ID','Tree node missing id',{path});
      if(ids.has(node.id))throw err('PROMETEO_CATALOG_TREE_DUPLICATE_ID',`Duplicate tree id ${node.id}`);
      ids.add(node.id);
      if(visiting.has(node))throw err('PROMETEO_CATALOG_TREE_CYCLE','Tree object cycle');
      visiting.add(node);
      if(node.page_id){
        refs.push(node.page_id);
        paths.set(node.page_id,[...path]);
        if(node.children?.length)throw err('PROMETEO_CATALOG_LEAF_CHILDREN','Page leaf cannot have children',{id:node.id});
      }else{
        for(const child of node.children||[])walk(child,[...path,node.id]);
      }
      visiting.delete(node);
    }
    walk(tree,[]);
    return {ids,refs,paths};
  }
  function validate({tree,pages,manifest}){
    if(!tree||!pages||!manifest)throw err('PROMETEO_CATALOG_INPUT_REQUIRED','tree, pages and manifest required');
    if(pages.schema!=='prometeo.page-registry/v1')throw err('PROMETEO_CATALOG_PAGES_SCHEMA','Unexpected page registry schema');
    if(manifest.schema!=='prometeo.catalog-manifest/v1')throw err('PROMETEO_CATALOG_MANIFEST_SCHEMA','Unexpected catalog manifest schema');
    const {refs,paths}=collectTree(tree);
    const pageIds=new Set(),hrefs=new Map(),sourceIds=new Map();
    for(const p of pages.pages||[]){
      if(!p.id)throw err('PROMETEO_CATALOG_PAGE_ID','Page missing id');
      if(pageIds.has(p.id))throw err('PROMETEO_CATALOG_DUPLICATE_PAGE',`Duplicate page ${p.id}`);
      pageIds.add(p.id);
      if(!p.source)throw err('PROMETEO_CATALOG_SOURCE_REQUIRED',`Page ${p.id} missing source`);
      if(p.status==='live'&&!p.href)throw err('PROMETEO_CATALOG_LIVE_HREF',`Live page ${p.id} missing href`);
      if(!LIVE.has(p.status))throw err('PROMETEO_CATALOG_LIVE_STATUS',`Unknown live status ${p.status}`);
      if(hrefs.has(p.href)&&hrefs.get(p.href)!==p.id)throw err('PROMETEO_CATALOG_HREF_COLLISION',`Href collision ${p.href}`,{ids:[hrefs.get(p.href),p.id]});
      hrefs.set(p.href,p.id);
      const srcKey=p.source;
      if(sourceIds.has(srcKey)&&sourceIds.get(srcKey)!==p.id){
        // same exact source may represent aliases only when manifest explicitly says so; default fail.
        throw err('PROMETEO_CATALOG_SOURCE_COLLISION',`Two page IDs claim source ${srcKey}`,{ids:[sourceIds.get(srcKey),p.id]});
      }
      sourceIds.set(srcKey,p.id);
    }
    const missingRefs=refs.filter(id=>!pageIds.has(id));
    if(missingRefs.length)throw err('PROMETEO_CATALOG_MISSING_PAGE_REF','Tree references missing pages',{missingRefs});
    const refSet=new Set(refs);
    const orphans=[...pageIds].filter(id=>!refSet.has(id));
    if(orphans.length)throw err('PROMETEO_CATALOG_ORPHAN_PAGE','Catalog pages absent from tree',{orphans});
    if(new Set(refs).size!==refs.length)throw err('PROMETEO_CATALOG_DUPLICATE_REF','Page referenced multiple times in tree');
    if(manifest.source_contract.expected_page_count!==pageIds.size)throw err('PROMETEO_CATALOG_COUNT_MISMATCH','Page count mismatch');
    const manifestMap=new Map((manifest.pages||[]).map(p=>[p.page_id,p]));
    if(manifestMap.size!==pageIds.size)throw err('PROMETEO_CATALOG_MANIFEST_COUNT','Manifest/page count mismatch');
    for(const p of pages.pages){
      const m=manifestMap.get(p.id);
      if(!m)throw err('PROMETEO_CATALOG_MANIFEST_MISSING',`Manifest missing ${p.id}`);
      if(m.source_identity!==p.source||m.href!==p.href)throw err('PROMETEO_CATALOG_MANIFEST_DRIFT',`Manifest drift for ${p.id}`);
      if(!STATES.has(m.artifact_state))throw err('PROMETEO_CATALOG_ARTIFACT_STATE',`Invalid artifact state ${m.artifact_state}`);
      const path=paths.get(p.id)||[];
      if(JSON.stringify(path)!==JSON.stringify(m.category_path))throw err('PROMETEO_CATALOG_PATH_DRIFT',`Category path drift for ${p.id}`,{tree:path,manifest:m.category_path});
      if(m.reconstructed && m.artifact_state!=='RECONSTRUCTED')throw err('PROMETEO_CATALOG_RECONSTRUCTION_STATE',`Reconstructed flag mismatch ${p.id}`);
      if(m.candidate && !['CANDIDATE','TESTED_CANDIDATE'].includes(m.artifact_state))throw err('PROMETEO_CATALOG_CANDIDATE_STATE',`Candidate flag mismatch ${p.id}`);
      if(m.writable_target&&(!m.writable_target.repository||!m.writable_target.path||m.writable_target.kind!=='repo_path'))throw err('PROMETEO_CATALOG_WRITABLE_TARGET',`Invalid writable target ${p.id}`);
    }
    return Object.freeze({
      ok:true,pageCount:pageIds.size,treeRefCount:refs.length,
      sourceIdentity:manifest.source_contract.identity,
      pageIds:[...pageIds].sort()
    });
  }
  async function verifyLoadedBytes({treeText,pagesText,manifest,expectedTreeSha256=null,expectedPagesSha256=null}){
    const tree=JSON.parse(treeText),pages=JSON.parse(pagesText);
    const validated=validate({tree,pages,manifest});
    const treeSha256=await D().sha256Text(treeText),pagesSha256=await D().sha256Text(pagesText);
    if(expectedTreeSha256&&treeSha256!==expectedTreeSha256)throw err('PROMETEO_CATALOG_TREE_DIGEST_MISMATCH','Tree SHA-256 mismatch');
    if(expectedPagesSha256&&pagesSha256!==expectedPagesSha256)throw err('PROMETEO_CATALOG_PAGES_DIGEST_MISMATCH','Pages SHA-256 mismatch');
    return Object.freeze({...validated,treeSha256,pagesSha256,contentIdentity:`sha256:${treeSha256}+${pagesSha256}`});
  }
  function resolvePage(id,{pages,manifest}){
    const p=(pages.pages||[]).find(x=>x.id===id); if(!p)return null;
    const m=(manifest.pages||[]).find(x=>x.page_id===id); if(!m)return null;
    return Object.freeze({...structuredClone(p),truth:structuredClone(m)});
  }
  global.PrometeoCatalog=Object.freeze({version:'1.0.0-candidate',validate,verifyLoadedBytes,resolvePage,collectTree});
})(typeof globalThis!=='undefined'?globalThis:window);
