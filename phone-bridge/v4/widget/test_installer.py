import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

spec=importlib.util.spec_from_file_location("widgetinstaller",Path(__file__).with_name("installer.py"))
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class Widget(unittest.TestCase):
    def setUp(self):
        self.t=tempfile.TemporaryDirectory()
        self.addCleanup(self.t.cleanup)
        self.home=Path(self.t.name)
        self.original=self.home/".local/share/prometeo/app/launcher.sh"
        self.original.parent.mkdir(parents=True)
        self.original.write_text('#!/usr/bin/env bash\nprintf "%s" "$1" > "$HOME/last-action"\n')

    def test_install_is_idempotent_and_owner_only(self):
        x=m.operate(self.home,test_mode=True)
        f=Path(x["path"])
        self.assertEqual(x["state"],"installed")
        self.assertEqual(f.stat().st_mode & 0o777,0o700)
        self.assertEqual(f.parent.stat().st_mode & 0o777,0o700)
        self.assertEqual(m.operate(self.home,test_mode=True)["state"],"already_installed")
        self.assertFalse(x["project_files_modified"])

    def test_one_tap_delegates_to_original_open(self):
        x=m.operate(self.home,test_mode=True)
        env={**os.environ,"HOME":str(self.home)}
        subprocess.run(["bash",x["path"]],check=True,env=env,timeout=5)
        self.assertEqual((self.home/"last-action").read_text(),"abrir")

    def test_refuse_conflict(self):
        f=self.home/".shortcuts/PROMETEO"
        f.parent.mkdir(parents=True)
        f.write_text("user own script")
        with self.assertRaisesRegex(RuntimeError,"different"):
            m.operate(self.home,test_mode=True)
        self.assertEqual(f.read_text(),"user own script")

    def test_missing_launcher_no_mutation(self):
        self.original.unlink()
        with self.assertRaisesRegex(RuntimeError,"unavailable"):
            m.operate(self.home,test_mode=True)
        self.assertFalse((self.home/".shortcuts").exists())

    def test_symlink_rejected(self):
        (self.home/".shortcuts").symlink_to(self.home/".local")
        with self.assertRaisesRegex(RuntimeError,"symlinked"):
            m.operate(self.home,test_mode=True)

    def test_exact_undo_and_no_other_files(self):
        f=Path(m.operate(self.home,test_mode=True)["path"])
        sibling=f.parent/"other"
        sibling.write_text("keep me")
        self.assertEqual(m.operate(self.home,test_mode=True,undo=True)["state"],"removed")
        self.assertTrue(sibling.exists())
        self.assertEqual(m.operate(self.home,test_mode=True,undo=True)["state"],"not_present")
        f.write_text("user modified")
        with self.assertRaisesRegex(RuntimeError,"changed"):
            m.operate(self.home,test_mode=True,undo=True)

    def test_non_termux_refused(self):
        with self.assertRaisesRegex(RuntimeError,"Only Termux"):
            m.operate(self.home,test_mode=False)

if __name__=="__main__":
    unittest.main()
