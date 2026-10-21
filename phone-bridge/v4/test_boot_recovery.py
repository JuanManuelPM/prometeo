"""Offline regression tests for a safe, idempotent, exact Android boot hook."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SOURCE = Path(__file__).with_name("boot-recovery.py")
spec = importlib.util.spec_from_file_location("prometeo_boot_recovery", SOURCE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class BootRecoveryTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name)
        launcher = self.home / ".local/share/prometeo/app/launcher.sh"
        launcher.parent.mkdir(parents=True)
        launcher.write_text('#!/usr/bin/env bash\necho "$1" >> "$HOME/started"\n')
        self.launcher = launcher

    def test_install_once_and_no_overwrite(self):
        first = mod.install(self.home, test_mode=True)
        hook = Path(first["boot_hook"])
        self.assertEqual(first["state"], "installed")
        self.assertEqual(hook.stat().st_mode & 0o777, 0o700)
        self.assertEqual(first["projects_touched"], False)
        self.assertEqual(first["server_restarted"], False)
        self.assertEqual(mod.install(self.home, test_mode=True)["state"], "already_present")
        self.assertEqual(hook.read_text(), mod.HOOK)

    def test_actual_launch_path_and_no_browser(self):
        hook = Path(mod.install(self.home, test_mode=True)["boot_hook"])
        env = {**os.environ, "HOME": str(self.home), "PROMETEO_BOOT_DELAY_SECONDS": "0"}
        subprocess.run(["bash", str(hook)], env=env, check=True, timeout=8)
        self.assertEqual((self.home/"started").read_text().strip(), "iniciar")
        self.assertTrue((self.home/".local/share/prometeo/logs/boot-recovery.log").is_file())

    def test_refuses_conflicting_file(self):
        target = self.home / ".termux/boot/70-prometeo-recovery"
        target.parent.mkdir(parents=True)
        target.write_text("USER SCRIPT: do not overwrite")
        with self.assertRaisesRegex(RuntimeError, "not overwritten"):
            mod.install(self.home, test_mode=True)
        self.assertEqual(target.read_text(), "USER SCRIPT: do not overwrite")

    def test_missing_launcher_no_mutation(self):
        self.launcher.unlink()
        with self.assertRaisesRegex(RuntimeError, "not found"):
            mod.install(self.home, test_mode=True)
        self.assertFalse((self.home/".termux").exists())

    def test_refuses_symlink_boot_folder(self):
        (self.home/".termux").symlink_to(self.home/"not-a-directory")
        with self.assertRaisesRegex(RuntimeError, "symlink"):
            mod.install(self.home, test_mode=True)

    def test_refuses_non_termux_outside_test(self):
        previous = os.environ.get("PREFIX")
        os.environ["PREFIX"] = "/some/untrusted/prefix"
        try:
            with self.assertRaisesRegex(RuntimeError, "Only Termux"):
                mod.install(self.home)
        finally:
            if previous is None: os.environ.pop("PREFIX", None)
            else: os.environ["PREFIX"] = previous

    def test_explicit_truth_boundaries(self):
        receipt = mod.install(self.home, test_mode=True)
        self.assertIn("NOT_RUN", receipt["android_reboot_test"])
        self.assertIn("requires independent install", receipt["termux_boot_app"])

if __name__ == "__main__":
    unittest.main()
