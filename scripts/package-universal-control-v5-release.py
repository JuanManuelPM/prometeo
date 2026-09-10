#!/usr/bin/env python3
from __future__ import annotations
import base64,gzip,hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; V5=ROOT/'shared'/'universal-shell'/'v5'; SOURCE=V5/'candidate'/'single-host-source.html'; TEMPLATE=ROOT/'index.html'; OUT=V5/'release-candidate'

def replace_once(text,pattern,replacement,label):
    result,count=re.subn(pattern,replacement,text,count=1)
    if count!=1: raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return result

def split_b64(encoded,count=5):
    unit=((len(encoded)+count-1)//count+3)//4*4
    chunks=[encoded[i*unit:(i+1)*unit] for i in range(count-1)]+[encoded[(count-1)*unit:]]
    chunks=[c for c in chunks if c]
    if len(chunks)!=count or any(len(c)%4 for c in chunks[:-1]) or ''.join(chunks)!=encoded: raise SystemExit('invalid chunk split')
    return chunks

def make_loader(template,sha,length,chunk_expr):
    loader=replace_once(template,r"const EXPECTED='[0-9a-f]{64}';",f"const EXPECTED='{sha}';",'loader sha')
    loader=replace_once(loader,r'const EXPECTED_LENGTH=\d+;',f'const EXPECTED_LENGTH={length};','loader length')
    loader=replace_once(loader,r"const CHUNKS=\[1,2,3,4,5\]\.map\(n=>`[^`]+`\);",chunk_expr,'loader chunks')
    guard="""(async()=>{
  if(window.self!==window.top){
    document.documentElement.dataset.prometeoNestedShell='blocked';
    try{window.parent.postMessage({type:'prometeo:nested-shell',href:location.href},location.origin)}catch{}
    return;
  }
  document.documentElement.dataset.prometeoUniversalShell='v5';
  try{localStorage.removeItem('prometeo.shell.enabled.v1')}catch{}"""
    if 'window.self!==window.top' not in loader:
        marker="(async()=>{\n  try{localStorage.removeItem('prometeo.shell.enabled.v1')}catch{}"
        if marker not in loader: raise SystemExit('loader boot marker not found')
        loader=loader.replace(marker,guard,1)
    write_plain='document.open();document.write(html);document.close();'
    write_guarded="document.open();document.write(html);document.close();document.documentElement.dataset.prometeoUniversalShell='v5';"
    if write_guarded not in loader:
        if write_plain not in loader: raise SystemExit('loader document replacement marker not found')
        loader=loader.replace(write_plain,write_guarded,1)
    return loader

def main():
    html=SOURCE.read_bytes(); source_sha=hashlib.sha256(html).hexdigest(); compressed=gzip.compress(html,compresslevel=9,mtime=0); gzip_sha=hashlib.sha256(compressed).hexdigest(); encoded=base64.b64encode(compressed).decode('ascii'); chunks=split_b64(encoded)
    OUT.mkdir(parents=True,exist_ok=True)
    for old in OUT.glob('chunk-*.b64'): old.unlink()
    for i,chunk in enumerate(chunks,1): (OUT/f'chunk-{i}.b64').write_text(chunk,encoding='ascii')
    template=TEMPLATE.read_text(encoding='utf-8')
    candidate_loader=make_loader(template,source_sha,len(encoded),"const CHUNKS=[1,2,3,4,5].map(n=>`./chunk-${n}.b64`);")
    root_loader=make_loader(template,source_sha,len(encoded),"const CHUNKS=[1,2,3,4,5].map(n=>`./shared/universal-shell/v5/chunk-${n}.b64`);")
    (OUT/'index.html').write_text(candidate_loader,encoding='utf-8'); (OUT/'root-index.html').write_text(root_loader,encoding='utf-8')
    manifest={'schema':'prometeo.universal-shell-served-manifest/v1','source':'shared/universal-shell/v5/candidate/single-host-source.html','source_sha256':source_sha,'gzip_sha256':gzip_sha,'base64_length':len(encoded),'chunks':[{'file':f'chunk-{i}.b64','size':len(chunk)} for i,chunk in enumerate(chunks,1)],'capabilities':{'single_top_level_shell':True,'nested_root_boot_blocked':True,'page_host_overlay':True,'closed_puck_repeatable_drag':True,'closed_puck_regrab_during_snap':True,'semantic_corner_persistence':True,'durable_favorites':True}}
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    joined=''.join((OUT/c['file']).read_text(encoding='ascii') for c in manifest['chunks']); decoded=gzip.decompress(base64.b64decode(joined,validate=True))
    if decoded!=html: raise SystemExit('packaged payload does not decode to exact candidate source')
    for loader in (candidate_loader,root_loader):
        if 'window.self!==window.top' not in loader or 'prometeo:nested-shell' not in loader or "document.documentElement.dataset.prometeoUniversalShell='v5'" not in loader: raise SystemExit('loader guard/marker missing')
    if source_sha not in root_loader or str(len(encoded)) not in root_loader: raise SystemExit('root loader metadata mismatch')
    print(json.dumps(manifest,ensure_ascii=False))
if __name__=='__main__': main()
