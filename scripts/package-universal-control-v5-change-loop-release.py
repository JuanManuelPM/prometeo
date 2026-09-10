#!/usr/bin/env python3
from __future__ import annotations
import base64,gzip,hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];V5=ROOT/'shared'/'universal-shell'/'v5';SOURCE=V5/'candidate'/'change-loop-source.html';TEMPLATE=ROOT/'index.html';OUT=V5/'change-loop-release-candidate'

def repl(t,p,r,label):
    out,n=re.subn(p,r,t,count=1)
    if n!=1:raise SystemExit(f'{label}: expected 1, got {n}')
    return out

def split_b64(s,count=5):
    unit=((len(s)+count-1)//count+3)//4*4
    a=[s[i*unit:(i+1)*unit] for i in range(count-1)]+[s[(count-1)*unit:]]
    if len(a)!=count or any(len(x)%4 for x in a[:-1]) or ''.join(a)!=s:raise SystemExit('invalid chunks')
    return a

def loader(template,sha,length,expr):
    x=repl(template,r"const EXPECTED='[0-9a-f]{64}';",f"const EXPECTED='{sha}';",'sha')
    x=repl(x,r'const EXPECTED_LENGTH=\d+;',f'const EXPECTED_LENGTH={length};','length')
    x=repl(x,r"const CHUNKS=\[1,2,3,4,5\]\.map\(n=>`[^`]+`\);",expr,'chunks')
    if 'window.self!==window.top' not in x:raise SystemExit('nested root guard missing')
    if "document.documentElement.dataset.prometeoUniversalShell='v5'" not in x:raise SystemExit('single shell marker missing')
    return x

def main():
    html=SOURCE.read_bytes();sha=hashlib.sha256(html).hexdigest();gz=gzip.compress(html,compresslevel=9,mtime=0);gzsha=hashlib.sha256(gz).hexdigest();b64=base64.b64encode(gz).decode('ascii');chunks=split_b64(b64)
    text=html.decode('utf-8');required=['prometeo.page-change-loop-ui/v1','loadPageChangeLoop','createTextCaptureForChangeLoop','data-change-unread','__PROMETEO_UNIVERSAL_HOST__','suppressNextClosedClick=true','PROMETEO_DB_CANONICAL_WITH_SYNC_RECOVERY']
    for m in required:
        if m not in text:raise SystemExit(f'missing {m}')
    OUT.mkdir(parents=True,exist_ok=True)
    for f in OUT.glob('chunk-*.b64'):f.unlink()
    for i,c in enumerate(chunks,1):(OUT/f'chunk-{i}.b64').write_text(c,encoding='ascii')
    t=TEMPLATE.read_text(encoding='utf-8');cand=loader(t,sha,len(b64),"const CHUNKS=[1,2,3,4,5].map(n=>`./chunk-${n}.b64`);");root=loader(t,sha,len(b64),"const CHUNKS=[1,2,3,4,5].map(n=>`./shared/universal-shell/v5/chunk-${n}.b64`);")
    (OUT/'index.html').write_text(cand,encoding='utf-8');(OUT/'root-index.html').write_text(root,encoding='utf-8')
    m={'schema':'prometeo.universal-shell-served-manifest/v1','source':'shared/universal-shell/v5/candidate/change-loop-source.html','source_sha256':sha,'gzip_sha256':gzsha,'base64_length':len(b64),'chunks':[{'file':f'chunk-{i}.b64','size':len(c)} for i,c in enumerate(chunks,1)],'capabilities':{'single_top_level_shell':True,'nested_root_boot_blocked':True,'page_host_overlay':True,'closed_puck_repeatable_drag':True,'closed_puck_regrab_during_snap':True,'semantic_corner_persistence':True,'durable_favorites':True,'page_change_threads':True,'page_change_feed':True,'disposable_agent_launcher':True,'unread_change_indicator':True,'text_capture_from_thread':True,'private_attachment_intake':True}}
    (OUT/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    decoded=gzip.decompress(base64.b64decode(''.join((OUT/c['file']).read_text() for c in m['chunks']),validate=True))
    if decoded!=html:raise SystemExit('payload mismatch')
    print(json.dumps(m,ensure_ascii=False))
if __name__=='__main__':main()
