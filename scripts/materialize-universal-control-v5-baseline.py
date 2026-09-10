#!/usr/bin/env python3
"""Verify/materialize the frozen Universal Control V5 Golden Master.

Release candidates replace the live chunk files, so the Golden Master must no longer be
reconstructed from whichever chunks happen to be on the candidate branch. Prefer the
persisted byte-exact baseline snapshot. Fall back to the historical chunks only when the
snapshot is absent (bootstrap/recovery case).
"""
from __future__ import annotations
import base64, gzip, hashlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
V5=ROOT/'shared'/'universal-shell'/'v5'
OUT=V5/'candidate'/'baseline-source.html'
META=V5/'candidate'/'BASELINE_SOURCE_SHA256.txt'
EXPECTED_SHA256='67965c4da9161737f06fcf6503d6b73db43eef574796977327c97f165e514d8a'
EXPECTED_B64_LENGTH=32776
EXPECTED_CHUNK_SIZES=[6552,6552,6552,6552,6568]

def verify(html:bytes, source:str)->None:
    digest=hashlib.sha256(html).hexdigest()
    if digest!=EXPECTED_SHA256: raise SystemExit(f'Golden Master sha256 {digest} != {EXPECTED_SHA256}')
    text=html.decode('utf-8')
    required=['Universal Shell V5 Integrated Control','prometeo.v5.favorites.v1','favorites-organizer','prometeo.universal-control.corner.v1','nearestCorner','localVector']
    missing=[m for m in required if m not in text]
    if missing: raise SystemExit(f'Golden Master missing markers: {missing}')
    OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_bytes(html)
    META.write_text(f'{digest}  baseline-source.html\nsource={source}\nrole=FROZEN_GOLDEN_MASTER_NOT_SERVED_AUTHORITY\n',encoding='utf-8')
    print('Golden Master PASS',digest,source)

def main()->None:
    if OUT.exists():
        raw=OUT.read_bytes()
        if hashlib.sha256(raw).hexdigest()==EXPECTED_SHA256:
            verify(raw,'persisted-candidate-baseline-snapshot'); return
    pieces=[]
    for i,expected in enumerate(EXPECTED_CHUNK_SIZES,1):
        p=V5/f'chunk-{i}.b64'; raw=p.read_bytes()
        if len(raw)!=expected: raise SystemExit(f'{p}: historical chunk size {len(raw)} != {expected} and no valid frozen baseline snapshot exists')
        pieces.append(''.join(raw.decode('ascii').split()))
    encoded=''.join(pieces)
    if len(encoded)!=EXPECTED_B64_LENGTH: raise SystemExit('historical combined base64 length mismatch')
    verify(gzip.decompress(base64.b64decode(encoded,validate=True)),'historical-v5-chunks')

if __name__=='__main__': main()
