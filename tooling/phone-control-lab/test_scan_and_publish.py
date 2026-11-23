import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

f=Path(__file__).with_name("scan_and_publish.py")
spec=importlib.util.spec_from_file_location("prometeo_scan_publish",f)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
report={"schema":"prometeo.android-capabilities/v1",
        "inspection_mode":"READ_ONLY_NO_PERSONAL_DATA",
        "environment":{"termux_detected":True},
        "tools":{},"known_apps":{},"permissions_and_actions":{},"claims":{}}

class PublishTests(unittest.TestCase):
    def test_redacted_payload(self):
        raw=mod.safe_payload(report)
        self.assertEqual(json.loads(raw)["schema"],report["schema"])
        self.assertLess(len(raw),16000)
    def test_unknown_data_rejected(self):
        with self.assertRaisesRegex(ValueError,"Unexpected"):
            mod.safe_payload({**report,"messages":["secret"]})
        with self.assertRaisesRegex(ValueError,"Content-collecting"):
            mod.safe_payload({**report,"inspection_mode":"COLLECT_MESSAGES"})
    def test_public_repository_rejected(self):
        with patch.object(mod,"github_api",return_value={"private":False,"permissions":{"push":True}}):
            with self.assertRaisesRegex(RuntimeError,"Private"):
                mod.publish(report)
    def test_read_only_repository_rejected(self):
        with patch.object(mod,"github_api",return_value={"private":True,"permissions":{"push":False}}):
            with self.assertRaisesRegex(RuntimeError,"Private"):
                mod.publish(report)
    def test_safe_publish_to_fixed_private_path(self):
        events=[]
        def api(args,input_data=None):
            events.append((args,input_data))
            if args[0].endswith("pruebas"):return {"private":True,"permissions":{"push":True}}
            if args[0].endswith("latest.json") and "-X" not in args:return {"sha":"testprevsha"}
            if "-X" in args:return {"content":{"sha":"newsha"}}
            raise AssertionError(args)
        with patch.object(mod,"github_api",side_effect=api):
            self.assertEqual(mod.publish(report),mod.RESULT_PATH)
        self.assertEqual(events[-1][0][:2],["-X","PUT"])
        request=json.loads(events[-1][1])
        self.assertEqual(request["sha"],"testprevsha")
        self.assertNotIn("token",json.dumps(request).lower())
        self.assertIn("main",request["branch"])

if __name__=="__main__":unittest.main()
