#!/usr/bin/env python3
"""Stage a reversible Termux:Boot hook around the EXISTING Prometeo launcher.

Does not install Android packages, change the server, expose a port or touch projects.
Termux:Boot must be installed and opened once by the device owner separately.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import tempfile

VERSION = "prometeo.android-boot-hook/v1"
FILENAME = "70-prometeo-recovery"
HOOK = r"""#!/data/data/com.termux/files/usr/bin/bash
# Prometeo · Termux:Boot · start the EXISTING local server, do not install another.
set -u
umask 077
export PATH="/data/data/com.termux/files/usr/bin:$HOME/.local/bin:$PATH"
ROOT="$HOME/.local/share/prometeo"
LOG="$ROOT/logs/boot-recovery.log"
mkdir -p "$ROOT/logs"
chmod 700 "$ROOT/logs" 2>/dev/null || true
{
  printf '\n[%s] Android boot: Prometeo launcher check\n' "$(date -u +%FT%TZ)"
  sleep "${PROMETEO_BOOT_DELAY_SECONDS:-10}"
  if [[ -f "$ROOT/app/launcher.sh" ]]; then
    bash "$ROOT/app/launcher.sh" iniciar
  elif command -v prometeo >/dev/null 2>&1; then
    prometeo iniciar
  else
    echo 'Prometeo launcher not found; nothing changed'
    exit 1
  fi
} >>"$LOG" 2>&1
"""

def install(home: Path, *, test_mode: bool = False) -> dict:
    home = home.expanduser().resolve()
    root = home / ".local" / "share" / "prometeo"
    launcher = root / "app" / "launcher.sh"
    if not test_mode and os.environ.get("PREFIX") != "/data/data/com.termux/files/usr":
        raise RuntimeError("Only Termux on Android is supported; not installed")
    if not launcher.is_file() or launcher.is_symlink():
        raise RuntimeError("Original Prometeo launcher not found; nothing changed")
    boot_home = home / ".termux"
    boot_dir = boot_home / "boot"
    for folder in (boot_home, boot_dir):
        if folder.is_symlink():
            raise RuntimeError("Refusing symlinked Termux boot directory")
        folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    target = boot_dir / FILENAME
    data = HOOK.encode("utf-8")
    if target.is_symlink():
        raise RuntimeError("Refusing to overwrite a symlink")
    if target.exists():
        if not target.is_file() or target.read_bytes() != data:
            raise RuntimeError("Boot hook path already has different content; not overwritten")
        state = "already_present"
    else:
        with tempfile.NamedTemporaryFile(dir=boot_dir, prefix=".prometeo-", delete=False) as f:
            temp = Path(f.name)
            try:
                f.write(data)
                f.flush()
                os.fsync(f.fileno())
            except BaseException:
                temp.unlink(missing_ok=True)
                raise
        try:
            temp.chmod(stat.S_IRWXU)
            os.replace(temp, target)
        except BaseException:
            temp.unlink(missing_ok=True)
            raise
        state = "installed"
    return {
        "protocol": VERSION,
        "state": state,
        "boot_hook": str(target),
        "sha256": hashlib.sha256(data).hexdigest(),
        "termux_boot_app": "requires independent install and first launch; NOT checked",
        "android_reboot_test": "NOT_RUN",
        "projects_touched": False,
        "server_restarted": False,
    }

def undo(home: Path, *, test_mode: bool = False) -> dict:
    """Undo ONLY the exact hook created by this installer; keep any user-owned file."""
    home = home.expanduser().resolve()
    if not test_mode and os.environ.get("PREFIX") != "/data/data/com.termux/files/usr":
        raise RuntimeError("Only Termux on Android is supported; nothing removed")
    target = home / ".termux" / "boot" / FILENAME
    if target.is_symlink():
        raise RuntimeError("Refusing symlinked boot hook")
    if not target.exists():
        state = "not_present"
    elif not target.is_file() or target.read_bytes() != HOOK.encode("utf-8"):
        raise RuntimeError("Different boot hook owned by someone else; nothing removed")
    else:
        target.unlink()
        state = "removed"
    return {"protocol": VERSION, "state": state, "projects_touched": False,
            "server_restarted": False}

if __name__ == "__main__":
    try:
        testing = os.environ.get("PROMETEO_BOOT_TEST_MODE") == "1"
        home = Path(os.environ.get("PROMETEO_BOOT_TEST_HOME", str(Path.home())))
        result = undo(home, test_mode=testing) if sys.argv[1:] == ["--undo"] else install(home, test_mode=testing)
    except (OSError, RuntimeError) as exc:
        print(json.dumps({"protocol": VERSION, "state": "not_installed", "reason": str(exc)}))
        sys.exit(1)
    print(json.dumps(result, indent=2))
