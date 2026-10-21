#!/usr/bin/env python3
"""Single home-screen launcher for the existing Prometeo installation (Termux:Widget).

Creates one user-owned ~/.shortcuts/PROMETEO file. It never installs a daemon,
changes original apps, touches projects, or exposes a port. Optional exact undo.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
import stat
import sys
import tempfile

SHORTCUT_NAME = "PROMETEO"
EXPECTED_PREFIX = "/data/data/com.termux/files/usr"
SOURCE = """#!/data/data/com.termux/files/usr/bin/bash
# Termux:Widget foreground shortcut. Delegates to the original Prometeo launcher.
set -Eeuo pipefail
export PATH="/data/data/com.termux/files/usr/bin:$HOME/.local/bin:$PATH"
if [[ -f "$HOME/.local/share/prometeo/app/launcher.sh" && ! -L "$HOME/.local/share/prometeo/app/launcher.sh" ]]; then
  exec bash "$HOME/.local/share/prometeo/app/launcher.sh" abrir
elif command -v prometeo >/dev/null 2>&1; then
  exec prometeo abrir
else
  printf '%s\\n' 'Prometeo no está instalado. No se modificó nada.' >&2
  exit 1
fi
"""

def operate(home: Path, *, undo: bool = False, test_mode: bool = False):
    if not test_mode and os.environ.get("PREFIX") != EXPECTED_PREFIX:
        raise RuntimeError("Only Termux on Android is supported")
    home = home.expanduser().resolve()
    folder = home / ".shortcuts"
    target = folder / SHORTCUT_NAME
    if folder.is_symlink():
        raise RuntimeError("Refusing a symlinked shortcuts directory")
    if undo:
        if target.is_symlink():
            raise RuntimeError("Refusing a symlinked shortcut")
        if not target.exists():
            return {"state": "not_present", "path": str(target)}
        if not target.is_file() or target.read_bytes() != SOURCE.encode():
            raise RuntimeError("Shortcut was changed by somebody else; no removal")
        target.unlink()
        return {"state": "removed", "path": str(target)}
    original = home / ".local/share/prometeo/app/launcher.sh"
    if not original.is_file() or original.is_symlink():
        raise RuntimeError("The original Prometeo launcher is unavailable. No changes made")
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    folder.chmod(0o700)
    if target.is_symlink():
        raise RuntimeError("Existing shortcut is a symlink; refusing overwrite")
    data=SOURCE.encode()
    if target.exists():
        if not target.is_file() or target.read_bytes()!=data:
            raise RuntimeError("A different PROMETEO shortcut already exists; no overwrite")
        target.chmod(stat.S_IRWXU)
        state="already_installed"
    else:
        with tempfile.NamedTemporaryFile(dir=folder,prefix=".prometeo-shortcut-",delete=False) as f:
            tmp=Path(f.name)
            try:
                f.write(data)
                f.flush()
                os.fsync(f.fileno())
            except BaseException:
                tmp.unlink(missing_ok=True)
                raise
        try:
            tmp.chmod(stat.S_IRWXU)
            os.replace(tmp,target)
        except BaseException:
            tmp.unlink(missing_ok=True)
            raise
        state="installed"
    return {"state":state,"path":str(target),"mode":"Termux:Widget foreground shortcut",
            "actions":"check / start original Prometeo / open browser",
            "project_files_modified":False,"credentials_modified":False,
            "widget_android_installed":"NOT_CHECKED","android_runtime_test":"NOT_RUN"}

if __name__=="__main__":
    try:
        result=operate(Path(os.environ.get("PROMETEO_WIDGET_TEST_HOME") or Path.home()),
                       undo=sys.argv[1:]==["--undo"],
                       test_mode=os.environ.get("PROMETEO_WIDGET_TEST_MODE")=="1")
        print(json.dumps(result,ensure_ascii=False,indent=2))
    except (OSError,RuntimeError) as exc:
        print("PROMETEO_WIDGET_NOT_INSTALLED:",str(exc),file=sys.stderr)
        sys.exit(1)
