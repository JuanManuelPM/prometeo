#!/usr/bin/env python3
"""Pinned, fail-closed GitHub device-auth installer for existing Prometeo Actions."""
import base64
import hashlib
import io
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import urllib.request

KIT_URL='https://raw.githubusercontent.com/JuanManuelPM/prometeo/95c718f9e2e486e16625cef6750b53d65547281d/phone-bridge/v3/github-device-kit.tar.br.b64'
BR_SHA='591d4a3f46131400f7ca05f292c3e248dc46dd7c2a8e912cf5e80c294a33d85c'
TAR_SHA='c26fc8708cfd5e2d81fa0c5dcb86e80b9a8e175695eab99297bc09a5c0038080'
NAMES={'github-auth.mjs','github-device.py','github-auth-ui.js','github-auth-ui.css','install.py','test_device_auth.py'}
def verify(b,sha):
    if hashlib.sha256(b).hexdigest()!=sha:
        raise SystemExit('DESCARGA RECHAZADA: SHA-256 incorrecto; Prometeo no se modificó.')
def main():
    fixture=os.environ.get('PROMETEO_AUTH_KIT_TEST_FIXTURE')
    if fixture:
        raw=Path(fixture).read_bytes()
    else:
        with urllib.request.urlopen(KIT_URL,timeout=30) as r:
            raw=r.read(30_000)
    encoded=raw.strip()
    if len(encoded)>20_000:raise SystemExit('Descarga demasiado grande; cancelada.')
    archive=base64.b64decode(encoded,validate=True)
    verify(archive,BR_SHA)
    with tempfile.TemporaryDirectory(prefix='prometeo-gh-setup-') as tmp:
        folder=Path(tmp)
        br=folder/'kit.br';tar=folder/'kit.tar'
        br.write_bytes(archive)
        subprocess.run(['node','-e',
          'const fs=require("node:fs"),z=require("node:zlib");fs.writeFileSync(process.argv[2],z.brotliDecompressSync(fs.readFileSync(process.argv[1])));',
          str(br),str(tar)],check=True,timeout=30)
        raw_tar=tar.read_bytes()
        verify(raw_tar,TAR_SHA)
        with tarfile.open(fileobj=io.BytesIO(raw_tar),mode='r:') as z:
            members=z.getmembers()
            if {m.name for m in members}!=NAMES or any(not m.isfile() or m.size>40_000 or m.size<1 for m in members):
                raise SystemExit('Paquete no reconocido; cancelado.')
            for m in members:
                dst=folder/m.name
                dst.write_bytes(z.extractfile(m).read())
                dst.chmod(0o600)
        p=subprocess.run([sys.executable,str(folder/'install.py')],check=True,timeout=50)
        return p.returncode
if __name__=='__main__':
    raise SystemExit(main())
