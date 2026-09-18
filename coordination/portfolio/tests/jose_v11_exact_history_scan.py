#!/usr/bin/env python3
import hashlib, json, os, subprocess, sys
from collections import defaultdict

TARGET=os.environ.get('TARGET_SHA256','0cf9a40fb53e977dccb40c9755d668a3ee922ccd61883f19229bb4a113139a05').lower()
TARGET_BYTES=int(os.environ.get('TARGET_BYTES','69235'))

rows=subprocess.check_output(['git','rev-list','--objects','--all'],text=True,errors='replace').splitlines()
paths=defaultdict(set)
oids=[]
for row in rows:
    if not row: continue
    parts=row.split(' ',1); oid=parts[0]
    oids.append(oid)
    if len(parts)>1 and parts[1]: paths[oid].add(parts[1])
unique=list(dict.fromkeys(oids))

check=subprocess.Popen(
    ['git','cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize)'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)
check_stdout,check_stderr=check.communicate('\n'.join(unique)+'\n')
if check.returncode:
    raise RuntimeError(f'git cat-file --batch-check failed rc={check.returncode}: {check_stderr.strip()}')
blobs=[]
for line in check_stdout.splitlines():
    parts=line.split(' ')
    if len(parts)==3 and parts[1]=='blob': blobs.append((parts[0],int(parts[2])))

size_candidates=[(oid,size) for oid,size in blobs if size==TARGET_BYTES]

batch=subprocess.Popen(
    ['git','cat-file','--batch'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)
batch_input=b''.join((oid+'\n').encode() for oid,_ in size_candidates)
batch_stdout,batch_stderr=batch.communicate(batch_input)
if batch.returncode:
    raise RuntimeError(f'git cat-file --batch failed rc={batch.returncode}: {batch_stderr.decode("utf-8","replace").strip()}')

matches=[]; scanned=0; bytes_scanned=0; offset=0
for expected_oid,expected_size in size_candidates:
    header_end=batch_stdout.find(b'\n',offset)
    if header_end<0:
        raise RuntimeError(f'missing cat-file header for {expected_oid}')
    header=batch_stdout[offset:header_end].decode('utf-8','replace').split(' ')
    if len(header)<3 or header[1]!='blob':
        raise RuntimeError(f'unexpected cat-file header for {expected_oid}: {header!r}')
    oid,objtype,size=header[0],header[1],int(header[2])
    body_start=header_end+1
    body_end=body_start+size
    body=batch_stdout[body_start:body_end]
    trailer=batch_stdout[body_end:body_end+1]
    if len(body)!=size or trailer!=b'\n':
        raise RuntimeError(f'truncated batch body {oid}')
    offset=body_end+1
    scanned+=1; bytes_scanned+=size
    digest=hashlib.sha256(body).hexdigest()
    if digest==TARGET:
        commits=subprocess.check_output(['git','log','--all','--format=%H','--find-object='+oid],text=True).splitlines()
        matches.append({'git_blob':oid,'size':size,'sha256':digest,'paths':sorted(paths.get(oid,())),'commits':list(dict.fromkeys(commits))})
if offset!=len(batch_stdout):
    raise RuntimeError(f'unparsed cat-file output bytes: {len(batch_stdout)-offset}')

refs=subprocess.check_output(['git','for-each-ref','--format=%(refname)'],text=True).splitlines()
result={
  'schema':'prometeo.jose-v11-exact-history-scan/v1',
  'target_sha256':TARGET,
  'target_bytes':TARGET_BYTES,
  'scope':'all objects reachable from refs after checkout fetch-depth=0 plus git fetch --all --tags --prune',
  'refs_count':len(refs),
  'objects_enumerated':len(unique),
  'blobs_enumerated':len(blobs),
  'size_candidates':len(size_candidates),
  'blobs_scanned':scanned,
  'bytes_scanned':bytes_scanned,
  'matches':matches,
  'status':'EXACT_MATCH' if matches else 'NO_EXACT_MATCH'
}
with open('jose-v11-history-scan-result.json','w',encoding='utf-8') as f: json.dump(result,f,ensure_ascii=False,indent=2,sort_keys=True)
print(json.dumps(result,ensure_ascii=False,sort_keys=True))
notice=f"José V11 exact history scan: {result['status']}; target={TARGET}; blobs={scanned}; matches={len(matches)}"
print(f'::notice title=José V11 exact history scan::{notice}')
summary=os.environ.get('GITHUB_STEP_SUMMARY')
if summary:
    with open(summary,'a',encoding='utf-8') as f:
        f.write('## José V11 exact history scan\n\n')
        f.write(f"- Status: `{result['status']}`\n- Target SHA-256: `{TARGET}`\n- Target bytes: `{TARGET_BYTES}`\n- Blobs enumerated: `{len(blobs)}`\n- Size-matched candidates hashed: `{scanned}`\n- Bytes hashed: `{bytes_scanned}`\n- Refs: `{len(refs)}`\n- Exact matches: `{len(matches)}`\n")
        if matches:
            for m in matches: f.write(f"- Match blob `{m['git_blob']}` paths `{m['paths']}` commits `{m['commits']}`\n")
